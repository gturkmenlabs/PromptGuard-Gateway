import React, { useState } from 'react';
import { 
  TrendingUp, 
  ShieldAlert, 
  Users, 
  Calculator, 
  Sparkles, 
  Mail, 
  CheckCircle2,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const RoiRiskCalculator: React.FC = () => {
  const [employeeCount, setEmployeeCount] = useState<number>(150);
  const [promptsPerDay, setPromptsPerDay] = useState<number>(8);
  const [industry, setIndustry] = useState<'saas' | 'fintech' | 'healthcare' | 'general'>('healthcare');
  const [isLeadModalOpen, setIsLeadModalOpen] = useState<boolean>(false);
  const [leadEmail, setLeadEmail] = useState<string>('');
  const [leadSubmitted, setLeadSubmitted] = useState<boolean>(false);

  // Calculations
  const monthlyPrompts = employeeCount * promptsPerDay * 22;
  const leakRate = industry === 'healthcare' ? 0.045 : industry === 'fintech' ? 0.052 : 0.038;
  const monthlyLeakAttempts = Math.round(monthlyPrompts * leakRate);
  
  const avgBreachFine = 
    industry === 'healthcare' ? 2400000 : // HIPAA penalties
    industry === 'fintech' ? 2900000 :    // SEC / PCI-DSS / SOX
    industry === 'saas' ? 1450000 : 950000; // GDPR / SOC 2 damages

  const promptGuardMonthlyPrice = employeeCount <= 50 ? 499 : employeeCount <= 200 ? 1999 : Math.round(employeeCount * 12);
  const annualSavings = Math.round(avgBreachFine * 0.94);
  const calculatedRoi = Math.round((annualSavings / (promptGuardMonthlyPrice * 12)) * 100);

  const handleSubmitLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadEmail) return;
    setLeadSubmitted(true);
    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
                Shadow AI Exposure ROI Calculator & Risk Audit
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Calculate your enterprise's potential financial exposure from shadow AI leaks vs. PromptGuard's zero-disruption gateway.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsLeadModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all"
        >
          <Sparkles className="w-4 h-4" />
          <span>Get Free AI Risk Audit Script</span>
        </button>
      </div>

      {/* Main Calculator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sliders Input Panel (5 Cols) */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-6 border border-slate-800 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Organization Parameters</span>
          </h2>

          {/* Employee Count Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="text-slate-300 font-medium">Total Active Employees / Knowledge Workers</label>
              <span className="font-mono font-bold text-emerald-400 text-sm">{employeeCount} seats</span>
            </div>
            <input
              type="range"
              min={25}
              max={500}
              step={25}
              value={employeeCount}
              onChange={(e) => setEmployeeCount(Number(e.target.value))}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>25 seats (SMB)</span>
              <span>200 seats (Mid-Market)</span>
              <span>500+ seats</span>
            </div>
          </div>

          {/* Daily AI Prompts Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="text-slate-300 font-medium">Avg. AI Prompts / Employee / Day</label>
              <span className="font-mono font-bold text-cyan-400 text-sm">{promptsPerDay} prompts/day</span>
            </div>
            <input
              type="range"
              min={2}
              max={25}
              step={1}
              value={promptsPerDay}
              onChange={(e) => setPromptsPerDay(Number(e.target.value))}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>Light (2)</span>
              <span>Average (8)</span>
              <span>Heavy (25)</span>
            </div>
          </div>

          {/* Industry Type */}
          <div className="space-y-2">
            <label className="text-xs text-slate-300 font-medium block">Regulatory & Compliance Sector</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'healthcare', label: '🏥 Healthcare / HIPAA' },
                { id: 'fintech', label: '💳 FinTech / Banking' },
                { id: 'saas', label: '☁️ B2B SaaS / Tech' },
                { id: 'general', label: '🏢 Enterprise' }
              ].map(ind => (
                <button
                  key={ind.id}
                  onClick={() => setIndustry(ind.id as any)}
                  className={`p-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                    industry === ind.id
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {ind.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Calculated Financial & Risk Output (7 Cols) */}
        <div className="lg:col-span-7 glass-panel-glow rounded-2xl p-6 border border-emerald-500/40 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Risk Exposure & Subscription ROI Summary</h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-500/40">
              {calculatedRoi.toLocaleString()}% Projected ROI
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
              <div className="text-[11px] text-slate-400 mb-1">Monthly AI Traffic</div>
              <div className="text-xl font-bold font-mono text-cyan-300">{monthlyPrompts.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">prompts / month</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-amber-500/30">
              <div className="text-[11px] text-amber-300 mb-1">Unsanctioned Leak Attempts</div>
              <div className="text-xl font-bold font-mono text-amber-400">{monthlyLeakAttempts.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">secrets/PII per month</div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30">
              <div className="text-[11px] text-rose-300 mb-1">Potential Breach Exposure</div>
              <div className="text-xl font-bold font-mono text-rose-400">${(avgBreachFine / 1000000).toFixed(1)}M</div>
              <div className="text-[10px] text-slate-500 mt-0.5">statutory fines / damages</div>
            </div>
          </div>

          {/* Pricing Tier Card */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-400">PromptGuard Gateway Recommendation:</div>
              <div className="text-lg font-bold text-white mt-0.5">
                {employeeCount <= 50 ? 'Starter Mesh (Up to 50 Users)' : employeeCount <= 200 ? 'Growth Mesh (Up to 200 Users)' : 'Enterprise Scale Mesh'}
              </div>
              <div className="text-xs text-emerald-400 mt-0.5 font-mono">
                Full Zero-Disruption Tokenization + SOC 2 / HIPAA Auditor Suite
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl font-extrabold font-heading text-emerald-400">
                ${promptGuardMonthlyPrice.toLocaleString()}<span className="text-xs text-slate-400 font-normal"> / mo</span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono">Billed monthly or annually</div>
            </div>
          </div>

          <button
            onClick={() => setIsLeadModalOpen(true)}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center space-x-2"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Claim Free Enterprise Shadow AI Audit Report</span>
          </button>
        </div>
      </div>

      {/* Lead Modal */}
      {isLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel-glow max-w-lg w-full rounded-2xl p-6 border border-cyan-500/40 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Free Shadow AI Risk Audit Tool</h3>
              </div>
              <button 
                onClick={() => { setIsLeadModalOpen(false); setLeadSubmitted(false); }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {leadSubmitted ? (
              <div className="p-6 rounded-xl bg-slate-900 border border-emerald-500/30 text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                <div className="font-bold text-sm text-white">Audit Package Dispatched!</div>
                <p className="text-xs text-slate-400">
                  We've sent the CLI Shadow AI scanner script and executive audit template to <strong className="text-cyan-300">{leadEmail}</strong>.
                </p>
                <button
                  onClick={() => { setIsLeadModalOpen(false); setLeadSubmitted(false); }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitLead} className="space-y-4 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  Run a lightweight non-invasive script to scan your corporate proxy or DNS logs for unsanctioned ChatGPT, Claude, and Perplexity egress traffic.
                </p>

                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Corporate Email Address (CISO / IT Lead):</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={leadEmail}
                      onChange={(e) => setLeadEmail(e.target.value)}
                      placeholder="ciso@company.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  🔒 Includes ready-to-run Python/Bash analysis script + SOC 2 gap checklist.
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all"
                >
                  Generate Free Shadow AI Analysis
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
