@echo off
echo ========================================
echo   YOLOv11 Transformer Defects Training
echo ========================================

cd /d D:\software-design-competetion\tf_model

echo Activating conda environment 'yolov11'...
call conda activate yolov11

echo.
echo Current directory: %cd%
echo Conda environment: %CONDA_DEFAULT_ENV%
echo.

echo Starting YOLOv11 training for Transformer Defects...
python train_transformer_defects.py

echo.
echo Training completed. Press any key to exit...
pause