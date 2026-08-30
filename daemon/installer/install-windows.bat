@echo off
REM ==============================================================================
REM PromptGuard Gateway — Windows Setup Installer
REM ==============================================================================
title PromptGuard Gateway — Windows Setup Installer
color 0A

echo ====================================================
echo   PromptGuard Gateway Windows Desktop Installer
echo ====================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-windows.ps1"
if %errorlevel% neq 0 echo [ERROR] PromptGuard installation failed.
pause
