# Two-Stage Transformer Defect Detection API

## 🎯 Overview

This FastAPI server implements a **two-stage transformer defect detection system** using YOLO11 models:

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Input Thermal Image                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 1: Transformer Segmentation                          │
│  Model: weights/segment/best.pt                             │
│  Task: Locate and segment transformer from thermal image    │
│  Output: Cropped transformer region + bounding box          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  STAGE 2: Defect Detection                                  │
│  Model: weights/defects/best.pt                             │
│  Task: Detect and classify defects in transformer region    │
│  Output: Defect bounding boxes + classifications            │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  Result: Annotated Image + Detection Data                   │
│  - Defects overlaid on original image                       │
│  - Confidence scores and severity levels                    │
│  - Base64 encoded annotated image                           │
└─────────────────────────────────────────────────────────────┘
```

## 📋 Features

✅ **Two-Stage Detection Pipeline**
- Stage 1: Segments transformer from thermal image
- Stage 2: Detects defects within segmented region

✅ **6 Defect Classes**
1. Full Wire Overload PF
2. Loose Joint F
3. Loose Joint PF
4. Point Overload F
5. Point Overload PF
6. Transformer Overload

✅ **RESTful API**
- FastAPI with automatic OpenAPI documentation
- CORS enabled for web integration
- Base64 image encoding for easy display

✅ **Smart Detection**
- Confidence thresholds
- Severity scoring (NORMAL, LOW, MEDIUM, HIGH, CRITICAL)
- Color-coded bounding boxes by defect type

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Activate your conda environment
conda activate yolov11

# Install required packages (if not already installed)
pip install fastapi uvicorn ultralytics opencv-python numpy pillow
```

### 2. Ensure Models Are Available

Make sure you have trained models in the correct locations:
```
tf_model/
  └── weights/
      ├── segment/
      │   └── best.pt       # Transformer segmentation model
      └── defects/
          └── best.pt       # Defect detection model
```

### 3. Start the Server

```bash
# Navigate to ai-anomaly-service directory
cd "d:\ACCA Sem 7\Software Design Competetion\quanta-project\Fork\software-design-competetion-forked\ai-anomaly-service"

# Run the server
python fastapi_server.py
```

The server will start at **http://localhost:8001**

### 4. Access API Documentation

Open your browser and go to:
- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

## 🔌 API Endpoints

### 1. Health Check

**GET** `/health`

Check if the API is running and models are loaded.

```bash
curl http://localhost:8001/health
```

Response:
```json
{
  "status": "healthy",
  "transformer_model_loaded": true,
  "defect_model_loaded": true,
  "transformer_model_path": "../tf_model/weights/segment/best.pt",
  "defect_model_path": "../tf_model/weights/defects/best.pt",
  "service_version": "5.0.0",
  "supported_defect_classes": [
    "Full Wire Overload PF",
    "Loose Joint F",
    "Loose Joint PF",
    "Point Overload F",
    "Point Overload PF",
    "Transformer Overload"
  ],
  "detection_mode": "two_stage"
}
```

### 2. Test Endpoint

**GET** `/test`

Simple test to verify service is running.

```bash
curl http://localhost:8001/test
```

### 3. Detect Defects (Main Endpoint)

**POST** `/detect-thermal-anomalies`

Upload a thermal image and get defect detections.

#### Using cURL:

```bash
curl -X POST "http://localhost:8001/detect-thermal-anomalies?confidence_threshold=0.25" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@path/to/thermal_image.jpg"
```

#### Using Python:

```python
import requests
import json
import base64
from PIL import Image
import io

# API endpoint
url = "http://localhost:8001/detect-thermal-anomalies"

# Read image file
image_path = "path/to/thermal_image.jpg"
with open(image_path, "rb") as f:
    files = {"file": ("thermal_image.jpg", f, "image/jpeg")}
    
    # Optional: Set confidence threshold
    params = {"confidence_threshold": 0.25}
    
    # Send request
    response = requests.post(url, files=files, params=params)

# Parse response
result = response.json()

print(f"Success: {result['success']}")
print(f"Stage 1 Status: {result['stage1_info']['status']}")
print(f"Stage 2 Defects Found: {result['stage2_info']['defect_count']}")
print(f"Total Detections: {result['total_detections']}")
print(f"Severity Level: {result['severity_level']}")

# Display detections
for detection in result['detections']:
    print(f"\n{detection['class_name']}:")
    print(f"  Confidence: {detection['confidence']:.2%}")
    print(f"  BBox: {detection['bbox']}")
    print(f"  Area: {detection['area']} px²")

# Save annotated image
if result['annotated_image_base64']:
    image_data = base64.b64decode(result['annotated_image_base64'])
    image = Image.open(io.BytesIO(image_data))
    image.save("annotated_result.jpg")
    print("\n✅ Annotated image saved as 'annotated_result.jpg'")
```

#### Using JavaScript/Frontend:

```javascript
async function detectDefects(imageFile) {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await fetch(
        'http://localhost:8001/detect-thermal-anomalies?confidence_threshold=0.25',
        {
            method: 'POST',
            body: formData
        }
    );
    
    const result = await response.json();
    
    // Display results
    console.log('Stage 1:', result.stage1_info.status);
    console.log('Defects Found:', result.stage2_info.defect_count);
    console.log('Severity:', result.severity_level);
    
    // Display annotated image
    const imgElement = document.getElementById('result-image');
    imgElement.src = `data:image/jpeg;base64,${result.annotated_image_base64}`;
    
    return result;
}
```

## 📊 Response Format

```typescript
{
  success: boolean,
  stage1_info: {
    status: "transformer_detected" | "no_transformer_detected",
    confidence?: number,         // 0.0 - 1.0
    bbox?: [x1, y1, x2, y2],    // Transformer bounding box
    crop_bbox?: [x1, y1, x2, y2], // Cropped region coords
    transformer_area?: number    // Area in pixels
  },
  stage2_info: {
    status: "defects_detected" | "no_defects_detected",
    defect_count: number,
    classes_detected: string[]   // List of defect types found
  },
  detections: [
    {
      class_id: number,          // 0-5
      class_name: string,        // Defect type name
      confidence: number,        // 0.0 - 1.0
      bbox: [x1, y1, x2, y2],   // Defect bounding box
      area: number,              // Defect area in pixels
      color: [B, G, R]           // Color for visualization
    }
  ],
  total_detections: number,
  severity_level: "NO_TRANSFORMER" | "NORMAL" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  severity_score: number,        // 0.0 - 1.0
  confidence_threshold: number,  // Used threshold
  processing_time: number,       // Time in seconds
  annotated_image_base64: string, // Base64 encoded result image
  image_name: string,
  image_size: [width, height]
}
```

## 🎨 Defect Color Coding

| Defect Class             | Color   | Hex Code |
|-------------------------|---------|----------|
| Full Wire Overload PF   | 🔴 Red   | #0000FF  |
| Loose Joint F           | 🟠 Orange| #00A5FF  |
| Loose Joint PF          | 🟡 Yellow| #00FFFF  |
| Point Overload F        | 🔵 Blue  | #FF0000  |
| Point Overload PF       | 🟣 Magenta| #FF00FF |
| Transformer Overload    | 🟢 Green | #00FF00  |

## ⚙️ Configuration

### Confidence Threshold

Controls the minimum confidence for detections (0.1 - 1.0):
- **0.1 - 0.3**: Very sensitive (more false positives)
- **0.25 - 0.5**: Balanced (recommended)
- **0.5 - 1.0**: Very strict (may miss some defects)

Default: **0.25**

### Model Paths

The API automatically searches for models in these locations:
1. `../tf_model/weights/segment/best.pt` (transformer)
2. `../tf_model/weights/defects/best.pt` (defects)
3. Relative paths from current directory

## 🔧 Troubleshooting

### Models Not Loading

```
⚠️ Transformer model not found
⚠️ Defect model not found
```

**Solution:**
1. Ensure you've trained the models using `train_transformer_defects.py`
2. Check model paths in console output
3. Verify files exist: `weights/segment/best.pt` and `weights/defects/best.pt`

### CUDA/GPU Issues

If you see CUDA errors:

```python
# Edit fastapi_server.py, line ~172
results = self.transformer_model(image, conf=confidence_threshold, verbose=False, device='cpu')
results = self.defect_model(transformer_image, conf=confidence_threshold, verbose=False, device='cpu')
```

Force CPU mode by adding `device='cpu'` parameter.

### Port Already in Use

If port 8001 is occupied:

```python
# Edit fastapi_server.py, last line
uvicorn.run(app, host="127.0.0.1", port=8002)  # Change to 8002 or other
```

### CORS Issues

If your frontend can't connect:

```python
# Edit CORS settings in fastapi_server.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (dev only!)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 📈 Performance Tips

1. **Use Appropriate Confidence Threshold**
   - Lower threshold = more detections, more false positives
   - Higher threshold = fewer detections, may miss real defects

2. **Image Size**
   - Optimal: 640x640 to 1280x1280
   - Larger images take longer to process
   - Consider resizing very large images

3. **Batch Processing**
   - For multiple images, send requests in parallel
   - Server handles concurrent requests well

4. **GPU Acceleration**
   - If you have CUDA GPU, models will use it automatically
   - CPU mode works but is slower

## 🧪 Testing

### Test with Sample Image

```bash
# Using the provided test script
cd "d:\ACCA Sem 7\Software Design Competetion\quanta-project\Fork\software-design-competetion-forked\tf_model"

# Start server in one terminal
python ../ai-anomaly-service/fastapi_server.py

# In another terminal, test with sample
cd "Sample Thermal Images"
curl -X POST "http://localhost:8001/detect-thermal-anomalies" \
  -F "file=@thermal_sample.jpg" \
  -o result.json
```

## 📝 Integration with Frontend

### React Example

```jsx
import React, { useState } from 'react';

function DefectDetector() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await fetch(
        'http://localhost:8001/detect-thermal-anomalies?confidence_threshold=0.25',
        {
          method: 'POST',
          body: formData
        }
      );
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Detection failed:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div>
      <input type="file" accept="image/*" onChange={handleImageUpload} />
      
      {loading && <p>Processing...</p>}
      
      {result && (
        <div>
          <h3>Detection Results</h3>
          <p>Severity: {result.severity_level}</p>
          <p>Defects Found: {result.total_detections}</p>
          
          <img 
            src={`data:image/jpeg;base64,${result.annotated_image_base64}`}
            alt="Detection Result"
            style={{maxWidth: '100%'}}
          />
          
          <ul>
            {result.detections.map((det, idx) => (
              <li key={idx}>
                {det.class_name}: {(det.confidence * 100).toFixed(1)}%
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

## 🔄 Version History

### v5.0.0 (Current)
- ✅ Two-stage detection architecture
- ✅ Transformer segmentation (Stage 1)
- ✅ Defect detection within transformer (Stage 2)
- ✅ 6 defect classes
- ✅ Enhanced response format with stage info
- ✅ Improved accuracy through focused detection

### v4.0.0 (Previous)
- Single-stage YOLO detection
- Generic thermal anomaly classes

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in terminal where server is running
3. Verify model files are present and properly trained
4. Test with `/health` endpoint to check model status

## 🎉 Success Indicators

When everything is working correctly, you'll see:

```
🚀 Starting Two-Stage Transformer Defect Detection API...
🤖 Model Status:
   Stage 1 (Transformer Segmentation): ✅ Loaded
   Stage 2 (Defect Detection): ✅ Loaded
📱 Server will be available at:
   - http://localhost:8001
   - http://127.0.0.1:8001
📚 API Documentation:
   - http://localhost:8001/docs
   - http://localhost:8001/redoc

💡 Supported Defect Classes:
   0. Full Wire Overload PF
   1. Loose Joint F
   2. Loose Joint PF
   3. Point Overload F
   4. Point Overload PF
   5. Transformer Overload
```

## 🚀 Next Steps

1. **Train Models** (if not done):
   ```bash
   cd ../tf_model
   python train_transformer_defects.py
   ```

2. **Start Server**:
   ```bash
   python fastapi_server.py
   ```

3. **Test API**:
   - Open http://localhost:8001/docs
   - Try the `/detect-thermal-anomalies` endpoint
   - Upload a sample thermal image

4. **Integrate with Frontend**:
   - Use the provided code examples
   - Update CORS settings if needed
   - Handle responses in your UI

Happy detecting! 🔍✨
