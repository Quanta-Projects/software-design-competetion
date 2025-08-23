@echo off
REM Stop Backend Docker Services

echo ========================================
echo  Stopping Backend Services...
echo ========================================

docker-compose -f docker-compose.backend.yml down

if %ERRORLEVEL% equ 0 (
    echo.
    echo [SUCCESS] Backend services stopped successfully!
    echo.
    echo To start again: start-backend.bat
) else (
    echo [ERROR] Failed to stop some services.
    echo Check running containers: docker ps
)

echo.
pause
