import React from 'react';
import { 
  ShieldCheck, 
  X, 
  CheckCircle2
} from 'lucide-react';

interface ExtensionPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokensMaskedCount: number;
}

export const ExtensionPopupModal: React.FC<ExtensionPopupModalProps> = ({
  isOpen,
  onClose,
  tokensMaskedCount
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Chrome Extension Style Card */}
      <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-emerald-500/20 animate-in fade-in zoom-in-95 duration-200">
        {/* Extension Header */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-white">PromptGuard Enterprise</div>
              <div className="text-[10px] text-emerald-400 font-mono">Mesh v2.4 (Active)</div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Extension Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Status Badge */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center space-x-2.5 text-emerald-300">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div className="flex-1 font-semibold text-xs">
              Zero-Disruption Proxy Active
            </div>
            <span className="text-[10px] font-mono bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              MDM Locked
            </span>
          </div>

          {/* Telemetry Counter */}
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">Session Masked</div>
              <div className="text-lg font-bold font-mono text-emerald-400">{tokensMaskedCount + 14} tokens</div>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <div className="text-[10px] text-slate-400">Proxy Overhead</div>
              <div className="text-lg font-bold font-mono text-cyan-300">3.4ms</div>
            </div>
          </div>

          {/* Active Intercepted Domains */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>Protected Web AI Endpoints:</span>
              <span className="text-[10px] text-emerald-400 font-mono">100% In-Line</span>
            </div>

            <div className="space-y-1">
              {[
                { domain: 'chatgpt.com (OpenAI)', active: true },
                { domain: 'claude.ai (Anthropic)', active: true },
                { domain: 'perplexity.ai (Perplexity)', active: true },
                { domain: 'github.com/copilot', active: true }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px]">
                  <span className="font-mono text-slate-300">{item.domain}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
              ))}
            </div>
          </div>

          {/* Cryptographic Attestation */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-indigo-500/20 text-[10px] text-slate-400 font-mono">
            <div className="text-indigo-300 font-semibold mb-0.5">Ephemeral In-Memory Vault</div>
            Zero plaintext cached on disk. All cryptographic keys cycle upon tab close.
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono">
          Organization Policy: Acme Enterprise Technologies
        </div>
      </div>
    </div>
  );
};
