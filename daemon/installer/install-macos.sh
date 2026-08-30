#!/usr/bin/env bash
# ==============================================================================
# PromptGuard Gateway — macOS Desktop Setup & Service Installer
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}====================================================${NC}"
echo -e "${GREEN}  PromptGuard Gateway — macOS Desktop Installer     ${NC}"
echo -e "${CYAN}====================================================${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js is not installed.${NC} Please install Node.js (v18+) from https://nodejs.org/"
    exit 1
fi

NODE_PATH=$(which node)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_PATH="$SCRIPT_DIR/server.mjs"
PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_FILE="$PLIST_DIR/io.promptguard.gateway.plist"
CUSTOM_DOMAINS=$(printf '%s' "${PROMPTGUARD_DOMAINS:-}" | tr -cd 'A-Za-z0-9*.,:/_-')
CUSTOM_LOCAL_PORTS=$(printf '%s' "${PROMPTGUARD_LOCAL_LLM_PORTS:-}" | tr -cd '0-9,')

echo -e "Node executable: ${CYAN}$NODE_PATH${NC}"
echo -e "Daemon script:   ${CYAN}$SERVER_PATH${NC}"

mkdir -p "$PLIST_DIR"

# Stop existing service if loaded
if launchctl list | grep -q "io.promptguard.gateway"; then
    echo -e "${YELLOW}Stopping existing PromptGuard LaunchAgent...${NC}"
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
fi

# Create LaunchAgent plist
cat <<EOF > "$PLIST_FILE"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>io.promptguard.gateway</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$SERVER_PATH</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/promptguard-daemon.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/promptguard-daemon.err</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PORT</key>
        <string>9119</string>
        <key>PROXY_PORT</key>
        <string>9120</string>
        <key>PROMPTGUARD_DOMAINS</key>
        <string>$CUSTOM_DOMAINS</string>
        <key>PROMPTGUARD_LOCAL_LLM_PORTS</key>
        <string>$CUSTOM_LOCAL_PORTS</string>
    </dict>
</dict>
</plist>
EOF

echo -e "${GREEN}[OK] Created LaunchAgent: $PLIST_FILE${NC}"

# Load service
launchctl load -w "$PLIST_FILE"
echo -e "${GREEN}[OK] PromptGuard Desktop Gateway is now running as a background service!${NC}"

# Health check
sleep 1
if curl -fsS http://127.0.0.1:9119/health > /dev/null; then
    echo -e "${GREEN}✓ Verification Successful! Daemon is active at http://127.0.0.1:9119${NC}"
    echo -e "${CYAN}PAC File URL:${NC} http://127.0.0.1:9119/proxy.pac"
    echo -e "${CYAN}Web SDK URL:${NC}  http://127.0.0.1:9119/promptguard-web.js"
else
    echo -e "${YELLOW}[WARNING] Daemon started but did not respond to initial probe. Check /tmp/promptguard-daemon.log${NC}"
fi

CA_CERT="$HOME/.promptguard/ca/certs/ca.pem"
if [ ! -f "$CA_CERT" ]; then
    echo -e "${YELLOW}[WARNING] Local CA was not generated. Check /tmp/promptguard-daemon.err${NC}"
    exit 1
fi

echo -e "\n${CYAN}Installing the PromptGuard local CA into the macOS System Keychain...${NC}"
echo -e "${YELLOW}macOS will request your administrator password once.${NC}"
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CA_CERT"
echo -e "${GREEN}[OK] PromptGuard CA is trusted for HTTPS inspection.${NC}"

echo -e "${CYAN}Enabling the PromptGuard PAC on macOS network services...${NC}"
networksetup -listallnetworkservices | tail -n +2 | while IFS= read -r NETWORK_SERVICE; do
    case "$NETWORK_SERVICE" in
        \**|'') continue ;;
    esac
    networksetup -setautoproxyurl "$NETWORK_SERVICE" "http://127.0.0.1:9119/proxy.pac"
    networksetup -setautoproxystate "$NETWORK_SERVICE" on
    echo -e "${GREEN}[OK] PAC enabled for: $NETWORK_SERVICE${NC}"
done

echo -e "${CYAN}CA certificate:${NC} $CA_CERT"
echo -e "${CYAN}HTTPS proxy:${NC}   127.0.0.1:9120"
echo -e "\n${GREEN}Setup Complete!${NC}"
