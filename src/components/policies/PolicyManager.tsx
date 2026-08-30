import React, { useState } from 'react';
import { 
  Sliders, 
  Key, 
  HeartPulse, 
  DollarSign, 
  CreditCard, 
  FileCode2, 
  Plus, 
  Check, 
  Sparkles,
  ShieldAlert,
  Terminal,
  Trash2,
  Play
} from 'lucide-react';
import { PolicyRule, EntityCategory, CustomDlpRule } from '../../types';
import { scanPrompt } from '../../engine/tokenEngine';

interface PolicyManagerProps {
  policies: PolicyRule[];
  customKeywords: string[];
  customRules: CustomDlpRule[];
  onUpdatePolicyAction: (category: EntityCategory, action: 'MASK' | 'BLOCK' | 'HASH' | 'LOG_ONLY') => void;
  onTogglePolicy: (ruleId: string) => void;
  onAddKeyword: (kw: string) => void;
  onRemoveKeyword: (kw: string) => void;
  onAddCustomRule: (rule: CustomDlpRule) => void;
  onDeleteCustomRule: (id: string) => void;
}

export const PolicyManager: React.FC<PolicyManagerProps> = ({
  policies,
  customKeywords,
  customRules,
  onUpdatePolicyAction,
  onTogglePolicy,
  onAddKeyword,
  onRemoveKeyword,
  onAddCustomRule,
  onDeleteCustomRule
}) => {
  const [customKeywordInput, setCustomKeywordInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New Custom Rule Form State
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<EntityCategory>('SECRET');
  const [newRuleRisk, setNewRuleRisk] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('CRITICAL');
  const [newRuleAction, setNewRuleAction] = useState<'MASKED' | 'BLOCKED'>('BLOCKED');
  const [newRulePrefix, setNewRulePrefix] = useState('CUSTOM_SECRET');

  // Policy Sandbox Dry-Run State
  const [sandboxInput, setSandboxInput] = useState('Verify this token: sk-live-9381928472910384729103 and check Project Titan timeline.');
  const [sandboxResult, setSandboxResult] = useState<ReturnType<typeof scanPrompt> | null>(null);

  const handleActionChange = (ruleId: string, category: EntityCategory, newAction: 'MASK' | 'BLOCK' | 'HASH' | 'LOG_ONLY') => {
    onUpdatePolicyAction(category, newAction);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleAddKeywordSubmit = () => {
    if (!customKeywordInput.trim()) return;
    onAddKeyword(customKeywordInput.trim());
    setCustomKeywordInput('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleCreateCustomRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRulePattern.trim()) return;

    const rule: CustomDlpRule = {
      id: `cust_rule_${Date.now()}`,
      name: newRuleName.trim(),
      patternString: newRulePattern.trim(),
      isRegex: true,
      category: newRuleCategory,
      riskLevel: newRuleRisk,
      action: newRuleAction,
      tokenPrefix: newRulePrefix.trim() || 'CUSTOM_TOKEN',
      enabled: true
    };

    onAddCustomRule(rule);
    setIsAddingRule(false);
    setNewRuleName('');
    setNewRulePattern('');
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  const handleRunSandbox = () => {
    const disabledIds = policies.filter(p => !p.enabled).map(p => p.id);
    const result = scanPrompt(sandboxInput, {
      customKeywords,
      customRules,
      disabledRuleIds: disabledIds
    });
    setSandboxResult(result);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
                Data Loss Prevention (DLP) & AI Guardrail Matrix
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Configure real-time interception, synthetic vault masking, prompt injection defense, and custom enterprise rules.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {savedSuccess && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Policy Mesh Synchronized (&lt;1ms)</span>
            </div>
          )}

          <button
            onClick={() => setIsAddingRule(prev => !prev)}
            className="px-3.5 py-2 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-lg shadow-violet-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingRule ? 'Close Rule Builder' : 'New Custom DLP Rule'}</span>
          </button>
        </div>
      </div>

      {/* New Custom Rule Builder Drawer */}
      {isAddingRule && (
        <form onSubmit={handleCreateCustomRule} className="glass-panel rounded-2xl p-5 border border-violet-500/40 bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-violet-300 flex items-center space-x-2">
              <Plus className="w-4 h-4 text-violet-400" />
              <span>Register Custom Enterprise DLP / Secret Pattern</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">Real-time Regex Engine</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Rule Name</label>
              <input
                type="text"
                required
                value={newRuleName}
                onChange={e => setNewRuleName(e.target.value)}
                placeholder="e.g. Internal Employee ID Pattern"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Regex Pattern (ECMAScript Syntax)</label>
              <input
                type="text"
                required
                value={newRulePattern}
                onChange={e => setNewRulePattern(e.target.value)}
                placeholder="e.g. \\bEMP-[0-9]{6}-[A-Z]\\b"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Category</label>
              <select
                value={newRuleCategory}
                onChange={e => setNewRuleCategory(e.target.value as EntityCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="SECRET">SECRET (Credentials)</option>
                <option value="PII">PII (Personal)</option>
                <option value="HIPAA_PHI">HIPAA PHI (Health)</option>
                <option value="FINANCIAL">FINANCIAL (Corporate)</option>
                <option value="SOURCE_CODE">SOURCE_CODE (Internal)</option>
                <option value="PROMPT_INJECTION">PROMPT_INJECTION</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Risk Level</label>
              <select
                value={newRuleRisk}
                onChange={e => setNewRuleRisk(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Enforcement Action</label>
              <select
                value={newRuleAction}
                onChange={e => setNewRuleAction(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200"
              >
                <option value="BLOCKED">BLOCKED (Reject Packet)</option>
                <option value="MASKED">MASKED (Synthetic Vault)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-400 font-medium block mb-1">Synthetic Prefix</label>
              <input
                type="text"
                value={newRulePrefix}
                onChange={e => setNewRulePrefix(e.target.value)}
                placeholder="EMP_ID_TOKEN"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddingRule(false)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-bold text-white shadow-md shadow-violet-500/20"
            >
              Save & Activate Rule
            </button>
          </div>
        </form>
      )}

      {/* Built-in Policy Rules Grid */}
      <div className="space-y-4">
        {policies.map(rule => (
          <div 
            key={rule.id}
            className={`glass-panel rounded-2xl p-5 border transition-all ${
              rule.enabled ? 'border-slate-800 bg-slate-900/60' : 'border-slate-800/40 opacity-60 bg-slate-950/40'
            }`}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    {rule.category === 'SECRET' && <Key className="w-4 h-4 text-rose-400" />}
                    {rule.category === 'HIPAA_PHI' && <HeartPulse className="w-4 h-4 text-purple-400" />}
                    {rule.category === 'FINANCIAL' && <DollarSign className="w-4 h-4 text-amber-400" />}
                    {rule.category === 'PII' && <CreditCard className="w-4 h-4 text-cyan-400" />}
                    {rule.category === 'SOURCE_CODE' && <FileCode2 className="w-4 h-4 text-emerald-400" />}
                    {rule.category === 'PROMPT_INJECTION' && <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />}
                    <span className="font-bold text-sm text-white">{rule.name}</span>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                    rule.riskLevel === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                    rule.riskLevel === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                    'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  }`}>
                    {rule.riskLevel}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {rule.description}
                </p>

                <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500 font-mono">
                  <span>Patterns Active: <strong className="text-slate-300">{rule.patternsCount} rules</strong></span>
                  <span>•</span>
                  <span>Intercepted: <strong className="text-emerald-400">{rule.totalIntercepted.toLocaleString()}</strong></span>
                  <span>•</span>
                  <span>SOC 2: <strong className="text-indigo-300">{rule.soc2Control}</strong></span>
                  {rule.owaspControl && (
                    <>
                      <span>•</span>
                      <span>OWASP: <strong className="text-rose-400">{rule.owaspControl}</strong></span>
                    </>
                  )}
                </div>
              </div>

              {/* Action Mode Selector */}
              <div className="flex items-center space-x-3 self-start lg:self-center">
                <div className="flex flex-col space-y-1">
                  <span className="text-[10px] text-slate-400 font-medium uppercase">Enforcement Action:</span>
                  <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                    {[
                      { id: 'MASK', label: '🛡️ Auto-Mask', desc: 'Preserves context synthetically' },
                      { id: 'BLOCK', label: '⛔ Block & Alert', desc: 'Outright reject outbound packet' },
                      { id: 'HASH', label: '🔒 Hash', desc: 'SHA256 one-way anonymize' },
                      { id: 'LOG_ONLY', label: '👁️ Log Only', desc: 'Pass through & alert CISO' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => handleActionChange(rule.id, rule.category, opt.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          rule.action === opt.id
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title={opt.desc}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Enable Switch */}
                <button
                  onClick={() => onTogglePolicy(rule.id)}
                  className={`w-12 h-6 rounded-full transition-colors relative mt-4 ${
                    rule.enabled ? 'bg-emerald-500' : 'bg-slate-800'
                  }`}
                  title={rule.enabled ? 'Click to disable rule' : 'Click to enable rule'}
                >
                  <div className={`w-5 h-5 rounded-full bg-slate-950 shadow-md transition-transform transform ${
                    rule.enabled ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Dynamic Custom Rules Section (if any created) */}
      {customRules.length > 0 && (
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center space-x-2">
              <Plus className="w-4 h-4 text-violet-400" />
              <span>User-Defined Custom Regex DLP Rules ({customRules.length})</span>
            </h2>
          </div>

          <div className="space-y-2">
            {customRules.map(cr => (
              <div key={cr.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div className="flex items-center space-x-3">
                  <span className="font-semibold text-slate-200">{cr.name}</span>
                  <code className="font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700/60">{cr.patternString}</code>
                  <span className="text-[10px] font-mono text-slate-400">{cr.category}</span>
                  <span className="text-[10px] font-mono text-emerald-400">{cr.action}</span>
                </div>
                <button
                  onClick={() => onDeleteCustomRule(cr.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                  title="Delete custom rule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Enterprise Dictionary / Keyword Protection */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Custom Enterprise Proprietary Keywords & Secret Projects</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Automatically substitute project code names, unpublished mergers, or internal trademarked codenames with synthetic tokens across all prompts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={customKeywordInput}
            onChange={(e) => setCustomKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddKeywordSubmit()}
            placeholder="Add proprietary codename (e.g. Project Apollo, StealthCo Merger)..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            onClick={handleAddKeywordSubmit}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center space-x-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Keyword</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {customKeywords.map((kw, idx) => (
            <span
              key={idx}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-cyan-300"
            >
              <span>{kw}</span>
              <button
                onClick={() => onRemoveKeyword(kw)}
                className="text-slate-500 hover:text-rose-400 text-sm font-bold ml-1"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Policy Dry-Run & Testing Sandbox */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Policy Dry-Run Sandbox</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Simulate prompt evaluation against all currently active DLP policies, keywords, and custom regex rules.
              </p>
            </div>
          </div>

          <button
            onClick={handleRunSandbox}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 text-xs font-bold transition-all"
          >
            <Play className="w-3.5 h-3.5 text-emerald-400" />
            <span>Test Policies</span>
          </button>
        </div>

        <textarea
          rows={2}
          value={sandboxInput}
          onChange={e => setSandboxInput(e.target.value)}
          placeholder="Type or paste sample text here to test active detection rules..."
          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        {sandboxResult && (
          <div className="rounded-xl p-4 bg-slate-950 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between font-mono text-[11px]">
              <span className="text-slate-400">Total Matches: <strong className="text-emerald-400">{sandboxResult.totalFound}</strong></span>
              <span className="text-slate-400">Contains Critical: <strong className={sandboxResult.hasCritical ? 'text-rose-400' : 'text-slate-300'}>{sandboxResult.hasCritical ? 'YES' : 'NO'}</strong></span>
              <span className="text-slate-400">Enforcement: <strong className={sandboxResult.hasBlock ? 'text-rose-400' : 'text-emerald-400'}>{sandboxResult.hasBlock ? 'BLOCKED' : 'PERMITTED (MASKED)'}</strong></span>
            </div>

            {sandboxResult.entities.length > 0 ? (
              <div className="divide-y divide-slate-800/60 pt-2">
                {sandboxResult.entities.map(ent => (
                  <div key={ent.id} className="py-1.5 flex items-center justify-between font-mono text-[11px]">
                    <div className="flex items-center space-x-2">
                      <span className="text-rose-400 font-bold">[{ent.type}]</span>
                      <span className="text-slate-400">"{ent.originalValue.slice(0, 35)}"</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-cyan-400">→ {ent.syntheticToken}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-slate-800 text-slate-300 border border-slate-700">{ent.actionTaken}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 italic text-[11px]">No violations detected. Text passes clean through gateway.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

