import React from 'react';
import { 
  ShieldCheck, 
  Activity, 
  Terminal, 
  FileCheck2, 
  Sliders, 
  DownloadCloud, 
  Lock, 
  Zap,
  TrendingUp,
  Cpu,
  Laptop
} from 'lucide-react';

export type ActiveTab = 'simulator' | 'dashboard' | 'audit' | 'compliance' | 'policies' | 'deployment' | 'desktop' | 'roi';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  blockedCount: number;
  maskedCount: number;
  onSimulateAttack: () => void;
  onOpenExtension: () => void;
  merkleRoot: string;
  chainVerified: boolean | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  blockedCount,
  maskedCount,
  onSimulateAttack,
  onOpenExtension,
  merkleRoot,
  chainVerified
}) => {
  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      {/* Top System Status Ribbon */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900/80 to-cyan-950/60 px-4 py-1 border-b border-emerald-500/20 text-xs flex flex-wrap items-center justify-between text-slate-300">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-mono text-emerald-400 font-semibold uppercase tracking-wider">Gateway Active</span>
          </div>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="hidden sm:flex items-center text-slate-400 font-mono">
            <Cpu className="w-3.5 h-3.5 mr-1 text-cyan-400" />
            Proxy Overhead: <span className="text-emerald-400 font-semibold ml-1">3.4ms</span>
          </span>
          <span className="text-slate-600 hidden md:inline">|</span>
          <span className="hidden md:flex items-center text-slate-400 font-mono">
            <Lock className="w-3.5 h-3.5 mr-1 text-amber-400" />
            Protected Seats: <span className="text-slate-200 font-semibold ml-1">248 / 250</span>
          </span>
          <span className="text-slate-600 hidden lg:inline">|</span>
          <span className="hidden lg:flex items-center text-slate-400 font-mono">
            Merkle Root: <span className={`ml-1 text-[11px] ${chainVerified === false ? 'text-rose-400' : 'text-cyan-300'}`}>
              {merkleRoot ? `${merkleRoot.slice(0, 8)}…${merkleRoot.slice(-4)}` : '—'}
              {chainVerified === null ? ' (verifying…)' : chainVerified ? ' (chain verified)' : ' (CHAIN BROKEN)'}
            </span>
          </span>
        </div>

        <div className="flex items-center space-x-3 my-0.5">
          <div className="text-slate-400 text-xs hidden sm:block">
            Leaks Neutralized: <span className="text-emerald-400 font-bold">{maskedCount + blockedCount}</span>
          </div>
          <button 
            onClick={onSimulateAttack}
            className="flex items-center space-x-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2 py-0.5 rounded text-[11px] font-medium transition-all"
            title="Simulate rapid credential and PHI leak attempts across multiple employees"
          >
            <Zap className="w-3 h-3 text-rose-400" />
            <span>Simulate Leak Wave</span>
          </button>
          <button
            onClick={onOpenExtension}
            className="flex items-center space-x-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[11px] font-medium transition-all"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>Extension Simulator</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('simulator')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-lg shadow-emerald-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-heading font-extrabold text-lg sm:text-xl text-white tracking-tight">
                  Prompt<span className="text-emerald-400">Guard</span>
                </span>
                <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono px-1.5 py-0.5 rounded uppercase font-semibold">
                  GATEWAY v2.4
                </span>
              </div>
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">
                Transparent AI Proxy & SOC 2 Zero-Disruption Mesh
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('simulator')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'simulator'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span>Live AI Proxy Sandbox</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>CISO Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('audit')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'audit'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Lock className="w-4 h-4 text-indigo-400" />
              <span>Crypto Audit Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('compliance')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'compliance'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileCheck2 className="w-4 h-4 text-amber-400" />
              <span>SOC 2 / HIPAA Suite</span>
            </button>

            <button
              onClick={() => setActiveTab('policies')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'policies'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4 text-violet-400" />
              <span>DLP Policies</span>
            </button>

            <button
              onClick={() => setActiveTab('deployment')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'deployment'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <DownloadCloud className="w-4 h-4 text-sky-400" />
              <span>MDM & Extension</span>
            </button>

            <button
              onClick={() => setActiveTab('desktop')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'desktop'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Laptop className="w-4 h-4 text-teal-400" />
              <span>PC Setup & Web SDK</span>
            </button>

            <button
              onClick={() => setActiveTab('roi')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'roi'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>ROI & Free Audit</span>
            </button>
          </nav>

          {/* Quick Mobile / Tablet Select */}
          <div className="lg:hidden flex items-center">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as ActiveTab)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:ring-1 focus:ring-emerald-500"
            >
              <option value="simulator">🛡️ Live AI Sandbox</option>
              <option value="dashboard">📊 CISO Dashboard</option>
              <option value="audit">📜 Crypto Audit Logs</option>
              <option value="compliance">📋 SOC 2 / HIPAA Suite</option>
              <option value="policies">⚙️ DLP Policies</option>
              <option value="deployment">🚀 MDM & Extension</option>
              <option value="desktop">💻 PC Setup & Web SDK</option>
              <option value="roi">💰 ROI & Free Audit</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
