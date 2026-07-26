@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title TrollPyla

rem ---------------------------------------------------------------------------
rem Same interpreter search as setup.bat. main.py prints its own banner, so this
rem script stays quiet unless something is wrong.
rem ---------------------------------------------------------------------------
set "PY="
py -3.11 -c "import sys" >nul 2>&1 && set "PY=py -3.11"
if not defined PY py -3 -c "import sys" >nul 2>&1 && set "PY=py -3"
if not defined PY python -c "import sys" >nul 2>&1 && set "PY=python"

if not defined PY (
    echo   [ !! ] No Python found. Run setup.bat first.
    echo.
    pause
    exit /b 1
)

rem A missing model folder almost always means setup was never run.
if not exist "models\mainInGameModel.onnx" (
    echo   [ !! ] Models are missing. Run setup.bat first.
    echo.
    pause
    exit /b 1
)

%PY% main.py
set "CODE=%ERRORLEVEL%"

if not "%CODE%"=="0" (
    echo.
    echo   [ !! ] TrollPyla exited with code %CODE%. Scroll up for the traceback.
    echo.
    pause
)

endlocal
exit /b %CODE%
