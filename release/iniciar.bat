@echo off
title TorrentManager - Servidor BitTorrent Unificado
echo ========================================================
echo               INICIANDO TORRENT MANAGER
echo ========================================================
echo.
echo Abrindo o servidor em http://localhost:3000
echo Pressione Ctrl+C nesta janela para encerrar.
echo.

start http://localhost:3000
"%~dp0TorrentManager.exe"
pause
