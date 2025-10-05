# Two-Stage Transformer Defect Detection System

## 🎯 Overview

This system provides **automated transformer defect detection** using a two-stage approach:

1. **Stage 1**: Automatically segments and locates transformers in thermal images using YOLOv11 segmentation
2. **Stage 2**: Detects and classifies 6 types of defects within the segmented transformer region

The system can identify the following defect types:
- **Full Wire Overload PF**
- **Loose Joint F** 
- **Loose Joint PF**
- **Point Overload F**
- **Point Overload PF**
- **Transformer Overload**

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

## 🚀 Running the Two-Stage Detection System

### Prerequisites
Before running inference, ensure you have the trained models:
- **Transformer Segmentation Model**: `runs/seg_y11n_tx3/weights/best.pt`
- **Defect Detection Model**: `runs/detect/transformer_defects_v1/weights/best.pt`

If models are missing, refer to the [Model Training](#-model-training) section.

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

### Method 3: Quick Test with Sample Images
```bash
# Run automated test with sample images
python test_two_stage_detection.py

# This will:
# 1. Find sample images automatically
# 2. Load both models
# 3. Process a test image
# 4. Generate results in 'test_results' folder
```

### Method 4: Batch Script (Windows Only)
```bash
# Double-click or run from command prompt
run_two_stage_detection.bat

# This provides an interactive menu with options:
# 1. Single Image Detection
# 2. Batch Folder Detection  
# 3. Test with Sample Image
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

## 🏗️ Model Training (Optional)

If you need to train custom models or retrain existing ones:

### Train Transformer Segmentation Model
```bash
# Using existing dataset
python simple_train.py

# With custom parameters
python config_train.py
```

### Train Defect Detection Model
```bash
# Using Transformer Defects dataset
python train_transformer_defects.py

# Monitor training progress in runs/detect/transformer_defects_v1/
```

## 📁 Directory Structure
```
tf_model/
├── two_stage_defect_detection.py    # Main detection script
├── defect_detection_gui.py          # GUI interface
├── test_two_stage_detection.py      # Quick test script
├── requirements.txt                 # Python dependencies
├── README.md                        # This file
├── TWO_STAGE_DETECTION_README.md   # Detailed documentation
├── runs/                           # Model weights and training results
│   ├── seg_y11n_tx3/weights/      # Transformer segmentation model
│   └── detect/transformer_defects_v1/weights/  # Defect detection model
├── detection_results/              # Output folder for results
├── test_results/                   # Test output folder
├── Sample Thermal Images/          # Sample data for testing
└── Transformer Defects/           # Training dataset
```

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

---

**Ready to detect transformer defects! 🔍⚡**

For questions or issues, refer to the troubleshooting section or check the detailed documentation files.