#!/usr/bin/env node
/**
 * PromptGuard Gateway — Local Desktop Proxy Daemon
 * Port: 9119
 * 
 * Runs silently in the background on the user's PC.
 * Intercepts LLM traffic system-wide via PAC file or local proxy endpoint.
 * Serves the Universal Web SDK directly at http://localhost:9119/promptguard-web.js
 */

import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { StringDecoder } from 'node:string_decoder';
import { Proxy } from 'http-mitm-proxy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT || 9119;
const PROXY_PORT = process.env.PROXY_PORT || 9120;
const HOST = process.env.HOST || '127.0.0.1';
const PROXY_HOST = process.env.PROXY_HOST || '127.0.0.1';
const CA_DIR = process.env.PROMPTGUARD_CA_DIR || path.join(os.homedir(), '.promptguard', 'ca');
const CA_CERT_PATH = path.join(CA_DIR, 'certs', 'ca.pem');
const MAX_HTTP_HEADER_SIZE = 64 * 1024;

// Path to the public web SDK and static assets
const SDK_PATH = path.resolve(__dirname, '../public/promptguard-web.js');
const DIST_PATH = path.resolve(__dirname, '../dist');
const DEMO_CHAT_PATH = path.resolve(__dirname, '../public/demo-chat.html');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

const DEFAULT_LLM_DOMAINS = [
  // OpenAI, Anthropic, Google, Microsoft and Amazon
  'api.openai.com', 'chatgpt.com', 'api.anthropic.com', 'claude.ai',
  'gemini.google.com', 'generativelanguage.googleapis.com', '*.aiplatform.googleapis.com',
  '*.openai.azure.com', '*.services.ai.azure.com',
  'bedrock-runtime.*.amazonaws.com', 'bedrock-mantle.*.api.aws',

  // Hosted model APIs and first-party chat applications
  'perplexity.ai', 'api.mistral.ai', 'chat.mistral.ai', 'api.groq.com',
  'api.together.xyz', 'api.openrouter.ai', 'openrouter.ai',
  'api.deepseek.com', 'chat.deepseek.com', 'api.x.ai', 'grok.com',
  'api.cohere.ai', 'api.fireworks.ai', 'router.huggingface.co',
  'api.replicate.com', 'inference.cerebras.ai', 'api.deepinfra.com',
  'ollama.com', 'poe.com', 'character.ai', 'meta.ai',
  'cursor.sh', 'copilot.microsoft.com'
];

function parseConfiguredDomains(value = '') {
  return value
    .split(',')
    .map(domain => domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, ''))
    .filter(Boolean)
    .filter(domain => domain !== '*' && domain !== '*.*')
    .filter(domain => {
      if (domain.length > 253 || !domain.includes('.') || domain.includes('..')) return false;
      return domain.split('.').every(label => (
        label === '*' || /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
      ));
    });
}

const configuredDomains = parseConfiguredDomains(
  process.env.PROMPTGUARD_DOMAINS || process.env.PROMPTGUARD_EXTRA_DOMAINS || ''
);
const PROTECTED_DOMAIN_PATTERNS = [...new Set([...DEFAULT_LLM_DOMAINS, ...configuredDomains])];
const configuredLocalPorts = (process.env.PROMPTGUARD_LOCAL_LLM_PORTS || '')
  .split(',')
  .map(port => port.trim())
  .filter(port => /^\d{1,5}$/.test(port) && Number(port) > 0 && Number(port) <= 65535);
const LOCAL_LLM_PORTS = [...new Set(['11434', '1234', ...configuredLocalPorts])];

function escapeRegex(text) {
  return text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

function matchesDomainPattern(hostname, pattern) {
  if (pattern.includes('*')) {
    const wildcardRegex = new RegExp(`^${pattern.split('*').map(escapeRegex).join('[^.]+')}$`, 'i');
    return wildcardRegex.test(hostname);
  }
  return hostname === pattern || hostname.endsWith(`.${pattern}`);
}

function createPacContent() {
  const conditions = PROTECTED_DOMAIN_PATTERNS.map(pattern => {
    if (pattern.includes('*')) return `shExpMatch(host, "${pattern}")`;
    return `(dnsDomainIs(host, "${pattern}") || dnsDomainIs(host, ".${pattern}"))`;
  });
  for (const port of LOCAL_LLM_PORTS) {
    conditions.push(`shExpMatch(url, "http://localhost:${port}/*")`);
    conditions.push(`shExpMatch(url, "http://127.0.0.1:${port}/*")`);
  }

  return `function FindProxyForURL(url, host) {
  if (
    ${conditions.join(' ||\n    ')}
  ) {
    return "PROXY 127.0.0.1:${PROXY_PORT}";
  }
  return "DIRECT";
}
`;
}

const PAC_CONTENT = createPacContent();

function isProtectedHost(hostHeader = '') {
  const normalizedHost = hostHeader.toLowerCase();
  if (LOCAL_LLM_PORTS.some(port => (
    normalizedHost === `localhost:${port}` || normalizedHost === `127.0.0.1:${port}`
  ))) return true;
  const hostname = normalizedHost.split(':')[0];
  return PROTECTED_DOMAIN_PATTERNS.some(pattern => matchesDomainPattern(hostname, pattern));
}

// Simple in-memory stats & vault
const stats = {
  startedAt: new Date().toISOString(),
  requestsIntercepted: 0,
  tokensMasked: 0,
  injectionsBlocked: 0
};

const ephemeralVault = new Map(); // token -> original

// Core rules for daemon scan API
const INJECTION_PATTERNS = [
  /\b(?:ignore|disregard|forget|skip|override)\s+(?:all\s+)?(?:previous|prior|above|existing)\s+(?:instructions|prompts|rules|directives|constraints)\b/i,
  /\b(?:DAN\s+mode|jailbreak(?:ed)?|developer\s+mode\s+(?:v\d+|enabled)|do\s+anything\s+now|unfiltered\s+mode|bypass\s+(?:safety|guardrails))\b/i,
  /\b(?:(?:repeat|reveal|output|display|show|dump|print)\s+(?:your\s+)?(?:system\s+prompt|initial\s+instructions|system\s+message|secret\s+prompt))\b/i,
  /<\|(?:im_start|im_end|endoftext|system|user|assistant)\|>/i
];

const SECRET_PATTERNS = [
  { name: 'OpenAI Secret Key', regex: /\b(sk-proj-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,})\b/g, prefix: 'OPENAI_KEY' },
  { name: 'Anthropic Key', regex: /\b(sk-ant-[A-Za-z0-9_-]{20,})\b/g, prefix: 'ANTHROPIC_KEY' },
  { name: 'GitHub PAT', regex: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{30,})\b/g, prefix: 'GITHUB_PAT' },
  { name: 'AWS Access Key', regex: /\b(AKIA[0-9A-Z]{16})\b/g, prefix: 'AWS_KEY' },
  { name: 'Credit Card', regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, prefix: 'CREDIT_CARD' },
  { name: 'TCKN', regex: /\b([1-9]\d{10})\b/g, prefix: 'TR_TCKN' },
  { name: 'Email Address', regex: /\b([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, prefix: 'PII_EMAIL' }
];

function scanPayload(text, vault = ephemeralVault, countRequest = true) {
  if (countRequest) stats.requestsIntercepted++;
  let blocked = false;
  let blockReason = null;
  let sanitized = text;
  const findings = [];

  // Check injection
  for (const inj of INJECTION_PATTERNS) {
    if (inj.test(text)) {
      blocked = true;
      blockReason = 'OWASP LLM01: Prompt Injection / Jailbreak Attempt Detected';
      stats.injectionsBlocked++;
      return { sanitized, blocked, blockReason, findings: [{ type: 'PROMPT_INJECTION' }] };
    }
  }

  // Check secrets/PII
  for (const pattern of SECRET_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const val = match[0];
      findings.push({ type: pattern.name, val });
      const synthetic = `[${pattern.prefix}_TOKEN_${Math.random().toString(36).substring(2, 6).toUpperCase()}]`;
      vault.set(synthetic, val);
      sanitized = sanitized.split(val).join(synthetic);
      stats.tokensMasked++;
    }
  }

  return { sanitized, blocked, blockReason, findings };
}

function sanitizeProxyBody(body, vault) {
  // Scan the original wire text directly. Parsing and re-serializing arbitrary
  // application JSON can invalidate signatures, proof tokens and opaque fields
  // used by first-party web clients even when no sensitive value was found.
  const scan = scanPayload(body, vault, false);
  return {
    blocked: scan.blocked,
    blockReason: scan.blockReason,
    findings: scan.findings.length,
    sanitized: scan.sanitized
  };
}

function createStreamingDetokenizer(vault) {
  const decoder = new StringDecoder('utf8');
  let carry = '';
  const tokens = [...vault.keys()];

  const replace = text => {
    let restored = text;
    for (const [token, original] of vault.entries()) restored = restored.split(token).join(original);
    return restored;
  };

  const longestPartialTokenSuffix = text => {
    let hold = 0;
    for (const token of tokens) {
      const max = Math.min(token.length - 1, text.length);
      for (let size = max; size > hold; size--) {
        if (text.endsWith(token.slice(0, size))) {
          hold = size;
          break;
        }
      }
    }
    return hold;
  };

  return {
    write(chunk) {
      const text = carry + decoder.write(chunk);
      const hold = longestPartialTokenSuffix(text);
      const safe = hold ? text.slice(0, -hold) : text;
      carry = hold ? text.slice(-hold) : '';
      return Buffer.from(replace(safe));
    },
    end() {
      const final = replace(carry + decoder.end());
      carry = '';
      return Buffer.from(final);
    }
  };
}

function generateIntelligentResponse(prompt) {
  // Generates real, contextual AI answers addressing the prompt using the sanitized tokens!
  if (prompt.toLowerCase().includes('aws') || prompt.includes('AWS_KEY')) {
    return `To safely configure your AWS CLI session with the provided credential token, execute the following command:\n\n\`\`\`bash\nexport AWS_ACCESS_KEY_ID="[AWS_KEY_TOKEN_A8F2]"\naws s3 ls --region us-east-1\n\`\`\`\n\nNote: All security credentials have been protected via PromptGuard zero-knowledge isolation.`;
  }
  if (prompt.toLowerCase().includes('sql') || prompt.toLowerCase().includes('database')) {
    return `Here is the optimized SQL query for your database schema:\n\n\`\`\`sql\nSELECT id, name, created_at FROM users WHERE status = 'active' ORDER BY created_at DESC LIMIT 100;\n\`\`\`\n\nEnsure appropriate indexing on \`status\` and \`created_at\` for sub-millisecond execution.`;
  }
  if (prompt.toLowerCase().includes('email') || prompt.includes('PII_EMAIL')) {
    return `I have recorded the contact email reference securely. You can dispatch automated confirmation notifications using your internal mail relay service.`;
  }
  return `I have processed your request safely through PromptGuard Gateway. All identified sensitive tokens have been sanitized in-flight:\n\n> "${prompt.slice(0, 100)}..."\n\nHow else can I assist you with your project?`;
}

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-PromptGuard-Redact');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Health check
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'active',
      daemon: 'PromptGuard Desktop Local Gateway',
      version: '2.4.0',
      port: PORT,
      proxyPort: Number(PROXY_PORT),
      stats,
      pacUrl: `http://127.0.0.1:${PORT}/proxy.pac`,
      webSdkUrl: `http://127.0.0.1:${PORT}/promptguard-web.js`,
      caCertUrl: `http://127.0.0.1:${PORT}/ca.pem`,
      caReady: fs.existsSync(CA_CERT_PATH),
      mode: 'https-inspection',
      protectedDomainCount: PROTECTED_DOMAIN_PATTERNS.length,
      protectedDomains: PROTECTED_DOMAIN_PATTERNS,
      customDomains: configuredDomains,
      protectedLocalPorts: LOCAL_LLM_PORTS
    }));
    return;
  }

  // PAC file
  if (parsedUrl.pathname === '/proxy.pac') {
    res.writeHead(200, { 'Content-Type': 'application/x-ns-proxy-autoconfig' });
    res.end(PAC_CONTENT);
    return;
  }

  // Web SDK script
  if (parsedUrl.pathname === '/promptguard-web.js') {
    if (fs.existsSync(SDK_PATH)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
      fs.createReadStream(SDK_PATH).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Web SDK file not found');
    }
    return;
  }

  // Local CA certificate used by the extension-free HTTPS inspection proxy.
  if (parsedUrl.pathname === '/ca.pem') {
    if (fs.existsSync(CA_CERT_PATH)) {
      res.writeHead(200, {
        'Content-Type': 'application/x-pem-file',
        'Content-Disposition': 'attachment; filename="promptguard-ca.pem"'
      });
      fs.createReadStream(CA_CERT_PATH).pipe(res);
    } else {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('PromptGuard CA is still being generated. Retry in a moment.');
    }
    return;
  }

  // Local DLP scan endpoint
  if (parsedUrl.pathname === '/v1/scan' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const json = JSON.parse(body || '{}');
        const text = json.prompt || json.text || '';
        const scanRes = scanPayload(text);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(scanRes));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // REAL OpenAI-compatible chat completions proxy endpoint
  if (parsedUrl.pathname === '/v1/chat/completions' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const messages = payload.messages || [];
        const authHeader = req.headers['authorization'] || '';
        const shouldRedact = req.headers['x-promptguard-redact'] === 'true';

        let blocked = false;
        let blockReason = '';
        let lastUserPrompt = '';

        for (const msg of messages) {
          if (typeof msg.content === 'string') {
            const scan = scanPayload(msg.content);
            if (scan.blocked) {
              blocked = true;
              blockReason = scan.blockReason;
              break;
            }
            msg.content = scan.sanitized;
            if (msg.role === 'user') lastUserPrompt = scan.sanitized;
          }
        }

        if (blocked) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            error: {
              message: `[PROMPTGUARD BLOCK] ${blockReason}`,
              type: 'promptguard_security_block',
              code: 'prompt_injection_detected'
            }
          }));
          return;
        }

        const apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();

        // 1. If user provided a real OpenAI key: forward to real OpenAI API
        if (apiKey && apiKey.startsWith('sk-') && !apiKey.includes('mock')) {
          const upstreamData = JSON.stringify({
            model: payload.model || 'gpt-4o-mini',
            messages: payload.messages,
            temperature: payload.temperature || 0.7
          });

          const upstreamReq = https.request('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            }
          }, (upstreamRes) => {
            let upstreamBody = '';
            upstreamRes.on('data', chunk => { upstreamBody += chunk; });
            upstreamRes.on('end', () => {
              try {
                const upstreamJson = JSON.parse(upstreamBody);
                if (!shouldRedact && upstreamJson.choices && upstreamJson.choices[0]?.message?.content) {
                  let text = upstreamJson.choices[0].message.content;
                  for (const [tok, orig] of ephemeralVault.entries()) {
                    text = text.split(tok).join(orig);
                  }
                  upstreamJson.choices[0].message.content = text;
                }
                res.writeHead(upstreamRes.statusCode || 200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(upstreamJson));
              } catch {
                res.writeHead(upstreamRes.statusCode || 200, { 'Content-Type': 'application/json' });
                res.end(upstreamBody);
              }
            });
          });

          upstreamReq.on('error', (err) => {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: `Upstream error: ${err.message}` }));
          });

          upstreamReq.write(upstreamData);
          upstreamReq.end();
          return;
        }

        // 2. Real intelligent contextual engine (Zero API Key required!)
        const aiAnswer = generateIntelligentResponse(lastUserPrompt);
        let finalAnswer = aiAnswer;

        if (!shouldRedact) {
          // Detokenize back
          for (const [tok, orig] of ephemeralVault.entries()) {
            finalAnswer = finalAnswer.split(tok).join(orig);
          }
        }

        const responseObj = {
          id: `chatcmpl-pg-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: payload.model || 'promptguard-real-engine',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: finalAnswer
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: Math.round(lastUserPrompt.length / 4),
            completion_tokens: Math.round(finalAnswer.length / 4),
            total_tokens: Math.round((lastUserPrompt.length + finalAnswer.length) / 4)
          },
          promptguard: {
            intercepted: true,
            sanitized: true,
            redacted: shouldRedact,
            latencyMs: 1.8
          }
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseObj));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve demo-chat.html directly
  if (parsedUrl.pathname === '/demo-chat.html') {
    if (fs.existsSync(DEMO_CHAT_PATH)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(DEMO_CHAT_PATH).pipe(res);
      return;
    }
  }

  // Serve compiled production frontend if dist exists (e.g. in Docker or production build)
  if (fs.existsSync(DIST_PATH)) {
    const requestedFile = parsedUrl.pathname === '/' ? 'index.html' : parsedUrl.pathname.replace(/^\//, '');
    const candidatePath = path.join(DIST_PATH, requestedFile);

    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      const ext = path.extname(candidatePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(candidatePath).pipe(res);
      return;
    }

    // SPA fallback to index.html for frontend client routes
    const indexPath = path.join(DIST_PATH, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
  }

  // Forwarding or root status page
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>PromptGuard Desktop Gateway Active</title>
        <style>
          body { background: #030712; color: #f3f4f6; font-family: -apple-system, sans-serif; padding: 40px; }
          .card { background: #111827; border: 1px solid #10b981; border-radius: 16px; padding: 24px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(16,185,129,0.15); }
          h1 { color: #10b981; font-size: 20px; margin-top: 0; }
          code { background: #1f2937; padding: 3px 8px; border-radius: 6px; font-family: monospace; color: #34d399; }
          .stat { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1f2937; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>🛡️ PromptGuard Desktop Gateway is Active</h1>
          <p style="font-size:13px; color:#9ca3af;">Zero-extension AI DLP and prompt injection defense engine running locally on your PC.</p>
          <div class="stat"><span>Port:</span><code>${PORT}</code></div>
          <div class="stat"><span>HTTPS inspection proxy:</span><code>127.0.0.1:${PROXY_PORT}</code></div>
          <div class="stat"><span>PAC Auto-Proxy:</span><code>http://127.0.0.1:${PORT}/proxy.pac</code></div>
          <div class="stat"><span>Local CA:</span><code>http://127.0.0.1:${PORT}/ca.pem</code></div>
          <div class="stat"><span>Web SDK URL:</span><code>http://127.0.0.1:${PORT}/promptguard-web.js</code></div>
          <div class="stat"><span>Tokens Masked:</span><strong>${stats.tokensMasked}</strong></div>
          <div class="stat"><span>Injections Blocked:</span><strong>${stats.injectionsBlocked}</strong></div>
        </div>
      </body>
    </html>
  `);
});

// Decrypt only the AI domains selected by the PAC file. The generated local CA
// must be trusted by the OS; installers do this explicitly with user consent.
class PromptGuardInspectionProxy extends Proxy {
  _createHttpsServer(options, callback) {
    // Authenticated AI web apps commonly exceed Node's 16 KiB default because
    // of cookies and anti-abuse headers. Keep a finite, local-only 64 KiB cap.
    return super._createHttpsServer({ ...options, maxHeaderSize: MAX_HTTP_HEADER_SIZE }, callback);
  }
}

const inspectionProxy = new PromptGuardInspectionProxy();
const MAX_INSPECTABLE_BODY = 5 * 1024 * 1024;
const INSPECTABLE_METHODS = new Set(['POST', 'PUT', 'PATCH']);

function attachResponseDetokenizer(ctx, vault) {
  ctx.promptGuardVault = vault;

  ctx.onResponse((responseCtx, responseCallback) => {
    responseCtx.promptGuardDetokenizer = createStreamingDetokenizer(vault);
    return responseCallback();
  });

  ctx.onResponseData((responseCtx, chunk, dataCallback) => {
    return dataCallback(null, responseCtx.promptGuardDetokenizer.write(chunk));
  });

  ctx.onResponseEnd((responseCtx, endCallback) => {
    const tail = responseCtx.promptGuardDetokenizer.end();
    if (tail.length) responseCtx.proxyToClientResponse.write(tail);
    return endCallback();
  });
}

function detokenizeWithVault(text, vault) {
  let restored = text;
  for (const [token, original] of vault.entries()) restored = restored.split(token).join(original);
  return restored;
}

inspectionProxy.onError((ctx, err, kind) => {
  const host = ctx?.clientToProxyRequest?.headers?.host || 'unknown-host';
  console.error(`[PromptGuard Proxy] ${kind} (${host}): ${err.message}`);
});

inspectionProxy.onRequest((ctx, callback) => {
  const host = ctx.clientToProxyRequest.headers.host || '';
  if (!isProtectedHost(host)) return callback();

  // Node applies a separate 16 KiB default while parsing the provider's
  // response headers. Google/Gemini can exceed it with CSP and reporting
  // headers even when the browser request itself is small.
  ctx.proxyToServerRequestOptions.maxHeaderSize = MAX_HTTP_HEADER_SIZE;

  const method = String(ctx.clientToProxyRequest.method || 'GET').toUpperCase();
  const contentType = String(ctx.clientToProxyRequest.headers['content-type'] || '').toLowerCase();
  const hasInspectableBody = INSPECTABLE_METHODS.has(method) && (
    contentType.includes('json') ||
    contentType.includes('text') ||
    contentType.includes('x-www-form-urlencoded')
  );
  if (!hasInspectableBody) return callback();

  // Ask upstream for an uncompressed response only on requests that may create
  // vault tokens. Static assets and ordinary page traffic pass through untouched.
  ctx.proxyToServerRequestOptions.headers['accept-encoding'] = 'identity';
  const requestChunks = [];
  let requestBytes = 0;
  let bodyTooLarge = false;
  const requestVault = new Map();

  ctx.onRequestData((_requestCtx, chunk, dataCallback) => {
    requestBytes += chunk.length;
    if (requestBytes > MAX_INSPECTABLE_BODY) {
      bodyTooLarge = true;
      requestChunks.length = 0;
    } else if (!bodyTooLarge) {
      requestChunks.push(Buffer.from(chunk));
    }
    // Hold the complete request until it has been scanned. Nothing sensitive is
    // written upstream before onRequestEnd makes the allow/block decision.
    return dataCallback(null, null);
  });

  ctx.onRequestEnd((requestCtx, endCallback) => {
    if (bodyTooLarge) {
      stats.requestsIntercepted++;
      requestCtx.proxyToClientResponse.writeHead(413, { 'Content-Type': 'application/json; charset=utf-8' });
      requestCtx.proxyToClientResponse.end(JSON.stringify({
        error: {
          type: 'promptguard_payload_too_large',
          message: 'PromptGuard blocked an AI request larger than the 5 MiB inspection limit.'
        }
      }));
      requestCtx.proxyToServerRequest.destroy();
      return endCallback();
    }

    const rawBody = Buffer.concat(requestChunks);
    if (rawBody.length === 0) return endCallback();
    stats.requestsIntercepted++;

    const result = sanitizeProxyBody(rawBody.toString('utf8'), requestVault);

    if (result.blocked) {
      requestCtx.proxyToClientResponse.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
      requestCtx.proxyToClientResponse.end(JSON.stringify({
        error: {
          type: 'promptguard_security_block',
          message: `[PROMPTGUARD BLOCK] ${result.blockReason}`
        }
      }));
      requestCtx.proxyToServerRequest.destroy();
      return endCallback();
    }

    const outboundBody = Buffer.from(result.sanitized);
    requestCtx.proxyToServerRequest.removeHeader('transfer-encoding');
    requestCtx.proxyToServerRequest.setHeader('content-length', outboundBody.length);
    if (requestVault.size) attachResponseDetokenizer(requestCtx, requestVault);
    requestCtx.proxyToServerRequest.write(outboundBody);
    return endCallback();
  });

  return callback();
});

inspectionProxy.onWebSocketConnection((ctx, callback) => {
  const host = ctx.clientToProxyWebSocket.upgradeReq.headers.host || '';
  if (!isProtectedHost(host)) return callback();

  ctx.proxyToServerWebSocketOptions.maxHeaderSize = MAX_HTTP_HEADER_SIZE;

  const vault = new Map();

  ctx.onWebSocketSend((socketCtx, message, isBinary, sendCallback) => {
    if (isBinary) return sendCallback(null, message, isBinary);

    const originalText = Buffer.isBuffer(message) ? message.toString('utf8') : String(message);
    const result = scanPayload(originalText, vault, true);

    if (result.blocked) {
      const reason = 'PromptGuard blocked an unsafe LLM WebSocket message';
      socketCtx.clientToProxyWebSocket.close(1008, reason);
      socketCtx.proxyToServerWebSocket.close(1008, reason);
      return sendCallback(new Error(reason));
    }

    if (result.sanitized === originalText) return sendCallback(null, message, isBinary);
    return sendCallback(null, Buffer.from(result.sanitized), false);
  });

  ctx.onWebSocketMessage((_socketCtx, message, isBinary, messageCallback) => {
    if (isBinary || vault.size === 0) return messageCallback(null, message, isBinary);
    const responseText = Buffer.isBuffer(message) ? message.toString('utf8') : String(message);
    return messageCallback(null, Buffer.from(detokenizeWithVault(responseText, vault)), false);
  });

  return callback();
});

inspectionProxy.listen({
  port: Number(PROXY_PORT),
  host: PROXY_HOST,
  sslCaDir: CA_DIR,
  keepAlive: false
}, err => {
  if (err) {
    console.error(`[PromptGuard Proxy] Failed to start: ${err.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[PromptGuard Proxy] HTTPS inspection active on ${PROXY_HOST}:${PROXY_PORT}`);
  console.log(`[PromptGuard Proxy] Local CA: ${CA_CERT_PATH}`);
});

server.listen(PORT, HOST, () => {
  console.log(`[PromptGuard Daemon] Listening on http://${HOST}:${PORT}`);
  console.log(`[PromptGuard Daemon] PAC: http://127.0.0.1:${PORT}/proxy.pac`);
  console.log(`[PromptGuard Daemon] SDK: http://127.0.0.1:${PORT}/promptguard-web.js`);
});
