@echo off
echo 🚀 Model Training Pipeline
echo =========================
echo.
echo This will train a new YOLO model on the thermal anomaly dataset.
echo.
echo Options:
echo 1. Train with GPU (faster, requires CUDA)
echo 2. Train with CPU (slower, always works)
echo 3. Check system requirements
echo.

set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo Starting GPU training...
    python model_trainer.py
) else if "%choice%"=="2" (
    echo Starting CPU training...
    python train_yolo_cpu.py
) else if "%choice%"=="3" (
    echo Checking system requirements...
    python system_diagnostics.py
) else (
    echo Invalid choice
)

pause