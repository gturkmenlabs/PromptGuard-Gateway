// PromptGuard Enterprise AI DLP - Zero-Disruption Kernel (Clean DOM & Network Proxy)
(function() {
  console.log('%c[PromptGuard Gateway]%c Enterprise AI Proxy Active & Protected.', 'background: #022c22; color: #10b981; font-weight: bold; padding: 2px 6px; border-radius: 4px;', 'color: #38bdf8;');

  const vault = new Map();
  let sessionMaskedCount = 0;
  let sessionBlockedCount = 0;

  const core = window.PromptGuardCore;
  if (!core) {
    console.error('[PromptGuard Gateway] Core rules failed to load; gateway is inactive.');
    return;
  }

  function sanitizeText(text) {
    const result = core.sanitize(text, vault);
    return {
      sanitized: result.sanitized,
      foundCount: result.maskedCount,
      detectedTypes: result.maskedTypes,
      blocked: result.blocked,
      blockedTypes: result.blockedTypes,
      findings: result.findings
    };
  }

  function restoreTokens(text) {
    return core.restore(text, vault);
  }

  // Reports the event to the service worker ledger. Only a digest of the payload
  // is sent -- the payload itself never leaves the page.
  async function emitAuditEvent(action, findings, payload) {
    try {
      window.postMessage({
        __promptguard: true,
        event: {
          action: action,
          host: location.host,
          timestampIso: new Date().toISOString(),
          entityTypes: findings.map(f => f.type).filter((t, i, a) => a.indexOf(t) === i),
          categories: findings.map(f => f.category).filter((c, i, a) => a.indexOf(c) === i),
          payloadDigest: await core.sha256Hex(payload)
        }
      }, location.origin);
    } catch (err) {
      console.warn('[PromptGuard Gateway] Audit event could not be emitted:', err);
    }
  }

  // ========================================================
  // SAFE UI SYSTEM: ONLY APPEND TO document.body
  // ========================================================
  function showToast(count, types) {
    let toast = document.getElementById('promptguard-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'promptguard-toast';
      toast.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 2147483647;
        background: rgba(15, 23, 42, 0.96);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(16, 185, 129, 0.7);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(16, 185, 129, 0.4);
        border-radius: 12px;
        padding: 14px 20px;
        display: flex;
        align-items: center;
        gap: 14px;
        font-family: system-ui, -apple-system, sans-serif;
        color: #ffffff;
        transform: translateY(-20px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
      `;
      document.body?.appendChild(toast);
    }

    toast.innerHTML = `
      <div style="width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #10b981, #059669); display:flex; align-items:center; justify-content:center; color:#022c22; font-size:18px; font-weight:bold; flex-shrink:0;">🛡️</div>
      <div>
        <div style="font-size: 13px; font-weight: 700; color: #34d399; letter-spacing: -0.01em;">PromptGuard Gateway: Veriler Maskelendi!</div>
        <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;"><b>${count} adet</b> hassas veri (<i>${types.join(', ')}</i>) OpenAI'a iletilmeden şifrelendi.</div>
      </div>
    `;

    toast.style.transform = 'translateY(0)';
    toast.style.opacity = '1';

    setTimeout(() => {
      if (toast) {
        toast.style.transform = 'translateY(-20px)';
        toast.style.opacity = '0';
      }
    }, 4500);
  }

  function showBlockNotice(types) {
    let notice = document.getElementById('promptguard-block-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.id = 'promptguard-block-notice';
      notice.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 2147483647;
        max-width: 380px;
        background: rgba(24, 8, 12, 0.97);
        backdrop-filter: blur(16px);
        border: 1px solid rgba(244, 63, 94, 0.8);
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.65), 0 0 25px rgba(244, 63, 94, 0.35);
        border-radius: 12px;
        padding: 14px 20px;
        display: flex;
        align-items: flex-start;
        gap: 14px;
        font-family: system-ui, -apple-system, sans-serif;
        color: #ffffff;
      `;
      document.body?.appendChild(notice);
    }

    notice.innerHTML = `
      <div style="width: 36px; height: 36px; border-radius: 8px; background: linear-gradient(135deg, #f43f5e, #be123c); display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0;">⛔</div>
      <div>
        <div style="font-size: 13px; font-weight: 700; color: #fda4af;">PromptGuard Gateway: İstek Engellendi</div>
        <div style="font-size: 11px; color: #e2e8f0; margin-top: 3px; line-height: 1.5;">
          <b>${types.join(', ')}</b> tespit edildi. Kurumsal DLP politikası gereği bu istek gönderilmedi.
          Lütfen kimlik bilgisini prompt'tan çıkarın ve anahtarı rotasyona alın.
        </div>
      </div>
    `;
    notice.style.display = 'flex';
    setTimeout(() => { if (notice) notice.style.display = 'none'; }, 9000);
  }

  function updateBadgeText() {
    const badgeCount = document.getElementById('pg-badge-count');
    if (badgeCount) {
      badgeCount.textContent = `${sessionMaskedCount} Maskeli · ${sessionBlockedCount} Engelli`;
    }
  }

  // Floating Status Widget (Bottom Right)
  function injectBadge() {
    if (!document.body || document.getElementById('promptguard-floating-badge')) return;
    const badge = document.createElement('div');
    badge.id = 'promptguard-floating-badge';
    badge.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483646;
      background: rgba(15, 23, 42, 0.94);
      backdrop-filter: blur(14px);
      border: 1px solid rgba(16, 185, 129, 0.5);
      box-shadow: 0 4px 25px rgba(0, 0, 0, 0.5), 0 0 15px rgba(16, 185, 129, 0.25);
      border-radius: 9999px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 12px;
      font-weight: 600;
      color: #34d399;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    badge.innerHTML = `
      <span style="display:inline-block; width:9px; height:9px; background:#10b981; border-radius:50%; box-shadow:0 0 8px #10b981; animation: pg-pulse 2s infinite;"></span>
      <span>PromptGuard Gateway</span>
      <span id="pg-badge-count" style="background:rgba(16,185,129,0.2); color:#a7f3d0; padding:2px 8px; border-radius:12px; font-size:10px; font-family:monospace;">${sessionMaskedCount} Maskeli · ${sessionBlockedCount} Engelli</span>
    `;

    if (!document.getElementById('pg-keyframes')) {
      const style = document.createElement('style');
      style.id = 'pg-keyframes';
      style.textContent = `
        @keyframes pg-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.15); }
        }
      `;
      document.head?.appendChild(style);
    }

    badge.title = 'PromptGuard Enterprise DLP Koruması Aktif (CISO Dashboard için tıklayın)';
    badge.onclick = () => window.open('http://localhost:5174/', '_blank');
    badge.onmouseenter = () => { badge.style.transform = 'translateY(-2px) scale(1.03)'; };
    badge.onmouseleave = () => { badge.style.transform = 'translateY(0) scale(1)'; };
    
    document.body.appendChild(badge);
  }

  // Floating Positioned Banner over Input Area (Safe, attached to body)
  function updateFloatingToolbar() {
    if (!document.body) return;
    const inputEl = document.querySelector('#prompt-textarea') || document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea');
    if (!inputEl) {
      const tb = document.getElementById('promptguard-float-toolbar');
      if (tb) tb.style.display = 'none';
      return;
    }

    let text = inputEl.isContentEditable ? (inputEl.innerText || inputEl.textContent || '') : (inputEl.value || '');
    const { sanitized, foundCount, detectedTypes, blocked, blockedTypes } = sanitizeText(text);

    let toolbar = document.getElementById('promptguard-float-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'promptguard-float-toolbar';
      toolbar.style.cssText = `
        position: fixed;
        z-index: 2147483645;
        background: linear-gradient(135deg, rgba(6, 78, 59, 0.96), rgba(15, 23, 42, 0.96));
        backdrop-filter: blur(12px);
        border: 1px solid #10b981;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(16, 185, 129, 0.3);
        border-radius: 10px;
        padding: 8px 14px;
        display: none;
        align-items: center;
        gap: 12px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 12px;
        color: #ecfdf5;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      `;
      document.body.appendChild(toolbar);
    }

    // Rebound on every pass: the handler must see the current draft, not the
    // one that existed when the toolbar was first created.
    toolbar.onclick = () => {
      if (!blocked) applyMaskToEditor(inputEl, sanitized);
    };

    if (blocked || foundCount > 0) {
      const rect = inputEl.getBoundingClientRect();
      if (rect.top > 0) {
        toolbar.style.left = `${Math.max(16, rect.left)}px`;
        toolbar.style.top = `${Math.max(10, rect.top - 48)}px`;
        toolbar.style.display = 'flex';
        toolbar.style.borderColor = blocked ? '#f43f5e' : '#10b981';
        toolbar.innerHTML = blocked
          ? `
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:15px;">⛔</span>
            <span><b>Gönderim engellenecek:</b> <span style="color:#fda4af; font-weight:normal;">${blockedTypes.join(', ')}</span></span>
          </div>
        `
          : `
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:15px;">🛡️</span>
            <span><b>${foundCount} Hassas Veri Algılandı:</b> <span style="color:#6ee7b7; font-weight:normal;">${detectedTypes.join(', ')}</span></span>
          </div>
          <button style="background:#10b981; color:#022c22; border:none; padding:4px 12px; border-radius:6px; font-weight:700; font-size:11px; cursor:pointer; box-shadow:0 2px 6px rgba(16,185,129,0.4);">
            ⚡ Şimdi Maskele
          </button>
        `;
      }
    } else {
      toolbar.style.display = 'none';
    }
  }

  function applyMaskToEditor(el, sanitized) {
    if (!el) return;
    try {
      el.focus();
      document.execCommand('selectAll', false, null);
      document.execCommand('insertText', false, sanitized);
    } catch {}

    const tb = document.getElementById('promptguard-float-toolbar');
    if (tb) tb.style.display = 'none';
  }

  // ========================================================
  // 1. OUTBOUND NETWORK PROXY (fetch + XHR)
  // ========================================================

  class PromptGuardBlockedError extends Error {}

  /**
   * Inspects an outbound payload. Returns the payload to send, or throws
   * PromptGuardBlockedError when policy forbids the request entirely.
   */
  function inspectOutbound(bodyText) {
    const { sanitized, foundCount, detectedTypes, blocked, blockedTypes, findings } = sanitizeText(bodyText);

    if (blocked) {
      sessionBlockedCount++;
      showBlockNotice(blockedTypes);
      emitAuditEvent('BLOCKED', findings, bodyText);
      console.warn('[PromptGuard Proxy] Outbound request blocked:', blockedTypes);
      throw new PromptGuardBlockedError(
        'PromptGuard Gateway blocked this request: ' + blockedTypes.join(', ')
      );
    }

    if (foundCount > 0) {
      sessionMaskedCount += foundCount;
      updateBadgeText();
      showToast(foundCount, detectedTypes);
      emitAuditEvent('MASKED', findings, bodyText);
      console.log('%c[PromptGuard Proxy]%c Outgoing payload sanitized (' + foundCount + ' items masked):', 'color: #10b981; font-weight: bold;', '', detectedTypes);
    }

    return sanitized;
  }

  const originalFetch = window.fetch;
  window.fetch = async function(...args) {
    let resource = args[0];
    const config = args[1] || {};

    if (config && typeof config.body === 'string') {
      config.body = inspectOutbound(config.body);
      args[1] = config;
    } else if (resource instanceof Request && resource.body) {
      let bodyText = null;
      try {
        bodyText = await resource.clone().text();
      } catch {
        // Streamed or already-consumed bodies cannot be inspected; let them through.
      }
      if (bodyText) {
        resource = new Request(resource, { body: inspectOutbound(bodyText) });
        args[0] = resource;
      }
    }

    const response = await originalFetch.apply(this, args);

    // Detokenize streaming response on the fly
    try {
      if (vault.size > 0 && response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        const transformedStream = new ReadableStream({
          async start(controller) {
            function push() {
              reader.read().then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                const chunkText = decoder.decode(value, { stream: true });
                controller.enqueue(encoder.encode(restoreTokens(chunkText)));
                push();
              }).catch(err => controller.error(err));
            }
            push();
          }
        });

        return new Response(transformedStream, {
          headers: response.headers,
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch {}

    return response;
  };

  // Some AI consoles still submit over XHR, which bypasses the fetch proxy entirely.
  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function(body) {
    if (typeof body === 'string' && body.trim()) {
      let inspected;
      try {
        inspected = inspectOutbound(body);
      } catch (err) {
        if (err instanceof PromptGuardBlockedError) {
          this.abort();
          return;
        }
        throw err;
      }
      return originalXhrSend.call(this, inspected);
    }
    return originalXhrSend.call(this, body);
  };

  // ========================================================
  // 2. INPUT LISTENERS
  // ========================================================
  let debounceTimer = null;
  document.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateFloatingToolbar, 100);
  }, true);

  document.addEventListener('keyup', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updateFloatingToolbar, 100);
  }, true);

  document.addEventListener('paste', () => {
    setTimeout(updateFloatingToolbar, 50);
  }, true);

  // ========================================================
  // 3. DETOKENIZATION OBSERVER (DOM Text Stream)
  // ========================================================
  // Re-hydration belongs in the reading area only. Restoring inside the composer
  // visibly undoes the mask the user just applied, and puts the raw value back
  // where the page will pick it up again on the next submission.
  const NO_RESTORE_SELECTOR = [
    'textarea',
    'input',
    '[contenteditable]:not([contenteditable="false"])',
    '[id^="promptguard-"]'
  ].join(', ');

  function isRestoreForbidden(node) {
    const el = node.parentElement;
    return !el || el.closest(NO_RESTORE_SELECTOR) !== null;
  }

  const observer = new MutationObserver(() => {
    if (vault.size === 0) return;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.includes('[') && !isRestoreForbidden(node)) {
        vault.forEach((val, tok) => {
          if (node.nodeValue.includes(tok)) {
            node.nodeValue = node.nodeValue.split(tok).join(val);
          }
        });
      }
    }
  });

  // Initialization
  function init() {
    injectBadge();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    window.addEventListener('DOMContentLoaded', init);
  }

  setInterval(() => {
    injectBadge();
    updateFloatingToolbar();
  }, 1500);
})();
