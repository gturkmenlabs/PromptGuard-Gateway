import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Terminal, 
  Send, 
  ArrowRight, 
  Layers, 
  RefreshCw, 
  Key, 
  HeartPulse, 
  DollarSign, 
  CreditCard, 
  CheckCircle2, 
  FileCode2,
  Code2,
  Copy,
  Check
} from 'lucide-react';
import { SIMULATION_SCENARIOS } from '../../data/mockData';
import { ZeroDisruptionVault } from '../../engine/syntheticVault';
import { UncommittedAuditLog, CustomDlpRule } from '../../types';

interface LiveProxySimulatorProps {
  onLogGenerated: (log: UncommittedAuditLog) => void;
  globalPolicies?: Record<string, 'MASK' | 'BLOCK' | 'HASH' | 'LOG_ONLY'>;
  customKeywords?: string[];
  customRules?: CustomDlpRule[];
  disabledRuleIds?: string[];
}

export const LiveProxySimulator: React.FC<LiveProxySimulatorProps> = ({
  onLogGenerated,
  globalPolicies,
  customKeywords,
  customRules,
  disabledRuleIds
}) => {
  const [selectedAiTool, setSelectedAiTool] = useState<'ChatGPT-4o' | 'Claude 3.5 Sonnet' | 'Perplexity Pro'>('ChatGPT-4o');
  const [promptText, setPromptText] = useState<string>(SIMULATION_SCENARIOS[0].prompt);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(SIMULATION_SCENARIOS[0].id);
  const [isShieldActive, setIsShieldActive] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [rawAiResponse, setRawAiResponse] = useState<string>('');
  const [finalDetokenizedResponse, setFinalDetokenizedResponse] = useState<string>('');
  const [activePipelineTab, setActivePipelineTab] = useState<'all' | 'raw' | 'wire' | 'ai' | 'detoken' | 'api'>('all');
  const [vaultInstance] = useState(() => new ZeroDisruptionVault());
  const [copiedCode, setCopiedCode] = useState(false);
  const [redactionPolicy, setRedactionPolicy] = useState<'PERMANENT_REDACT' | 'RESTORE_ORIGINAL'>('PERMANENT_REDACT');

  // Derive real-time prompt analysis directly during render (prevents cascading re-renders and set-state-in-effect)
  const analysis = useMemo(() => {
    if (!isShieldActive) {
      return {
        sanitizedPrompt: promptText,
        entities: [],
        isBlocked: false,
        blockReason: '',
        executionTimeMs: 0.2,
        riskScore: 'LOW' as const
      };
    }

    const { sanitizedPrompt: clean, entities, isBlocked, blockReason, executionTimeMs } = 
      vaultInstance.processPrompt(promptText, globalPolicies, {
        customKeywords,
        customRules,
        disabledRuleIds
      });

    const riskScore = entities.some(e => e.riskLevel === 'CRITICAL') ? 'CRITICAL' : 
      entities.some(e => e.riskLevel === 'HIGH') ? 'HIGH' : 
      entities.length > 0 ? 'MEDIUM' : 'LOW';

    return {
      sanitizedPrompt: clean,
      entities,
      isBlocked,
      blockReason: blockReason || '',
      executionTimeMs,
      riskScore
    };
  }, [promptText, isShieldActive, globalPolicies, vaultInstance, customKeywords, customRules, disabledRuleIds]);

  const detectedEntities = analysis.entities;
  const sanitizedPrompt = analysis.sanitizedPrompt;
  const executionMetrics = {
    latencyMs: analysis.executionTimeMs,
    tokensReplaced: analysis.entities.length,
    riskScore: analysis.riskScore,
    isBlocked: analysis.isBlocked,
    blockReason: analysis.blockReason
  };

  // Handle Scenario Switch
  const handleSelectScenario = (scenarioId: string) => {
    const scenario = SIMULATION_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return;
    setSelectedScenarioId(scenarioId);
    setPromptText(scenario.prompt);
    setRawAiResponse('');
    setFinalDetokenizedResponse('');
  };

  // Run Simulation Dispatch
  const handleExecutePrompt = async () => {
    setIsProcessing(true);
    setRawAiResponse('');
    setFinalDetokenizedResponse('');

    const startTime = performance.now();

    // 1. If shield is OFF -> send RAW breach prompt
    if (!isShieldActive) {
      await new Promise(r => setTimeout(r, 650));
      const currentScenario = SIMULATION_SCENARIOS.find(s => s.id === selectedScenarioId);
      const simulatedResponse = currentScenario ? currentScenario.simulatedAiResponse(promptText) : `Processed raw unshielded prompt:\n${promptText}`;
      setRawAiResponse(simulatedResponse);
      setFinalDetokenizedResponse(simulatedResponse);
      setIsProcessing(false);
      return;
    }

    // 2. Shield is ON -> Run Zero-Disruption Pipeline
    const { sanitizedPrompt: cleanPrompt, entities, isBlocked, blockReason, executionTimeMs } = 
      vaultInstance.processPrompt(promptText, globalPolicies, {
        customKeywords,
        customRules,
        disabledRuleIds
      });

    await new Promise(r => setTimeout(r, 700));

    if (isBlocked) {
      const blockMsg = `⚠️ [PROMPTGUARD GATEWAY INTERCEPT]\nOutbound request was rejected by Enterprise DLP / AI Guardrail Policy.\nReason: ${blockReason}\n\nNo sensitive tokens or malicious payloads were transmitted to ${selectedAiTool}.`;
      setRawAiResponse(blockMsg);
      setFinalDetokenizedResponse(blockMsg);
      setIsProcessing(false);

      // Create Audit Log
      const auditLog: UncommittedAuditLog = {
        id: `log-${Math.floor(Math.random() * 9000 + 1000)}`,
        timestamp: 'Just now (Live Intercept)',
        user: {
          name: 'Alex Mercer (You)',
          email: 'a.mercer@acmecorp.internal',
          department: 'Engineering',
          role: 'Active Developer Seat',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
        },
        aiTool: selectedAiTool,
        promptRaw: promptText,
        promptSanitized: cleanPrompt,
        entitiesFound: entities,
        status: 'BLOCKED',
        latencyMs: executionTimeMs,
        complianceFlags: entities.some(e => e.category === 'PROMPT_INJECTION')
          ? ['OWASP LLM01:2025', 'MITRE ATLAS AML.T0054', 'SOC 2 CC6.6']
          : ['SOC 2 CC6.6', 'NIST SP 800-53']
      };
      onLogGenerated(auditLog);
      return;
    }

    // Generate AI simulated answer (the LLM receives clean synthetic tokens!)
    const currentScenario = SIMULATION_SCENARIOS.find(s => s.id === selectedScenarioId);
    const aiOutputWithTokens = currentScenario 
      ? currentScenario.simulatedAiResponse(cleanPrompt)
      : `AI response processed safely for synthetic prompt payload:\n${cleanPrompt}`;

    setRawAiResponse(aiOutputWithTokens);

    let finalOutput = aiOutputWithTokens;
    if (redactionPolicy === 'PERMANENT_REDACT') {
      // Keep tokens permanently masked in output so real secret NEVER appears in the chat!
      finalOutput = aiOutputWithTokens;
    } else {
      // Detokenize back to original values in 0.1ms
      const { detokenizedResponse } = vaultInstance.deTokenizeResponse(aiOutputWithTokens);
      finalOutput = detokenizedResponse;
    }

    setFinalDetokenizedResponse(finalOutput);
    setIsProcessing(false);

    // Create Audit Log for CISO Dashboard & Crypto stream
    const auditLog: UncommittedAuditLog = {
      id: `log-${Math.floor(Math.random() * 9000 + 1000)}`,
      timestamp: 'Just now (Live Intercept)',
      user: {
        name: 'Alex Mercer (You)',
        email: 'a.mercer@acmecorp.internal',
        department: 'Engineering',
        role: 'Active Developer Seat',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
      },
      aiTool: selectedAiTool,
      promptRaw: promptText,
      promptSanitized: cleanPrompt,
      llmResponseRaw: aiOutputWithTokens,
      llmResponseDeTokenized: finalOutput,
      entitiesFound: entities,
      status: entities.length > 0 ? 'MASKED' : 'ALLOWED',
      latencyMs: Math.round((performance.now() - startTime) * 10) / 10 + 2.1,
      complianceFlags: entities.some(e => e.category === 'PROMPT_INJECTION')
        ? ['OWASP LLM01:2025', 'MITRE ATLAS AML.T0054']
        : entities.some(e => e.category === 'HIPAA_PHI') 
        ? ['HIPAA § 164.312(a)(2)(iv)', 'SOC 2 CC6.7']
        : entities.some(e => e.category === 'SECRET')
        ? ['SOC 2 CC6.1', 'ISO 27001 A.10.1']
        : ['SOC 2 CC6.7', 'GDPR Art. 32']
    };
    onLogGenerated(auditLog);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SECRET': return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIPAA_PHI': return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'FINANCIAL': return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'PII': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'PROMPT_INJECTION': return 'bg-red-600/30 text-red-300 border-red-500/60 animate-pulse';
      default: return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Tool Bar */}
      <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden border border-slate-800">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
                <Terminal className="w-5 h-5" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
                Live AI Proxy & Zero-Disruption Sandbox
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              Simulate employee interactions with ChatGPT, Claude, and Perplexity. Watch real-time cryptographic tokenization prevent data leaks without degrading AI comprehension.
            </p>
          </div>

          {/* Shield Status Toggle Button */}
          <div className="flex items-center space-x-3 bg-slate-900/90 border border-slate-800 p-2 rounded-xl">
            <div className="flex items-center space-x-2">
              {isShieldActive ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-500 animate-bounce" />
              )}
              <div className="text-xs">
                <div className="font-semibold text-slate-200">
                  {isShieldActive ? 'PromptGuard Shield' : 'Shield Inactive (Direct Leak)'}
                </div>
                <div className="text-[11px] text-slate-400">
                  {isShieldActive ? 'Zero-Disruption Proxy Active' : 'Plaintext Exfiltration Risk'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsShieldActive(!isShieldActive)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                isShieldActive 
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/20' 
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
              }`}
            >
              {isShieldActive ? 'ACTIVE (PROTECTED)' : 'BYPASS PROXY'}
            </button>
          </div>
        </div>

        {/* AI Client Selector Tabs & Preset Scenarios */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Target LLM Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium">Intercept Target:</span>
            <div className="inline-flex rounded-lg bg-slate-900/80 p-1 border border-slate-800">
              {(['ChatGPT-4o', 'Claude 3.5 Sonnet', 'Perplexity Pro'] as const).map(tool => (
                <button
                  key={tool}
                  onClick={() => setSelectedAiTool(tool)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    selectedAiTool === tool
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tool === 'ChatGPT-4o' && '🟢 ChatGPT-4o'}
                  {tool === 'Claude 3.5 Sonnet' && '🟠 Claude 3.5'}
                  {tool === 'Perplexity Pro' && '🔵 Perplexity Pro'}
                </button>
              ))}
            </div>
          </div>

          {/* Preset Leak Scenarios */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Load Preset Scenario:</span>
            <div className="flex space-x-1.5">
              {SIMULATION_SCENARIOS.map(scen => (
                <button
                  key={scen.id}
                  onClick={() => handleSelectScenario(scen.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap transition-all ${
                    selectedScenarioId === scen.id
                      ? 'bg-slate-800 text-slate-100 border-emerald-500/60 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  {scen.badgeText}
                </button>
              ))}
            </div>
          </div>

          {/* Redaction Output Policy Switcher */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Sohbet Çıktı Modu:</span>
            <div className="inline-flex rounded-lg bg-slate-900/90 p-1 border border-slate-800 text-xs">
              <button
                onClick={() => setRedactionPolicy('PERMANENT_REDACT')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  redactionPolicy === 'PERMANENT_REDACT'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Sohbette şifre asla çıkmaz, kalıcı olarak [TOKEN] veya sansürlü kalır"
              >
                🔒 Kalıcı Sansür (Sohbette Çıkmasın)
              </button>
              <button
                onClick={() => setRedactionPolicy('RESTORE_ORIGINAL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  redactionPolicy === 'RESTORE_ORIGINAL'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="ChatGPT şifreyi görmez ama kullanıcının kendi ekranında orijinal değer geri yüklenir"
              >
                ⚡ Sıfır-Kesinti (Geri Çözümle)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Simulated Employee AI Chat Client (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col h-full">
            {/* Header of AI Chat Window */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className={`w-3 h-3 rounded-full ${
                  selectedAiTool === 'ChatGPT-4o' ? 'bg-emerald-500' :
                  selectedAiTool === 'Claude 3.5 Sonnet' ? 'bg-amber-500' : 'bg-cyan-500'
                }`} />
                <span className="text-sm font-semibold text-slate-200">{selectedAiTool} Interface</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                  {isShieldActive ? '🔒 PromptGuard Mesh' : '⚠️ Direct HTTP'}
                </span>
              </div>
            </div>

            {/* Prompt Editor */}
            <div className="mt-4 flex-1 flex flex-col">
              <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Employee Outbound Prompt</span>
                <span className="text-[11px] text-slate-400 font-normal">
                  {promptText.length} chars | {detectedEntities.length} sensitive tokens
                </span>
              </label>
              
              <div className="relative flex-1">
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Paste or write a prompt containing API keys, SSN, patient PHI, or code..."
                  rows={8}
                  className="w-full h-full min-h-[190px] bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-y"
                />
              </div>

              {/* Real-time Detected Chips */}
              <div className="mt-3 min-h-[48px] bg-slate-900/50 p-2.5 rounded-xl border border-slate-800/80">
                <div className="text-[11px] font-medium text-slate-400 mb-1 flex items-center justify-between">
                  <span>Real-Time DLP Scanner Telemetry:</span>
                  <span className={`font-semibold ${
                    executionMetrics.riskScore === 'CRITICAL' ? 'text-rose-400' :
                    executionMetrics.riskScore === 'HIGH' ? 'text-amber-400' :
                    executionMetrics.riskScore === 'MEDIUM' ? 'text-cyan-400' : 'text-emerald-400'
                  }`}>
                    {detectedEntities.length > 0 ? `${executionMetrics.riskScore} RISK DETECTED` : 'CLEAN PROMPT'}
                  </span>
                </div>

                {detectedEntities.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {detectedEntities.map((ent, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border ${getCategoryColor(ent.category)}`}
                        title={`Original: ${ent.originalValue} -> Token: ${ent.syntheticToken}`}
                      >
                        {ent.category === 'SECRET' && <Key className="w-3 h-3 mr-1 text-rose-400" />}
                        {ent.category === 'HIPAA_PHI' && <HeartPulse className="w-3 h-3 mr-1 text-purple-400" />}
                        {ent.category === 'FINANCIAL' && <DollarSign className="w-3 h-3 mr-1 text-amber-400" />}
                        {ent.category === 'PII' && <CreditCard className="w-3 h-3 mr-1 text-cyan-400" />}
                        {ent.category === 'SOURCE_CODE' && <FileCode2 className="w-3 h-3 mr-1 text-emerald-400" />}
                        <strong className="mr-1">{ent.type}:</strong> {ent.syntheticToken}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-400/90 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>No data leaks or confidential credentials detected in this prompt.</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => setPromptText('')}
                  className="px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all"
                >
                  Clear Input
                </button>

                <button
                  onClick={handleExecutePrompt}
                  disabled={isProcessing || !promptText.trim()}
                  className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                    isProcessing 
                      ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                      : isShieldActive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-[0.99]'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Interception & Round-Trip in Progress...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>
                        {isShieldActive ? 'Send Safely via PromptGuard Proxy' : 'Send Raw (Unshielded Breach)'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Zero-Disruption 5-Stage Live Inspection Pipeline (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col h-full">
            {/* Pipeline Header with Stage Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Zero-Disruption Tokenization Pipeline</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ⚡ &lt;4ms Engine
                </span>
              </div>

              {/* View Switcher */}
              <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setActivePipelineTab('all')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    activePipelineTab === 'all' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Full Pipeline View
                </button>
                <button
                  onClick={() => setActivePipelineTab('wire')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    activePipelineTab === 'wire' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Wire Payload
                </button>
                <button
                  onClick={() => setActivePipelineTab('detoken')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                    activePipelineTab === 'detoken' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  De-Tokenized Output
                </button>
                <button
                  onClick={() => setActivePipelineTab('api')}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all flex items-center space-x-1 ${
                    activePipelineTab === 'api' ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3 h-3" />
                  <span>Developer API (cURL)</span>
                </button>
              </div>
            </div>

            {/* Pipeline Stage Cards */}
            <div className="mt-4 flex-1 space-y-4 overflow-y-auto max-h-[600px] pr-1">
              {/* STAGE 1: Real Outbound Wire Payload to OpenAI/Anthropic */}
              {(activePipelineTab === 'all' || activePipelineTab === 'wire') && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-cyan-500/30 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 text-[10px] font-bold flex items-center justify-center">
                        1
                      </span>
                      <span className="text-xs font-bold text-cyan-300">
                        Outbound Wire Payload to {selectedAiTool} (Over Public Internet)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/60">
                      {isShieldActive ? '✅ ZERO SENSITIVE DATA EXPOSED' : '❌ UNPROTECTED BREACH'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-2">
                    This is the exact JSON body received by OpenAI/Anthropic servers. Notice how raw SSNs, API keys, and patient identifiers are fully replaced by synthetic tokens:
                  </p>

                  <pre className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-300 whitespace-pre-wrap break-all overflow-x-auto">
                    {sanitizedPrompt || promptText}
                  </pre>
                </div>
              )}

              {/* STAGE 2: Local AES-GCM In-Memory Vault Mapping */}
              {activePipelineTab === 'all' && detectedEntities.length > 0 && isShieldActive && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-indigo-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-400 text-[10px] font-bold flex items-center justify-center">
                        2
                      </span>
                      <span className="text-xs font-bold text-indigo-300">
                        Client-Side In-Memory Vault Mapping (AES Session)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                      🔒 Ephemeral RAM Only
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {detectedEntities.map((ent, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] font-mono">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400 font-semibold">{ent.type}:</span>
                          <span className="text-rose-400 line-through truncate max-w-[140px]">{ent.originalValue}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-emerald-400 font-bold mt-1 sm:mt-0">
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500 hidden sm:inline" />
                          <span>{ent.syntheticToken}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STAGE 3: Simulated Raw AI Response (With Synthetic Placeholders) */}
              {activePipelineTab === 'all' && rawAiResponse && isShieldActive && !executionMetrics.isBlocked && (
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-amber-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold flex items-center justify-center">
                        3
                      </span>
                      <span className="text-xs font-bold text-amber-300">
                        Inbound LLM Response Stream (Containing Synthetic Tokens)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                      Received from {selectedAiTool}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-amber-200/90 whitespace-pre-wrap break-words">
                    {rawAiResponse}
                  </div>
                </div>
              )}

              {/* STAGE 4: Final Output in Chat */}
              {(activePipelineTab === 'all' || activePipelineTab === 'detoken') && (
                <div className={`p-4 rounded-xl bg-gradient-to-br via-slate-900/90 to-slate-950 border shadow-lg ${
                  redactionPolicy === 'PERMANENT_REDACT'
                    ? 'from-rose-950/40 border-rose-500/40 shadow-rose-500/10'
                    : 'from-emerald-950/40 border-emerald-500/40 shadow-emerald-500/10'
                }`}>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center space-x-2">
                      <span className={`w-5 h-5 rounded-full border text-[10px] font-bold flex items-center justify-center ${
                        redactionPolicy === 'PERMANENT_REDACT'
                          ? 'bg-rose-500/30 border-rose-500/50 text-rose-300'
                          : 'bg-emerald-500/30 border-emerald-500/50 text-emerald-300'
                      }`}>
                        ★
                      </span>
                      <span className={`text-xs font-bold ${
                        redactionPolicy === 'PERMANENT_REDACT' ? 'text-rose-300' : 'text-emerald-300'
                      }`}>
                        {redactionPolicy === 'PERMANENT_REDACT'
                          ? 'Final Redacted Chat Output (Sohbette Orijinal Veri Asla Görünmez)'
                          : 'Final De-Tokenized Output Rendered to Employee (Zero Disruption)'}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-semibold ${
                      redactionPolicy === 'PERMANENT_REDACT'
                        ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                    }`}>
                      {redactionPolicy === 'PERMANENT_REDACT' ? '🔒 Kalıcı Sansür (Sohbette Gizli)' : '✨ Geri Çözümlendi (Sıfır Kesinti)'}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mb-3">
                    {redactionPolicy === 'PERMANENT_REDACT'
                      ? 'Hassas şifre ve kimlik bilgileri ne yapay zekaya iletildi ne de sohbette açık şekilde görüntülendi. Tamamen sansürlenmiş güvenli çıktı.'
                      : 'The employee sees their original context and variable names perfectly restored in 0.1ms by the client-side proxy, while the public AI provider never had access to the real data!'}
                  </p>

                  <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
                    {finalDetokenizedResponse ? (
                      finalDetokenizedResponse
                    ) : (
                      <div className="text-slate-500 italic flex items-center justify-center py-6">
                        Click "Send Safely via PromptGuard Proxy" to trigger the live tokenization & reverse round-trip.
                      </div>
                    )}
                  </div>

                  {finalDetokenizedResponse && (
                    <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-emerald-400">✓ Cryptographic Audit Logged</span>
                        <span>•</span>
                        <span>Latency: <strong className="text-slate-200">{executionMetrics.latencyMs}ms</strong></span>
                      </div>
                      <div className="text-cyan-300">
                        SHA-256 Merkle Verification Root Active
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STAGE 5: Developer API (cURL / Python) */}
              {activePipelineTab === 'api' && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-violet-500/40 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Code2 className="w-5 h-5 text-violet-400" />
                      <span className="text-xs font-bold text-violet-300">PromptGuard Proxy Gateway SDK & cURL Endpoint</span>
                    </div>
                    <button
                      onClick={() => {
                        const snippet = `curl -X POST https://gateway.internal.promptguard.io/v1/chat/completions \\\n  -H "Authorization: Bearer pg_live_sec_token" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "${selectedAiTool.toLowerCase().replace(/[^a-z0-9]/g, '-')}",\n    "messages": [{"role": "user", "content": ${JSON.stringify(promptText)}}],\n    "promptguard_policy": "STRICT_ZERO_KNOWLEDGE"\n  }'`;
                        navigator.clipboard.writeText(snippet);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 border border-violet-500/40 text-xs font-mono transition-all"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-violet-400" />}
                      <span>{copiedCode ? 'Copied to Clipboard' : 'Copy cURL'}</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Use PromptGuard Gateway as a drop-in reverse proxy in any OpenAI or LangChain compatible application. Outbound traffic is inspected and tokenized with sub-4ms latency.
                  </p>

                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 overflow-x-auto">
                    <pre className="text-[11px] font-mono text-cyan-300">
{`curl -X POST https://gateway.internal.promptguard.io/v1/chat/completions \\
  -H "Authorization: Bearer pg_live_sec_token" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "${selectedAiTool.toLowerCase().replace(/[^a-z0-9]/g, '-')}",
    "messages": [{"role": "user", "content": ${JSON.stringify(promptText)}}],
    "promptguard_policy": "STRICT_ZERO_KNOWLEDGE"
  }'`}
                    </pre>
                  </div>

                  <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 overflow-x-auto">
                    <div className="text-[10px] font-mono text-slate-500 mb-1">Python (OpenAI SDK Drop-in Base URL)</div>
                    <pre className="text-[11px] font-mono text-emerald-400">
{`from openai import OpenAI

client = OpenAI(
    base_url="https://gateway.internal.promptguard.io/v1",
    api_key="your-openai-api-key"
)

# PromptGuard automatically anonymizes PII and blocks prompt injections in-flight:
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "${promptText.slice(0, 60).replace(/"/g, '\\"')}..."}]
)`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
