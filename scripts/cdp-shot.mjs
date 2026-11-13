/**
 * Dev-only screenshot helper.
 *
 * Drives a local headless Chrome over the DevTools protocol so we can inspect
 * real viewport widths (including phone layouts) and capture full pages.
 * Not imported by the app and not part of the production bundle.
 *
 * Usage:
 *   node scripts/cdp-shot.mjs --url http://127.0.0.1:5173/ --width 390 --out shot.png
 *   node scripts/cdp-shot.mjs --url ... --width 1440 --height 900 --full --out shot.png
 */
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { tmpdir } from 'node:os';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = process.argv[index + 1];
  return value && !value.startsWith('--') ? value : true;
}

const url = String(arg('url', 'http://127.0.0.1:5173/'));
const width = Number(arg('width', 390));
const height = Number(arg('height', 844));
const output = resolve(String(arg('out', 'cdp-shot.png')));
const fullPage = Boolean(arg('full', false));
const reduceMotion = Boolean(arg('reduce-motion', true));
const waitMs = Number(arg('wait', 1200));
const port = Number(arg('port', 9333));
const seedSession = Boolean(arg('seed-session', false));

mkdirSync(dirname(output), { recursive: true });

// A fresh profile per run keeps concurrent captures from fighting over locks.
const profileDir = mkdtempSync(join(tmpdir(), 'savora-cdp-'));

const chrome = spawn(
  CHROME,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);

async function getJson(path, method = 'GET') {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { method });
  if (!response.ok) throw new Error(`CDP ${path} -> ${response.status}`);
  return response.json();
}

async function waitForChrome() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      await getJson('/json/version');
      return;
    } catch {
      await sleep(250);
    }
  }
  throw new Error('Chrome DevTools endpoint did not start.');
}

await waitForChrome();

const target = await getJson('/json/new?about:blank', 'PUT');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener('open', resolveOpen, { once: true });
  socket.addEventListener('error', rejectOpen, { once: true });
});

let nextId = 0;
const pending = new Map();
const events = [];

socket.addEventListener('message', (event) => {
  const message = JSON.parse(String(event.data));
  if (message.id) {
    const waiter = pending.get(message.id);
    if (waiter) {
      pending.delete(message.id);
      if (message.error) waiter.reject(new Error(message.error.message));
      else waiter.resolve(message.result);
    }
    return;
  }
  events.push(message);
});

function send(method, params = {}) {
  const id = (nextId += 1);
  return new Promise((resolveSend, rejectSend) => {
    pending.set(id, { resolve: resolveSend, reject: rejectSend });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Evaluation failed');
  }
  return result.result.value;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 768,
  screenWidth: width,
  screenHeight: height,
});
if (reduceMotion) {
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
}

if (seedSession) {
  const session = {
    accessToken: 'demo.capture-session',
    user: {
      id: 'usr_maya_bennett',
      fullName: 'Maya Bennett',
      email: 'maya@example.com',
      phone: '+1 (718) 555-0148',
      avatarKey: 'avatar-maya',
      memberSince: '2023-04-12T00:00:00.000Z',
      role: 'customer',
      preferences: {
        dietary: ['vegetarian'],
        emailReceipts: true,
        orderUpdates: true,
        marketing: false,
      },
    },
    expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
    remember: true,
  };

  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `try { localStorage.setItem('savora.session', ${JSON.stringify(JSON.stringify(session))}); } catch {}`,
  });
}

await send('Page.navigate', { url });
for (let attempt = 0; attempt < 120; attempt += 1) {
  if (events.some((event) => event.method === 'Page.loadEventFired')) break;
  await sleep(100);
}
await sleep(waitMs);

if (fullPage) {
  await evaluate(`(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    const height = document.documentElement.scrollHeight;
    for (let y = 0; y < height; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 250));
    return height;
  })()`);
  // Force every lazy image to resolve before capturing, then let the last
  // reveals settle. This prevents photographs from missing in full-page shots.
  await evaluate(`(async () => {
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
    await new Promise((r) => setTimeout(r, 500));
    return document.images.length;
  })()`);
}

const metrics = await evaluate(`(() => {
  const root = document.documentElement;
  const offenders = [...document.querySelectorAll('body *')]
    .filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.right > window.innerWidth + 1 && rect.width > 0;
    })
    .slice(0, 12)
    .map((element) => ({
      tag: element.tagName,
      className: String(element.className).slice(0, 90),
      width: Math.round(element.getBoundingClientRect().width),
      right: Math.round(element.getBoundingClientRect().right),
    }));

  return {
    title: document.title,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    scrollWidth: root.scrollWidth,
    scrollHeight: root.scrollHeight,
    overflow: root.scrollWidth > window.innerWidth,
    offenders,
  };
})()`);

const screenshot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: fullPage,
  ...(fullPage
    ? { clip: { x: 0, y: 0, width, height: metrics.scrollHeight, scale: 1 } }
    : {}),
});

writeFileSync(output, Buffer.from(screenshot.data, 'base64'));
console.log(JSON.stringify({ output, ...metrics }, null, 2));

socket.close();
chrome.kill();
setTimeout(() => {
  try {
    rmSync(profileDir, { recursive: true, force: true });
  } catch {
    /* Windows can hold the profile briefly; leaving it in tmp is harmless. */
  }
}, 500);
