@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title TrollPyla - setup

echo.
echo   /\_/\    T R O L L P Y L A
echo  ( o.o )   -------------------
echo   ^> ^^ ^<    setup
echo.

rem ---------------------------------------------------------------------------
rem Locate a Python interpreter. TrollPyla inherits PylaAI's requirement of
rem Python 3.11, so the 3.11 launcher is preferred, then any 3.x, then whatever
rem "python" happens to be on PATH.
rem ---------------------------------------------------------------------------
set "PY="
py -3.11 -c "import sys" >nul 2>&1 && set "PY=py -3.11"
if not defined PY py -3 -c "import sys" >nul 2>&1 && set "PY=py -3"
if not defined PY python -c "import sys" >nul 2>&1 && set "PY=python"

if not defined PY (
    echo   [ !! ] No Python found on this machine.
    echo          Install Python 3.11.9 and tick "Add python.exe to PATH":
    echo          https://www.python.org/downloads/release/python-3119/
    echo.
    pause
    exit /b 1
)

for /f "delims=" %%v in ('%PY% -c "import sys;print(sys.version.split()[0])"') do set "PYVER=%%v"
echo   [ ok ] Using Python %PYVER% (%PY%)

%PY% -c "import sys;sys.exit(0 if sys.version_info[:2]==(3,11) else 1)" >nul 2>&1
if errorlevel 1 (
    echo   [ ?? ] PylaAI targets Python 3.11. %PYVER% may work, or may not.
    echo          Press any key to try anyway, or close this window.
    pause >nul
)

echo   [ .. ] Waking the hamsters and installing dependencies.
echo          This downloads PyTorch, so it can take a while. Go get a drink.
echo.

%PY% setup.py install
if errorlevel 1 (
    echo.
    echo   [ !! ] Setup did not finish. Scroll up for the actual error.
    echo.
    pause
    exit /b 1
)

echo.
echo   [ ok ] Setup complete. Run start.bat to release the beast.
echo.
pause
endlocal
