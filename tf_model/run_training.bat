@echo off
REM YOLOv11 Segmentation Training Script for Windows
REM ================================================

echo.
echo 🚀 YOLOv11 Segmentation Training
echo ================================

REM Activate conda environment
echo 🔧 Activating conda environment...
call conda activate yolov11
if %errorlevel% neq 0 (
    echo ❌ Failed to activate conda environment 'yolov11'
    echo Please make sure the environment exists
    pause
    exit /b 1
)

REM Set environment variables
echo 🛠️  Setting environment variables...
set KMP_DUPLICATE_LIB_OK=TRUE

REM Change to tf_model directory
echo 📁 Changing to tf_model directory...
cd /d "D:\software-design-competetion\tf_model"
if %errorlevel% neq 0 (
    echo ❌ Failed to change to tf_model directory
    pause
    exit /b 1
)

REM Check if dataset exists
if not exist "dataset\data.yaml" (
    echo ❌ Dataset not found: dataset\data.yaml
    echo Please ensure you're in the correct directory
    pause
    exit /b 1
)

echo ✅ Dataset found
echo.

REM Ask user which method to use
echo Choose training method:
echo 1) Simple Python script (recommended)
echo 2) Advanced Python script (more features)
echo 3) Direct YOLO CLI command
echo.
set /p choice=Enter your choice (1-3): 

if "%choice%"=="1" (
    echo.
    echo 🐍 Running simple Python training script...
    python simple_train.py
) else if "%choice%"=="2" (
    echo.
    echo 🐍 Running advanced Python training script...
    python train_yolo_segmentation.py
) else if "%choice%"=="3" (
    echo.
    echo 💻 Running YOLO CLI command...
    yolo segment train model=yolo11n-seg.pt data="dataset\data.yaml" epochs=100 imgsz=640 device=0 project="runs" name="seg_batch_train"
) else (
    echo ❌ Invalid choice. Please run the script again.
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ Training failed with error code %errorlevel%
) else (
    echo.
    echo 🎉 Training completed successfully!
    echo 📁 Check the 'runs' directory for results
)

echo.
pause