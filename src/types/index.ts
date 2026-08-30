export type EntityCategory = 'PII' | 'SECRET' | 'FINANCIAL' | 'HIPAA_PHI' | 'SOURCE_CODE' | 'PROMPT_INJECTION';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type EnforcementAction = 'MASKED' | 'BLOCKED' | 'ANONYMIZED' | 'ALLOWED';

export interface DetectedEntity {
  id: string;
  category: EntityCategory;
  type: string;
  originalValue: string;
  syntheticToken: string;
  confidence: number;
  start: number;
  end: number;
  riskLevel: RiskLevel;
  actionTaken: EnforcementAction;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: {
    name: string;
    email: string;
    department: 'Engineering' | 'Finance' | 'Healthcare / Clinical' | 'Sales & Marketing' | 'Legal & HR' | 'Executive';
    role: string;
    avatar: string;
  };
  aiTool: 'ChatGPT-4o' | 'Claude 3.5 Sonnet' | 'Perplexity Pro' | 'GitHub Copilot' | 'Cursor AI' | 'DeepSeek-V3';
  promptRaw: string;
  promptSanitized: string;
  llmResponseRaw?: string;
  llmResponseDeTokenized?: string;
  entitiesFound: DetectedEntity[];
  status: EnforcementAction;
  /** Position in the append-only ledger. */
  sequence: number;
  /** SHA-256 of the raw prompt. The prompt itself is never committed to the ledger. */
  promptDigest: string;
  /** SHA-256 leaf over the canonical, plaintext-free record. */
  leafHash: string;
  prevHash: string;
  /** Chained entry hash: SHA-256(prevHash || leafHash). */
  sha256Hash: string;
  latencyMs: number;
  complianceFlags: string[];
}

export interface PolicyRule {
  id: string;
  name: string;
  category: EntityCategory;
  enabled: boolean;
  action: 'MASK' | 'BLOCK' | 'HASH' | 'LOG_ONLY';
  riskLevel: RiskLevel;
  description: string;
  patternsCount: number;
  totalIntercepted: number;
  soc2Control: string;
  hipaaControl?: string;
  owaspControl?: string;
}

export interface CustomDlpRule {
  id: string;
  name: string;
  category: EntityCategory;
  patternString: string;
  isRegex: boolean;
  riskLevel: RiskLevel;
  action: EnforcementAction;
  tokenPrefix: string;
  enabled: boolean;
}

export interface TamperSimulationState {
  isTampered: boolean;
  tamperedSequence: number | null;
  originalValue: string | null;
  corruptedValue: string | null;
  detectedAtSequence: number | null;
}

export interface DepartmentMetric {
  department: string;
  userCount: number;
  promptVolume: number;
  leakAttemptsBlocked: number;
  riskScore: number;
  topAiTool: string;
  trend: 'up' | 'down' | 'stable';
}

export interface ComplianceControl {
  id: string;
  framework: 'SOC 2 Type II' | 'HIPAA Security Rule' | 'GDPR' | 'ISO 27001' | 'OWASP Top 10 for LLM' | 'MITRE ATLAS';
  code: string;
  title: string;
  description: string;
  status: 'COMPLIANT' | 'WARNING' | 'AUDIT_READY';
  evidenceHash: string;
  lastVerified: string;
  coveragePct: number;
  policyMapped: string;
}

export interface SimulationScenario {
  id: string;
  title: string;
  category: EntityCategory;
  description: string;
  prompt: string;
  badgeText: string;
  department: AuditLog['user']['department'];
  simulatedAiResponse: (cleanPrompt: string) => string;
}

/** An audit record before the ledger assigns its cryptographic fields. */
export type UncommittedAuditLog = Omit<AuditLog, 'sequence' | 'promptDigest' | 'leafHash' | 'prevHash' | 'sha256Hash'>;

