@echo off
echo ========================================
echo   Two-Stage Transformer Defect Detection
echo ========================================

cd /d D:\software-design-competetion\tf_model

echo Activating conda environment 'yolov11'...
call conda activate yolov11

echo.
echo Available Commands:
echo   1. Single Image Detection
echo   2. Batch Folder Detection
echo   3. Test with Sample Image
echo.

set /p choice="Enter your choice (1-3): "

if "%choice%"=="1" (
    set /p image_path="Enter image path: "
    echo Running single image detection...
    python two_stage_defect_detection.py --image "%image_path%"
) else if "%choice%"=="2" (
    set /p folder_path="Enter folder path: "
    echo Running batch detection...
    python two_stage_defect_detection.py --batch "%folder_path%"
) else if "%choice%"=="3" (
    echo Testing with sample image...
    if exist "Sample Thermal Images\T1\normal\T1_normal_001.jpg" (
        python two_stage_defect_detection.py --image "Sample Thermal Images\T1\normal\T1_normal_001.jpg"
    ) else (
        echo Sample image not found. Please provide your own image path.
        set /p image_path="Enter image path: "
        python two_stage_defect_detection.py --image "%image_path%"
    )
) else (
    echo Invalid choice. Running help...
    python two_stage_defect_detection.py --help
)

echo.
echo Detection completed. Check the 'detection_results' folder for outputs.
echo Press any key to exit...
pause