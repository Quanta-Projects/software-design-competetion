# Two-Stage Transformer Defect Detection System

## 🎯 Overview

This system provides **automated transformer defect detection** using a two-stage approach:

1. **Stage 1**: Automatically segments and locates transformers in thermal images using YOLOv11 segmentation
2. **Stage 2**: Detects and classifies defects within the segmented transformer region

### Current Defect Types (6 classes):
- **Full Wire Overload PF**
- **Loose Joint F** 
- **Loose Joint PF**
- **Point Overload F**
- **Point Overload PF**
- **Transformer Overload**

> 💡 **Note**: You can train custom defect models with your own annotated data - see [Training Custom Models](#-training-custom-defect-models) section.

## 🛠️ System Requirements

### Hardware Requirements
- **GPU**: NVIDIA RTX series (recommended) or CPU
- **RAM**: 8GB minimum, 16GB recommended for batch processing
- **Storage**: 5GB free space for models, dependencies, and results
- **OS**: Windows 10/11, Linux, or macOS

### Software Requirements
- **Python**: 3.9 or 3.10 (recommended)
- **CUDA**: 12.8 (recommended for optimal GPU acceleration)
- **Git**: For repository cloning

## 📦 Installation & Setup

### 🚀 Quick Start (Automated Setup)

#### Option 1: One-Click Installation (Recommended)

**Windows Users:**
```bash
# 1. Download or clone the repository
git clone https://github.com/neocodered/software-design-competetion.git
cd software-design-competetion/tf_model

# 2. Run automated installer
install.bat
```

**Linux/macOS Users:**
```bash
# 1. Download or clone the repository
git clone https://github.com/neocodered/software-design-competetion.git
cd software-design-competetion/tf_model

# 2. Make installer executable and run
chmod +x install.sh
./install.sh
```

#### Option 2: Python Setup Script
```bash
# Auto-detect system and install appropriate version
python setup.py

# Force GPU installation (NVIDIA GPU required)
python setup.py --gpu

# Force CPU-only installation
python setup.py --cpu
```

### 🛠️ Manual Installation (Advanced Users)

If you prefer manual control or the automated setup fails:

#### Step 1: Clone the Repository
```bash
git clone https://github.com/neocodered/software-design-competetion.git
cd software-design-competetion/tf_model
```

#### Step 2: Create Virtual Environment

**Option A: Using Conda (Recommended)**
```bash
# Install Miniconda/Anaconda if not already installed
# Download from: https://docs.conda.io/en/latest/miniconda.html

# Create conda environment
conda create -n transformer_defect_detection python=3.9
conda activate transformer_defect_detection

# Install PyTorch with CUDA 12.8 support (for GPU)
conda install pytorch torchvision torchaudio pytorch-cuda=12.8 -c pytorch -c nvidia

# Or for CPU only
# conda install pytorch torchvision torchaudio cpuonly -c pytorch
```

**Option B: Using Python venv**
```bash
# Create virtual environment
python -m venv transformer_defect_env

# Activate environment (Windows)
transformer_defect_env\Scripts\activate

# Activate environment (Linux/macOS)
source transformer_defect_env/bin/activate

# Upgrade pip
python -m pip install --upgrade pip
```

#### Step 3: Install Dependencies
```bash
# Install all required packages
pip install -r requirements.txt

# For GPU users, verify CUDA installation
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

#### Step 4: Verify Installation
```bash
# Set environment variable (Windows)
set KMP_DUPLICATE_LIB_OK=TRUE

# Set environment variable (Linux/macOS)  
export KMP_DUPLICATE_LIB_OK=TRUE

# Run quick test
python test_two_stage_detection.py
```

### 🎯 Post-Installation

After successful installation, you'll have:
- **Environment activation scripts**: `activate_env.bat` (Windows) or `activate_env.sh` (Linux/macOS)
- **All dependencies installed**: PyTorch, Ultralytics, OpenCV, etc.
- **Ready-to-use detection system**: GUI and CLI interfaces available

**Quick Start After Installation:**
```bash
# Windows
activate_env.bat

# Linux/macOS  
source activate_env.sh

# Then run
python defect_detection_gui.py
```

## 🚀 Running Inference (Detection)

### Prerequisites
Ensure you have the trained models in the correct locations:
- **Transformer Segmentation Model**: `runs/seg_y11n_tx3/weights/best.pt`
- **Defect Detection Model**: `runs/detect/transformer_defects_v1/weights/best.pt`

> ⚠️ **If models are missing**: You need to train them first - see [Training Models](#-training-models) section below.

### Method 1: Graphical User Interface (Recommended for Beginners)

#### Windows
```bash
# Activate environment
conda activate transformer_defect_detection

# Navigate to tf_model directory
cd D:\software-design-competetion\tf_model

# Run GUI
python defect_detection_gui.py
```

#### Linux/macOS
```bash
# Activate environment
conda activate transformer_defect_detection

# Navigate to tf_model directory
cd /path/to/software-design-competetion/tf_model

# Run GUI
python defect_detection_gui.py
```

#### GUI Usage Instructions:
1. **Select Image**: Click "Browse" and choose a thermal image
2. **Adjust Confidence**: Use the slider (0.3-0.7 recommended)
3. **Process**: Click "🚀 Detect Defects"
4. **View Results**: Check the output panel and results folder

### Method 2: Command Line Interface (Advanced Users)

#### Single Image Detection
```bash
# Basic usage
python two_stage_defect_detection.py --image "path/to/thermal_image.jpg"

# With custom confidence threshold
python two_stage_defect_detection.py --image "path/to/image.jpg" --confidence 0.4

# With custom output directory
python two_stage_defect_detection.py --image "path/to/image.jpg" --output "my_results"
```

#### Batch Processing (Multiple Images)
```bash
# Process all images in a folder
python two_stage_defect_detection.py --batch "path/to/image_folder/"

# With custom settings
python two_stage_defect_detection.py --batch "path/to/folder/" --confidence 0.5 --output "batch_results"
```

#### Advanced Options
```bash
python two_stage_defect_detection.py \
    --image "thermal_image.jpg" \
    --confidence 0.5 \
    --transformer-model "custom/transformer_model.pt" \
    --defect-model "custom/defect_model.pt" \
    --output "custom_output_folder"
```

### Method 3: Direct Python Usage
```bash
# Test with a specific image
python two_stage_defect_detection.py --image "dataset/Sample_Thermal_Images/T1/normal/T1_normal_001.jpg"

# This will:
# 1. Load both models automatically
# 2. Process the specified image
# 3. Generate results in 'detection_results' folder
```

### Method 4: Python API Integration
```python
# For integration into other Python applications
from two_stage_defect_detection import TwoStageDefectDetector

# Initialize detector
detector = TwoStageDefectDetector(
    transformer_model_path="runs/seg_y11n_tx3/weights/best.pt",
    defect_model_path="runs/detect/transformer_defects_v1/weights/best.pt",
    confidence_threshold=0.5
)

# Load models
detector.load_models()

# Process single image
result = detector.process_single_image("path/to/image.jpg")
```

## 📊 Understanding the Results

### Output Files
For each processed image, the system generates:

1. **Annotated Image** (`*_annotated_*.jpg`)
   - Original image with defect bounding boxes overlaid
   - Color-coded defect labels with confidence scores
   - Transformer boundary highlighted

2. **Detailed Visualization** (`*_detailed_*.png`) 
   - Multi-panel view showing all detection stages
   - Original → Transformer Detection → Defect Detection → Final Result

3. **JSON Report** (`*_report_*.json`)
   - Complete detection metadata
   - Confidence scores and bounding box coordinates
   - Processing timestamps and model information

### Visual Interpretation

#### Color Coding:
- **Cyan Box**: Transformer location (Stage 1)
- **Red**: Full Wire Overload PF
- **Orange**: Loose Joint F
- **Yellow**: Loose Joint PF  
- **Blue**: Point Overload F
- **Magenta**: Point Overload PF
- **Green**: Transformer Overload

#### Confidence Scores:
- **0.8-1.0**: Very high confidence (reliable detection)
- **0.6-0.8**: High confidence (likely correct)
- **0.4-0.6**: Medium confidence (review recommended)
- **0.3-0.4**: Low confidence (possible false positive)

## ⚙️ Configuration & Optimization

### Confidence Threshold Guidelines
```bash
# Conservative (fewer false positives)
--confidence 0.7

# Balanced (default)
--confidence 0.5  

# Sensitive (catches more potential defects)
--confidence 0.3
```

### Performance Optimization

#### For Speed:
- Use GPU acceleration
- Process images at 640x640 resolution
- Increase confidence threshold
- Use batch processing for multiple images

#### For Accuracy:
- Use high-resolution thermal images
- Lower confidence threshold
- Ensure good thermal contrast
- Process images individually for detailed analysis

### Input Image Requirements
- **Format**: JPG, PNG, BMP, or TIFF
- **Type**: Thermal/infrared images (not RGB photos)
- **Resolution**: Minimum 320x320, recommended 640x640 or higher
- **Quality**: Clear thermal signatures with visible temperature differences

## 🔧 Troubleshooting

### Common Issues and Solutions

#### 1. Models Not Found
```
❌ Error: Transformer model not found: runs/seg_y11n_tx3/weights/best.pt
```
**Solution**: Train the models first or download pre-trained models
```bash
# Train transformer segmentation model
python simple_train.py

# Train defect detection model
python train_transformer_defects.py
```

#### 2. Environment Issues
```
❌ Import "ultralytics" could not be resolved
```
**Solution**: Ensure virtual environment is activated and dependencies installed
```bash
conda activate transformer_defect_detection
pip install -r requirements.txt
```

#### 3. CUDA/GPU Issues
```
❌ CUDA out of memory
```
**Solutions**:
- Reduce batch size or image resolution
- Use CPU mode: add `--device cpu` to commands
- Close other GPU-intensive applications

#### 4. No Transformer Detected
```
⚠️ Status: no_transformer_detected
```
**Solutions**:
- Lower confidence threshold: `--confidence 0.3`
- Verify image is thermal (not RGB)
- Check image quality and contrast
- Ensure transformer is clearly visible in thermal spectrum

#### 5. Poor Defect Detection
**Solutions**:
- Adjust confidence threshold based on image quality
- Ensure defects are thermally visible (hot spots)
- Use higher resolution images
- Verify thermal calibration

### Performance Monitoring
```bash
# Check GPU usage (if available)
nvidia-smi

# Monitor system resources
# Task Manager (Windows) or htop (Linux)

# Verify model loading
python -c "from ultralytics import YOLO; print('YOLO installation OK')"
```

## 🏗️ Training Models

The system consists of two models that work together. Here's how to train each one:

### 🎯 Training Defect Detection Model (Most Common Use Case)

If you want to detect **different types of defects** or **improve detection accuracy** with your own data:

#### Step 1: Prepare Your Data
1. **Collect thermal images** containing transformers with defects
2. **Create masked dataset** (transformer regions isolated from background)
3. **Annotate defects** using tools like [LabelImg](https://github.com/HumanSignal/labelImg), [Roboflow](https://roboflow.com/), or [CVAT](https://cvat.ai/)

#### Step 2: Annotation Guidelines
```
📋 Annotation Format: YOLO format (YOLOv11 compatible)
📂 Required Structure:
   Transformer Defects/
   ├── data.yaml          # Dataset configuration
   ├── train/
   │   ├── images/        # Training images (.jpg, .png)
   │   └── labels/        # Training labels (.txt)
   ├── valid/
   │   ├── images/        # Validation images
   │   └── labels/        # Validation labels
   └── test/              # Optional test set
       ├── images/
       └── labels/

🏷️ Label Format: Each .txt file contains:
   class_id x_center y_center width height
   (normalized coordinates 0-1)
```

#### Step 3: Dataset Configuration
Create `Transformer Defects/data.yaml`:
```yaml
# Dataset configuration for defect detection
train: train/images
val: valid/images
test: test/images  # optional

# Number of classes
nc: 6  # Change this to your number of defect types

# Class names (customize for your defects)
names:
  0: 'Full Wire Overload PF'
  1: 'Loose Joint F'
  2: 'Loose Joint PF'
  3: 'Point Overload F'
  4: 'Point Overload PF'
  5: 'Transformer Overload'
```

#### Step 4: Replace Dataset and Train
```bash
# 1. Backup current dataset (optional)
mv "Transformer Defects" "Transformer Defects_backup"

# 2. Add your new dataset
# Place your annotated dataset in "Transformer Defects" folder
# Ensure it follows the structure shown in Step 2

# 3. Activate environment
conda activate transformer_defect_detection

# 4. Train the defect model
python train_transformer_defects.py

# 5. Monitor training progress
# Check runs/detect/transformer_defects_v1/ for results
```

#### Step 5: Use New Model for Inference
After training completes, your new model will be saved at:
- **New model**: `runs/detect/transformer_defects_v1/weights/best.pt`

Update inference scripts to use the new model:
```bash
# Use new model in inference
python two_stage_defect_detection.py \
    --image "your_image.jpg" \
    --defect-model "runs/detect/transformer_defects_v1/weights/best.pt"

# Or update the default path in the script
```

### 🔧 Training Transformer Segmentation Model (Advanced)

Only needed if you want to detect **different types of transformers** or work with **different image types**:

#### When to Retrain:
- Different transformer designs (indoor vs outdoor, different manufacturers)
- Different thermal camera specifications
- Different image resolutions or thermal ranges
- Poor transformer detection performance

#### Quick Training Process:
```bash
# If you have transformer segmentation data in YOLO format
python simple_train.py  # Basic training script

# Monitor results in runs/seg_y11n_tx*/ folder
```

> 💡 **Recommendation**: The transformer segmentation model works well for most thermal images. Focus on retraining the defect detection model instead.

## 🔄 Complete Custom Training Workflow

### Scenario: You want to detect new defect types

#### Step-by-Step Process:

1. **Collect Data** (100+ images recommended per defect class)
   ```bash
   # Collect thermal images showing:
   # - Normal transformers
   # - Various defect types you want to detect
   ```

2. **Prepare Annotations**
   ```bash
   # Use annotation tools:
   # - Roboflow (web-based, recommended)
   # - LabelImg (desktop application)
   # - CVAT (advanced, team collaboration)
   
   # Export in YOLOv11 format
   ```

3. **Organize Dataset**
   ```bash
   # Remove old dataset
   rm -rf "Transformer Defects"  # Linux/macOS
   # or delete folder in Windows Explorer
   
   # Add your new dataset
   # Ensure structure matches Step 2 above
   ```

4. **Update Configuration**
   ```yaml
   # Edit Transformer Defects/data.yaml
   nc: 4  # Example: 4 custom defect types
   names:
     0: 'Hotspot'
     1: 'Cold Joint' 
     2: 'Insulation Failure'
     3: 'Corrosion'
   ```

5. **Train Model**
   ```bash
   conda activate transformer_defect_detection
   python train_transformer_defects.py
   
   # Training will show:
   # - Real-time loss graphs
   # - mAP (mean Average Precision) metrics
   # - Validation results every few epochs
   ```

6. **Evaluate Results**
   ```bash
   # Check training results
   ls runs/detect/transformer_defects_v1/
   
   # Key files:
   # - weights/best.pt        (your new model)
   # - results.png           (training curves)
   # - confusion_matrix.png  (performance matrix)
   # - val_batch0_pred.jpg   (sample predictions)
   ```

7. **Test New Model**
   ```bash
   # Test with sample image
   python two_stage_defect_detection.py --image "dataset/Sample_Thermal_Images/T1/normal/T1_normal_001.jpg"
   
   # Or test with your own image
   python two_stage_defect_detection.py --image "your_test_image.jpg"
   ```

### 📊 Training Tips

#### Data Quality:
- **Minimum**: 50 images per class
- **Recommended**: 200+ images per class
- **Balance**: Similar number of examples for each defect type
- **Variety**: Different angles, lighting conditions, transformer types

#### Annotation Quality:
- **Tight boxes**: Draw boxes closely around defects
- **Consistency**: Same person should annotate similar defects similarly
- **Validation**: Double-check annotations before training

#### Training Parameters:
```bash
# Default training uses optimized settings
# For custom tuning, edit train_transformer_defects.py:
# - epochs: 100-300 (more data = more epochs)
# - batch_size: 8-32 (based on GPU memory)
# - image_size: 640 (standard for most cases)
```

### 📈 Expected Training Results

#### Good Training Indicators:
- **mAP@0.5 > 0.6**: Good detection performance
- **Loss decreasing**: Model is learning
- **Stable validation**: No overfitting

#### Training Time Estimates:
- **GPU (RTX 30/40 series)**: 30-60 minutes for 100 epochs
- **CPU**: 3-6 hours for 100 epochs
- **Dataset size**: 200 images ≈ 30 min, 1000 images ≈ 2 hours



## 📁 Directory Structure
```
tf_model/
├── 🔧 Core Scripts
│   ├── two_stage_defect_detection.py    # Main CLI detection script
│   ├── defect_detection_gui.py          # GUI interface
│   └── train_transformer_defects.py     # Defect model training script
│
├── 📚 Documentation & Setup
│   ├── README.md                        # This file (setup & usage guide)
│   └── requirements.txt                 # Python dependencies
│
├── 🤖 Trained Models
│   └── runs/
│       ├── seg_y11n_tx3/weights/       # Transformer segmentation model
│       └── detect/transformer_defects_v1/weights/  # Defect detection model
│
├── 📊 Training & Sample Data
│   ├── Transformer Defects/            # YOLOv11 format defect dataset
│   │   ├── data.yaml                   # Dataset configuration
│   │   ├── train/ (images + labels)    # Training set
│   │   ├── valid/ (images + labels)    # Validation set  
│   │   └── test/ (images + labels)     # Test set (optional)
│   ├── dataset/                        # Original sample images
│   │   └── Sample_Thermal_Images/      # Test images for inference
│   └── masked_dataset/                 # Processed training data
│
└── 📂 Results & Outputs (created during use)
    └── detection_results/              # Inference outputs
```

### 🎯 Key Files for Different Tasks:

#### **Running Inference** (Most Common):
- `two_stage_defect_detection.py` - Command line interface
- `defect_detection_gui.py` - Graphical interface  
- `dataset/Sample_Thermal_Images/` - Sample images for testing

#### **Training Custom Defect Models**:
- `train_transformer_defects.py` - Training script
- `Transformer Defects/` - Your annotated dataset (YOLO format)
- `runs/detect/` - Training outputs and new models

#### **Required Models** (must exist for inference):
- `runs/seg_y11n_tx3/weights/best.pt` - Transformer segmentation
- `runs/detect/transformer_defects_v1/weights/best.pt` - Defect detection

#### **Sample Data for Testing**:
- `dataset/Sample_Thermal_Images/` - Test images to verify system works

## 🎯 Best Practices

### For Optimal Results:
1. **Image Quality**: Use high-resolution thermal images with clear temperature gradients
2. **Thermal Calibration**: Ensure thermal camera is properly calibrated
3. **Confidence Tuning**: Adjust thresholds based on your specific use case
4. **Batch Processing**: Process similar images together for efficiency
5. **Result Review**: Always review low-confidence detections manually

### For Production Use:
1. **Automated Workflows**: Integrate with thermal camera systems
2. **Monitoring**: Set up automated processing pipelines
3. **Validation**: Regularly validate results with manual inspection
4. **Model Updates**: Retrain models with new data periodically
5. **Documentation**: Keep records of detection results for trend analysis

## 📞 Support and Documentation

### Additional Resources:
- **Detailed API Documentation**: `TWO_STAGE_DETECTION_README.md`
- **Training Documentation**: `README_TRAINING.md` 
- **Model Training Guide**: `TRAINING_SUMMARY.md`

### Getting Help:
1. Check error messages in GUI status panel or terminal output
2. Review troubleshooting section above
3. Verify all dependencies are installed correctly
4. Ensure models are properly trained and available

### Example Workflow:
```bash
# 1. Setup (one-time)
conda activate transformer_defect_detection
cd tf_model

# 2. Daily usage
python defect_detection_gui.py
# OR
python two_stage_defect_detection.py --batch "daily_images/"

# 3. Review results
# Check detection_results/ folder for outputs
```

## 🚀 Quick Reference

### Common Commands:
```bash
# Activate environment
conda activate transformer_defect_detection

# Run GUI (easiest)
python defect_detection_gui.py

# Test with sample image
python two_stage_defect_detection.py --image "dataset/Sample_Thermal_Images/T1/normal/T1_normal_001.jpg"

# Single image inference
python two_stage_defect_detection.py --image "your_image.jpg"

# Batch inference
python two_stage_defect_detection.py --batch "dataset/Sample_Thermal_Images/T1/"

# Train custom defect model
python train_transformer_defects.py
```

### Troubleshooting Checklist:
- ✅ Environment activated: `conda activate transformer_defect_detection`
- ✅ Models exist: Check `runs/seg_y11n_tx3/weights/best.pt` and `runs/detect/transformer_defects_v1/weights/best.pt`
- ✅ Image format supported: JPG, PNG, BMP, TIFF
- ✅ Thermal image (not RGB photo)
- ✅ GPU available: `python -c "import torch; print(torch.cuda.is_available())"`

### File Paths:
- **Inference Results**: `detection_results/` (created automatically)
- **Sample Images**: `dataset/Sample_Thermal_Images/`
- **Training Dataset**: `Transformer Defects/` (YOLO format)
- **Model Outputs**: `runs/detect/transformer_defects_v1/`
- **Logs**: Check terminal output or `runs/detect/transformer_defects_v1/` folder

---

**🎯 Ready to detect transformer defects! 🔍⚡**

**Need Help?** 
1. 📖 Check troubleshooting section above
2. 🧪 Test with sample: `python two_stage_defect_detection.py --image "dataset/Sample_Thermal_Images/T1/normal/T1_normal_001.jpg"`
3. 🔍 Ensure models exist and environment is activated
4. 🎮 Try GUI mode: `python defect_detection_gui.py`