@echo off
REM YOLOv11 Segmentation Inference Script
REM ====================================

echo.
echo 🔍 YOLOv11 Segmentation Inference
echo =================================

REM Activate conda environment
echo 🔧 Activating conda environment...
call conda activate yolov11
if %errorlevel% neq 0 (
    echo ❌ Failed to activate conda environment 'yolov11'
    pause
    exit /b 1
)

REM Set environment variables
set KMP_DUPLICATE_LIB_OK=TRUE

REM Change to tf_model directory
cd /d "D:\software-design-competetion\tf_model"

echo.
echo 📂 Available trained models:
dir /b runs\seg_*\weights\*.pt 2>nul
if %errorlevel% neq 0 (
    echo ❌ No trained models found in runs directory
    pause
    exit /b 1
)

echo.
echo 🖼️  Available test images:
dir /b dataset\test\images\*.jpg 2>nul

echo.
echo Choose inference mode:
echo 1) Single image prediction (default blue)
echo 2) Batch prediction (all test images, default blue)
echo 3) Single image with RED color
echo 4) Batch prediction with RED color
echo 5) Custom source
echo 6) Use Python inference script
echo.
set /p choice=Enter your choice (1-6): 

if "%choice%"=="1" (
    echo.
    echo Available test images:
    dir /b dataset\test\images\*.jpg
    echo.
    set /p image_name=Enter image filename: 
    echo 🚀 Running inference on single image...
    yolo segment predict model="runs\seg_y11n_tx3\weights\best.pt" source="dataset\test\images\%image_name%" save=true conf=0.25
    
) else if "%choice%"=="2" (
    echo.
    echo 🚀 Running batch inference on all test images...
    yolo segment predict model="runs\seg_y11n_tx3\weights\best.pt" source="dataset\test\images" save=true conf=0.25
    
) else if "%choice%"=="3" (
    echo.
    echo Available test images:
    dir /b dataset\test\images\*.jpg
    echo.
    set /p image_name=Enter image filename: 
    echo 🔴 Running RED segmentation on single image...
    python simple_red_inference.py
    
) else if "%choice%"=="4" (
    echo.
    echo 🔴 Running RED segmentation on all test images...
    python batch_red_inference.py
    
) else if "%choice%"=="5" (
    echo.
    set /p custom_source=Enter custom source path: 
    echo 🚀 Running inference on custom source...
    yolo segment predict model="runs\seg_y11n_tx3\weights\best.pt" source="%custom_source%" save=true conf=0.25
    
) else if "%choice%"=="6" (
    echo.
    echo 🐍 Running Python inference script...
    python inference.py
    
) else (
    echo ❌ Invalid choice
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ Inference failed with error code %errorlevel%
) else (
    echo.
    echo ✅ Inference completed successfully!
    echo 📁 Results saved to: runs\segment\predict\
    echo.
    echo 📂 Opening results folder...
    start runs\segment\predict\
)

echo.
pause