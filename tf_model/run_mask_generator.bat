@echo off
REM Binary Mask Generator Batch Script
REM ==================================

echo.
echo 🎭 Binary Mask Generator
echo =======================

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
echo Choose source:
echo 1) Process all test images (dataset/test/images)
echo 2) Process single image
echo 3) Custom source folder
echo.
set /p choice=Enter your choice (1-3): 

if "%choice%"=="1" (
    echo.
    echo 🎭 Generating binary masks for all test images...
    python generate_binary_masks.py --source "dataset\test\images" --output "masked_images" --conf 0.25
    
) else if "%choice%"=="2" (
    echo.
    echo Available test images:
    dir /b dataset\test\images\*.jpg
    echo.
    set /p image_name=Enter image filename: 
    echo 🎭 Generating binary mask for single image...
    python generate_binary_masks.py --source "dataset\test\images\%image_name%" --output "masked_images" --conf 0.25
    
) else if "%choice%"=="3" (
    echo.
    set /p custom_source=Enter source folder path: 
    echo 🎭 Generating binary masks for custom source...
    python generate_binary_masks.py --source "%custom_source%" --output "masked_images" --conf 0.25
    
) else (
    echo ❌ Invalid choice
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ Mask generation failed with error code %errorlevel%
) else (
    echo.
    echo ✅ Mask generation completed successfully!
    echo 📁 Results saved to: masked_images\
    echo.
    echo 📂 Generated folders:
    echo    📁 binary_masks\      - Black/white mask images
    echo    📁 isolated_objects\  - Objects on black background
    echo    📁 masked_originals\  - Original with background removed
    echo    📁 inverted_masks\    - Background only images
    echo.
    echo 📂 Opening results folder...
    start masked_images\
)

echo.
pause