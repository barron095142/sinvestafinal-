@echo off
title Sinvesta Group - local website preview
cd /d "%~dp0"

echo.
echo  ============================================
echo    SINVESTA GROUP - local website preview
echo  ============================================
echo.
echo    Opening:  http://127.0.0.1:8899
echo.
echo    KEEP THIS BLACK WINDOW OPEN while you browse.
echo    Close it (or press Ctrl+C) to stop the server.
echo.
echo  ============================================
echo.

REM Give the server a moment to bind, then open the default browser.
REM `explorer` is used rather than `start` to avoid nested-quote problems in batch.
start "" /min cmd /c "timeout /t 2 /nobreak >nul & explorer http://127.0.0.1:8899/index.html"

python -m http.server 8899 --bind 127.0.0.1

REM If we reach here the server stopped or failed to start.
echo.
echo  --------------------------------------------
echo   The server stopped.
echo.
echo   If it closed straight away, port 8899 is
echo   probably already in use - close any other
echo   preview window and run this again.
echo.
echo   If it said 'python is not recognized',
echo   install Python from https://python.org
echo   and tick "Add Python to PATH".
echo  --------------------------------------------
echo.
pause
