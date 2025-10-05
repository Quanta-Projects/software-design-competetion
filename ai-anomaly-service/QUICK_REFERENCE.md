# Quick Reference Guide
## Two-Stage Transformer Defect Detection API

---

## 🚀 Quick Start (30 seconds)

```bash
# 1. Navigate to directory
cd "d:\ACCA Sem 7\Software Design Competetion\quanta-project\Fork\software-design-competetion-forked\ai-anomaly-service"

# 2. Start server
python fastapi_server.py

# 3. Open browser
http://localhost:8001/docs
```

---

## 📋 Common Commands

### Start Server
```bash
python fastapi_server.py
```

### Run Tests
```bash
python test_api.py
```

### Test with cURL
```bash
curl -X POST "http://localhost:8001/detect-thermal-anomalies?confidence_threshold=0.25" \
  -F "file=@path/to/image.jpg"
```

---

## 🔌 Quick Code Snippets

### Python - Basic Detection
```python
import requests

with open("thermal_image.jpg", "rb") as f:
    response = requests.post(
        "http://localhost:8001/detect-thermal-anomalies",
        files={"file": f},
        params={"confidence_threshold": 0.25}
    )
    
result = response.json()
print(f"Found {result['total_detections']} defects")
print(f"Severity: {result['severity_level']}")
```

### Python - Save Annotated Image
```python
import base64
from PIL import Image
import io

# ... (detection code above)

if result['annotated_image_base64']:
    img_data = base64.b64decode(result['annotated_image_base64'])
    img = Image.open(io.BytesIO(img_data))
    img.save("result.jpg")
```

### JavaScript - Upload & Display
```javascript
async function detectDefects(imageFile) {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await fetch(
        'http://localhost:8001/detect-thermal-anomalies?confidence_threshold=0.25',
        { method: 'POST', body: formData }
    );
    
    const result = await response.json();
    
    // Display image
    document.getElementById('result').src = 
        `data:image/jpeg;base64,${result.annotated_image_base64}`;
    
    // Show results
    console.log(`Defects: ${result.total_detections}`);
    console.log(`Severity: ${result.severity_level}`);
    
    return result;
}
```

---

## 📊 Response Structure (Quick View)

```json
{
  "success": true,
  "stage1_info": {
    "status": "transformer_detected",
    "confidence": 0.95
  },
  "stage2_info": {
    "status": "defects_detected", 
    "defect_count": 3
  },
  "detections": [
    {
      "class_name": "Loose Joint F",
      "confidence": 0.87,
      "bbox": [x1, y1, x2, y2]
    }
  ],
  "severity_level": "HIGH",
  "annotated_image_base64": "..."
}
```

---

## 🎨 Defect Classes (Quick Reference)

| ID | Class Name              | Color   | Severity |
|----|------------------------|---------|----------|
| 0  | Full Wire Overload PF  | 🔴 Red   | Critical |
| 1  | Loose Joint F          | 🟠 Orange| High     |
| 2  | Loose Joint PF         | 🟡 Yellow| Medium   |
| 3  | Point Overload F       | 🔵 Blue  | High     |
| 4  | Point Overload PF      | 🟣 Purple| Medium   |
| 5  | Transformer Overload   | 🟢 Green | Critical |

---

## ⚙️ Configuration Options

### Confidence Threshold
- **Default**: 0.25
- **Range**: 0.1 - 1.0
- **Recommended**: 0.25 - 0.5

```python
params = {"confidence_threshold": 0.3}  # More strict
params = {"confidence_threshold": 0.2}  # More sensitive
```

---

## 🔧 Troubleshooting Quick Fixes

### Server Won't Start
```bash
# Check if port 8001 is in use
netstat -ano | findstr :8001

# Use different port
# Edit fastapi_server.py, change port=8001 to port=8002
```

### Models Not Loading
```bash
# Check model files exist
dir "..\tf_model\weights\segment\best.pt"
dir "..\tf_model\weights\defects\best.pt"

# If missing, train models
cd ..\tf_model
python train_transformer_defects.py
```

### Connection Refused
```bash
# Make sure server is running
# Check this terminal shows:
# "✅ Transformer segmentation model loaded"
# "✅ Defect detection model loaded"
```

### CUDA/GPU Errors
```python
# Force CPU mode (edit fastapi_server.py)
results = self.transformer_model(image, conf=threshold, verbose=False, device='cpu')
results = self.defect_model(img, conf=threshold, verbose=False, device='cpu')
```

---

## 📍 Endpoints Quick Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/` | GET | Root info |
| `/health` | GET | Check status |
| `/test` | GET | Simple test |
| `/detect-thermal-anomalies` | POST | Main detection |
| `/docs` | GET | API documentation |

---

## 🎯 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (invalid image) |
| 500 | Server error (model issue) |
| 422 | Validation error |

---

## 💡 Pro Tips

1. **Batch Processing**:
   ```python
   import concurrent.futures
   
   def detect(image_path):
       # ... detection code ...
       return result
   
   with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
       results = list(executor.map(detect, image_paths))
   ```

2. **Optimal Image Size**:
   - Resize to 640-1280px for faster processing
   - Maintain aspect ratio

3. **Cache Results**:
   ```python
   import hashlib
   
   # Hash image content
   img_hash = hashlib.md5(image_data).hexdigest()
   
   # Check cache before API call
   if img_hash in cache:
       return cache[img_hash]
   ```

4. **Monitor Performance**:
   ```python
   import time
   
   start = time.time()
   result = requests.post(...)
   api_time = time.time() - start
   
   print(f"API: {api_time:.2f}s, Processing: {result['processing_time']:.2f}s")
   ```

---

## 📞 Getting Help

1. **Check Logs**: Look at terminal where server is running
2. **Test Health**: `curl http://localhost:8001/health`
3. **Run Tests**: `python test_api.py`
4. **Read Docs**: See `TWO_STAGE_API_README.md`
5. **Check Models**: Ensure both `.pt` files exist

---

## ✅ Quick Validation

Server is working correctly if you see:

```
✅ Transformer segmentation model loaded
✅ Defect detection model loaded
📱 Server available at http://localhost:8001
```

And `/health` returns:
```json
{
  "status": "healthy",
  "transformer_model_loaded": true,
  "defect_model_loaded": true
}
```

---

## 🎓 Learn More

- **Full Documentation**: `TWO_STAGE_API_README.md`
- **Migration Guide**: `MIGRATION_SUMMARY.md`
- **Test Script**: `test_api.py`
- **API Docs**: http://localhost:8001/docs (when running)

---

**Quick Tip**: Bookmark `http://localhost:8001/docs` for interactive API testing! 🚀
