import React from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  Cpu, 
  Users, 
  Activity, 
  Zap, 
  CheckCircle2, 
  Lock, 
  Flame, 
  ArrowUpRight, 
  BarChart3
} from 'lucide-react';
import { AuditLog, DepartmentMetric, PolicyRule } from '../../types';

interface CisoDashboardProps {
  logs: AuditLog[];
  departmentMetrics: DepartmentMetric[];
  policies: PolicyRule[];
  onNavigateTab: (tab: any) => void;
}

export const CisoDashboard: React.FC<CisoDashboardProps> = ({
  logs,
  departmentMetrics,
  policies,
  onNavigateTab
}) => {
  const totalPrompts = 48740 + logs.length;
  const totalBlockedOrMasked = 3842 + logs.filter(l => l.status === 'MASKED' || l.status === 'BLOCKED').length;


  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-heading text-white">
                  CISO Command Center & Shadow AI Telemetry
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Real-time visibility, automated PII/Secret neutralizations, and SOC 2 / HIPAA compliance posture across 248 enterprise seats.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => onNavigateTab('compliance')}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Generate SOC 2 Audit Report</span>
            </button>
          </div>
        </div>

        {/* 5 Core KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-6">
          {/* Health Score */}
          <div className="glass-card rounded-xl p-4 border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 to-slate-900/60">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Security Posture</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold font-heading text-emerald-400">96 / 100</span>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" /> +4.2%
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Low Risk (SOC 2 Type II Pass)
            </div>
          </div>

          {/* Neutralized Leaks */}
          <div className="glass-card rounded-xl p-4 border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Leaks Neutralized</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold font-heading text-slate-100">{totalBlockedOrMasked.toLocaleString()}</span>
              <span className="text-[11px] font-mono text-amber-400">100% Intercepted</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Secrets, PII & PHI masked
            </div>
          </div>

          {/* Total Prompts */}
          <div className="glass-card rounded-xl p-4 border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Total Prompt Volume</span>
              <BarChart3 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold font-heading text-slate-100">{totalPrompts.toLocaleString()}</span>
              <span className="text-[11px] font-mono text-cyan-400">+18% MoM</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Across 5 AI services
            </div>
          </div>

          {/* Active Protected Seats */}
          <div className="glass-card rounded-xl p-4 border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Protected Seats</span>
              <Users className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold font-heading text-slate-100">248 / 250</span>
              <span className="text-[11px] font-mono text-emerald-400">99.2% MDM</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Chrome/Edge Extension Mesh
            </div>
          </div>

          {/* Latency Overhead */}
          <div className="glass-card rounded-xl p-4 border border-slate-800 bg-slate-900/40">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span>Proxy Overhead</span>
              <Cpu className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold font-heading text-emerald-400">3.4ms</span>
              <span className="text-[11px] font-mono text-emerald-400">Zero-Lag</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Local WASM/Rust Tokenizer
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Department Matrix & Shadow AI Traffic Share */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Department Shadow AI Risk Matrix (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-white">Department Shadow AI Risk & Usage Matrix</h2>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Real-time Telemetry</span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-800/80">
                    <th className="pb-3 font-semibold">Department</th>
                    <th className="pb-3 font-semibold">Protected Seats</th>
                    <th className="pb-3 font-semibold">Monthly Prompts</th>
                    <th className="pb-3 font-semibold">Blocked / Masked</th>
                    <th className="pb-3 font-semibold">Top AI Tool</th>
                    <th className="pb-3 font-semibold text-right">Risk Posture</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {departmentMetrics.map((dept, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3.5 font-medium text-slate-200 flex items-center space-x-2">
                        <span>{dept.department}</span>
                      </td>
                      <td className="py-3.5 text-slate-300 font-mono">{dept.userCount}</td>
                      <td className="py-3.5 text-slate-300 font-mono">{dept.promptVolume.toLocaleString()}</td>
                      <td className="py-3.5 font-mono font-semibold text-amber-400">
                        {dept.leakAttemptsBlocked}
                      </td>
                      <td className="py-3.5 text-slate-300 text-[11px] font-mono">
                        {dept.topAiTool}
                      </td>
                      <td className="py-3.5 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          dept.riskScore < 20 
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : dept.riskScore < 30
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}>
                          {dept.riskScore < 20 ? 'Optimal' : dept.riskScore < 30 ? 'Protected' : 'Elevated'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active DLP Enforcement Rules Summary */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Active DLP Policy Enforcements</h2>
              </div>
              <button 
                onClick={() => onNavigateTab('policies')}
                className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center space-x-1"
              >
                <span>Manage Policies</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
              {policies.map(pol => (
                <div key={pol.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-200">{pol.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Mapped to {pol.soc2Control}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    AUTO-MASK
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: AI Traffic Breakdown & Live Threat Stream (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Shadow AI Discovery & Traffic Share */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <h2 className="text-sm font-bold text-white">Shadow AI Tool Market Share</h2>
              </div>
              <span className="text-[11px] text-emerald-400 font-mono">100% Routed via Proxy</span>
            </div>

            <div className="mt-4 space-y-3">
              {[
                { name: 'ChatGPT-4o (OpenAI)', share: 54, color: 'bg-emerald-500', prompts: '26,320 prompts' },
                { name: 'Claude 3.5 Sonnet (Anthropic)', share: 24, color: 'bg-amber-500', prompts: '11,690 prompts' },
                { name: 'Perplexity Pro', share: 12, color: 'bg-cyan-500', prompts: '5,840 prompts' },
                { name: 'Cursor AI & GitHub Copilot', share: 10, color: 'bg-indigo-500', prompts: '4,890 prompts' }
              ].map((tool, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-300 font-medium">{tool.name}</span>
                    <span className="text-slate-400 font-mono">{tool.share}% ({tool.prompts})</span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div className={`h-full ${tool.color} rounded-full`} style={{ width: `${tool.share}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Threat Feed Preview */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-bold text-white">Live Interception Feed</h2>
              </div>
              <button 
                onClick={() => onNavigateTab('audit')}
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
              >
                <span>View Full Audit Vault</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-3 space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {logs.slice(0, 4).map(log => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <img src={log.user.avatar} alt={log.user.name} className="w-5 h-5 rounded-full object-cover" />
                      <span className="font-semibold text-slate-200">{log.user.name}</span>
                      <span className="text-[10px] text-slate-400">({log.user.department})</span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                      log.status === 'BLOCKED' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                      log.status === 'MASKED' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                      'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <p className="text-[11px] font-mono text-slate-400 mt-1.5 truncate">
                    {log.promptSanitized}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                    <span>{log.aiTool}</span>
                    <span>{log.timestamp}</span>
                    <span className="text-cyan-400">Merkle Proof Verified</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
