#!/usr/bin/env bash
# ==============================================================================
# PromptGuard Gateway — Linux systemd User Service Setup Installer
# ==============================================================================

set -e

echo "=== PromptGuard Gateway Linux Installer ==="

if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is required. Please install Node.js."
    exit 1
fi

NODE_BIN=$(which node)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_FILE="$SCRIPT_DIR/server.mjs"
SYSTEMD_DIR="$HOME/.config/systemd/user"
SERVICE_FILE="$SYSTEMD_DIR/promptguard.service"
CUSTOM_DOMAINS=$(printf '%s' "${PROMPTGUARD_DOMAINS:-}" | tr -cd 'A-Za-z0-9*.,:/_-')
CUSTOM_LOCAL_PORTS=$(printf '%s' "${PROMPTGUARD_LOCAL_LLM_PORTS:-}" | tr -cd '0-9,')

mkdir -p "$SYSTEMD_DIR"

cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=PromptGuard Desktop Gateway Local Proxy Daemon
After=network.target

[Service]
Type=simple
ExecStart=$NODE_BIN $SERVER_FILE
Restart=always
RestartSec=5
Environment=PORT=9119
Environment=PROXY_PORT=9120
Environment="PROMPTGUARD_DOMAINS=$CUSTOM_DOMAINS"
Environment="PROMPTGUARD_LOCAL_LLM_PORTS=$CUSTOM_LOCAL_PORTS"

[Install]
WantedBy=default.target
EOF

systemctl --user daemon-reload
systemctl --user enable promptguard.service
systemctl --user restart promptguard.service

for ATTEMPT in 1 2 3 4 5; do
    if curl -fsS http://127.0.0.1:9119/health >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

CA_CERT="$HOME/.promptguard/ca/certs/ca.pem"
if [ ! -f "$CA_CERT" ]; then
    echo "[ERROR] PromptGuard CA was not generated."
    journalctl --user -u promptguard.service -n 20 --no-pager
    exit 1
fi

if command -v update-ca-certificates >/dev/null 2>&1; then
    echo "Installing PromptGuard CA into the system trust store (sudo required)..."
    sudo install -m 0644 "$CA_CERT" /usr/local/share/ca-certificates/promptguard-ca.crt
    sudo update-ca-certificates
elif command -v update-ca-trust >/dev/null 2>&1; then
    echo "Installing PromptGuard CA into the system trust store (sudo required)..."
    sudo install -m 0644 "$CA_CERT" /etc/pki/ca-trust/source/anchors/promptguard-ca.pem
    sudo update-ca-trust
else
    echo "[WARNING] Could not update the Linux system CA store automatically."
fi

if command -v gsettings >/dev/null 2>&1; then
    gsettings set org.gnome.system.proxy mode 'auto' || true
    gsettings set org.gnome.system.proxy autoconfig-url 'http://127.0.0.1:9119/proxy.pac' || true
    echo "[OK] GNOME automatic proxy configuration enabled."
else
    echo "[INFO] Set your desktop proxy configuration URL to http://127.0.0.1:9119/proxy.pac"
fi

echo "[OK] PromptGuard systemd service started."
echo "Verify status with: systemctl --user status promptguard.service"
echo "PAC URL:     http://127.0.0.1:9119/proxy.pac"
echo "HTTPS proxy: 127.0.0.1:9120"
echo "CA file:     $CA_CERT"
echo "Web SDK URL: http://127.0.0.1:9119/promptguard-web.js"
