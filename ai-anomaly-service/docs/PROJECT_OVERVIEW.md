# Thermal Anomaly Detection Service - Project Overview

## 📁 Directory Structure

```
ai-anomaly-service/
├── 📄 Core Application Files
│   ├── fastapi_server.py              # Main FastAPI web service
│   ├── thermal_detection_algorithm.py # Original thermal analysis algorithms
│   ├── model_trainer.py               # YOLO model training pipeline
│   ├── model_tester.py                # Comprehensive testing suite
│   ├── dataset_generator.py           # Dataset creation from thermal images
│   ├── dataset_validator.py           # Dataset validation and quality checks
│   └── system_diagnostics.py          # GPU/system diagnostics
│
├── 📁 Configuration
│   └── service_config.ini              # Service configuration settings
│
├── 📁 Scripts
│   ├── start_service.bat              # Start the FastAPI service
│   ├── test_model.bat                 # Model testing interface
│   └── train_model.bat                # Model training interface
│
├── 📁 Documentation
│   └── TRAINING_SUMMARY.md            # Training process documentation
│
├── 📁 Data & Models
│   ├── yolo_dataset/                  # Training dataset (YOLO format)
│   │   ├── images/                    # Train/val/test image splits
│   │   ├── labels/                    # YOLO annotation files
│   │   ├── data.yaml                  # Dataset configuration
│   │   └── classes.txt                # Class names
│   ├── yolo_runs/                     # Training results and logs
│   ├── test_results/                  # Testing outputs and reports
│   └── dataset/                       # Original thermal images
│
├── 📄 Configuration Files
│   ├── requirements.txt               # Python dependencies
│   └── README.md                      # Project documentation
```

## 🔧 Core Components

### 1. **FastAPI Service** (`fastapi_server.py`)
- REST API endpoints for thermal anomaly detection
- Image upload and processing
- Real-time inference using trained YOLO model
- JSON response with detection results

### 2. **Thermal Detection Algorithm** (`thermal_detection_algorithm.py`)
- Original computer vision-based detection
- HSV color space analysis
- Morphological operations for anomaly identification
- Rule-based classification system

### 3. **Model Training Pipeline** (`model_trainer.py`)
- YOLOv8 model training with GPU/CPU support
- Automatic mixed precision training
- Model validation and metrics
- Hyperparameter optimization

### 4. **Testing Suite** (`model_tester.py`)
- Single image and batch testing capabilities
- Detailed reporting (JSON, text, visual)
- Interactive testing interface
- Performance metrics and analysis

### 5. **Dataset Management**
- **Generator** (`dataset_generator.py`): Convert thermal images to YOLO format
- **Validator** (`dataset_validator.py`): Quality checks and visualization
- Automated train/validation/test splits

## 🎯 Anomaly Detection Classes

| ID | Class Name | Severity | Description |
|----|------------|----------|-------------|
| 0 | Loose Joint (Faulty) | 🚨 Critical | Confirmed loose electrical connection |
| 1 | Loose Joint (Potential) | ⚠️ Warning | Developing loose connection |
| 2 | Point Overload (Faulty) | 🚨 Critical | Confirmed electrical overload |
| 3 | Point Overload (Potential) | ⚠️ Warning | Potential overload condition |
| 4 | Full Wire Overload | ⚠️ Warning | Wire carrying excessive current |
| 5 | Hotspot (Review) | 🔍 Review | Unusual heat signature |
| 6 | Warm Area (Normal) | ✅ Normal | Normal operational heating |

## 🚀 Usage Workflows

### Development Workflow
1. **Setup**: Install dependencies (`pip install -r requirements.txt`)
2. **Dataset**: Generate/validate dataset using `dataset_generator.py`
3. **Training**: Train model using `model_trainer.py`
4. **Testing**: Validate results using `model_tester.py`
5. **Deployment**: Start service using `fastapi_server.py`

### Production Workflow
1. **Service**: Start with `scripts/start_service.bat`
2. **API**: Send POST requests to `/detect-anomalies`
3. **Results**: Receive JSON with detected anomalies
4. **Monitoring**: Check `/health` endpoint for service status

## 🔍 Key Features

### AI/ML Capabilities
- **YOLOv8 Architecture**: State-of-the-art object detection
- **Custom Training**: Domain-specific thermal anomaly dataset
- **Real-time Inference**: Fast detection (~100-500ms per image)
- **Confidence Scoring**: Reliability metrics for each detection

### Software Engineering
- **REST API**: FastAPI with automatic OpenAPI documentation
- **Modular Design**: Separate concerns for training, testing, and inference
- **Configuration Management**: INI-based configuration system
- **Error Handling**: Comprehensive error management and logging

### Data Processing
- **Image Preprocessing**: Automatic resizing and normalization
- **Batch Processing**: Handle multiple images efficiently
- **Output Formats**: JSON, text reports, annotated images
- **Dataset Management**: Automated splitting and validation

## 🛠️ Technical Architecture

### Training Pipeline
```
Thermal Images → Dataset Generator → YOLO Dataset → Model Trainer → Trained Model
```

### Inference Pipeline
```
Input Image → FastAPI → YOLO Model → Post-processing → JSON Response
```

### Data Flow
```
Raw Thermal Images
    ↓
Annotation & Labeling
    ↓
YOLO Dataset (train/val/test)
    ↓
Model Training
    ↓
Trained Model (.pt file)
    ↓
FastAPI Service
    ↓
Real-time Detection
```

## 📊 Performance Metrics

### Dataset Statistics
- **Total Images**: 106 thermal images
- **Total Annotations**: 473 anomaly detections
- **Class Distribution**: Balanced across 7 anomaly types
- **Data Splits**: 70% train, 20% validation, 10% test

### Model Performance
- **Architecture**: YOLOv8 Nano (lightweight, fast)
- **Training Time**: 30-60 minutes (GPU), 2-4 hours (CPU)
- **Inference Speed**: ~100-500ms per image
- **Memory Usage**: ~500MB (model loaded)

## 🔧 Configuration Options

### Service Configuration (`config/service_config.ini`)
- **Network**: Host, port, CORS settings
- **Model**: Path, confidence thresholds, device selection
- **Output**: Result storage, formatting options
- **Performance**: Timeouts, batch sizes, resource limits

### Training Configuration (`model_trainer.py`)
- **Hyperparameters**: Learning rate, batch size, epochs
- **Hardware**: GPU/CPU selection, memory optimization
- **Data Augmentation**: Image transformations, augmentation strategies
- **Validation**: Metrics, early stopping, model checkpoints

## 🚨 Error Handling & Diagnostics

### System Diagnostics (`system_diagnostics.py`)
- GPU availability and CUDA support
- Memory usage and performance estimates
- Hardware compatibility checks
- Installation verification

### Common Issues & Solutions
- **OpenMP Conflicts**: Automatically resolved with environment variables
- **Memory Issues**: Configurable batch sizes and image resizing
- **Model Loading**: Automatic fallbacks and error messages
- **API Errors**: Detailed HTTP status codes and error descriptions

## 🎯 Future Enhancements

### Potential Improvements
1. **Real-time Streaming**: WebSocket support for live thermal feeds
2. **Model Versioning**: A/B testing and model comparison
3. **Advanced Analytics**: Trend analysis and predictive maintenance
4. **Mobile Support**: Optimized models for edge deployment
5. **Integration**: Database storage and external system APIs

### Scalability Considerations
- **Containerization**: Docker support for easy deployment
- **Load Balancing**: Multiple service instances
- **Caching**: Redis for frequently accessed results
- **Monitoring**: Prometheus/Grafana integration
- **Security**: Authentication and API rate limiting