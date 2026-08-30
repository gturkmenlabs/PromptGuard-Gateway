# ==============================================================================
# PromptGuard Gateway — Windows PowerShell Setup Installer
# ==============================================================================

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  PromptGuard Gateway — Windows PowerShell Setup   " -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Node.js not detected in PATH. Please install Node.js." -ForegroundColor Red
    exit 1
}

$scriptDir = Split-Path -Parent $PSScriptRoot
$serverScript = Join-Path $scriptDir "server.mjs"
$projectDir = Split-Path -Parent $scriptDir
$startupDir = [System.IO.Path]::Combine($env:APPDATA, "Microsoft\Windows\Start Menu\Programs\Startup")
$vbsPath = Join-Path $startupDir "PromptGuardDaemon.vbs"

$vbsContent = @"
Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "node ""$serverScript""", 0, False
"@

Set-Content -Path $vbsPath -Value $vbsContent
Write-Host "[OK] Created startup launcher at: $vbsPath" -ForegroundColor Green

# Start daemon
Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`""
Start-Sleep -Seconds 2

try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:9119/health" -Method Get -TimeoutSec 3
    Write-Host "[OK] PromptGuard Gateway is active on port 9119!" -ForegroundColor Green
    Write-Host "PAC URL: http://127.0.0.1:9119/proxy.pac" -ForegroundColor Cyan
    Write-Host "SDK URL: http://127.0.0.1:9119/promptguard-web.js" -ForegroundColor Cyan
} catch {
    Write-Host "[ERROR] Daemon did not start. Run npm install in $projectDir and retry." -ForegroundColor Red
    exit 1
}

$caPath = Join-Path $env:USERPROFILE ".promptguard\ca\certs\ca.pem"
if (-not (Test-Path $caPath)) {
    Write-Host "[ERROR] PromptGuard CA was not generated: $caPath" -ForegroundColor Red
    exit 1
}

Import-Certificate -FilePath $caPath -CertStoreLocation "Cert:\CurrentUser\Root" | Out-Null
Write-Host "[OK] PromptGuard CA trusted for the current user." -ForegroundColor Green

$internetSettings = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
Set-ItemProperty -Path $internetSettings -Name AutoConfigURL -Value 'http://127.0.0.1:9119/proxy.pac'
Set-ItemProperty -Path $internetSettings -Name ProxyEnable -Value 0
Write-Host "[OK] PAC enabled for Windows browsers and system web clients." -ForegroundColor Green
Write-Host "HTTPS inspection proxy: 127.0.0.1:9120" -ForegroundColor Cyan

Write-Host "Setup Completed successfully!" -ForegroundColor Green
