@echo off
REM Masked Dataset Generator Batch Script
REM =====================================

echo.
echo 🎭 Masked Dataset Generator
echo ===========================

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
echo Choose dataset creation options:
echo 1) Create masked dataset with isolated objects (recommended)
echo 2) Create masked dataset with white backgrounds
echo 3) Create binary mask dataset
echo 4) Custom options
echo.
set /p choice=Enter your choice (1-4): 

if "%choice%"=="1" (
    echo.
    echo 🎭 Creating masked dataset with isolated objects...
    python create_masked_dataset.py --source "Sample Thermal Images" --output "masked_dataset" --mask-type isolated --conf 0.25
    
) else if "%choice%"=="2" (
    echo.
    echo 🎭 Creating masked dataset with white backgrounds...
    python create_masked_dataset.py --source "Sample Thermal Images" --output "masked_dataset_white" --mask-type masked_white --conf 0.25
    
) else if "%choice%"=="3" (
    echo.
    echo 🎭 Creating binary mask dataset...
    python create_masked_dataset.py --source "Sample Thermal Images" --output "binary_dataset" --mask-type binary --conf 0.25
    
) else if "%choice%"=="4" (
    echo.
    echo Custom Options:
    set /p conf_val=Enter confidence threshold (0.1-0.9, default 0.25): 
    if "%conf_val%"=="" set conf_val=0.25
    
    set /p output_name=Enter output directory name (default: custom_masked_dataset): 
    if "%output_name%"=="" set output_name=custom_masked_dataset
    
    echo.
    echo Mask types:
    echo   isolated - Objects on black background
    echo   masked_white - Objects on white background  
    echo   binary - Pure black/white masks
    set /p mask_type=Enter mask type (default: isolated): 
    if "%mask_type%"=="" set mask_type=isolated
    
    echo.
    echo 🎭 Creating custom masked dataset...
    python create_masked_dataset.py --source "Sample Thermal Images" --output "%output_name%" --mask-type %mask_type% --conf %conf_val%
    
) else (
    echo ❌ Invalid choice
    pause
    exit /b 1
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ Dataset creation failed with error code %errorlevel%
) else (
    echo.
    echo ✅ Masked dataset creation completed successfully!
    echo.
    echo 📊 Dataset structure created:
    echo    📂 faulty/  - Masked faulty transformer images
    echo    📂 normal/  - Masked normal transformer images
    echo.
    echo 📂 Opening dataset folder...
    if "%choice%"=="1" start masked_dataset\
    if "%choice%"=="2" start masked_dataset_white\
    if "%choice%"=="3" start binary_dataset\
    if "%choice%"=="4" start %output_name%\
)

echo.
pause