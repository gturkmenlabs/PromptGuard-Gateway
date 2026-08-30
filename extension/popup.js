document.addEventListener('DOMContentLoaded', () => {
  let ledgerSnapshot = [];

  chrome.runtime.sendMessage({ type: 'PG_GET_STATE' }, (state) => {
    if (chrome.runtime.lastError || !state) return;
    ledgerSnapshot = state.ledger;

    document.getElementById('tokensCount').textContent = state.counters.masked;
    document.getElementById('blockedCount').textContent = state.counters.blocked;
    document.getElementById('ledgerLength').textContent = state.ledger.length;

    const head = state.ledger.length ? state.ledger[state.ledger.length - 1].entryHash : '—';
    document.getElementById('ledgerHead').textContent = head;

    const status = document.getElementById('ledgerStatus');
    if (state.verification.ok) {
      status.textContent = '✓ zincir doğrulandı';
      status.style.color = '#10b981';
    } else {
      status.textContent = `✗ #${state.verification.brokenAt} bozuk`;
      status.style.color = '#f43f5e';
    }
  });

  document.getElementById('openDashboardBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5174/' });
  });

  document.getElementById('exportLedgerBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(ledgerSnapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    if (chrome.downloads) {
      chrome.downloads.download({ url, filename: `promptguard-audit-ledger-${new Date().toISOString().slice(0, 10)}.json` });
    } else {
      window.open(url, '_blank');
    }
  });
});
