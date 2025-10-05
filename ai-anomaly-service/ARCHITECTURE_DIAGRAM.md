# System Architecture Diagram
## Two-Stage Transformer Defect Detection API

```
╔══════════════════════════════════════════════════════════════════════════╗
║                         CLIENT APPLICATION                                ║
║                    (Web Browser / Python Script / Mobile)                 ║
╚══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    │ HTTP POST /detect-thermal-anomalies
                                    │ (Multipart Form Data: image file)
                                    ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         FASTAPI SERVER (Port 8001)                        ║
║                         ai-anomaly-service/fastapi_server.py              ║
╠══════════════════════════════════════════════════════════════════════════╣
║  📥 REQUEST VALIDATION                                                    ║
║   - Check file type (JPEG, PNG, etc.)                                    ║
║   - Validate file size (< 10MB)                                          ║
║   - Decode image to numpy array                                          ║
║   - Extract confidence threshold parameter                               ║
╚══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                    TWO-STAGE DETECTION PIPELINE                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                           ║
║  🎯 STAGE 1: TRANSFORMER SEGMENTATION                                    ║
║  ┌────────────────────────────────────────────────────────────┐         ║
║  │ Model: weights/segment/best.pt (YOLO11)                    │         ║
║  │ Input: Full thermal image (e.g., 1920x1080)                │         ║
║  │ Task: Locate and segment transformer                       │         ║
║  │                                                             │         ║
║  │ Process:                                                    │         ║
║  │  1. Run YOLO inference on full image                       │         ║
║  │  2. Detect transformer bounding box                        │         ║
║  │  3. Extract segmentation mask (if available)               │         ║
║  │  4. Crop transformer region with 20px padding              │         ║
║  │                                                             │         ║
║  │ Output:                                                     │         ║
║  │  - Cropped transformer image                               │         ║
║  │  - Transformer bounding box: [x1, y1, x2, y2]              │         ║
║  │  - Confidence score: e.g., 0.95                            │         ║
║  │  - Status: "transformer_detected" or "not_detected"        │         ║
║  └────────────────────────────────────────────────────────────┘         ║
║                              │                                            ║
║                              │ If transformer detected                   ║
║                              ▼                                            ║
║  🔍 STAGE 2: DEFECT DETECTION                                            ║
║  ┌────────────────────────────────────────────────────────────┐         ║
║  │ Model: weights/defects/best.pt (YOLO11)                    │         ║
║  │ Input: Cropped transformer region                          │         ║
║  │ Task: Detect and classify defects                          │         ║
║  │                                                             │         ║
║  │ Process:                                                    │         ║
║  │  1. Run YOLO inference on cropped region                   │         ║
║  │  2. Detect all defect bounding boxes                       │         ║
║  │  3. Classify each defect (6 classes)                       │         ║
║  │  4. Filter by confidence threshold                         │         ║
║  │  5. Sort by confidence (highest first)                     │         ║
║  │                                                             │         ║
║  │ Defect Classes:                                             │         ║
║  │  0. Full Wire Overload PF    🔴 Red                         │         ║
║  │  1. Loose Joint F            🟠 Orange                      │         ║
║  │  2. Loose Joint PF           🟡 Yellow                      │         ║
║  │  3. Point Overload F         🔵 Blue                        │         ║
║  │  4. Point Overload PF        🟣 Purple                      │         ║
║  │  5. Transformer Overload     🟢 Green                       │         ║
║  │                                                             │         ║
║  │ Output:                                                     │         ║
║  │  - List of defects with bounding boxes                     │         ║
║  │  - Confidence scores for each                              │         ║
║  │  - Class names and IDs                                     │         ║
║  │  - Status: "defects_detected" or "no_defects"              │         ║
║  └────────────────────────────────────────────────────────────┘         ║
║                              │                                            ║
║                              ▼                                            ║
║  🎨 RESULT PROCESSING                                                    ║
║  ┌────────────────────────────────────────────────────────────┐         ║
║  │ 1. Map defect coordinates back to original image           │         ║
║  │    (from cropped region to full image)                     │         ║
║  │                                                             │         ║
║  │ 2. Draw annotations on original image:                     │         ║
║  │    - Transformer bounding box (green)                      │         ║
║  │    - Defect bounding boxes (color-coded)                   │         ║
║  │    - Labels with class names and confidence                │         ║
║  │                                                             │         ║
║  │ 3. Calculate severity:                                      │         ║
║  │    - Overload defects: weight = 1.0 (Critical)             │         ║
║  │    - Loose joints: weight = 0.8 (High)                     │         ║
║  │    - Others: weight = 0.5 (Medium)                         │         ║
║  │                                                             │         ║
║  │ 4. Determine severity level:                                │         ║
║  │    - NO_TRANSFORMER: Transformer not found                 │         ║
║  │    - NORMAL: No defects detected                           │         ║
║  │    - LOW: Severity score < 0.3                             │         ║
║  │    - MEDIUM: Severity score 0.3-0.5                        │         ║
║  │    - HIGH: Severity score 0.5-0.8                          │         ║
║  │    - CRITICAL: Severity score > 0.8                        │         ║
║  │                                                             │         ║
║  │ 5. Encode annotated image to Base64                        │         ║
║  └────────────────────────────────────────────────────────────┘         ║
╚══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    │ JSON Response
                                    ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                            API RESPONSE                                   ║
╠══════════════════════════════════════════════════════════════════════════╣
║  {                                                                        ║
║    "success": true,                                                       ║
║    "stage1_info": {                                                       ║
║      "status": "transformer_detected",                                    ║
║      "confidence": 0.95,                                                  ║
║      "bbox": [100, 50, 800, 600],                                         ║
║      "crop_bbox": [80, 30, 820, 620],                                     ║
║      "transformer_area": 385000                                           ║
║    },                                                                     ║
║    "stage2_info": {                                                       ║
║      "status": "defects_detected",                                        ║
║      "defect_count": 3,                                                   ║
║      "classes_detected": ["Loose Joint F", "Point Overload PF"]           ║
║    },                                                                     ║
║    "detections": [                                                        ║
║      {                                                                    ║
║        "class_id": 1,                                                     ║
║        "class_name": "Loose Joint F",                                     ║
║        "confidence": 0.87,                                                ║
║        "bbox": [150, 200, 250, 300],                                      ║
║        "area": 10000,                                                     ║
║        "color": [0, 165, 255]                                             ║
║      },                                                                   ║
║      ...                                                                  ║
║    ],                                                                     ║
║    "total_detections": 3,                                                 ║
║    "severity_level": "HIGH",                                              ║
║    "severity_score": 0.77,                                                ║
║    "confidence_threshold": 0.25,                                          ║
║    "processing_time": 1.45,                                               ║
║    "annotated_image_base64": "iVBORw0KGgoAAAANSUhEUg...",                ║
║    "image_name": "thermal_001.jpg",                                       ║
║    "image_size": [1920, 1080]                                             ║
║  }                                                                        ║
╚══════════════════════════════════════════════════════════════════════════╝
                                    │
                                    ▼
╔══════════════════════════════════════════════════════════════════════════╗
║                         CLIENT DISPLAYS RESULTS                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  1. Decode Base64 image                                                   ║
║  2. Display annotated thermal image                                       ║
║  3. Show detection summary:                                               ║
║     - Transformer: ✅ Detected (95% confidence)                           ║
║     - Defects: 3 found                                                    ║
║     - Severity: HIGH                                                      ║
║  4. List individual defects:                                              ║
║     • Loose Joint F: 87%                                                  ║
║     • Point Overload PF: 76%                                              ║
║     • Loose Joint F: 68%                                                  ║
╚══════════════════════════════════════════════════════════════════════════╝


═══════════════════════════════════════════════════════════════════════════
                            TECHNICAL DETAILS
═══════════════════════════════════════════════════════════════════════════

📦 DEPENDENCIES:
   - FastAPI (Web framework)
   - Uvicorn (ASGI server)
   - Ultralytics (YOLO models)
   - OpenCV (Image processing)
   - NumPy (Array operations)
   - Pillow (Image I/O)
   - Pydantic (Data validation)

🔧 CONFIGURATION:
   - Port: 8001
   - Host: 127.0.0.1 (localhost)
   - Max file size: 10 MB
   - Confidence threshold: 0.25 (default)
   - CORS: Enabled for localhost:3000, localhost:8080

⚙️ MODEL FILES:
   Stage 1: ../tf_model/weights/segment/best.pt (~6MB)
   Stage 2: ../tf_model/weights/defects/best.pt (~6MB)

📊 PERFORMANCE:
   - Processing time: 1-5 seconds per image
   - Memory usage: 2-4 GB RAM + 2-4 GB VRAM
   - Concurrent requests: Up to 10 simultaneously
   - Throughput: 10-20 images per minute

🔐 SECURITY:
   - File type validation
   - File size limits
   - Input sanitization
   - CORS restrictions
   - Error handling

═══════════════════════════════════════════════════════════════════════════
                              DATA FLOW
═══════════════════════════════════════════════════════════════════════════

1. CLIENT → SERVER:
   HTTP POST with image file (multipart/form-data)
   
2. SERVER → STAGE 1:
   NumPy array (H x W x 3, uint8)
   
3. STAGE 1 → STAGE 2:
   Cropped NumPy array + metadata dict
   
4. STAGE 2 → RESULT PROCESSOR:
   List of defects + metadata dict
   
5. RESULT PROCESSOR → CLIENT:
   JSON with Base64 encoded annotated image

═══════════════════════════════════════════════════════════════════════════
                            ERROR HANDLING
═══════════════════════════════════════════════════════════════════════════

❌ POSSIBLE ERRORS:

1. File Upload Issues:
   - Invalid file format → 400 Bad Request
   - File too large (>10MB) → 400 Bad Request
   - Empty file → 400 Bad Request
   - Corrupted image → 400 Bad Request

2. Model Issues:
   - Models not loaded → 500 Internal Server Error
   - Inference failure → 500 Internal Server Error
   - Out of memory → 500 Internal Server Error

3. Processing Issues:
   - Invalid image data → 400 Bad Request
   - Processing timeout → 504 Gateway Timeout
   - Coordinate mapping error → 500 Internal Server Error

═══════════════════════════════════════════════════════════════════════════
                         ENDPOINTS SUMMARY
═══════════════════════════════════════════════════════════════════════════

GET  /                            → API info
GET  /health                      → Model status
GET  /test                        → Service status
POST /detect-thermal-anomalies    → Main detection endpoint
GET  /docs                        → Swagger UI
GET  /redoc                       → ReDoc UI
GET  /openapi.json                → OpenAPI schema

═══════════════════════════════════════════════════════════════════════════
