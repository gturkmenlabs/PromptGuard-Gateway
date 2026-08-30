/**
 * Tamper-evident audit ledger.
 *
 * Two independent integrity primitives, both real SHA-256 (WebCrypto):
 *  - Hash chain: entryHash = H(prevHash || leafHash) proves append-only ordering.
 *  - Merkle tree: inclusion proofs let an auditor verify a single record against
 *    a published root without seeing any other record.
 *
 * No plaintext prompt ever enters the ledger; only its digest is committed.
 */

import { AuditLog, UncommittedAuditLog } from '../types';

export interface AuditRecordInput {
  id: string;
  timestampIso: string;
  actor: string;
  aiTool: string;
  action: string;
  entityTypes: string[];
  promptDigest: string;
  complianceFlags: string[];
}

export interface LedgerEntry {
  sequence: number;
  leafHash: string;
  prevHash: string;
  entryHash: string;
}

export interface MerkleProof {
  leafHash: string;
  siblings: Array<{ hash: string; side: 'left' | 'right' }>;
  root: string;
}

const GENESIS = '0'.repeat(64);

export async function sha256(message: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Deterministic serialization: field order and array order are fixed. */
export function canonicalRecord(input: AuditRecordInput): string {
  return JSON.stringify([
    input.id,
    input.timestampIso,
    input.actor,
    input.aiTool,
    input.action,
    [...input.entityTypes].sort(),
    input.promptDigest,
    [...input.complianceFlags].sort(),
  ]);
}

// Domain separation (RFC 6962 style) so a leaf can never be replayed as an inner node.
const leafHash = (data: string) => sha256('\x00' + data);
const nodeHash = (left: string, right: string) => sha256('\x01' + left + right);

async function buildLevels(leaves: string[]): Promise<string[][]> {
  if (leaves.length === 0) return [[GENESIS]];
  const levels: string[][] = [leaves];
  let current = leaves;
  while (current.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < current.length; i += 2) {
      // Odd node is promoted unchanged rather than paired with itself,
      // which would make two distinct trees share a root.
      next.push(i + 1 < current.length ? await nodeHash(current[i], current[i + 1]) : current[i]);
    }
    levels.push(next);
    current = next;
  }
  return levels;
}

export async function merkleRoot(leaves: string[]): Promise<string> {
  const levels = await buildLevels(leaves);
  return levels[levels.length - 1][0];
}

export async function merkleProof(leaves: string[], index: number): Promise<MerkleProof> {
  const levels = await buildLevels(leaves);
  const siblings: MerkleProof['siblings'] = [];
  let idx = index;
  for (let level = 0; level < levels.length - 1; level++) {
    const nodes = levels[level];
    const isRight = idx % 2 === 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    if (siblingIdx < nodes.length) {
      siblings.push({ hash: nodes[siblingIdx], side: isRight ? 'left' : 'right' });
    }
    idx = Math.floor(idx / 2);
  }
  return { leafHash: leaves[index], siblings, root: levels[levels.length - 1][0] };
}

export async function verifyMerkleProof(proof: MerkleProof): Promise<boolean> {
  let computed = proof.leafHash;
  for (const sibling of proof.siblings) {
    computed = sibling.side === 'left'
      ? await nodeHash(sibling.hash, computed)
      : await nodeHash(computed, sibling.hash);
  }
  return computed === proof.root;
}

export class AuditLedger {
  private entries: LedgerEntry[] = [];
  private records = new Map<number, AuditRecordInput>();

  public async append(input: AuditRecordInput): Promise<LedgerEntry> {
    const leaf = await leafHash(canonicalRecord(input));
    const prevHash = this.entries.length === 0
      ? GENESIS
      : this.entries[this.entries.length - 1].entryHash;
    const entry: LedgerEntry = {
      sequence: this.entries.length,
      leafHash: leaf,
      prevHash,
      entryHash: await sha256(prevHash + leaf),
    };
    this.entries.push(entry);
    this.records.set(entry.sequence, input);
    return entry;
  }

  public get size(): number {
    return this.entries.length;
  }

  public getRoot(): Promise<string> {
    return merkleRoot(this.entries.map(e => e.leafHash));
  }

  public getProof(sequence: number): Promise<MerkleProof> | null {
    if (sequence < 0 || sequence >= this.entries.length) return null;
    return merkleProof(this.entries.map(e => e.leafHash), sequence);
  }

  /**
   * Recomputes every leaf from its record and re-links the chain.
   * Returns the first sequence number that fails, or null when intact.
   */
  public async verify(): Promise<{ ok: boolean; brokenAt: number | null }> {
    let prevHash = GENESIS;
    for (const entry of this.entries) {
      const record = this.records.get(entry.sequence);
      if (!record) return { ok: false, brokenAt: entry.sequence };
      const expectedLeaf = await leafHash(canonicalRecord(record));
      const expectedEntry = await sha256(prevHash + expectedLeaf);
      if (expectedLeaf !== entry.leafHash || entry.prevHash !== prevHash || expectedEntry !== entry.entryHash) {
        return { ok: false, brokenAt: entry.sequence };
      }
      prevHash = entry.entryHash;
    }
    return { ok: true, brokenAt: null };
  }

  public getRecord(sequence: number): AuditRecordInput | undefined {
    return this.records.get(sequence);
  }

  /**
   * Tamper Simulation Lab:
   * Deliberately mutates a historical committed record in memory without
   * recalculating the Merkle tree or hash chain. This lets auditors witness
   * immediate cryptographic tampering detection.
   */
  public tamperRecord(
    sequence: number, 
    corruptedField: 'actor' | 'promptDigest' | 'action' = 'promptDigest',
    corruptedValue: string = '00000000000000000000000000000000000000000000000000000000TAMPERED'
  ): { original: string } | null {
    const record = this.records.get(sequence);
    if (!record) return null;

    const original = record[corruptedField];
    const tampered = { ...record, [corruptedField]: corruptedValue };
    this.records.set(sequence, tampered);
    return { original };
  }

  public restoreRecord(
    sequence: number,
    originalValue: string,
    corruptedField: 'actor' | 'promptDigest' | 'action' = 'promptDigest'
  ): void {
    const record = this.records.get(sequence);
    if (!record) return;
    this.records.set(sequence, { ...record, [corruptedField]: originalValue });
  }
}

/**
 * Commits an audit record to the ledger and returns the log with its
 * cryptographic fields filled in. Only the prompt digest is committed.
 */
export async function commitAuditLog(
  ledger: AuditLedger,
  log: UncommittedAuditLog,
  timestampIso: string = new Date().toISOString()
): Promise<AuditLog> {
  const promptDigest = await sha256(log.promptRaw);
  const entry = await ledger.append({
    id: log.id,
    timestampIso,
    actor: log.user.email,
    aiTool: log.aiTool,
    action: log.status,
    entityTypes: log.entitiesFound.map(e => e.type),
    promptDigest,
    complianceFlags: log.complianceFlags,
  });
  return {
    ...log,
    promptDigest,
    sequence: entry.sequence,
    leafHash: entry.leafHash,
    prevHash: entry.prevHash,
    sha256Hash: entry.entryHash,
  };
}
