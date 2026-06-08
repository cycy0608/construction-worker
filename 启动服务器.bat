@echo off
chcp 65001 >nul
title 工地临时人员管理系统

set "NODE_PATH=C:\Users\Administrator\AppData\Roaming\TRAE SOLO CN\ModularData\ai-agent\vm\tools\node"
set "PATH=%NODE_PATH%;%PATH%"

cd /d "%~dp0server"
node index.js
pause