# Thermal Anomaly Detection API

## Overview
This FastAPI service provides AI-powered thermal anomaly detection for transformer inspections. It compares baseline and current thermal images to identify temperature deviations, hotspots, and other anomalies.

## Features
- **Computer Vision-based Anomaly Detection**: Uses OpenCV and image processing techniques
- **Configurable Thresholds**: Adjustable temperature and confidence thresholds
- **Multiple Severity Levels**: Critical, High, and Medium anomaly classification
- **Comprehensive Metrics**: SSIM, PSNR, MSE, and histogram correlation
- **Visual Annotations**: Returns annotated images with bounding boxes and labels
- **RESTful API**: Easy integration with existing systems

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- pip package manager

### Installation
1. Navigate to the ai-anomaly-service directory:
```bash
cd ai-anomaly-service
```

2. Create a virtual environment (recommended):
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

### Running the Service
1. Start the FastAPI server:
```bash
python main.py
```

2. The API will be available at:
- Main service: http://localhost:8001
- API documentation: http://localhost:8001/docs
- Alternative docs: http://localhost:8001/redoc

## API Endpoints

### 1. Detect Anomalies
**POST** `/detect-anomalies`

Compares baseline and current thermal images to detect anomalies.

**Parameters:**
- `baseline_image` (file): Reference thermal image
- `current_image` (file): Current thermal image to analyze
- `temperature_threshold` (float, optional): Temperature deviation threshold (default: 10.0)
- `confidence_threshold` (float, optional): Confidence threshold (default: 0.7)

**Response:**
```json
{
  "has_anomalies": true,
  "anomaly_count": 2,
  "anomaly_regions": [
    {
      "x": 100,
      "y": 150,
      "width": 50,
      "height": 40,
      "severity_score": 0.85,
      "confidence_score": 0.92,
      "temperature_deviation": 15.2,
      "anomaly_type": "CRITICAL"
    }
  ],
  "overall_severity": 0.75,
  "confidence_score": 0.88,
  "metadata": {
    "pixel_coordinates": [[100, 150], [200, 300]],
    "anomaly_size": 2000,
    "severity_score": 0.75,
    "confidence_score": 0.88,
    "detection_timestamp": "2025-01-09T10:30:00",
    "algorithm_version": "1.0.0"
  },
  "annotated_image_base64": "iVBORw0KGgoAAAANSUhEUgAA...",
  "comparison_metrics": {
    "structural_similarity": 0.85,
    "peak_signal_noise_ratio": 25.3,
    "mean_squared_error": 120.5,
    "histogram_correlation": 0.92
  }
}
```

### 2. Configure Thresholds
**POST** `/configure-thresholds`

Updates detection thresholds.

### 3. Get Thresholds
**GET** `/get-thresholds`

Returns current threshold settings.

### 4. Health Check
**GET** `/health`

Returns service health status.

## Detection Algorithm

The anomaly detection uses a multi-step computer vision approach:

1. **Preprocessing**: Converts images to grayscale, applies Gaussian blur, and normalizes
2. **Difference Calculation**: Computes absolute difference between baseline and current images
3. **Thresholding**: Applies configurable temperature threshold to identify significant changes
4. **Morphological Operations**: Cleans up noise using opening and closing operations
5. **Contour Detection**: Identifies connected regions of anomalies
6. **Severity Classification**: Categorizes anomalies as Critical, High, or Medium based on intensity
7. **Annotation**: Generates visual overlays with bounding boxes and labels

## Anomaly Types
- **CRITICAL**: Severity score > 0.8 (Red bounding box)
- **HIGH**: Severity score > 0.5 (Orange bounding box)
- **MEDIUM**: Severity score ≤ 0.5 (Yellow bounding box)

## Integration Notes
- The service runs on port 8001 to avoid conflicts with Spring Boot (8080)
- CORS is configured for integration with React frontend and Spring Boot backend
- All responses include confidence scores and metadata for quality assessment
- Images are returned as base64-encoded strings for easy display in web applications

## Dependencies
- FastAPI: Web framework
- OpenCV: Computer vision operations
- NumPy: Numerical computations
- Pillow: Image processing
- scikit-image: Advanced image metrics
- scipy: Scientific computing

## Known Limitations
- Currently supports standard image formats (PNG, JPG, JPEG)
- Assumes thermal images have consistent scales and orientations
- Detection accuracy depends on image quality and lighting conditions
- Processing time increases with image resolution
