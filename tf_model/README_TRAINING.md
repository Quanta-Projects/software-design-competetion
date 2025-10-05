# YOLOv11 Segmentation Training Scripts
=============================================

This directory contains multiple Python scripts for training YOLOv11 segmentation models with your custom dataset.

## 📁 Available Scripts

### 1. `simple_train.py` - **Recommended for beginners**
- **Purpose**: Simple, straightforward training script
- **Features**: Basic training with sensible defaults
- **Usage**: `python simple_train.py`

### 2. `config_train.py` - **Recommended for customization**
- **Purpose**: Configuration-based training using `training_config.ini`
- **Features**: Easy parameter customization without code changes
- **Usage**: `python config_train.py`

### 3. `train_yolo_segmentation.py` - **Advanced users**
- **Purpose**: Full-featured training with detailed monitoring
- **Features**: Comprehensive logging, validation, error handling
- **Usage**: `python train_yolo_segmentation.py`

### 4. `run_training.bat` - **Windows batch script**
- **Purpose**: Easy GUI-like interface for Windows users
- **Features**: Menu-driven selection of training methods
- **Usage**: Double-click or run from command prompt

## 🚀 Quick Start

### Method 1: Simple Training (Fastest)
```bash
# Activate your conda environment
conda activate yolov11

# Navigate to tf_model directory
cd "D:\software-design-competetion\tf_model"

# Run simple training
python simple_train.py
```

### Method 2: Configuration-based Training (Most Flexible)
```bash
# 1. Edit training_config.ini to customize parameters
# 2. Run training
python config_train.py

# Or with custom config file
python config_train.py --config my_custom_config.ini
```

### Method 3: Windows Batch Script (Easiest)
```batch
# Just double-click run_training.bat
# Or run from command prompt:
run_training.bat
```

## ⚙️ Configuration Options

Edit `training_config.ini` to customize:

- **Model size**: nano, small, medium, large, extra-large
- **Training epochs**: How long to train
- **Image size**: 640, 1024, or 1280 pixels
- **Batch size**: Number of images per batch
- **Learning rate**: How fast the model learns
- **Data augmentation**: Image transformations
- **Loss weights**: Emphasize different aspects of training

## 📊 Training Parameters

### Model Sizes
- `yolo11n-seg.pt`: Nano (fastest, smallest)
- `yolo11s-seg.pt`: Small
- `yolo11m-seg.pt`: Medium
- `yolo11l-seg.pt`: Large
- `yolo11x-seg.pt`: Extra Large (slowest, most accurate)

### Recommended Settings
- **For quick testing**: 50 epochs, nano model
- **For good results**: 100 epochs, small/medium model
- **For best results**: 200+ epochs, large model

## 📁 Output Structure

After training, results are saved to `runs/[experiment_name]/`:

```
runs/
└── seg_yolo11_custom/
    ├── weights/
    │   ├── best.pt          # Best performing model
    │   └── last.pt          # Final epoch model
    ├── results.csv          # Training metrics
    ├── confusion_matrix.png # Classification results
    ├── labels.jpg          # Label distribution
    ├── results.png         # Training curves
    └── args.yaml           # Training arguments
```

## 🔧 Troubleshooting

### Common Issues:

1. **"ultralytics not found"**
   ```bash
   conda activate yolov11
   pip install ultralytics
   ```

2. **"CUDA out of memory"**
   - Reduce batch size in config
   - Use smaller model (nano instead of large)

3. **"Dataset not found"**
   - Ensure you're in the tf_model directory
   - Check that `dataset/data.yaml` exists

4. **OpenMP warnings**
   - These are harmless and automatically handled
   - The scripts set `KMP_DUPLICATE_LIB_OK=TRUE`

## 📈 Monitoring Training

### Real-time monitoring:
- Watch the console output for epoch progress
- Training loss should generally decrease over time
- Validation metrics show model performance

### After training:
- Check `results.png` for training curves
- Use `best.pt` model for inference
- Validate with `yolo segment val model=runs/[name]/weights/best.pt data=dataset/data.yaml`

## 🎯 Using Your Trained Model

After training completes, use your model:

```python
from ultralytics import YOLO

# Load your trained model
model = YOLO('runs/seg_yolo11_custom/weights/best.pt')

# Run inference
results = model('path/to/image.jpg')

# Save results
results[0].save('output.jpg')
```

## 💡 Tips for Better Results

1. **More data**: Add more training images if possible
2. **Data quality**: Ensure accurate annotations
3. **Augmentation**: Enable augmentation for small datasets  
4. **Patience**: Let training run for more epochs
5. **Model size**: Use larger models for better accuracy
6. **Learning rate**: Try different learning rates if training stalls

---

**Happy Training! 🚀**