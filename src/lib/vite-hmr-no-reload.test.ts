import { describe, expect, it } from 'vitest';
import { removeSavoraHmrDocumentReload } from '../../scripts/vite-hmr-no-reload';

describe('Savora HMR ngrok guard', () => {
  it('preserves the active document after a Vite HMR reconnect', () => {
    const viteClient = `
      console.log("[vite] server connection lost.");
      await waitForSuccessfulPing(url.href);
      location.reload();
    `;

    const fixed = removeSavoraHmrDocumentReload(viteClient);

    expect(fixed).not.toContain('location.reload()');
    expect(fixed).toContain('preserving the active document');
  });

  it('does not alter unrelated HMR reload code', () => {
    const unrelated = 'if (outdated) location.reload();';
    expect(removeSavoraHmrDocumentReload(unrelated)).toBe(unrelated);
  });
});
