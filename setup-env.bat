@echo off
REM Transformer Management System - Environment Setup Script (Windows)
REM This script helps manage different environment configurations on Windows

setlocal enabledelayedexpansion

REM Check if Docker and Docker Compose are available
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH
    exit /b 1
)

where docker-compose >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Docker Compose is not installed or not in PATH
    exit /b 1
)

REM Get the command argument
set "COMMAND=%~1"

if "%COMMAND%"=="dev" goto setup_dev
if "%COMMAND%"=="development" goto setup_dev
if "%COMMAND%"=="docker" goto setup_docker
if "%COMMAND%"=="local" goto setup_docker
if "%COMMAND%"=="prod" goto setup_prod
if "%COMMAND%"=="production" goto setup_prod
if "%COMMAND%"=="stop" goto stop_all
if "%COMMAND%"=="status" goto show_status
if "%COMMAND%"=="logs" goto show_logs
goto show_help

:setup_dev
echo [INFO] Setting up Development Environment...
if not exist "Back-end\software-design-project-final\.env" (
    echo [ERROR] Development .env file not found!
    echo Please create Back-end\software-design-project-final\.env file
    exit /b 1
)
echo [SUCCESS] Development environment is ready!
echo To run development environment:
echo   cd Back-end\software-design-project-final
echo   .\mvnw.cmd spring-boot:run
goto :eof

:setup_docker
echo [INFO] Setting up Docker Environment...
if not exist ".env" (
    echo [ERROR] Docker .env file not found in root directory!
    exit /b 1
)
if not exist "docker-compose.yml" (
    echo [ERROR] docker-compose.yml not found!
    exit /b 1
)

echo [INFO] Building and starting Docker containers...
docker-compose up --build -d

echo [INFO] Waiting for services to be ready...
timeout /t 30 /nobreak >nul

echo [INFO] Checking service health...
docker-compose ps

echo [SUCCESS] Docker environment is ready!
echo Services are available at:
echo   Backend API: http://localhost:8080
echo   Health Check: http://localhost:8080/actuator/health
echo   API Documentation: http://localhost:8080/swagger-ui.html
goto :eof

:setup_prod
echo [INFO] Setting up Production Environment...
if not exist "Back-end\software-design-project-final\.env.production" (
    echo [ERROR] Production .env file not found!
    exit /b 1
)

REM Check if production .env file has been customized
findstr "CHANGE_ME" "Back-end\software-design-project-final\.env.production" >nul
if %ERRORLEVEL% equ 0 (
    echo [ERROR] Production .env file contains default passwords!
    echo Please update all 'CHANGE_ME' values in .env.production before deploying to production.
    exit /b 1
)

if not exist "docker-compose.prod.yml" (
    echo [ERROR] docker-compose.prod.yml not found!
    exit /b 1
)

REM Copy production env to root for docker-compose
copy "Back-end\software-design-project-final\.env.production" ".env" >nul

echo [INFO] Building and starting Production containers...
docker-compose -f docker-compose.prod.yml up --build -d

echo [SUCCESS] Production environment is ready!
echo Production services are available at:
echo   Backend API: http://localhost:8080
echo   Health Check: http://localhost:8080/actuator/health
goto :eof

:stop_all
echo [INFO] Stopping all Docker containers...
if exist "docker-compose.yml" (
    docker-compose down 2>nul
)
if exist "docker-compose.prod.yml" (
    docker-compose -f docker-compose.prod.yml down 2>nul
)
echo [SUCCESS] All containers stopped!
goto :eof

:show_status
echo [INFO] Current Docker containers status:
docker-compose ps 2>nul || echo No development containers running

echo [INFO] Current Production containers status:
docker-compose -f docker-compose.prod.yml ps 2>nul || echo No production containers running
goto :eof

:show_logs
set "SERVICE=%~2"
if "%SERVICE%"=="" (
    echo [INFO] Showing all container logs...
    docker-compose logs --tail=50 -f
) else (
    echo [INFO] Showing logs for service: %SERVICE%
    docker-compose logs --tail=50 -f %SERVICE%
)
goto :eof

:show_help
echo Transformer Management System - Environment Setup (Windows)
echo.
echo Usage: %~nx0 {dev^|docker^|prod^|stop^|status^|logs}
echo.
echo Commands:
echo   dev        - Setup development environment (local Spring Boot)
echo   docker     - Setup Docker environment (containers)
echo   prod       - Setup production environment (production containers)
echo   stop       - Stop all Docker containers
echo   status     - Show status of all environments
echo   logs       - Show logs (optionally specify service name)
echo.
echo Examples:
echo   %~nx0 docker          # Start Docker development environment
echo   %~nx0 prod           # Start production environment
echo   %~nx0 logs backend   # Show backend service logs
echo   %~nx0 stop           # Stop all containers
exit /b 0
