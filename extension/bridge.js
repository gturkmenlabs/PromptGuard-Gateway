// Relays audit events from the page (MAIN world) to the service worker.
// The MAIN-world script has no access to chrome.* APIs, so this isolated-world
// script is the only path between them.
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.__promptguard !== true || !data.event) return;

  chrome.runtime.sendMessage({ type: 'PG_AUDIT_EVENT', event: data.event }, () => {
    // Swallow "receiving end does not exist" while the worker is spinning up.
    void chrome.runtime.lastError;
  });
});
