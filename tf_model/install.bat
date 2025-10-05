@echo off
echo ========================================
echo   Transformer Defect Detection Setup
echo ========================================

cd /d D:\software-design-competetion\tf_model

echo Checking Python installation...
python --version
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.9+ first.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo.
echo Setup Options:
echo   1. Install with GPU support (NVIDIA GPU required)
echo   2. Install CPU-only version
echo   3. Auto-detect (recommended)
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    echo Installing with GPU support...
    python setup.py --gpu
) else if "%choice%"=="2" (
    echo Installing CPU-only version...
    python setup.py --cpu
) else if "%choice%"=="3" (
    echo Auto-detecting system configuration...
    python setup.py
) else (
    echo Invalid choice. Using auto-detect...
    python setup.py
)

echo.
echo Setup completed! 
echo Run 'activate_env.bat' to start using the system.
echo.
pause