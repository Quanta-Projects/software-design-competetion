@echo off
REM Simple Backend Docker Setup
REM This script starts only the backend and database containers

echo ========================================
echo  Transformer Management System
echo  Backend-Only Docker Setup
echo ========================================

REM Check if Docker is available
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH
    pause
    exit /b 1
)

where docker-compose >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker Compose is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo Please ensure .env file is in the same directory as this script.
    pause
    exit /b 1
)

echo [INFO] Starting Backend Services...
echo.

REM Create uploads directory if it doesn't exist
if not exist "uploads" (
    echo [INFO] Creating uploads directory...
    mkdir uploads
    mkdir uploads\images
)

REM Start the backend services
echo [INFO] Building and starting containers...
docker-compose -f docker-compose.backend.yml up --build -d

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to start containers!
    pause
    exit /b 1
)

echo.
echo [INFO] Waiting for services to be ready...
timeout /t 30 /nobreak >nul

echo.
echo [INFO] Checking service health...
docker-compose -f docker-compose.backend.yml ps

echo.
echo ========================================
echo  Backend Services Started Successfully!
echo ========================================
echo.
echo  Backend API: http://localhost:8080
echo  Health Check: http://localhost:8080/actuator/health
echo  API Docs: http://localhost:8080/swagger-ui.html
echo.
echo  Database: MySQL running on localhost:3306
echo  Uploads: ./uploads/images/ (mounted to container)
echo.
echo  To stop services: stop-backend.bat
echo  To view logs: docker-compose -f docker-compose.backend.yml logs -f
echo.
echo ========================================

pause
