export function removeSavoraHmrDocumentReload(code: string): string {
  return code.replace(
    /await waitForSuccessfulPing\(url\.href\);\s*\n\s*location\.reload\(\);/,
    'await waitForSuccessfulPing(url.href);\n            console.debug("[vite] HMR reconnected; preserving the active document.");',
  );
}
