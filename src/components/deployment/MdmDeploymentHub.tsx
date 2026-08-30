import React, { useState } from 'react';
import { 
  DownloadCloud, 
  Terminal, 
  Copy, 
  Check, 
  ShieldCheck, 
  Laptop, 
  Server, 
  Code2,
  FileCheck2
} from 'lucide-react';

export const MdmDeploymentHub: React.FC = () => {
  const [activeMdmTab, setActiveMdmTab] = useState<'intune' | 'jamf' | 'gpo' | 'googleAdmin' | 'gatewayDocker'>('intune');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CHROME_EXTENSION_ID = 'kmegfkckldmbidafocnbphknjjfdflgl';

  const INTUNE_OMA_URI_POLICY = `OMA-URI: ./Device/Vendor/MSFT/Policy/Config/Chrome~Policy~googlechrome~Extensions/ExtensionInstallForcelist
Value (String XML):
<enabled/>
<data id="ExtensionInstallForcelistDesc" value="1&#xF000;${CHROME_EXTENSION_ID};https://clients2.google.com/service/update2/crx"/>`;

  const JAMF_MANAGED_SCHEMA_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>ExtensionInstallForcelist</key>
  <array>
    <string>${CHROME_EXTENSION_ID};https://clients2.google.com/service/update2/crx</string>
  </array>
  <key>PromptGuardGatewayEndpoint</key>
  <string>https://gateway.acmecorp.internal:8443</string>
  <key>PromptGuardZeroDisruptionTokenization</key>
  <true/>
</dict>
</plist>`;

  const GPO_REGISTRY_COMMAND = `reg add "HKLM\\Software\\Policies\\Google\\Chrome\\ExtensionInstallForcelist" /v 1 /t REG_SZ /d "${CHROME_EXTENSION_ID};https://clients2.google.com/service/update2/crx" /f
reg add "HKLM\\Software\\Policies\\Microsoft\\Edge\\ExtensionInstallForcelist" /v 1 /t REG_SZ /d "${CHROME_EXTENSION_ID};https://edge.microsoft.com/extensionendpoints/crx" /f`;

  const DOCKER_COMPOSE_GATEWAY = `version: '3.8'
services:
  promptguard-proxy:
    image: promptguard/gateway-rust:latest
    container_name: promptguard_proxy_node
    restart: always
    ports:
      - "8443:8443"
    environment:
      - PROMPTGUARD_ORG_ID=org_acme_prod_9941
      - PROMPTGUARD_AES_KEY_VAULT=ephemeral_local_ram
      - PROMPTGUARD_SOC2_AUDIT_LOG_URL=https://audit-vault.acme.internal
      - PROMPTGUARD_LATENCY_CEILING_MS=5
    volumes:
      - ./certs:/etc/ssl/promptguard:ro
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400">
              <DownloadCloud className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-white">
                Enterprise MDM & Gateway Deployment Hub
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Roll out the PromptGuard zero-disruption extension to 500+ employees in 10 minutes via Microsoft Intune, Jamf Pro, Google Admin, or Docker.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-mono text-emerald-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>MDM Enforced: Employees Cannot Disable</span>
        </div>
      </div>

      {/* Deployment Mode Switcher */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'intune', label: 'Microsoft Intune (Windows & Edge)', icon: Laptop },
          { id: 'jamf', label: 'Jamf Pro (macOS & Chrome)', icon: Laptop },
          { id: 'gpo', label: 'Windows Active Directory GPO', icon: Server },
          { id: 'gatewayDocker', label: 'Self-Hosted Rust Gateway (Docker)', icon: Terminal }
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveMdmTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                activeMdmTab === tab.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Code Config Box */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-white">
              {activeMdmTab === 'intune' && 'Microsoft Intune Configuration Profile Policy'}
              {activeMdmTab === 'jamf' && 'Jamf Pro Configuration Profile (macOS Plist)'}
              {activeMdmTab === 'gpo' && 'Group Policy Object (GPO) Deployment Command'}
              {activeMdmTab === 'gatewayDocker' && 'Self-Hosted Zero-Disruption Rust Gateway (docker-compose.yml)'}
            </h2>
          </div>

          <button
            onClick={() => {
              const text = 
                activeMdmTab === 'intune' ? INTUNE_OMA_URI_POLICY :
                activeMdmTab === 'jamf' ? JAMF_MANAGED_SCHEMA_PLIST :
                activeMdmTab === 'gpo' ? GPO_REGISTRY_COMMAND : DOCKER_COMPOSE_GATEWAY;
              handleCopy(text, activeMdmTab);
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
          >
            {copiedId === activeMdmTab ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedId === activeMdmTab ? 'Copied to Clipboard!' : 'Copy Config'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 whitespace-pre-wrap break-all leading-relaxed overflow-x-auto">
          {activeMdmTab === 'intune' && INTUNE_OMA_URI_POLICY}
          {activeMdmTab === 'jamf' && JAMF_MANAGED_SCHEMA_PLIST}
          {activeMdmTab === 'gpo' && GPO_REGISTRY_COMMAND}
          {activeMdmTab === 'gatewayDocker' && DOCKER_COMPOSE_GATEWAY}
        </pre>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start space-x-3 text-xs text-slate-400">
          <FileCheck2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-200 font-semibold">Automatic Zero-Touch Installation: </strong>
            Once pushed via MDM, the extension installs silently in all employee browsers, intercepts web AI endpoints (ChatGPT, Claude, Perplexity), and forces encryption without requiring any employee sign-up or manual configuration.
          </div>
        </div>
      </div>
    </div>
  );
};
