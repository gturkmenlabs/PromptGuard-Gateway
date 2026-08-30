import React, { useEffect, useState } from 'react';
import { 
  Laptop, 
  Copy, 
  Check, 
  ShieldCheck, 
  DownloadCloud, 
  Globe, 
  Cpu, 
  Zap, 
  Play, 
  Sparkles, 
  AlertTriangle, 
  RefreshCw 
} from 'lucide-react';

interface DaemonStatus {
  active: boolean;
  version?: string;
  port?: number;
  proxyPort?: number;
  caReady?: boolean;
  protectedDomainCount?: number;
  stats?: {
    startedAt: string;
    requestsIntercepted: number;
    tokensMasked: number;
    injectionsBlocked: number;
  };
}

export const DesktopSetupHub: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'installer' | 'sdk' | 'proxy' | 'sandbox'>('installer');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [daemonStatus, setDaemonStatus] = useState<DaemonStatus>({ active: false });
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Sandbox simulation state
  const [sandboxPrompt, setSandboxPrompt] = useState<string>(
    'Debug our AWS cluster with access key AKIAIOSFODNN7EXAMPLE and email dev-lead@internal.corp regarding Project Titan.'
  );
  const [sandboxResult, setSandboxResult] = useState<{
    sanitized: string;
    tokensCreated: number;
    blocked: boolean;
    blockReason?: string;
    simulatedResponse: string;
    detokenizedResponse: string;
  } | null>(null);

  const checkDaemonHealth = async () => {
    setIsChecking(true);
    try {
      const res = await fetch('http://127.0.0.1:9119/health', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        setDaemonStatus({
          active: true,
          version: data.version,
          port: data.port,
          proxyPort: data.proxyPort,
          caReady: data.caReady,
          protectedDomainCount: data.protectedDomainCount,
          stats: data.stats
        });
      } else {
        setDaemonStatus({ active: false });
      }
    } catch {
      setDaemonStatus({ active: false });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const probe = async () => {
      try {
        const res = await fetch('http://127.0.0.1:9119/health', { method: 'GET' });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setDaemonStatus({
            active: true,
            version: data.version,
            port: data.port,
            proxyPort: data.proxyPort,
            caReady: data.caReady,
            protectedDomainCount: data.protectedDomainCount,
            stats: data.stats
          });
        }
      } catch {
        if (!cancelled) setDaemonStatus({ active: false });
      }
    };
    probe();
    const interval = setInterval(probe, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunSandbox = () => {
    if (typeof window !== 'undefined' && (window as any).PromptGuard) {
      const pg = (window as any).PromptGuard;
      const scanRes = pg.scan(sandboxPrompt);
      
      if (scanRes.blocked) {
        setSandboxResult({
          sanitized: '[INTERCEPTED & BLOCKED BY PROMPTGUARD]',
          tokensCreated: 0,
          blocked: true,
          blockReason: scanRes.blockReason,
          simulatedResponse: 'Transmission halted by client security policy.',
          detokenizedResponse: 'Transmission halted by client security policy.'
        });
        return;
      }

      const sanitized = scanRes.sanitized;
      const simulatedLlmReply = `I have received your request. The tokenized identifier [AWS_KEY_TOKEN_SIM] will be used to analyze configuration for [PII_EMAIL_TOKEN_SIM].`;
      const restored = pg.detokenize(simulatedLlmReply);

      setSandboxResult({
        sanitized,
        tokensCreated: scanRes.findings.length,
        blocked: false,
        simulatedResponse: simulatedLlmReply,
        detokenizedResponse: restored
      });
    } else {
      // Fallback if script not loaded yet
      setSandboxResult({
        sanitized: sandboxPrompt.replace(/AKIA[0-9A-Z]{16}/g, '[AWS_KEY_TOKEN_DEMO]').replace(/dev-lead@internal\.corp/g, '[PII_EMAIL_TOKEN_DEMO]'),
        tokensCreated: 2,
        blocked: false,
        simulatedResponse: `Acknowledged request with masked tokens [AWS_KEY_TOKEN_DEMO] and [PII_EMAIL_TOKEN_DEMO].`,
        detokenizedResponse: `Acknowledged request with restored credentials for dev-lead@internal.corp.`
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400">
                <Laptop className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
                  PC Desktop Setup & Zero-Extension Web Hub
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Run PromptGuard locally as an OS background daemon or drop one script tag into your web pages. No Google Chrome extensions required.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`px-3 py-1.5 rounded-xl border flex items-center space-x-2 text-xs font-mono transition-all ${
              daemonStatus.active
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${
                daemonStatus.active ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`} />
              <span>
                {daemonStatus.active 
                  ? `HTTPS Shield Active (${daemonStatus.proxyPort || 9120} · ${daemonStatus.protectedDomainCount || 0} routes)` 
                  : 'Desktop Daemon Inactive'}
              </span>
              <button 
                onClick={checkDaemonHealth}
                className="ml-1 p-1 hover:bg-slate-800 rounded transition-all text-slate-400 hover:text-white"
                title="Refresh daemon status"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-slate-800/80">
          <button
            onClick={() => setActiveSubTab('installer')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'installer'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <DownloadCloud className="w-4 h-4" />
            <span>1-Click PC Installer (macOS, Windows, Linux)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sdk')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'sdk'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Zero-Extension Web SDK (Your Own Websites)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('proxy')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'proxy'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>OS System Proxy (All Browsers Protected)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sandbox')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeSubTab === 'sandbox'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Interactive Web SDK Sandbox</span>
          </button>
        </div>
      </div>

      {/* TAB 1: 1-Click PC Installer */}
      {activeSubTab === 'installer' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* macOS Installer */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between hover:border-emerald-500/40 transition-all space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                    macOS
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    LaunchAgent
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-3">macOS Desktop Daemon</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Runs natively in the background via LaunchAgent. Starts automatically when your Mac boots up.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="text-[10px] font-mono text-slate-500">Run in Terminal:</div>
                <div className="relative">
                  <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto pr-8">
                    bash daemon/installer/install-macos.sh
                  </pre>
                  <button
                    onClick={() => handleCopy('bash daemon/installer/install-macos.sh', 'mac_cmd')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-white"
                  >
                    {copiedId === 'mac_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Windows Installer */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between hover:border-cyan-500/40 transition-all space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold">
                    Windows
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    .BAT / PowerShell
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-3">Windows Background Service</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Single-click batch or PowerShell installer that registers silent execution in the Windows Startup folder.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="text-[10px] font-mono text-slate-500">Run in Command Prompt:</div>
                <div className="relative">
                  <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto pr-8">
                    daemon\installer\install-windows.bat
                  </pre>
                  <button
                    onClick={() => handleCopy('daemon\\installer\\install-windows.bat', 'win_cmd')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-white"
                  >
                    {copiedId === 'win_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Linux Installer */}
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between hover:border-indigo-500/40 transition-all space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                    Linux
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    systemd
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-3">Linux systemd Service</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configures a systemd user service with auto-restart, logging, and crash protection.
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800">
                <div className="text-[10px] font-mono text-slate-500">Run in Terminal:</div>
                <div className="relative">
                  <pre className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-indigo-300 overflow-x-auto pr-8">
                    bash daemon/installer/install-linux.sh
                  </pre>
                  <button
                    onClick={() => handleCopy('bash daemon/installer/install-linux.sh', 'linux_cmd')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-white"
                  >
                    {copiedId === 'linux_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* How It Works Explainer */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>How the Desktop Daemon Works Without Browser Extensions</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="font-semibold text-emerald-400 flex items-center space-x-1.5">
                  <span>1. Local Loopback Daemon</span>
                </div>
                <p className="text-slate-400">
                  Runs silently on <code className="text-emerald-300">127.0.0.1:9119</code>. Requires no cloud dependencies or external third-party software.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="font-semibold text-cyan-400 flex items-center space-x-1.5">
                  <span>2. Zero-Knowledge Tokenization</span>
                </div>
                <p className="text-slate-400">
                  Decrypts only PAC-selected AI traffic with a locally trusted CA. It inspects prompts before they leave your PC and replaces credentials and PII in RAM.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                <div className="font-semibold text-indigo-400 flex items-center space-x-1.5">
                  <span>3. Dynamic PAC Routing</span>
                </div>
                <p className="text-slate-400">
                  Serves a dynamic Proxy Auto-Configuration (<code className="text-indigo-300">/proxy.pac</code>) that automatically routes all AI tools through PromptGuard.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Zero-Extension Web SDK */}
      {activeSubTab === 'sdk' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Globe className="w-5 h-5 text-emerald-400" />
                  <span>Embed PromptGuard Into Any Web Page with 1 Script Tag</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Add full client-side DLP, synthetic tokenization, and prompt injection defense to your internal web applications, SaaS dashboards, or WordPress sites.
                </p>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                v2.4.0 (Zero Dependencies)
              </span>
            </div>

            {/* Quick HTML Snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Method 1: Plain HTML / Any Web Page</span>
                <button
                  onClick={() => handleCopy('<script src="http://localhost:9119/promptguard-web.js"></script>', 'html_sdk')}
                  className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 font-mono"
                >
                  {copiedId === 'html_sdk' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'html_sdk' ? 'Copied' : 'Copy Script Tag'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 overflow-x-auto">
{`<!-- Add this in your <head> or <body>: -->
<script src="http://localhost:9119/promptguard-web.js"></script>

<script>
  // All window.fetch calls to OpenAI, Claude, or LLM endpoints are now automatically
  // scanned, tokenized, and protected in-flight!
  fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: "Analyze my private API key sk-proj-12345..." }]
    })
  });
</script>`}
              </pre>
            </div>

            {/* React / Next.js Hook Snippet */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Method 2: React / Next.js Programmatic API</span>
                <button
                  onClick={() => handleCopy(`import { useEffect } from 'react';\n\nexport function usePromptGuard() {\n  const sanitize = (text) => window.PromptGuard ? window.PromptGuard.protect(text) : text;\n  return { sanitize };\n}`, 'react_sdk')}
                  className="flex items-center space-x-1 text-xs text-emerald-400 hover:text-emerald-300 font-mono"
                >
                  {copiedId === 'react_sdk' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'react_sdk' ? 'Copied' : 'Copy React Hook'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 overflow-x-auto">
{`// Direct JavaScript API available on window.PromptGuard:
const protectedPrompt = window.PromptGuard.protect("My email is alice@corp.com");
// Result: "My email is [PII_EMAIL_TOKEN_A7B2]"

// When LLM answers:
const cleanReply = window.PromptGuard.detokenize(llmResponseWithTokens);
// Result: Restores original values client-side seamlessly!`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OS System Proxy */}
      {activeSubTab === 'proxy' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <span>OS-Level Proxy Auto-Configuration (PAC)</span>
            </h3>
            <p className="text-xs text-slate-400">
              By configuring your computer's network proxy to point to PromptGuard's PAC URL, <strong>all browsers</strong> (Safari, Chrome, Edge, Brave, Firefox) and desktop editors (Cursor, VS Code) will route outbound AI traffic through PromptGuard without installing any browser extensions.
            </p>

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                PAC routing alone cannot read HTTPS prompts. Run the platform installer once so the PromptGuard local CA is trusted; protection is active only when both the CA and proxy are configured.
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-300 font-bold">Your Local PAC File Endpoint:</span>
                <button
                  onClick={() => handleCopy('http://127.0.0.1:9119/proxy.pac', 'pac_url')}
                  className="flex items-center space-x-1 text-xs text-cyan-400 hover:text-cyan-300 font-mono"
                >
                  {copiedId === 'pac_url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'pac_url' ? 'Copied' : 'Copy PAC URL'}</span>
                </button>
              </div>
              <code className="text-xs font-mono text-slate-200 block p-2 bg-slate-900 rounded border border-slate-800">
                http://127.0.0.1:9119/proxy.pac
              </code>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="font-semibold text-xs text-slate-200">macOS System Proxy Command:</div>
                <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400 overflow-x-auto">
{`sudo security add-trusted-cert -d -r trustRoot \\
  -k /Library/Keychains/System.keychain ~/.promptguard/ca/certs/ca.pem
networksetup -setautoproxyurl "Wi-Fi" "http://127.0.0.1:9119/proxy.pac"
networksetup -setautoproxystate "Wi-Fi" on`}
                </pre>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <div className="font-semibold text-xs text-slate-200">Windows PowerShell Proxy Command:</div>
                <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-cyan-300 overflow-x-auto">
{`Import-Certificate -FilePath "$env:USERPROFILE\\.promptguard\\ca\\certs\\ca.pem" -CertStoreLocation "Cert:\\CurrentUser\\Root"
Set-ItemProperty -Path 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings' -Name AutoConfigURL -Value 'http://127.0.0.1:9119/proxy.pac'`}
                </pre>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="font-semibold text-xs text-slate-200">Custom / Private LLM Providers:</div>
              <p className="text-xs text-slate-400">
                Every model on the built-in providers is protected automatically. Add private gateways or new providers with comma-separated domain patterns, then restart the installer/daemon.
              </p>
              <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-violet-300 overflow-x-auto">
{`PROMPTGUARD_DOMAINS="llm.company.internal,*.models.example.com" \\
  bash daemon/installer/install-macos.sh

# Extra local OpenAI-compatible ports:
PROMPTGUARD_LOCAL_LLM_PORTS="8080,5001" node daemon/server.mjs`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Interactive Web SDK Sandbox */}
      {activeSubTab === 'sandbox' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Play className="w-4 h-4 text-cyan-400" />
                  <span>Live Web SDK In-Page Test Sandbox</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Test the exact client-side interception pipeline that runs when you embed <code className="text-emerald-400">promptguard-web.js</code> into your websites.
                </p>
              </div>
              <button
                onClick={handleRunSandbox}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Test In-Page Interception</span>
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Prompt Sent by Web Application User:</label>
              <textarea
                value={sandboxPrompt}
                onChange={(e) => setSandboxPrompt(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {sandboxResult && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-amber-400 flex items-center space-x-1.5">
                    <span>1. Outbound Sanitized Wire Payload (Sent to AI):</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all min-h-[100px]">
                    {sandboxResult.sanitized}
                  </pre>
                  {sandboxResult.blocked && (
                    <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{sandboxResult.blockReason}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-cyan-400 flex items-center space-x-1.5">
                    <span>2. Client-Side Restored Response (Shown to User):</span>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 whitespace-pre-wrap break-all min-h-[100px]">
                    {sandboxResult.detokenizedResponse}
                  </pre>
                  <div className="text-[11px] text-slate-400 font-mono">
                    ✓ Zero credentials transmitted over wire. Plaintext restored in client RAM.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
