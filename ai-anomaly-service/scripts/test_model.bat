@echo off
echo 🧪 Model Testing Suite
echo ====================
echo.
echo Choose testing method:
echo 1. Interactive testing
echo 2. Test single image
echo 3. Test batch of images
echo 4. System diagnostics
echo.

set /p choice="Enter choice (1-4): "

if "%choice%"=="1" (
    python model_tester.py --interactive
) else if "%choice%"=="2" (
    set /p image="Enter image path: "
    python model_tester.py --image "%image%"
) else if "%choice%"=="3" (
    set /p folder="Enter folder path: "
    python model_tester.py --folder "%folder%"
) else if "%choice%"=="4" (
    python system_diagnostics.py
) else (
    echo Invalid choice
)

pause