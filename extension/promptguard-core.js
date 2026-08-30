// PromptGuard DLP core — shared detection, masking and policy decisions.
// Runs in the page (MAIN world) and is also loadable in a service worker.
(function (root) {
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

  // action: 'BLOCK' stops the request outright; 'MASK' swaps in a synthetic token.
  const RULES = [
    // Credentials — the ones that grant standing access are blocked, not masked,
    // because a masked key still means the employee pasted a live key into a browser tab.
    { id: 'private_key', type: 'RSA/SSH Private Key', category: 'SECRET', action: 'BLOCK', prefix: 'PRIVATE_KEY_BLOCK',
      regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH)? ?PRIVATE KEY-----[\s\S]*?-----END (?:RSA|EC|DSA|OPENSSH)? ?PRIVATE KEY-----/g },
    { id: 'db_uri', type: 'Database URI with Credentials', category: 'SECRET', action: 'BLOCK', prefix: 'DB_CONNECTION_STRING',
      regex: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[A-Za-z0-9_-]+:[^@\s]+@[A-Za-z0-9_.-]+(?::\d+)?\/[A-Za-z0-9_-]+/g },
    { id: 'aws_key', type: 'AWS Access Key', category: 'SECRET', action: 'BLOCK', prefix: 'AWS_ACCESS_KEY',
      regex: /\b(AKIA[0-9A-Z]{16})\b/g },
    { id: 'openai_key', type: 'OpenAI Secret Key', category: 'SECRET', action: 'BLOCK', prefix: 'OPENAI_API_KEY',
      regex: /\b(sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,})\b/g },
    { id: 'anthropic_key', type: 'Anthropic API Key', category: 'SECRET', action: 'BLOCK', prefix: 'ANTHROPIC_KEY',
      regex: /\b(sk-ant-[A-Za-z0-9_-]{20,})\b/g },
    { id: 'google_key', type: 'Google API Key', category: 'SECRET', action: 'BLOCK', prefix: 'GOOGLE_API_KEY',
      regex: /\b(AIza[0-9A-Za-z_-]{35})\b/g },
    { id: 'github_pat', type: 'GitHub PAT', category: 'SECRET', action: 'BLOCK', prefix: 'GITHUB_PAT',
      regex: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{30,})\b/g },
    { id: 'hf_token', type: 'HuggingFace Token', category: 'SECRET', action: 'BLOCK', prefix: 'HUGGINGFACE_KEY',
      regex: /\b(hf_[A-Za-z0-9]{34,})\b/g },
    { id: 'jwt', type: 'JWT Bearer Token', category: 'SECRET', action: 'MASK', prefix: 'JWT_BEARER',
      regex: /\b(eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/g },
    { id: 'inline_password', type: 'Inline Password / Secret', category: 'SECRET', action: 'MASK', prefix: 'SECRET_CRED',
      regex: /(?:password|şifre|parola|secret|passwd|token)\s*[:=]\s*["']?([^\s"',;]{4,})["']?/gi, captureGroup: 1 },

    // PII
    { id: 'tckn', type: 'TR Kimlik No (TCKN)', category: 'PII', action: 'MASK', prefix: 'TR_TCKN',
      regex: /\b([1-9]\d{10})\b/g, validator: isValidTCKN },
    { id: 'us_ssn', type: 'US SSN', category: 'PII', action: 'MASK', prefix: 'US_SSN',
      regex: /\b(\d{3}-\d{2}-\d{4})\b/g },
    { id: 'credit_card', type: 'Credit Card Number', category: 'FINANCIAL', action: 'MASK', prefix: 'CREDIT_CARD',
      regex: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b/g, validator: isValidLuhn },
    { id: 'iban', type: 'IBAN', category: 'FINANCIAL', action: 'MASK', prefix: 'IBAN_SEC',
      regex: /\b([A-Z]{2}\d{2}[A-Z0-9]{11,28})\b/g },
    { id: 'tr_phone', type: 'Telefon Numarası', category: 'PII', action: 'MASK', prefix: 'TR_PHONE',
      regex: /(?:\+?90[\s.-]?|0)?(5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2})\b/g },
    { id: 'email', type: 'E-posta Adresi', category: 'PII', action: 'MASK', prefix: 'EMAIL_SEC',
      regex: /\b([A-Za-z0-9._%+-]+@(?!openai\.com|chatgpt\.com|anthropic\.com|claude\.ai|google\.com|perplexity\.ai)[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g },

    // HIPAA PHI
    { id: 'mrn', type: 'Medical Record Number (MRN)', category: 'HIPAA_PHI', action: 'MASK', prefix: 'HIPAA_MRN',
      regex: /\b(?:MRN|MR#|Patient ID|Hasta No)[:\s#-]*([A-Z0-9-]{5,12})\b/gi, captureGroup: 1 },
    { id: 'icd10', type: 'ICD-10 Diagnosis Code', category: 'HIPAA_PHI', action: 'MASK', prefix: 'ICD10_CODE',
      regex: /\b(?:ICD-10|Diagnosis Code|Tanı Kodu)[:\s]*([A-TV-Z][0-9][0-9AB](?:\.[0-9A-KXZ]{1,4})?)\b/gi, captureGroup: 1 },

    // Confidential financials
    { id: 'unreleased_financials', type: 'Unreleased Financial Metric', category: 'FINANCIAL', action: 'MASK', prefix: 'CONFIDENTIAL_FINANCIAL',
      regex: /(?:Q[1-4]\s*(?:Revenue|EBITDA|ARR|MRR|Net Income)|FY2[4-9]\s*(?:Projections|Guidance|EBITDA))[:\s]*\$?\d+(?:\.\d+)?(?:\s*(?:Million|Billion|M|B|k|K|USD))?/gi },
    { id: 'ma_valuation', type: 'M&A / Valuation Figure', category: 'FINANCIAL', action: 'MASK', prefix: 'MA_VALUATION',
      regex: /(?:Acquisition price|Valuation target|Series [A-E] valuation|Term sheet value)[:\s]*\$?\d+(?:\.\d+)?\s*(?:Million|Billion|M|B)/gi },

    // Proprietary source & infrastructure
    { id: 'internal_host', type: 'Internal Infrastructure Hostname', category: 'SOURCE_CODE', action: 'MASK', prefix: 'INTERNAL_ENDPOINT',
      regex: /https?:\/\/(?:[A-Za-z0-9-]+\.)*(?:corp|prod|staging|internal)\.(?:internal|local|lan)[^\s"']*/gi },
    { id: 'sql_dump', type: 'Proprietary SQL Statement', category: 'SOURCE_CODE', action: 'MASK', prefix: 'PROPRIETARY_SQL',
      regex: /INSERT INTO\s+[`"']?[A-Za-z0-9_]+[`"']?\s*\([^)]+\)\s*VALUES\s*\([^)]+\);/gi },

    // Prompt Injection & Jailbreak (OWASP LLM01)
    { id: 'prompt_injection_override', type: 'Prompt Injection: Instruction Override', category: 'PROMPT_INJECTION', action: 'BLOCK', prefix: 'PROMPT_INJECTION_BLOCK',
      regex: /\b(?:ignore|disregard|forget|skip|override)\s+(?:all\s+)?(?:previous|prior|above|existing)\s+(?:instructions|prompts|rules|directives|constraints)\b/gi },
    { id: 'prompt_jailbreak_dan', type: 'Jailbreak: Persona Hijack / DAN', category: 'PROMPT_INJECTION', action: 'BLOCK', prefix: 'JAILBREAK_BLOCK',
      regex: /\b(?:DAN\s+mode|jailbreak(?:ed)?|developer\s+mode\s+(?:v\d+|enabled)|do\s+anything\s+now|unfiltered\s+mode|bypass\s+(?:safety|guardrails))\b/gi },
    { id: 'system_prompt_leak', type: 'System Prompt Extraction', category: 'PROMPT_INJECTION', action: 'BLOCK', prefix: 'SYSTEM_PROMPT_LEAK',
      regex: /\b(?:(?:repeat|reveal|output|display|show|dump|print)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|system\s+message|secret\s+prompt))\b/gi }
  ];

  /**
   * Scans text, replaces MASK matches with synthetic tokens and reports any
   * BLOCK match. Callers must not transmit the text when `blocked` is true.
   */
  function sanitize(text, vault) {
    const empty = { sanitized: text, findings: [], maskedCount: 0, blocked: false, blockedTypes: [] };
    if (typeof text !== 'string' || !text.trim()) return empty;

    let sanitized = text;
    const findings = [];
    const blockedTypes = [];
    let maskedCount = 0;

    for (const rule of RULES) {
      rule.regex.lastIndex = 0;
      let match;
      const hits = [];
      while ((match = rule.regex.exec(sanitized)) !== null) {
        const value = rule.captureGroup ? match[rule.captureGroup] : match[0];
        if (!value || value.length < 4) continue;
        if (value.startsWith('[') && value.endsWith(']')) continue;
        if (rule.validator && !rule.validator(value)) continue;
        hits.push(value);
      }
      if (hits.length === 0) continue;

      const seen = new Set();
      for (const value of hits) {
        if (seen.has(value)) continue;
        seen.add(value);
        findings.push({ ruleId: rule.id, type: rule.type, category: rule.category, action: rule.action });

        if (rule.action === 'BLOCK') {
          if (!blockedTypes.includes(rule.type)) blockedTypes.push(rule.type);
          continue;
        }
        const token = '[' + rule.prefix + '_' + Math.floor(1000 + Math.random() * 9000) + ']';
        if (vault) vault.set(token, value);
        sanitized = sanitized.split(value).join(token);
        maskedCount++;
      }
    }

    const blocked = blockedTypes.length > 0;
    return {
      // A blocked payload must never be forwarded, so it is not returned rewritten.
      sanitized: blocked ? text : sanitized,
      findings,
      maskedCount,
      blocked,
      blockedTypes,
      maskedTypes: findings.filter(f => f.action === 'MASK').map(f => f.type)
        .filter((t, i, a) => a.indexOf(t) === i)
    };
  }

  function restore(text, vault) {
    if (typeof text !== 'string' || !vault || vault.size === 0) return text;
    let restored = text;
    vault.forEach((value, token) => {
      if (restored.includes(token)) restored = restored.split(token).join(value);
    });
    return restored;
  }

  async function sha256Hex(message) {
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  root.PromptGuardCore = { RULES, sanitize, restore, sha256Hex, isValidLuhn, isValidTCKN };
})(typeof self !== 'undefined' ? self : this);
