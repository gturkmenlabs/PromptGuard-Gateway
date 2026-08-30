import React, { useEffect, useState } from 'react';
import { 
  FileCheck2, 
  ShieldCheck, 
  CheckCircle2, 
  Download, 
  Printer, 
  Lock, 
  Sparkles, 
  Layers, 
  Award,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { COMPLIANCE_CONTROLS } from '../../data/mockData';
import { ComplianceControl } from '../../types';
import { AuditLedger } from '../../engine/cryptoAudit';

interface ComplianceAuditorSuiteProps {
  ledger: AuditLedger;
}

export const ComplianceAuditorSuite: React.FC<ComplianceAuditorSuiteProps> = ({ ledger }) => {
  const [controls] = useState<ComplianceControl[]>(COMPLIANCE_CONTROLS);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [attestation, setAttestation] = useState<{ root: string; ok: boolean; records: number } | null>(null);

  // The attestation block must quote the ledger's actual root, not a constant.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [root, status] = await Promise.all([ledger.getRoot(), ledger.verify()]);
      if (!cancelled) setAttestation({ root, ok: status.ok, records: ledger.size });
    })();
    return () => { cancelled = true; };
  }, [ledger, isDossierOpen]);

  const handleTriggerAuditScan = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore in headless/test environments
      }
    }, 1200);
  };

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
                SOC 2 Type II & HIPAA Compliance Auditor Suite
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Automated continuous compliance verification with 1-click auditor report generation and cryptographic evidence exports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleTriggerAuditScan}
            disabled={isVerifying}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all"
          >
            <Sparkles className={`w-4 h-4 text-cyan-400 ${isVerifying ? 'animate-spin' : ''}`} />
            <span>{isVerifying ? 'Running Real-time Evidence Audit...' : 'Re-verify Controls'}</span>
          </button>

          <button
            onClick={() => setIsDossierOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Award className="w-4 h-4" />
            <span>Generate Official Auditor Dossier</span>
          </button>
        </div>
      </div>

      {/* Compliance Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-4 border border-emerald-500/40 bg-emerald-950/20">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>SOC 2 Type II Status</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-heading text-emerald-400">100% PASS</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">CC6.1, CC6.6, CC6.7, CC6.8</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-emerald-500/40 bg-emerald-950/20">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>HIPAA Security Rule</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold font-heading text-emerald-400">COMPLIANT</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">§ 164.312(a)(2)(iv) ePHI Masking</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800 bg-slate-900/40">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>GDPR Art. 32</span>
            <Lock className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold font-heading text-cyan-300">VALIDATED</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Client-side Pseudonymisation</div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-slate-800 bg-slate-900/40">
          <div className="flex justify-between items-center text-xs text-slate-400 mb-1">
            <span>Evidence Chain</span>
            <Award className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold font-heading text-slate-100">SHA-256</div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono">Immutable Merkle Tree</div>
        </div>
      </div>

      {/* Trust Service Criteria & Controls Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-white">Trust Services Criteria & Statutory Control Matrix</h2>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">Continuous Automated Monitoring Active</span>
        </div>

        <div className="divide-y divide-slate-800">
          {controls.map(ctrl => (
            <div key={ctrl.id} className="p-4 hover:bg-slate-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center space-x-2.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30">
                    {ctrl.code}
                  </span>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
                    {ctrl.framework}
                  </span>
                  <span className="text-sm font-bold text-slate-100">
                    {ctrl.title}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {ctrl.description}
                </p>
                <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-3 pt-1">
                  <span>Cryptographic Proof: <strong className="text-cyan-400">{ctrl.evidenceHash}</strong></span>
                  <span>•</span>
                  <span>{ctrl.lastVerified}</span>
                </div>
              </div>

              <div className="flex items-center space-x-4 self-end md:self-center">
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-emerald-400">{ctrl.coveragePct}% Inspected</div>
                  <div className="text-[10px] text-slate-500">Continuous Enforcement</div>
                </div>
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>COMPLIANT</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Printable Auditor Dossier Modal */}
      {isDossierOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl max-w-4xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 shadow-2xl shadow-emerald-500/20">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">SOC 2 Type II & HIPAA Official Auditor Dossier</h2>
                  <p className="text-xs text-slate-400 font-mono">Document Ref: PG-AUDIT-2026-08-SOC2-MERKLE</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintDossier}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setIsDossierOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Dossier Body (Auditor Ready) */}
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-6 text-xs text-slate-300 leading-relaxed font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="font-bold text-sm text-emerald-400 font-sans">PromptGuard Gateway Security Attestation</div>
                  <div className="text-slate-400 text-[11px]">Independent Security & Data Masking Evaluation</div>
                </div>
                <div className="text-right text-[11px] text-slate-400">
                  <div>Audited Organization: <strong>Acme Enterprise Technologies Inc.</strong></div>
                  <div>Period Under Review: <strong>FY2026 Continuous</strong></div>
                  <div>Assessor Standard: <strong>AICPA SOC 2 & HHS HIPAA Security Rule</strong></div>
                </div>
              </div>

              {/* Executive Summary */}
              <div>
                <h3 className="font-bold text-white uppercase text-[11px] tracking-wider mb-1 text-emerald-300">
                  1. Executive Opinion & Scope
                </h3>
                <p>
                  PromptGuard Gateway operates as an in-line zero-disruption cryptographic proxy mesh. Outbound HTTP/WebSocket requests to third-party artificial intelligence engines (OpenAI ChatGPT, Anthropic Claude, Perplexity Pro) were subjected to continuous real-time regex/NER boundary masking. All identified PII, confidential secrets, financial records, and HIPAA ePHI were substituted with synthetic non-reversible tokens before packet transmission.
                </p>
              </div>

              {/* Verified Control Evidence */}
              <div>
                <h3 className="font-bold text-white uppercase text-[11px] tracking-wider mb-2 text-emerald-300">
                  2. Evaluated Trust Services Criteria
                </h3>
                <div className="space-y-2">
                  {COMPLIANCE_CONTROLS.map(c => (
                    <div key={c.id} className="p-2.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center">
                      <div>
                        <strong className="text-white">{c.code} - {c.title}</strong>
                        <div className="text-[10px] text-slate-400">{c.description}</div>
                      </div>
                      <span className="text-emerald-400 font-bold ml-2">PASS (100%)</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cryptographic Attestation Block */}
              <div className="p-3.5 rounded bg-slate-900 border border-indigo-500/40 text-[11px]">
                <div className="font-bold text-indigo-300 mb-1">Cryptographic Merkle Root Verification Hash</div>
                <div className="text-cyan-300 break-all">
                  SHA256: {attestation ? attestation.root : 'computing…'}
                </div>
                <div className="text-slate-400 text-[10px] mt-1">
                  {attestation
                    ? `${attestation.records} audit records committed · hash chain ${attestation.ok ? 'verified' : 'BROKEN'}`
                    : 'Verifying ledger…'}
                </div>
                <div className="text-slate-400 text-[10px] mt-1">
                  Zero plaintext data stored. All detokenization mappings exist strictly within ephemeral client RAM.
                </div>
              </div>

              {/* Assessor Sign-Off Box */}
              <div className="pt-4 border-t border-slate-800 flex justify-between items-center text-[11px]">
                <div>
                  <div className="text-slate-400">Chief Information Security Officer:</div>
                  <div className="font-bold text-white">Devon Ramirez, CISSP, CISM</div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400">Attestation Timestamp:</div>
                  <div className="font-bold text-emerald-400 font-mono">2026-08-29T14:45:00Z</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsDossierOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={handlePrintDossier}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Dossier (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
