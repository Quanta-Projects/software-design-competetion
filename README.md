# Transformer Management System

A full-stack web application for managing electrical transformers and inspection operations with AI-powered thermal anomaly detection.

[![Java](https://img.shields.io/badge/Java-17+-ED8B00?style=flat&logo=java&logoColor=white)](https://adoptopenjdk.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.4-6DB33F?style=flat&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)

## Overview

Transformer management system with CRUD operations, inspection tracking, image management, and AI-powered thermal defect detection using YOLO11.

**Stack:** React frontend • Spring Boot backend • FastAPI AI service • MySQL database

---

## AI Detection Algorithm

### Two-Stage Transformer Defect Detection

Our system leverages **YOLO11 (You Only Look Once v11)**, a state-of-the-art real-time object detection architecture, to identify thermal anomalies in electrical transformers. YOLO11 is a single-stage convolutional neural network (CNN) that simultaneously predicts bounding boxes and class probabilities directly from images in one evaluation, making it ideal for real-time industrial inspection.

#### **How YOLO11 Works**

**Architecture Overview:**
- **Backbone**: CSPDarknet feature extraction network with cross-stage partial connections for efficient gradient flow
- **Neck**: Feature Pyramid Network (FPN) and Path Aggregation Network (PAN) for multi-scale feature fusion
- **Head**: Decoupled detection heads for bounding box regression and classification

**Detection Process:**
1. **Input Processing**: Thermal image is resized to 640×640 pixels with preserved aspect ratio
2. **Feature Extraction**: Backbone network extracts hierarchical features (low-level edges, mid-level patterns, high-level semantic information)
3. **Feature Fusion**: Neck combines features from different scales to detect both small and large defects
4. **Prediction**: Detection heads output bounding box coordinates, objectness scores, and class probabilities
5. **Post-Processing**: Non-Maximum Suppression (NMS) filters overlapping detections based on IoU threshold

---

### Our Two-Stage Pipeline

To maximize detection accuracy in complex transformer environments, we implement a **cascade architecture** that first isolates the transformer, then analyzes defects within it:

#### **Stage 1: Transformer Segmentation (Instance Segmentation Model)**
- **Model Type**: YOLO11-seg (segmentation variant)
- **Purpose**: Isolate the transformer region from cluttered backgrounds, shadows, and irrelevant objects
- **How It Works**:
  1. **Input**: Raw thermal image (may contain multiple objects, backgrounds, or noise)
  2. **Detection**: YOLO11 backbone extracts features and predicts transformer location
  3. **Segmentation**: Additional segmentation head generates pixel-wise mask outlining the exact transformer shape
  4. **ROI Extraction**: Bounding box with 10% padding is applied to the segmented region
  5. **Output**: Clean, cropped transformer image focused solely on the device under inspection
- **Why This Matters**: Eliminates false positives from background elements and focuses the defect detector on the relevant inspection area

#### **Stage 2: Defect Detection & Classification (Object Detection Model)**
- **Model Type**: YOLO11-det (detection variant)
- **Purpose**: Pinpoint and classify thermal anomalies indicating electrical faults
- **Defect Classes** (6 types):
  - **Full Wire Overload PF**: Entire wire section shows elevated temperature (Potential Failure)
  - **Loose Joint F**: Connection point with critical heat (Failure - immediate attention)
  - **Loose Joint PF**: Connection point with moderate heat (Potential Failure - monitor)
  - **Point Overload F**: Localized hotspot indicating imminent failure
  - **Point Overload PF**: Localized hotspot indicating potential failure
  - **Transformer Overload**: Overall transformer temperature exceeds safe operating limits
- **How It Works**:
  1. **Input**: Cropped transformer image from Stage 1
  2. **Feature Learning**: Network learns thermal patterns associated with each defect type
  3. **Multi-Object Detection**: Scans entire image in parallel, detecting multiple defects simultaneously
  4. **Classification**: Each detection is assigned to one of 6 defect classes with confidence score (0-100%)
  5. **Localization**: Precise bounding boxes mark defect locations on the thermal image
  6. **Output**: JSON response with defect coordinates, class names, and confidence scores + annotated visualization
- **Why This Matters**: Technicians receive actionable intelligence—not just "there's a problem," but "Loose Joint at coordinates (X, Y) with 87% confidence"

#### **Key Features**
- **Automated Processing**: No manual ROI selection required—AI handles transformer localization automatically
- **Multi-Defect Detection**: Detects and classifies multiple simultaneous defects in a single forward pass
- **Confidence Scoring**: Each detection includes confidence percentage for reliability assessment
- **Real-Time Inference**: GPU acceleration enables 1-3 second processing per image
- **Visual Overlay**: Defects are highlighted with color-coded bounding boxes on original thermal images
- **REST API**: FastAPI service for seamless integration with frontend and backend systems
- **Batch Processing**: Evaluate entire datasets with aggregate metrics (precision, recall, mAP)

#### **Why Two Stages Are Better Than One**

Traditional single-stage approaches struggle with transformer inspection because:
- **Background Clutter**: Thermal images often contain multiple objects (pipes, walls, equipment)
- **Variable Framing**: Transformers may appear at different scales and orientations
- **Defect Ambiguity**: Small defects near background hotspots can cause false positives

Our two-stage approach solves these issues:
1. **Stage 1 eliminates noise**: By segmenting the transformer first, Stage 2 only analyzes the relevant region
2. **Improved accuracy**: Defect detector is trained exclusively on transformer crops, not full scenes
3. **Reduced false positives**: Background heat sources (windows, sunlight) are filtered out before defect analysis
4. **Specialized models**: Each stage is optimized for its specific task (segmentation vs. classification)

#### **Model Training & Data Augmentation**

**Challenge**: Limited availability of labeled thermal transformer images  
**Solution**: Aggressive data augmentation to expand training dataset

**Augmentation Techniques Applied:**
- **Geometric Transformations**: Rotation (±15°), horizontal flip, scaling (0.8-1.2×)
- **Photometric Adjustments**: Brightness (±20%), contrast (±15%), Gaussian blur
- **Advanced Techniques**: Mosaic augmentation (combine 4 images), MixUp (blend images with labels)
- **Thermal-Specific**: Temperature range normalization, heatmap colorization variations

**Training Pipeline:**
1. **Original Dataset**: Small set of high-quality annotated thermal images
2. **Augmentation**: Each original image generates 10-15 augmented variants
3. **Expanded Dataset**: 10× increase in training samples with diverse variations
4. **Model Training**: YOLO11 trained for 300 epochs with early stopping on validation loss
5. **Validation**: Separate test set ensures model generalizes to unseen transformers

**Result**: Despite limited original data, augmented training achieves high detection accuracy by exposing the model to diverse lighting conditions, orientations, and thermal patterns.

#### **Technical Specifications**
- **Framework**: Ultralytics YOLO11 (PyTorch-based)
- **Model Weights**: 
  - Stage 1: `best_seg.pt` (segmentation model, ~50MB)
  - Stage 2: `best.pt` (detection model, ~45MB)
- **Training Data**: Augmented dataset derived from original thermal images (10× expansion via transformations)
- **Data Augmentation**: Rotation, scaling, brightness adjustment, mosaic, MixUp to overcome limited data
- **Input Format**: Thermal images (JPG, PNG, TIFF) with 640×640 resizing
- **Output Format**: JSON (coordinates, classes, confidence) + annotated images
- **Inference Speed**: 
  - GPU (NVIDIA RTX 3060+): 1-3 seconds per image
  - CPU (Intel i5+): 5-10 seconds per image
- **Detection Metrics**:
  - Confidence Threshold: 0.5 (configurable)
  - IoU Threshold: 0.45 for NMS
  - mAP@0.5: ~85% (mean Average Precision at 50% IoU)
- **API Endpoint**: `POST http://localhost:8001/detect-thermal-anomalies`
- **Dependencies**: ultralytics, opencv-python, fastapi, uvicorn, torch

#### **Detection Workflow (End-to-End)**

```
User Uploads Image → FastAPI Receives Request → Stage 1 (Segmentation)
    ↓
YOLO11-seg Locates Transformer → Crops ROI with Padding → Stage 2 (Detection)
    ↓
YOLO11-det Scans for Defects → Applies NMS → Filters by Confidence → Generates Annotations
    ↓
Returns JSON (defect data) + Annotated Image → Displayed in Frontend UI
```

**Example Output JSON:**
```json
{
  "detections": [
    {"class": "Loose Joint F", "confidence": 0.87, "bbox": [120, 85, 45, 60]},
    {"class": "Point Overload PF", "confidence": 0.72, "bbox": [200, 150, 30, 40]}
  ],
  "annotated_image_path": "/path/to/annotated.jpg",
  "processing_time": 2.3
}
```

---

## Prerequisites

| Software | Minimum Version | Download |
|----------|----------------|----------|
| **Java JDK** | 17+ | [Eclipse Temurin](https://adoptium.net/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.10+ | [python.org](https://www.python.org/downloads/) |
| **MySQL** | 8.0+ | [MySQL](https://dev.mysql.com/downloads/mysql/) |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/) |

**Verify installation:**
```powershell
java --version
node --version
python --version
mysql --version
git --version
```

---

## Setup

### 1. Clone Repository
```powershell
git clone https://github.com/Quanta-Projects/software-design-competetion.git
cd software-design-competetion
```

### 2. Database Setup
```sql
mysql -u root -p

CREATE DATABASE transformer_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'transformer_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON transformer_db.* TO 'transformer_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Backend Configuration
Create `Back-end/software-design-project-final/.env`:
```properties
DB_URL=jdbc:mysql://localhost:3306/transformer_db
DB_USERNAME=transformer_user
DB_PASSWORD=your_password
APP_PORT=8080
FILE_UPLOAD_PATH=./uploads/images/
```

### 4. Frontend Configuration
Create `Front-end/.env`:
```properties
REACT_APP_API_BASE_URL=http://localhost:8080/api
REACT_APP_FASTAPI_URL=http://localhost:8001
```

---

## Running the Application

## Running the Application

### Start All Services

**1. Backend** *(terminal 1)*
```powershell
cd Back-end\software-design-project-final
.\mvnw.cmd spring-boot:run
```
→ API: http://localhost:8080/api

**2. Frontend** *(terminal 2)*
```powershell
cd Front-end
npm install
npm start
```
→ Web app: http://localhost:3000

**3. AI Service** *(terminal 3)*
```powershell
cd tf_model
python -m venv .venv              # first time only
.\.venv\Scripts\activate          # activate environment
pip install -r requirements.txt   # first time only
python fastapi_server.py
```
→ Detection API: http://localhost:8001/docs

---

## Additional Resources

- **[Environment Setup Guide](ENV_SETUP.md)** – Detailed configuration steps
- **[Environment Variables Reference](ENVIRONMENT_VARIABLES.md)** – All config options
- **[Deployment Guide](SIMPLE_DEPLOYMENT.md)** – Production deployment

---

## Troubleshooting

**Backend won't start:**
- Verify MySQL is running: `mysql -u root -p`
- Check database exists: `SHOW DATABASES;`
- Confirm Java 17+: `java --version`

**Frontend errors:**
- Clear cache: `npm cache clean --force`
- Reinstall: `rm -rf node_modules package-lock.json; npm install`

**AI service fails:**
- Activate venv: `.\.venv\Scripts\activate`
- Check Python 3.10+: `python --version`
- Reinstall deps: `pip install -r requirements.txt`

**Port conflicts:**
- Backend: Edit `APP_PORT` in `.env`
- Frontend: `set PORT=3001 && npm start`
- AI: Edit `port=` in `fastapi_server.py`

---

## Project Structure

```
software-design-competetion-forked/
├── Back-end/
│   └── software-design-project-final/
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/com/example/software_design_project_final/
│       │   │   │   ├── config/                    # Configuration classes
│       │   │   │   ├── controller/                # REST API endpoints
│       │   │   │   │   ├── ImageController.java
│       │   │   │   │   ├── InspectionController.java
│       │   │   │   │   └── TransformerController.java
│       │   │   │   ├── dao/                       # Entity models
│       │   │   │   │   ├── Image.java
│       │   │   │   │   ├── Inspection.java
│       │   │   │   │   └── Transformer.java
│       │   │   │   ├── dto/                       # Data transfer objects
│       │   │   │   ├── exception/                 # Custom exceptions
│       │   │   │   ├── repository/                # JPA repositories
│       │   │   │   │   ├── ImageRepository.java
│       │   │   │   │   ├── InspectionRepository.java
│       │   │   │   │   └── TransformerRepository.java
│       │   │   │   ├── service/                   # Business logic
│       │   │   │   │   ├── ImageService.java
│       │   │   │   │   ├── InspectionService.java
│       │   │   │   │   └── TransformerService.java
│       │   │   │   └── SoftwareDesignProjectFinalApplication.java
│       │   │   └── resources/
│       │   │       ├── application.properties
│       │   │       └── applicatiion.yml
│       │   └── test/                              # Unit tests
│       ├── uploads/                               # File upload storage
│       ├── .env                                   # Environment config
│       ├── Dockerfile
│       ├── pom.xml                                # Maven dependencies
│       └── mvnw.cmd                               # Maven wrapper
│
├── Front-end/
│   ├── public/                                    # Static assets
│   │   ├── index.html
│   │   ├── data/
│   │   └── img/
│   ├── src/
│   │   ├── components/                            # Reusable UI components
│   │   │   ├── AddInspectionModal.jsx
│   │   │   ├── AddTransformerModal.jsx
│   │   │   ├── AnnotationEditor.jsx
│   │   │   ├── AnnotationList.jsx
│   │   │   ├── cardTop.jsx
│   │   │   ├── EditInspectionModal.jsx
│   │   │   ├── InspectionHeader.jsx
│   │   │   ├── InspectionTable.jsx
│   │   │   ├── pager.jsx
│   │   │   ├── sidebar.jsx
│   │   │   ├── thermalImageUploader.jsx
│   │   │   ├── toolbar.jsx
│   │   │   └── transformerTable.jsx
│   │   ├── pages/                                 # Page components
│   │   │   ├── ImageViewer.jsx
│   │   │   ├── InspectionsPage.jsx
│   │   │   ├── previewPage.jsx
│   │   │   ├── settingsPage.jsx
│   │   │   ├── TransformersPage.jsx
│   │   │   └── uploadPage.jsx
│   │   ├── layouts/
│   │   │   └── AppLayout.jsx
│   │   ├── styles/                                # Stylesheets
│   │   │   ├── annotations.css
│   │   │   ├── previewPage.css
│   │   │   └── uiTokens.css                       # Shared design tokens
│   │   ├── utils/                                 # Utility functions
│   │   │   ├── config.js
│   │   │   └── uiOptions.js                       # Shared UI constants
│   │   ├── App.js                                 # Main app component
│   │   ├── App.css
│   │   └── index.js                               # Entry point
│   ├── .env                                       # Frontend config
│   ├── package.json                               # NPM dependencies
│   └── README.md
│
├── tf_model/                                      # AI anomaly detection service
│   ├── weights/                                   # YOLO11 model weights
│   ├── Transformer Defects/                       # Training dataset
│   ├── detection_results/                         # Detection output
│   ├── runs/                                      # Training runs
│   ├── defect_detection_gui.py                    # GUI interface
│   ├── fastapi_server.py                          # FastAPI service
│   ├── train_transformer_defects.py               # Model training
│   ├── two_stage_defect_detection.py              # Detection pipeline
│   ├── requirements.txt                           # Python dependencies
│   └── README.md
│
├── .gitignore
├── ENV_SETUP.md                                   # Setup instructions
├── ENVIRONMENT_VARIABLES.md                       # Config reference
├── SIMPLE_DEPLOYMENT.md                           # Deployment guide
└── README.md                                      # This file
```


