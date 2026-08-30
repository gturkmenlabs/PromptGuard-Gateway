import React, { useEffect, useState } from 'react';
import { 
  Lock, 
  Search, 
  Download, 
  Copy,
  Check,
  X,
  AlertOctagon,
  RotateCcw
} from 'lucide-react';
import { AuditLog } from '../../types';
import { AuditLedger, MerkleProof, verifyMerkleProof } from '../../engine/cryptoAudit';

interface CryptographicAuditLogsProps {
  logs: AuditLog[];
  ledger: AuditLedger;
}

export const CryptographicAuditLogs: React.FC<CryptographicAuditLogsProps> = ({ logs, ledger }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [merkleRootHash, setMerkleRootHash] = useState<string>('');
  const [chainStatus, setChainStatus] = useState<{ ok: boolean; brokenAt: number | null } | null>(null);
  const [selectedProof, setSelectedProof] = useState<{ proof: MerkleProof; valid: boolean } | null>(null);
  const [tamperInfo, setTamperInfo] = useState<{ isTampered: boolean; targetSeq: number | null; originalDigest: string | null }>({
    isTampered: false,
    targetSeq: null,
    originalDigest: null
  });

  // Recompute the published root and re-verify the whole chain whenever the ledger grows.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [root, status] = await Promise.all([ledger.getRoot(), ledger.verify()]);
      if (!cancelled) {
        setMerkleRootHash(root);
        setChainStatus(status);
      }
    })();
    return () => { cancelled = true; };
  }, [ledger, logs]);

  // Build and check the inclusion proof for the record under inspection.
  useEffect(() => {
    let cancelled = false;
    if (!selectedLog) return;
    const pending = ledger.getProof(selectedLog.sequence);
    if (!pending) return;
    (async () => {
      const proof = await pending;
      const valid = await verifyMerkleProof(proof);
      if (!cancelled) setSelectedProof({ proof, valid });
    })();
    return () => { cancelled = true; };
  }, [ledger, selectedLog]);

  const handleSimulateTamper = async (seq: number) => {
    const record = ledger.getRecord(seq);
    if (!record) return;

    const original = record.promptDigest;
    ledger.tamperRecord(seq, 'promptDigest', '00000000000000000000000000000000_TAMPERED_CORRUPTED_DIGEST_HASH');
    const [root, status] = await Promise.all([ledger.getRoot(), ledger.verify()]);
    setMerkleRootHash(root);
    setChainStatus(status);
    setTamperInfo({
      isTampered: true,
      targetSeq: seq,
      originalDigest: original
    });

    if (selectedLog && selectedLog.sequence === seq) {
      const pending = ledger.getProof(seq);
      if (pending) {
        const proof = await pending;
        const valid = await verifyMerkleProof(proof);
        setSelectedProof({ proof, valid });
      }
    }
  };

  const handleRestoreIntegrity = async () => {
    if (tamperInfo.targetSeq === null || tamperInfo.originalDigest === null) return;
    ledger.restoreRecord(tamperInfo.targetSeq, tamperInfo.originalDigest, 'promptDigest');
    const [root, status] = await Promise.all([ledger.getRoot(), ledger.verify()]);
    setMerkleRootHash(root);
    setChainStatus(status);
    setTamperInfo({ isTampered: false, targetSeq: null, originalDigest: null });

    if (selectedLog && selectedLog.sequence === tamperInfo.targetSeq) {
      const pending = ledger.getProof(tamperInfo.targetSeq);
      if (pending) {
        const proof = await pending;
        const valid = await verifyMerkleProof(proof);
        setSelectedProof({ proof, valid });
      }
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.promptRaw.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.aiTool.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entitiesFound.some(e => e.type.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesDept = departmentFilter === 'ALL' || log.user.department === departmentFilter;
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;

    return matchesSearch && matchesDept && matchesStatus;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['Sequence', 'ID', 'Timestamp', 'User', 'Department', 'AI Tool', 'Status', 'Entities Detected', 'Prompt Digest (SHA-256)', 'Prev Entry Hash', 'Entry Hash', 'Latency (ms)'];
    const rows = filteredLogs.map(l => [
      l.sequence,
      l.id,
      l.timestamp,
      l.user.name,
      l.user.department,
      l.aiTool,
      l.status,
      l.entitiesFound.map(e => e.type).join('; '),
      l.promptDigest,
      l.prevHash,
      l.sha256Hash,
      l.latencyMs
    ]);

    const footer = [`"MERKLE ROOT","${merkleRootHash}"`, `"CHAIN VERIFIED","${chainStatus?.ok ? 'YES' : 'NO'}"`];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(x => `"${x}"`).join(',')), '', ...footer].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PromptGuard_Cryptographic_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Active Tamper Compromise Banner */}
      {chainStatus && !chainStatus.ok && (
        <div className="rounded-2xl p-4 bg-rose-950/80 border-2 border-rose-500 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl shadow-rose-950/50 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-rose-500/30 text-rose-300">
              <AlertOctagon className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Cryptographic Tampering Detected at Sequence #{chainStatus.brokenAt}
              </h3>
              <p className="text-xs text-rose-200 mt-0.5">
                The committed SHA-256 prompt digest or predecessor entry hash has been altered offline. The Merkle root is invalid.
              </p>
            </div>
          </div>

          <button
            onClick={handleRestoreIntegrity}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/30 transition-all self-start md:self-auto whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restore Ledger Integrity</span>
          </button>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
                Cryptographic Audit Vault & Merkle Proofs
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Tamper-evident, immutable audit trail storing zero plaintext data. SHA-256 verified for SOC 2 Type II and HIPAA auditor inspection.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-2 md:items-end">
          <div className="flex items-center space-x-2 text-[10px] font-mono">
            <span className={`inline-flex items-center px-2 py-1 rounded border ${
              chainStatus === null ? 'bg-slate-800 text-slate-400 border-slate-700' :
              chainStatus.ok ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                             : 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold animate-pulse'
            }`}>
              {chainStatus === null
                ? 'Verifying chain…'
                : chainStatus.ok
                  ? `Hash chain intact (${logs.length} records)`
                  : `TAMPERING DETECTED at sequence #${chainStatus.brokenAt}`}
            </span>

            {logs.length > 0 && !tamperInfo.isTampered && (
              <button
                onClick={() => handleSimulateTamper(logs[0].sequence)}
                className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition-all"
                title="Deliberately corrupt sequence #0 digest to test tamper detection"
              >
                Simulate Tamper
              </button>
            )}
          </div>
          <div className="text-[10px] font-mono text-slate-400 break-all max-w-xs md:text-right">
            Merkle root: <span className="text-cyan-300">{merkleRootHash || '—'}</span>
          </div>
          <button
            onClick={handleExportCSV}
            className="flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV for Auditors</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by user, prompt keywords, detected token type (e.g. AWS Key, SSN)..."
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Healthcare / Clinical">Healthcare / Clinical</option>
            <option value="Finance">Finance</option>
            <option value="Sales & Marketing">Sales & Marketing</option>
            <option value="Legal & HR">Legal & HR</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="MASKED">MASKED (Synthetic)</option>
            <option value="BLOCKED">BLOCKED (Policy)</option>
            <option value="ALLOWED">ALLOWED (Clean)</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <th className="py-3 px-4 font-semibold">User & Dept</th>
                <th className="py-3 px-4 font-semibold">Target AI Tool</th>
                <th className="py-3 px-4 font-semibold">Sanitized Wire Payload</th>
                <th className="py-3 px-4 font-semibold">Detected Entities</th>
                <th className="py-3 px-4 font-semibold">Action</th>
                <th className="py-3 px-4 font-semibold">Cryptographic Hash</th>
                <th className="py-3 px-4 font-semibold text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map(log => (
                <tr 
                  key={log.id} 
                  className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                  onClick={() => setSelectedLog(log)}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center space-x-2.5">
                      <img src={log.user.avatar} alt={log.user.name} className="w-7 h-7 rounded-full object-cover border border-slate-700" />
                      <div>
                        <div className="font-semibold text-slate-200">{log.user.name}</div>
                        <div className="text-[10px] text-slate-400">{log.user.department}</div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-medium text-slate-300">
                    <span className="font-mono text-[11px]">{log.aiTool}</span>
                    <div className="text-[10px] text-slate-500">{log.timestamp}</div>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="font-mono text-[11px] text-emerald-400 truncate bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                      {log.promptSanitized}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {log.entitiesFound.length > 0 ? (
                        log.entitiesFound.map((e, idx) => (
                          <span 
                            key={idx} 
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${
                              e.category === 'SECRET' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                              e.category === 'HIPAA_PHI' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                              e.category === 'FINANCIAL' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                              'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            }`}
                          >
                            {e.type}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-slate-500 italic">No sensitive data</span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                      log.status === 'BLOCKED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      log.status === 'MASKED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}>
                      {log.status}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-[10px] text-slate-400">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-cyan-400 truncate max-w-[90px]">
                        {log.sha256Hash.slice(0, 10)}...{log.sha256Hash.slice(-6)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(log.sha256Hash, log.id);
                        }}
                        className="p-1 text-slate-500 hover:text-slate-200"
                        title="Copy full SHA-256 Hash"
                      >
                        {copiedHash === log.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-all"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cryptographic Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-glow max-w-3xl w-full rounded-2xl p-6 border border-emerald-500/30 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <Lock className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold text-white">Cryptographic Audit Record Details</h3>
                  <div className="text-xs font-mono text-slate-400">Audit ID: {selectedLog.id} | {selectedLog.timestamp}</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User & AI Tool Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <div>
                <span className="text-slate-400">Employee / Seat:</span>
                <div className="font-semibold text-slate-200">{selectedLog.user.name} ({selectedLog.user.role})</div>
                <div className="text-[11px] text-slate-400">{selectedLog.user.email}</div>
              </div>
              <div>
                <span className="text-slate-400">Target AI Model:</span>
                <div className="font-semibold text-cyan-300">{selectedLog.aiTool}</div>
                <div className="text-[11px] text-slate-400">Gateway Latency: {selectedLog.latencyMs}ms</div>
              </div>
              <div>
                <span className="text-slate-400">Compliance Mapping:</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {selectedLog.complianceFlags.map((flag, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[9px] border border-emerald-500/30">
                      {flag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Raw vs Sanitized Wire Payload */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Outbound Sanitized Payload (Sent to {selectedLog.aiTool} over Wire):
                </label>
                <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all">
                  {selectedLog.promptSanitized}
                </pre>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Local Client Plaintext (Retained Ephemerally in Client RAM Only):
                </label>
                <pre className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-400 whitespace-pre-wrap break-all">
                  {selectedLog.promptRaw}
                </pre>
              </div>
            </div>

            {/* Cryptographic SHA-256 & Merkle Tree Proof */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-indigo-500/30 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-indigo-300 font-bold">
                <span>SHA-256 Ledger Entry #{selectedLog.sequence}</span>
                {selectedProof === null ? (
                  <span className="text-slate-400">Recomputing proof…</span>
                ) : selectedProof.valid ? (
                  <span className="text-emerald-400">✓ Merkle inclusion proof verified</span>
                ) : (
                  <span className="text-rose-400">✗ Proof failed — record does not match root</span>
                )}
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-slate-400">Committed prompt digest (plaintext never stored):</div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 break-all text-[11px]">
                  {selectedLog.promptDigest}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] text-slate-400">
                  Entry hash = SHA-256(prevHash ‖ leafHash), linking this record to the one before it:
                </div>
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] space-y-1 break-all">
                  <div className="text-slate-400">prev: <span className="text-slate-300">{selectedLog.prevHash}</span></div>
                  <div className="text-slate-400">leaf: <span className="text-slate-300">{selectedLog.leafHash}</span></div>
                  <div className="text-slate-400">entry: <span className="text-emerald-300">{selectedLog.sha256Hash}</span></div>
                </div>
              </div>

              {selectedProof && (
                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400">
                    Inclusion path ({selectedProof.proof.siblings.length} sibling hashes) → root:
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] space-y-1 break-all">
                    {selectedProof.proof.siblings.length === 0 && (
                      <div className="text-slate-500 italic">Single-leaf ledger: the leaf is the root.</div>
                    )}
                    {selectedProof.proof.siblings.map((sibling, idx) => (
                      <div key={idx} className="text-slate-400">
                        [{sibling.side}] <span className="text-slate-300">{sibling.hash}</span>
                      </div>
                    ))}
                    <div className="pt-1 border-t border-slate-800 text-slate-400">
                      root: <span className="text-cyan-300">{selectedProof.proof.root}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
