import { defineConfig, type ProxyOptions } from "vite"
import react from "@vitejs/plugin-react"
import path from "node:path"
import { loadEnv } from "vite"
import { removeSavoraHmrDocumentReload } from "./scripts/vite-hmr-no-reload"

function parseAllowedHosts(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((host) => host.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
    .filter(Boolean);
}

function createBackendProxy(): ProxyOptions {
  return {
    target: 'http://localhost:3000',
    changeOrigin: true,
    configure(proxy) {
      const removeOrigin = (request: { removeHeader: (name: string) => void }) => {
        request.removeHeader('origin');
      };
      proxy.on('proxyReq', removeOrigin);
      proxy.on('proxyReqWs', removeOrigin);
    },
  };
}

const savoraRuntimeDiagnostics = `
(() => {
  if (window.__savoraNavigationDiagnostics) return;
  const diagnostics = {
    startedAt: new Date().toISOString(),
    documentNavigations: [],
    historyChanges: [],
    submissions: [],
    metaRefresh: [],
  };
  window.__savoraNavigationDiagnostics = diagnostics;
  window.addEventListener("beforeunload", (event) => {
    diagnostics.documentNavigations.push({
      type: "beforeunload",
      href: location.href,
      timestamp: new Date().toISOString(),
      stack: new Error().stack,
    });
  });
  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function(...args) {
      diagnostics.historyChanges.push({
        method,
        url: String(args[2] || location.href),
        timestamp: new Date().toISOString(),
        stack: new Error().stack,
      });
      return original.apply(this, args);
    };
  }
  document.addEventListener("submit", (event) => {
    diagnostics.submissions.push({
      href: location.href,
      action: event.target instanceof HTMLFormElement ? event.target.action : "",
      timestamp: new Date().toISOString(),
      stack: new Error().stack,
    });
  }, true);
  for (const meta of document.querySelectorAll("meta[http-equiv='refresh' i]")) {
    diagnostics.metaRefresh.push({ html: meta.outerHTML, timestamp: new Date().toISOString() });
  }
})();
`;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = [
    'kabob-calculus-blot.ngrok-free.dev',
    'smith-mem-pond-assign.trycloudflare.com',
    'periods-wanted-hwy-sample.trycloudflare.com',
    'considerable-suppose-gains-safely.trycloudflare.com',
    ...parseAllowedHosts(env.VITE_ALLOWED_HOSTS),
  ];

  return {
    plugins: [
      react(),
      {
        name: 'savora-ngrok-hmr',
        apply: 'serve',
        transform(code, id) {
          if (id.includes('/node_modules/vite/dist/client/client.mjs')) {
            return removeSavoraHmrDocumentReload(code);
          }
          return code;
        },
        transformIndexHtml() {
          return [
            {
              tag: 'script',
              attrs: { type: 'text/javascript' },
              children: savoraRuntimeDiagnostics,
              injectTo: 'head',
            },
          ];
        },
      },
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      host: "0.0.0.0",
      allowedHosts,
      proxy: {
        '/api': createBackendProxy(),
        '/socket.io': {
          ...createBackendProxy(),
          ws: true,
        },
      },
    },
    preview: {
      port: 4173,
      host: "0.0.0.0",
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 900,
    },
  };
});
