@echo off
chcp 65001 >nul
title Luodong Nice訂房系統

echo =======================================================
echo 🏠 Luodong Nice訂房系統 啟動中...
echo =======================================================

start http://localhost:3000
node server.js

pause

