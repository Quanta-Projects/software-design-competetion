# Thermal Anomaly Detection Service

## Overview
This AI-powered service provides thermal anomaly detection for transformer inspections using YOLOv8 object detection. The system can detect various types of thermal anomalies including loose joints, overheating components, and warm areas in electrical transformer thermal images.

## Features
- **YOLOv8 Object Detection**: State-of-the-art deep learning model for anomaly detection
- **7 Anomaly Classes**: Faulty components, potential issues, normal warm areas, and more
- **Dual Annotation Outputs**: Both YOLO automatic and detailed custom annotations
- **Comprehensive Testing Suite**: Single image and batch processing capabilities
- **Professional Reporting**: JSON and text reports with detailed analysis
- **FastAPI Web Service**: RESTful API for easy integration
- **GPU Acceleration**: CUDA support for faster inference

## Anomaly Classes
The model detects 7 different types of thermal anomalies:

1. **Loose Joint (Faulty)** - Critical issues requiring immediate attention
2. **Loose Joint (Potential)** - Potential problems that need monitoring
3. **Overheating (Faulty)** - Components running too hot
4. **Overheating (Potential)** - Components showing signs of overheating
5. **Warm Area (Likely Normal)** - Normal operational heating
6. **Warm Area (Potential Issue)** - Areas that may develop problems
7. **Cooling System Issue** - Problems with cooling mechanisms

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- pip package manager
- CUDA-compatible GPU (optional, for training and faster inference)
- At least 8GB RAM (16GB recommended for training)

### Installation
1. Navigate to the ai-anomaly-service directory:
```bash
cd ai-anomaly-service
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Linux/Mac:
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Model Training

### 1. Dataset Preparation
If you have thermal images that need to be converted to YOLO format:

```bash
python dataset_generator.py
```

This will:
- Convert thermal detection annotations to YOLO format
- Create train/validation/test splits
- Generate class mapping files
- Create visualization previews

### 2. Dataset Validation
Validate your dataset before training:

```bash
python dataset_validator.py
```

This checks:
- Image file integrity
- Annotation format correctness
- Class distribution balance
- Missing files or annotations

### 3. Training the Model
Train a new YOLO model on your thermal anomaly dataset:

```bash
python model_trainer.py --epochs 100 --batch-size 16 --img-size 640
```

**Training Parameters:**
- `--epochs`: Number of training epochs (default: 100)
- `--batch-size`: Batch size (default: 16, adjust based on GPU memory)
- `--img-size`: Input image size (default: 640)
- `--device`: Device to use ('cpu', 'cuda', or 'cuda:0', default: auto-detect)

**Training Features:**
- Automatic GPU detection and utilization
- Progress tracking with loss visualization
- Model validation on test set
- Automatic model saving
- Training metrics logging

### 4. System Diagnostics
Check your system's readiness for training:

```bash
python system_diagnostics.py
```

This reports:
- GPU availability and memory
- CUDA installation status
- Python environment details
- Available system resources

## Running the Model

### 1. Single Image Testing
Test the trained model on a single thermal image:

```bash
python model_tester.py --image path/to/thermal_image.jpg --confidence 0.5
```

**Parameters:**
- `--image`: Path to the thermal image
- `--confidence`: Confidence threshold (0.0-1.0, default: 0.25)
- `--model`: Custom model path (default: thermal_anomaly_model.pt)

**Output:**
- YOLO annotated image with automatic bounding boxes
- Detailed annotated image with enhanced visualization
- JSON report with detection details
- Text report for human reading

### 2. Batch Processing
Process multiple images in a folder:

```bash
python model_tester.py --folder path/to/images/ --confidence 0.3
```

This will:
- Process all images in the specified folder
- Generate reports for each image
- Create a batch summary report
- Save all results in the `test_results/` directory

### 3. Interactive Testing
Run interactive testing mode:

```bash
python model_tester.py --interactive
```

Features:
- Menu-driven interface
- Real-time parameter adjustment
- Visual result preview
- Batch processing options

### 4. FastAPI Web Service
Start the web service for API access:

```bash
python fastapi_server.py
```

The API will be available at:
- Main service: http://localhost:8001
- API documentation: http://localhost:8001/docs
- Alternative docs: http://localhost:8001/redoc

## API Endpoints

### 1. Detect Anomalies
**POST** `/detect-thermal-anomalies`

Analyzes a thermal image for anomalies using the trained YOLO model.

**Parameters:**
- `file` (file): Thermal image to analyze
- `confidence_threshold` (float, optional): Detection confidence threshold (default: 0.25)

**Response:**
```json
{
  "success": true,
  "detections": [
    {
      "class_id": 0,
      "class_name": "Loose Joint (Faulty)",
      "confidence": 0.95,
      "bbox": [100, 150, 200, 250],
      "center": [150, 200]
    },
    {
      "class_id": 1,
      "class_name": "Loose Joint (Potential)",
      "confidence": 0.78,
      "bbox": [300, 100, 380, 180],
      "center": [340, 140]
    }
  ],
  "total_detections": 2,
  "severity_level": "HIGH",
  "severity_score": 0.87,
  "confidence_threshold": 0.25,
  "processing_time": 0.15,
  "annotated_image_base64": "iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### 2. Health Check
**GET** `/health`

Returns service health status and model information.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_path": "thermal_anomaly_model.pt",
  "service_version": "1.0.0",
  "supported_classes": [
    "Loose Joint (Faulty)",
    "Loose Joint (Potential)",
    "Overheating (Faulty)",
    "Overheating (Potential)",
    "Warm Area (Likely Normal)",
    "Warm Area (Potential Issue)",
    "Cooling System Issue"
  ]
}
```

## Output Files

### Test Results Structure
When running model testing, results are saved in the `test_results/` directory:

```
test_results/
├── [image_name]_report.json              # Detailed JSON report
├── [image_name]_report.txt               # Human-readable report
├── [image_name]_yolo_annotated.jpg       # YOLO automatic annotations
├── [image_name]_detailed_annotated.jpg   # Custom detailed annotations
└── batch_summary.json                    # Batch processing summary
```

### Annotation Types

**YOLO Annotated Images:**
- Automatic bounding boxes from YOLO model
- Simple class labels and confidence scores
- Standard YOLO visualization format

**Detailed Annotated Images:**
- Professional layout with title and summary
- Numbered detection labels with detailed information
- Color-coded legend for all anomaly classes
- Summary statistics panel
- High-resolution output (150 DPI)

## Model Performance

### Training Dataset
- **106 thermal images** with various anomaly types
- **473 labeled detections** across 7 classes
- **Train/Validation/Test splits**: 70%/20%/10%
- **Image formats**: JPG thermal camera outputs

### Model Metrics
- **Architecture**: YOLOv8n (nano) - optimized for speed and accuracy
- **Input size**: 640x640 pixels
- **Training time**: ~30-60 minutes on RTX 3050 Ti
- **Inference speed**: ~100-150ms per image (GPU), ~300-500ms (CPU)

## Project Structure

```
ai-anomaly-service/
├── config/                    # Configuration files
│   └── service_config.ini
├── scripts/                   # Batch scripts
│   ├── train_model.bat
│   ├── test_model.bat
│   └── start_service.bat
├── docs/                      # Documentation
│   └── PROJECT_OVERVIEW.md
├── yolo_dataset/             # Training dataset
│   ├── images/
│   ├── labels/
│   └── data.yaml
├── test_results/             # Model testing outputs
├── yolo_runs/               # Training runs and checkpoints
├── dataset_generator.py     # Convert data to YOLO format
├── dataset_validator.py     # Validate dataset integrity
├── model_trainer.py         # Train YOLO model
├── model_tester.py          # Test trained model
├── system_diagnostics.py    # System capability check
├── fastapi_server.py        # Web API service
├── thermal_detection_algorithm.py  # Core detection logic
├── thermal_anomaly_model.pt # Trained model weights
└── requirements.txt         # Python dependencies
```

## Dependencies
- **ultralytics**: YOLOv8 implementation
- **torch**: PyTorch deep learning framework
- **opencv-python**: Computer vision operations
- **fastapi**: Web framework
- **matplotlib**: Visualization and plotting
- **numpy**: Numerical computations
- **pillow**: Image processing
- **pyyaml**: YAML configuration files

## Integration Notes
- Service runs on port 8001 (configurable)
- CORS enabled for frontend integration
- Supports standard image formats (PNG, JPG, JPEG)
- Base64 encoded image responses for web display
- Comprehensive error handling and logging
- GPU acceleration when available

## Troubleshooting

### Common Issues

**CUDA/GPU Issues:**
```bash
# Check GPU availability
python system_diagnostics.py

# Force CPU usage
python model_tester.py --image image.jpg --device cpu
```

**Memory Issues:**
- Reduce batch size during training
- Use smaller image size (416x416 instead of 640x640)
- Close other applications to free RAM

**Import Errors:**
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

**Model Not Found:**
- Ensure `thermal_anomaly_model.pt` exists in the service directory
- Train a new model if missing: `python model_trainer.py`

## Performance Optimization

### For Training:
- Use GPU if available (`--device cuda`)
- Increase batch size based on GPU memory
- Use larger image sizes for better accuracy
- Add data augmentation for better generalization

### For Inference:
- Use smaller models (YOLOv8n) for speed
- Reduce image size if speed is critical
- Use GPU for batch processing
- Cache model in memory for repeated use
