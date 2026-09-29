@echo off
REM ============================================================
REM TRADING COMPANEY - Windows Startup (WSL wrapper)
REM ============================================================
REM The repo's canonical home is now WSL:
REM   /home/chinque/projects/TRADING-COMPANEY
REM This wrapper just delegates to the Linux lifecycle scripts,
REM so there is ONE start/stop code path to maintain.
REM Usage (double-click or from cmd): start.bat
REM ============================================================

set DISTRO=Ubuntu-22.04
set REPO=/home/chinque/projects/TRADING-COMPANEY

echo === Trading Company Auto-Start (via WSL %DISTRO%) ===
echo.

wsl -d %DISTRO% -e bash -c "cd %REPO% && bash start.sh"
if errorlevel 1 (
  echo.
  echo [FAIL] start.sh reported an error. Read the output above.
  pause
  exit /b 1
)

echo.
echo Engine:   http://127.0.0.1:3001   ^(inside WSL; localhost forwarding applies^)
echo Terminal: http://127.0.0.1:3000
echo Stop:     wsl -d %DISTRO% -e bash -c "cd %REPO% ^&^& bash stop.sh"
echo.
echo Public URL (optional): bash tools/bore-tunnel.sh  ^(run inside WSL^)
pause
