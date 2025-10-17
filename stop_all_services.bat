@echo off
REM ============================================================================
REM Quick Stop Script - Stops All Running Services
REM ============================================================================

title Stop All Services

echo.
echo ============================================================================
echo   STOPPING ALL SERVICES
echo ============================================================================
echo.

echo Stopping Maven Backend (Port 8080)...
taskkill /FI "WindowTitle eq Maven Backend*" /T /F >nul 2>&1
if %errorlevel%==0 (
    echo [OK] Maven Backend stopped
) else (
    echo [INFO] Maven Backend was not running
)

echo.
echo Stopping React Frontend (Port 3000)...
taskkill /FI "WindowTitle eq React Frontend*" /T /F >nul 2>&1
if %errorlevel%==0 (
    echo [OK] React Frontend stopped
) else (
    echo [INFO] React Frontend was not running
)

echo.
echo Stopping FastAPI AI Service (Port 8000)...
taskkill /FI "WindowTitle eq FastAPI AI Service*" /T /F >nul 2>&1
if %errorlevel%==0 (
    echo [OK] FastAPI AI Service stopped
) else (
    echo [INFO] FastAPI AI Service was not running
)

echo.
echo Cleaning up processes on ports 8080, 3000, and 8000...

REM Kill processes using these ports (backup cleanup)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

echo.
echo ============================================================================
echo   ALL SERVICES STOPPED
echo ============================================================================
echo.

timeout /t 3 /nobreak >nul
