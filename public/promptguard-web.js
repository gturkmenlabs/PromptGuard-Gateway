/**
 * PromptGuard Gateway — Universal Web SDK (Zero-Extension Drop-in)
 * Version: 2.4.0 (Enterprise)
 * 
 * Automatically protects web applications from PII/credential leaks and OWASP LLM01
 * Prompt Injections by intercepting outbound AI requests (fetch & XHR) in-flight.
 * 
 * Usage:
 *   <script src="http://localhost:9119/promptguard-web.js"></script>
 *   <!-- or from your own CDN/host: -->
 *   <script src="/promptguard-web.js"></script>
 */
(function (global) {
  'use strict';

  // ------------------------------------------------------------
  // 1. In-Memory Ephemeral Synthetic Vault (Client-Side Only)
  // ------------------------------------------------------------
  class SyntheticVault {
    constructor() {
      this.tokenToOriginal = new Map();
      this.originalToToken = new Map();
      this.counters = { masked: 0, blocked: 0 };
    }

    tokenize(original, prefix) {
      if (this.originalToToken.has(original)) {
        return this.originalToToken.get(original);
      }
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const token = `[${prefix}_TOKEN_${randomSuffix}]`;
      this.tokenToOriginal.set(token, original);
      this.originalToToken.set(original, token);
      this.counters.masked++;
      return token;
    }

    detokenize(text) {
      if (typeof text !== 'string' || this.tokenToOriginal.size === 0) return text;
      let restored = text;
      for (const [token, original] of this.tokenToOriginal.entries()) {
        restored = restored.split(token).join(original);
      }
      return restored;
    }

    clear() {
      this.tokenToOriginal.clear();
      this.originalToToken.clear();
    }
  }

  const vault = new SyntheticVault();

  // ------------------------------------------------------------
  // 2. Core Detection & Verification Rules
  // ------------------------------------------------------------
  function isValidLuhn(value) {
    const clean = value.replace(/[\s-]/g, '');
    if (clean.length < 13 || clean.length > 19 || !/^\d+$/.test(clean)) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = clean.length - 1; i >= 0; i--) {
      let digit = parseInt(clean.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  function isValidTCKN(value) {
    if (!/^[1-9]\d{10}$/.test(value)) return false;
    const digits = value.split('').map(Number);
    const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
    const d10 = (((oddSum * 7) - evenSum) % 10 + 10) % 10;
    if (d10 !== digits[9]) return false;
    const first10Sum = digits.slice(0, 10).reduce((a, b) => a + b, 0);
    return first10Sum % 10 === digits[10];
  }

  const RULES = [
    // Prompt Injection & Jailbreak (OWASP LLM01) -> Default ACTION: BLOCK
    { id: 'inj_override', type: 'Prompt Injection: Instruction Override', category: 'PROMPT_INJECTION', action: 'BLOCK', prefix: 'PROMPT_INJECTION',
      regex: /\b(?:ignore|disregard|forget|skip|override)\s+(?:all\s+)?(?:previous|prior|above|existing)\s+(?:instructions|prompts|rules|directives|constraints)\b/gi },
    { id: 'inj_jailbreak', type: 'Jailbreak: Persona Hijack / DAN', category: 'PROMPT_INJECTION', action: 'BLOCK', prefix: 'JAILBREAK',
      regex: /\b(?:DAN\s+mode|jailbreak(?:ed)?|developer\s+mode\s+(?:v\d+|enabled)|do\s+anything\s+now|unfiltered\s+mode|bypass\s+(?:safety|guardrails))\b/gi },
    { id: 'inj_system_leak', type: 'System Prompt Extraction Attempt', category: 'PROMPT_INJECTION', action: 'BLOCK', prefix: 'SYSTEM_LEAK',
      regex: /\b(?:(?:repeat|reveal|output|display|show|dump|print)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|system\s+message|secret\s+prompt))\b/gi },
    { id: 'inj_control_tokens', type: 'Special Control Token Injection', category: 'PROMPT_INJECTION', action: 'BLOCK', prefix: 'CONTROL_TOKEN',
      regex: /<\|(?:im_start|im_end|endoftext|system|user|assistant)\|>/gi },

    // Credentials & Secrets -> Default ACTION: BLOCK
    { id: 'private_key', type: 'Cryptographic Private Key', category: 'SECRET', action: 'BLOCK', prefix: 'PRIVATE_KEY',
      regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH)? ?PRIVATE KEY-----[\s\S]*?-----END (?:RSA|EC|DSA|OPENSSH)? ?PRIVATE KEY-----/g },
    { id: 'db_uri', type: 'Database URI with Credentials', category: 'SECRET', action: 'BLOCK', prefix: 'DB_CONNECTION',
      regex: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[A-Za-z0-9_-]+:[^@\s]+@[A-Za-z0-9_.-]+(?::\d+)?\/[A-Za-z0-9_-]+/g },
    { id: 'aws_key', type: 'AWS Access Key', category: 'SECRET', action: 'BLOCK', prefix: 'AWS_ACCESS_KEY',
      regex: /\b(AKIA[0-9A-Z]{16})\b/g },
    { id: 'openai_key', type: 'OpenAI Secret Key', category: 'SECRET', action: 'BLOCK', prefix: 'OPENAI_API_KEY',
      regex: /\b(sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,})\b/g },
    { id: 'anthropic_key', type: 'Anthropic API Key', category: 'SECRET', action: 'BLOCK', prefix: 'ANTHROPIC_KEY',
      regex: /\b(sk-ant-[A-Za-z0-9_-]{20,})\b/g },
    { id: 'github_pat', type: 'GitHub Personal Access Token', category: 'SECRET', action: 'BLOCK', prefix: 'GITHUB_PAT',
      regex: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{30,})\b/g },
    
    // Masked Data (PII, Financial, PHI) -> Default ACTION: MASK
    { id: 'jwt', type: 'JWT Bearer Token', category: 'SECRET', action: 'MASK', prefix: 'JWT_BEARER',
      regex: /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g },
    { id: 'tckn', type: 'TR Kimlik No (TCKN)', category: 'PII', action: 'MASK', prefix: 'TR_TCKN',
      regex: /\b([1-9]\d{10})\b/g, validator: isValidTCKN },
    { id: 'us_ssn', type: 'US Social Security Number', category: 'PII', action: 'MASK', prefix: 'US_SSN',
      regex: /\b(\d{3}-\d{2}-\d{4})\b/g },
    { id: 'credit_card', type: 'Credit Card Number', category: 'FINANCIAL', action: 'MASK', prefix: 'CREDIT_CARD',
      regex: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b/g, validator: isValidLuhn },
    { id: 'iban', type: 'IBAN Bank Account', category: 'FINANCIAL', action: 'MASK', prefix: 'IBAN_SEC',
      regex: /\b([A-Z]{2}\d{2}[A-Z0-9]{11,28})\b/g },
    { id: 'phone', type: 'Phone Number', category: 'PII', action: 'MASK', prefix: 'PHONE_SEC',
      regex: /(?:\+?90[\s.-]?|0)?(5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2})\b/g },
    { id: 'email', type: 'Email Address', category: 'PII', action: 'MASK', prefix: 'EMAIL_SEC',
      regex: /\b([A-Za-z0-9._%+-]+@(?!openai\.com|chatgpt\.com|anthropic\.com|claude\.ai)[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g },
    { id: 'mrn', type: 'Medical Record Number (MRN)', category: 'HIPAA_PHI', action: 'MASK', prefix: 'HIPAA_MRN',
      regex: /\b(?:MRN|MR#|Patient ID|Hasta No)[:\s#-]*([A-Z0-9-]{5,12})\b/gi, captureGroup: 1 },
    { id: 'icd10', type: 'ICD-10 Diagnosis Code', category: 'HIPAA_PHI', action: 'MASK', prefix: 'ICD10_CODE',
      regex: /\b(?:ICD-10|Diagnosis Code|Tanı Kodu)[:\s]*([A-TV-Z][0-9][0-9AB](?:\.[0-9A-KXZ]{1,4})?)\b/gi, captureGroup: 1 },
    { id: 'unreleased_financials', type: 'Confidential Financial Revenue/EBITDA', category: 'FINANCIAL', action: 'MASK', prefix: 'CONFIDENTIAL_FINANCIAL',
      regex: /(?:Q[1-4]\s*(?:Revenue|EBITDA|ARR|MRR|Net Income)|FY2[4-9]\s*(?:Projections|Guidance|EBITDA))[:\s]*\$?\d+(?:\.\d+)?(?:\s*(?:Million|Billion|M|B|k|K|USD))?/gi }
  ];

  // ------------------------------------------------------------
  // 3. Inspection & Tokenization Pipeline
  // ------------------------------------------------------------
  function inspect(text) {
    const result = {
      original: text,
      sanitized: text,
      findings: [],
      blocked: false,
      blockReason: null
    };

    if (typeof text !== 'string' || !text.trim()) return result;

    let sanitized = text;

    for (const rule of RULES) {
      rule.regex.lastIndex = 0;
      let match;
      const matches = [];

      while ((match = rule.regex.exec(sanitized)) !== null) {
        const val = rule.captureGroup ? match[rule.captureGroup] : match[0];
        if (!val || val.length < 3) continue;
        if (val.startsWith('[') && val.endsWith(']')) continue;
        if (rule.validator && !rule.validator(val)) continue;
        matches.push(val);
      }

      if (matches.length === 0) continue;

      const uniqueMatches = Array.from(new Set(matches));

      for (const val of uniqueMatches) {
        result.findings.push({
          ruleId: rule.id,
          type: rule.type,
          category: rule.category,
          action: rule.action,
          value: val
        });

        if (rule.action === 'BLOCK') {
          result.blocked = true;
          result.blockReason = `PromptGuard Blocked: ${rule.type} detected.`;
          vault.counters.blocked++;
          updateBadge();
          return result;
        }

        if (rule.action === 'MASK') {
          const syntheticToken = vault.tokenize(val, rule.prefix);
          sanitized = sanitized.split(val).join(syntheticToken);
        }
      }
    }

    result.sanitized = sanitized;
    updateBadge();
    return result;
  }

  // ------------------------------------------------------------
  // 4. Automatic Network In-Flight Interception (fetch & XHR)
  // ------------------------------------------------------------
  function isAiEndpoint(url) {
    if (!url) return false;
    const str = String(url).toLowerCase();
    return (
      str.includes('api.openai.com') ||
      str.includes('api.anthropic.com') ||
      str.includes('/chat/completions') ||
      str.includes('/v1/chat') ||
      str.includes('/v1/completions') ||
      str.includes('/api/generate') ||
      str.includes('/api/chat') ||
      str.includes('claude.ai') ||
      str.includes('chatgpt.com') ||
      str.includes('perplexity.ai') ||
      str.includes('localhost:11434') // Ollama
    );
  }

  // Patch window.fetch
  if (typeof global.fetch === 'function') {
    const originalFetch = global.fetch;

    global.fetch = async function (resource, init) {
      let url = '';
      if (typeof resource === 'string') url = resource;
      else if (resource instanceof URL) url = resource.href;
      else if (resource && resource.url) url = resource.url;

      // Only inspect AI endpoints or any POST request sending JSON
      let bodyText = null;

      if (init && init.body && typeof init.body === 'string') {
        bodyText = init.body;
      } else if (resource instanceof Request && resource.body) {
        try {
          bodyText = await resource.clone().text();
        } catch {}
      }

      if (bodyText && (isAiEndpoint(url) || bodyText.includes('"prompt"') || bodyText.includes('"messages"'))) {
        try {
          const parsed = JSON.parse(bodyText);

          // Recursively sanitize all string values in messages/prompts
          function sanitizeObj(obj) {
            if (!obj) return obj;
            if (typeof obj === 'string') {
              const res = inspect(obj);
              if (res.blocked) throw new Error(`[PromptGuard Gateway Block] ${res.blockReason}`);
              return res.sanitized;
            }
            if (Array.isArray(obj)) return obj.map(sanitizeObj);
            if (typeof obj === 'object') {
              const out = {};
              for (const [k, v] of Object.entries(obj)) out[k] = sanitizeObj(v);
              return out;
            }
            return obj;
          }

          const sanitizedPayload = sanitizeObj(parsed);
          const newBody = JSON.stringify(sanitizedPayload);

          if (init) {
            init.body = newBody;
          } else if (resource instanceof Request) {
            resource = new Request(resource, { body: newBody });
          }
        } catch (e) {
          if (e.message && e.message.includes('[PromptGuard Gateway Block]')) {
            console.error('[PromptGuard]', e.message);
            return Promise.reject(e);
          }
        }
      }

      // Execute original fetch
      const response = await originalFetch.apply(this, arguments);

      // On response: detokenize stream or JSON seamlessly
      try {
        if (vault.tokenToOriginal.size > 0 && response.body && typeof response.body.getReader === 'function') {
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
                  const chunk = decoder.decode(value, { stream: true });
                  const restored = vault.detokenize(chunk);
                  controller.enqueue(encoder.encode(restored));
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
  }

  // ------------------------------------------------------------
  // 5. In-Page UI Floating Protection Badge
  // ------------------------------------------------------------
  let badgeEl = null;

  function createBadge() {
    if (document.getElementById('promptguard-web-badge')) return;

    badgeEl = document.createElement('div');
    badgeEl.id = 'promptguard-web-badge';
    badgeEl.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 11px;
      color: #e2e8f0;
      background: rgba(15, 23, 42, 0.94);
      border: 1px solid rgba(16, 185, 129, 0.4);
      border-radius: 12px;
      padding: 6px 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 0 15px rgba(16, 185, 129, 0.2);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
      transition: all 0.2s ease;
    `;

    badgeEl.innerHTML = `
      <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981; box-shadow:0 0 8px #10b981;"></span>
      <span style="font-weight:700; color:#fff; letter-spacing:0.3px;">PromptGuard Web Shield</span>
      <span style="color:#64748b;">|</span>
      <span id="pg-badge-stats" style="font-family:monospace; color:#34d399;">0 masked</span>
    `;

    badgeEl.title = "PromptGuard Zero-Extension DLP & Injection Gateway Active";

    badgeEl.addEventListener('mouseenter', () => {
      badgeEl.style.transform = 'translateY(-2px)';
      badgeEl.style.borderColor = '#10b981';
    });
    badgeEl.addEventListener('mouseleave', () => {
      badgeEl.style.transform = 'translateY(0)';
      badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    });

    document.body.appendChild(badgeEl);
  }

  function updateBadge() {
    const statsEl = document.getElementById('pg-badge-stats');
    if (statsEl) {
      statsEl.textContent = `${vault.counters.masked} masked · ${vault.counters.blocked} blocked`;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createBadge);
  } else {
    createBadge();
  }

  // ------------------------------------------------------------
  // 6. Public Global API (window.PromptGuard)
  // ------------------------------------------------------------
  global.PromptGuard = {
    version: '2.4.0-web',
    scan: inspect,
    protect: (text) => inspect(text).sanitized,
    detokenize: (text) => vault.detokenize(text),
    getVaultCounters: () => ({ ...vault.counters }),
    resetVault: () => vault.clear(),
    configure: (opts) => {
      if (opts && opts.hideBadge && badgeEl) {
        badgeEl.style.display = 'none';
      }
    }
  };

  console.log('🛡️ [PromptGuard Web SDK] Active. Client-side Zero-Knowledge DLP and Prompt Injection Defense initialized.');
})(typeof window !== 'undefined' ? window : this);
