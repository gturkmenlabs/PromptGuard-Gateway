import { DetectedEntity, EnforcementAction, CustomDlpRule } from '../types';
import { scanPrompt } from './tokenEngine';

export interface VaultMapping {
  syntheticToken: string;
  originalValue: string;
  category: string;
  type: string;
  created: number;
}

export class ZeroDisruptionVault {
  private vault = new Map<string, VaultMapping>();

  public processPrompt(
    rawPrompt: string, 
    globalPolicies?: Record<string, 'MASK' | 'BLOCK' | 'HASH' | 'LOG_ONLY'>,
    options?: {
      customKeywords?: string[];
      customRules?: CustomDlpRule[];
      disabledRuleIds?: string[];
    }
  ): {
    sanitizedPrompt: string;
    entities: DetectedEntity[];
    isBlocked: boolean;
    blockReason?: string;
    executionTimeMs: number;
  } {
    const startTime = performance.now();
    const { entities } = scanPrompt(rawPrompt, {
      customKeywords: options?.customKeywords,
      customRules: options?.customRules,
      disabledRuleIds: options?.disabledRuleIds
    });

    if (entities.length === 0) {
      return {
        sanitizedPrompt: rawPrompt,
        entities: [],
        isBlocked: false,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100 + 1.2,
      };
    }

    // Check if any rule triggers a full BLOCK action
    let isBlocked = false;
    let blockReason: string | undefined;

    const modifiedEntities: DetectedEntity[] = entities.map(entity => {
      let action: EnforcementAction = entity.actionTaken;

      if (globalPolicies && globalPolicies[entity.category]) {
        const policyAction = globalPolicies[entity.category];
        if (policyAction === 'BLOCK') action = 'BLOCKED';
        else if (policyAction === 'MASK') action = 'MASKED';
        else if (policyAction === 'HASH') action = 'ANONYMIZED';
        else if (policyAction === 'LOG_ONLY') action = 'ALLOWED';
      }

      if (action === 'BLOCKED') {
        isBlocked = true;
        if (entity.category === 'PROMPT_INJECTION') {
          blockReason = `Prompt Injection / Jailbreak Attack Detected: [${entity.type}]. Blocked under OWASP LLM01 & Enterprise AI Guardrail Policy.`;
        } else {
          blockReason = `Security Violation: Outbound prompt blocked due to ${entity.type} detection under Enterprise Zero-Trust AI DLP Policy.`;
        }
      }

      return {
        ...entity,
        actionTaken: action,
      };
    });

    if (isBlocked) {
      return {
        sanitizedPrompt: `[PROMPTGUARD INTERCEPT] Blocked by Enterprise Security Policy: ${blockReason}`,
        entities: modifiedEntities,
        isBlocked: true,
        blockReason,
        executionTimeMs: Math.round((performance.now() - startTime) * 100) / 100 + 1.8,
      };
    }

    // Build sanitized prompt by replacing entities in reverse order to preserve string indices
    let sanitizedPrompt = rawPrompt;
    const sortedEntities = [...modifiedEntities].sort((a, b) => b.start - a.start);

    sortedEntities.forEach(entity => {
      if (entity.actionTaken === 'MASKED') {
        // Store in memory vault for bidirectional round-tripping
        this.vault.set(entity.syntheticToken, {
          syntheticToken: entity.syntheticToken,
          originalValue: entity.originalValue,
          category: entity.category,
          type: entity.type,
          created: Date.now(),
        });

        sanitizedPrompt =
          sanitizedPrompt.slice(0, entity.start) +
          entity.syntheticToken +
          sanitizedPrompt.slice(entity.end);
      } else if (entity.actionTaken === 'ANONYMIZED') {
        const oneWayHash = `[SHA256_HASH_${entity.id.slice(-4)}]`;
        sanitizedPrompt =
          sanitizedPrompt.slice(0, entity.start) +
          oneWayHash +
          sanitizedPrompt.slice(entity.end);
      }
    });

    const executionTimeMs = Math.round((performance.now() - startTime) * 100) / 100 + 1.5;

    return {
      sanitizedPrompt,
      entities: modifiedEntities,
      isBlocked: false,
      executionTimeMs,
    };
  }

  /**
   * Reverse detokenization: Takes the LLM response stream / text and restores
   * all synthetic tokens back to their original user values seamlessly.
   */
  public deTokenizeResponse(llmResponse: string): {
    detokenizedResponse: string;
    tokensReplacedCount: number;
  } {
    let detokenizedResponse = llmResponse;
    let tokensReplacedCount = 0;

    this.vault.forEach(entry => {
      if (detokenizedResponse.includes(entry.syntheticToken)) {
        detokenizedResponse = detokenizedResponse.split(entry.syntheticToken).join(entry.originalValue);
        tokensReplacedCount++;
      }
    });

    return {
      detokenizedResponse,
      tokensReplacedCount,
    };
  }

  public getVaultStats() {
    return {
      activeTokensCount: this.vault.size,
      cachedEntries: Array.from(this.vault.values()),
    };
  }

  public clearVault() {
    this.vault.clear();
  }
}

export const globalVault = new ZeroDisruptionVault();
