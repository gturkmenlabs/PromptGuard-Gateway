// PromptGuard service worker: append-only, hash-chained audit ledger.
importScripts('promptguard-core.js');

const GENESIS = '0'.repeat(64);
const LEDGER_KEY = 'pgLedger';
const COUNTER_KEY = 'pgCounters';

const sha256Hex = (message) => self.PromptGuardCore.sha256Hex(message);

/** Field order is fixed so a record always hashes to the same leaf. */
function canonicalRecord(record) {
  return JSON.stringify([
    record.sequence,
    record.timestampIso,
    record.host,
    record.action,
    [...record.entityTypes].sort(),
    [...record.categories].sort(),
    record.payloadDigest
  ]);
}

const read = (key) => new Promise(resolve => chrome.storage.local.get([key], res => resolve(res[key])));
const write = (key, value) => new Promise(resolve => chrome.storage.local.set({ [key]: value }, resolve));

async function appendEntry(event) {
  const ledger = (await read(LEDGER_KEY)) || [];
  const prevHash = ledger.length === 0 ? GENESIS : ledger[ledger.length - 1].entryHash;

  const record = {
    sequence: ledger.length,
    timestampIso: event.timestampIso,
    host: event.host,
    action: event.action,
    entityTypes: event.entityTypes || [],
    categories: event.categories || [],
    payloadDigest: event.payloadDigest
  };

  const leafHash = await sha256Hex('\x00' + canonicalRecord(record));
  const entry = { ...record, leafHash, prevHash, entryHash: await sha256Hex(prevHash + leafHash) };

  ledger.push(entry);
  await write(LEDGER_KEY, ledger);
  return entry;
}

/** Recomputes every leaf and re-links the chain; reports the first broken link. */
async function verifyLedger() {
  const ledger = (await read(LEDGER_KEY)) || [];
  let prevHash = GENESIS;
  for (const entry of ledger) {
    const expectedLeaf = await sha256Hex('\x00' + canonicalRecord(entry));
    const expectedEntry = await sha256Hex(prevHash + expectedLeaf);
    if (expectedLeaf !== entry.leafHash || entry.prevHash !== prevHash || expectedEntry !== entry.entryHash) {
      return { ok: false, brokenAt: entry.sequence, length: ledger.length };
    }
    prevHash = entry.entryHash;
  }
  return { ok: true, brokenAt: null, length: ledger.length };
}

async function bumpCounters(action) {
  const counters = (await read(COUNTER_KEY)) || { masked: 0, blocked: 0 };
  if (action === 'BLOCKED') counters.blocked++;
  else counters.masked++;
  await write(COUNTER_KEY, counters);
  return counters;
}

async function refreshBadge(counters) {
  const total = counters.masked + counters.blocked;
  await chrome.action.setBadgeText({ text: total > 0 ? String(total) : 'ON' });
  await chrome.action.setBadgeBackgroundColor({ color: counters.blocked > 0 ? '#f43f5e' : '#10b981' });
}

chrome.runtime.onInstalled.addListener(async () => {
  const counters = (await read(COUNTER_KEY)) || { masked: 0, blocked: 0 };
  await write(COUNTER_KEY, counters);
  await refreshBadge(counters);
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'PG_AUDIT_EVENT') {
    (async () => {
      const entry = await appendEntry(request.event);
      await refreshBadge(await bumpCounters(request.event.action));
      sendResponse({ ok: true, sequence: entry.sequence });
    })();
    return true;
  }

  if (request.type === 'PG_GET_STATE') {
    (async () => {
      const [ledger, counters, verification] = await Promise.all([
        read(LEDGER_KEY), read(COUNTER_KEY), verifyLedger()
      ]);
      sendResponse({
        ledger: ledger || [],
        counters: counters || { masked: 0, blocked: 0 },
        verification
      });
    })();
    return true;
  }

  return false;
});
