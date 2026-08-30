import { DetectedEntity, EntityCategory, RiskLevel, EnforcementAction, CustomDlpRule } from '../types';

// Luhn algorithm for valid credit cards
function isValidLuhn(digits: string): boolean {
  const clean = digits.replace(/[\s-]/g, '');
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

// Turkish Republic ID (TCKN) validation
function isValidTCKN(tckn: string): boolean {
  if (!/^[1-9]\d{10}$/.test(tckn)) return false;
  const digits = tckn.split('').map(Number);
  const oddSum = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
  const evenSum = digits[1] + digits[3] + digits[5] + digits[7];
  const d10 = (((oddSum * 7) - evenSum) % 10 + 10) % 10;
  if (d10 !== digits[9]) return false;
  const first10Sum = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  return first10Sum % 10 === digits[10];
}

export interface DetectionRule {
  id: string;
  category: EntityCategory;
  type: string;
  pattern: RegExp;
  riskLevel: RiskLevel;
  validator?: (match: string) => boolean;
  tokenPrefix: string;
  defaultAction: EnforcementAction;
}

export const DETECTION_RULES: DetectionRule[] = [
  // 1. Secrets & Credentials
  {
    id: 'sec_aws_key',
    category: 'SECRET',
    type: 'AWS Access Key ID',
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'AWS_ACCESS_KEY_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'sec_openai_key',
    category: 'SECRET',
    type: 'OpenAI API Secret Key',
    pattern: /\b(sk-proj-[A-Za-z0-9_-]{32,}|sk-[A-Za-z0-9]{32,})\b/g,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'OPENAI_API_KEY_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'sec_github_pat',
    category: 'SECRET',
    type: 'GitHub Personal Access Token',
    pattern: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,})\b/g,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'GITHUB_PAT_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'sec_anthropic_key',
    category: 'SECRET',
    type: 'Anthropic Claude Secret Key',
    pattern: /\b(sk-ant-[A-Za-z0-9_-]{32,})\b/g,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'ANTHROPIC_KEY_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'sec_private_key',
    category: 'SECRET',
    type: 'RSA/SSH Cryptographic Private Key',
    pattern: /-----BEGIN (?:RSA|EC|DSA|OPENSSH)? ?PRIVATE KEY-----[\s\S]*?-----END (?:RSA|EC|DSA|OPENSSH)? ?PRIVATE KEY-----/g,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'PRIVATE_KEY_BLOCK_TOKEN',
    defaultAction: 'BLOCKED',
  },
  {
    id: 'sec_db_conn',
    category: 'SECRET',
    type: 'Database Connection URI with Credentials',
    pattern: /\b(?:postgres|postgresql|mysql|mongodb(?:\+srv)?|redis):\/\/[a-zA-Z0-9_-]+:[^@\s]+@[a-zA-Z0-9_.-]+:[0-9]+\/[a-zA-Z0-9_-]+/g,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'DB_CONNECTION_STRING_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'sec_jwt',
    category: 'SECRET',
    type: 'JSON Web Token (JWT)',
    pattern: /\beyJ[A-Za-z0-9-_=]{10,}\.eyJ[A-Za-z0-9-_=]{10,}\.[A-Za-z0-9-_.+/=]{10,}\b/g,
    riskLevel: 'HIGH',
    tokenPrefix: 'JWT_AUTH_TOKEN',
    defaultAction: 'MASKED',
  },

  // 2. Personally Identifiable Information (PII)
  {
    id: 'pii_us_ssn',
    category: 'PII',
    type: 'US Social Security Number (SSN)',
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'US_SSN_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'pii_tr_tckn',
    category: 'PII',
    type: 'Turkish National ID (TC Kimlik No)',
    pattern: /\b[1-9]\d{10}\b/g,
    validator: isValidTCKN,
    riskLevel: 'HIGH',
    tokenPrefix: 'TR_TCKN_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'pii_credit_card',
    category: 'PII',
    type: 'Credit Card Number (Visa / MC / Amex)',
    pattern: /\b(?:\d{4}[ -]?){3}\d{4}\b|\b3[47]\d{2}[ -]?\d{6}[ -]?\d{5}\b/g,
    validator: isValidLuhn,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'CREDIT_CARD_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'pii_iban',
    category: 'PII',
    type: 'International Bank Account (IBAN)',
    pattern: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g,
    riskLevel: 'HIGH',
    tokenPrefix: 'IBAN_SECURE_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'pii_email',
    category: 'PII',
    type: 'Corporate / Personal Email Address',
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    riskLevel: 'MEDIUM',
    tokenPrefix: 'EMAIL_ANON_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'pii_phone',
    category: 'PII',
    type: 'Direct Phone Number',
    pattern: /(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}|\b\+?90[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{2}[-.\s]?\d{2}\b/g,
    riskLevel: 'MEDIUM',
    tokenPrefix: 'PHONE_SECURE_TOKEN',
    defaultAction: 'MASKED',
  },

  // 3. HIPAA PHI (Protected Health Information)
  {
    id: 'hipaa_mrn',
    category: 'HIPAA_PHI',
    type: 'Medical Record Number (MRN)',
    pattern: /\b(?:MRN|MR#|Patient ID|Record ID)[:\s#-]*([A-Z0-9]{6,10})\b/gi,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'HIPAA_MRN_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'hipaa_patient_name',
    category: 'HIPAA_PHI',
    type: 'Patient Identifiable Record',
    pattern: /(?:Patient|Hasta|Patient Name|Case)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'PATIENT_NAME_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'hipaa_icd10',
    category: 'HIPAA_PHI',
    type: 'ICD-10 Diagnostic Health Code',
    pattern: /\b(?:ICD-10|Diagnosis Code|Diagnostic Code)[:\s]*([A-TV-Z][0-9][0-9AB](?:\.[0-9A-KXZ]{1,4})?)\b/gi,
    riskLevel: 'HIGH',
    tokenPrefix: 'ICD10_CODE_TOKEN',
    defaultAction: 'MASKED',
  },

  // 4. Financial & Confidential Corporate Metrics
  {
    id: 'fin_confidential_rev',
    category: 'FINANCIAL',
    type: 'Unreleased Financial Revenue / EBITDA / ARR',
    pattern: /(?:Q[1-4]\s*(?:Revenue|EBITDA|ARR|MRR|Net Income)|FY2[4-9]\s*(?:Projections|Guidance|EBITDA))[:\s]*\$?\d+(?:\.\d+)?(?:\s*(?:Million|Billion|M|B|k|K|USD))?/gi,
    riskLevel: 'HIGH',
    tokenPrefix: 'CONFIDENTIAL_FINANCIAL_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'fin_deal_amount',
    category: 'FINANCIAL',
    type: 'M&A / Acquisition Valuation Metric',
    pattern: /(?:Acquisition price|Valuation target|Series [A-E] valuation|Term sheet value)[:\s]*\$?\d+(?:\.\d+)?\s*(?:Million|Billion|M|B)/gi,
    riskLevel: 'HIGH',
    tokenPrefix: 'MA_VALUATION_TOKEN',
    defaultAction: 'MASKED',
  },

  // 5. Proprietary Source Code & Infrastructure
  {
    id: 'code_internal_endpoint',
    category: 'SOURCE_CODE',
    type: 'Internal Corporate Infrastructure Hostname',
    pattern: /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:corp\.internal|prod\.internal|internal-api\.company|staging-vpc\.internal)[^\s"']*/gi,
    riskLevel: 'MEDIUM',
    tokenPrefix: 'INTERNAL_ENDPOINT_TOKEN',
    defaultAction: 'MASKED',
  },
  {
    id: 'code_sql_dump',
    category: 'SOURCE_CODE',
    type: 'Proprietary SQL Schema / Dump',
    pattern: /INSERT INTO\s+[`"']?[a-zA-Z0-9_]+[`"']?\s*\([^)]+\)\s*VALUES\s*\([^)]+\);/gi,
    riskLevel: 'HIGH',
    tokenPrefix: 'PROPRIETARY_SQL_TOKEN',
    defaultAction: 'MASKED',
  },

  // 6. OWASP LLM01: Prompt Injection & Jailbreak Defense
  {
    id: 'inj_ignore_instructions',
    category: 'PROMPT_INJECTION',
    type: 'Prompt Injection: Instruction Override',
    pattern: /\b(?:ignore|disregard|forget|skip|override)\s+(?:all\s+)?(?:previous|prior|above|existing)\s+(?:instructions|prompts|rules|directives|constraints|system\s+message)\b/gi,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'PROMPT_INJECTION_BLOCK',
    defaultAction: 'BLOCKED',
  },
  {
    id: 'inj_jailbreak_dan',
    category: 'PROMPT_INJECTION',
    type: 'Jailbreak: Persona Hijacking / DAN Mode',
    pattern: /\b(?:DAN\s+mode|jailbreak(?:ed)?|developer\s+mode\s+(?:v\d+|enabled)|do\s+anything\s+now|unfiltered\s+mode|bypass\s+(?:safety|guardrails)|no\s+ethical\s+guidelines)\b/gi,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'JAILBREAK_ATTEMPT_BLOCK',
    defaultAction: 'BLOCKED',
  },
  {
    id: 'inj_system_leak',
    category: 'PROMPT_INJECTION',
    type: 'System Prompt Extraction Attempt',
    pattern: /\b(?:(?:repeat|reveal|output|display|show|dump|print|expose)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|system\s+message|secret\s+prompt|meta\s+prompt|guardrail\s+rules))\b/gi,
    riskLevel: 'HIGH',
    tokenPrefix: 'SYSTEM_PROMPT_LEAK_BLOCK',
    defaultAction: 'BLOCKED',
  },
  {
    id: 'inj_special_tokens',
    category: 'PROMPT_INJECTION',
    type: 'LLM Control Token / Delimiter Attack',
    pattern: /(?:<\|im_start\|>system|<\|endoftext\|>|\[SYSTEM_PROMPT\]|\[INST\][\s\S]*?\[\/INST\]|###\s*System:)/gi,
    riskLevel: 'CRITICAL',
    tokenPrefix: 'DELIMITER_ATTACK_BLOCK',
    defaultAction: 'BLOCKED',
  },
  {
    id: 'inj_hidden_payload',
    category: 'PROMPT_INJECTION',
    type: 'Hidden HTML / Markdown Delimiter Injection',
    pattern: /(?:<!--\s*(?:instruction|system|ignore|bypass)[\s\S]*?-->|<\s*hidden\s*>[\s\S]*?<\s*\/hidden\s*>)/gi,
    riskLevel: 'HIGH',
    tokenPrefix: 'HIDDEN_DELIMITER_BLOCK',
    defaultAction: 'BLOCKED',
  }
];

export interface ScanOptions {
  customKeywords?: string[];
  customRules?: CustomDlpRule[];
  disabledRuleIds?: string[];
  categoryActions?: Record<string, EnforcementAction>;
}

export interface ScanResult {
  entities: DetectedEntity[];
  hasCritical: boolean;
  hasBlock: boolean;
  totalFound: number;
}

export function scanPrompt(prompt: string, options?: ScanOptions): ScanResult {
  const entities: DetectedEntity[] = [];
  const disabledSet = new Set(options?.disabledRuleIds || []);

  // 1. Scan standard built-in rules
  DETECTION_RULES.forEach(rule => {
    if (disabledSet.has(rule.id)) return;

    // Reset regex state
    rule.pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rule.pattern.exec(prompt)) !== null) {
      const fullMatch = match[0];
      const start = match.index;
      const end = start + fullMatch.length;

      // Run custom validator if any (e.g. Luhn, TCKN)
      if (rule.validator && !rule.validator(fullMatch)) {
        continue;
      }

      // Avoid duplicate overlapping spans
      const overlaps = entities.some(e => 
        (start >= e.start && start < e.end) || (end > e.start && end <= e.end)
      );

      if (!overlaps) {
        const id = `det_${Math.random().toString(36).substring(2, 9)}`;
        const shortHash = Math.abs(start * 31 + end * 17).toString(16).slice(0, 4).toUpperCase();
        const syntheticToken = `[${rule.tokenPrefix}_${shortHash}]`;

        let action = rule.defaultAction;
        if (options?.categoryActions && options.categoryActions[rule.category]) {
          action = options.categoryActions[rule.category];
        }

        entities.push({
          id,
          category: rule.category,
          type: rule.type,
          originalValue: fullMatch,
          syntheticToken,
          confidence: rule.validator ? 0.99 : 0.96,
          start,
          end,
          riskLevel: rule.riskLevel,
          actionTaken: action,
        });
      }
    }
  });

  // 2. Scan dynamic custom rules
  if (options?.customRules && options.customRules.length > 0) {
    options.customRules.forEach(rule => {
      if (!rule.enabled || disabledSet.has(rule.id)) return;
      try {
        const regex = rule.isRegex
          ? new RegExp(rule.patternString, 'gi')
          : new RegExp(rule.patternString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');

        let match: RegExpExecArray | null;
        while ((match = regex.exec(prompt)) !== null) {
          const fullMatch = match[0];
          const start = match.index;
          const end = start + fullMatch.length;

          const overlaps = entities.some(e => 
            (start >= e.start && start < e.end) || (end > e.start && end <= e.end)
          );

          if (!overlaps) {
            const id = `det_cust_${Math.random().toString(36).substring(2, 9)}`;
            const shortHash = Math.abs(start * 37 + end * 19).toString(16).slice(0, 4).toUpperCase();
            const prefix = rule.tokenPrefix || 'CUSTOM_TOKEN';
            const syntheticToken = `[${prefix}_${shortHash}]`;

            let action = rule.action;
            if (options?.categoryActions && options.categoryActions[rule.category]) {
              action = options.categoryActions[rule.category];
            }

            entities.push({
              id,
              category: rule.category,
              type: rule.name || 'Custom DLP Match',
              originalValue: fullMatch,
              syntheticToken,
              confidence: 0.98,
              start,
              end,
              riskLevel: rule.riskLevel,
              actionTaken: action,
            });
          }
        }
      } catch {
        // Ignore invalid custom regex
      }
    });
  }

  // 3. Scan custom keyword dictionaries
  if (options?.customKeywords && options.customKeywords.length > 0) {
    options.customKeywords.forEach(kw => {
      if (!kw || !kw.trim()) return;
      const cleanKw = kw.trim();
      const kwRegex = new RegExp(`\\b${cleanKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      let match: RegExpExecArray | null;

      while ((match = kwRegex.exec(prompt)) !== null) {
        const fullMatch = match[0];
        const start = match.index;
        const end = start + fullMatch.length;

        const overlaps = entities.some(e => 
          (start >= e.start && start < e.end) || (end > e.start && end <= e.end)
        );

        if (!overlaps) {
          const id = `det_kw_${Math.random().toString(36).substring(2, 9)}`;
          const kwSlug = cleanKw.replace(/[^A-Za-z0-9]/g, '_').toUpperCase().slice(0, 12);
          const shortHash = Math.abs(start * 43 + end * 23).toString(16).slice(0, 4).toUpperCase();
          const syntheticToken = `[CONFIDENTIAL_PROJECT_${kwSlug}_${shortHash}]`;

          let action: EnforcementAction = 'MASKED';
          if (options?.categoryActions && options.categoryActions['SOURCE_CODE']) {
            action = options.categoryActions['SOURCE_CODE'];
          }

          entities.push({
            id,
            category: 'SOURCE_CODE',
            type: `Proprietary Enterprise Keyword: ${cleanKw}`,
            originalValue: fullMatch,
            syntheticToken,
            confidence: 0.99,
            start,
            end,
            riskLevel: 'HIGH',
            actionTaken: action,
          });
        }
      }
    });
  }

  // Sort by start index
  entities.sort((a, b) => a.start - b.start);

  const hasCritical = entities.some(e => e.riskLevel === 'CRITICAL');
  const hasBlock = entities.some(e => e.actionTaken === 'BLOCKED');

  return {
    entities,
    hasCritical,
    hasBlock,
    totalFound: entities.length
  };
}
