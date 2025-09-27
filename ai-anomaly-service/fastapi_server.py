# Step 3: Adding the AI Model Class
# This is where we implement our anomaly detection algorithm

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import cv2
import numpy as np
from PIL import Image
import io
import base64

# Create the FastAPI application instance
app = FastAPI(
    title="Thermal Anomaly Detection API",
    description="Learning FastAPI step by step - now with AI model!",
    version="3.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API responses
class ImageInfo(BaseModel):
    filename: str
    size: tuple
    format: str
    has_processed: bool

class AnomalyRegion(BaseModel):
    """Represents a detected anomaly region"""
    x: int
    y: int
    width: int
    height: int
    severity_score: float
    confidence_score: float
    anomaly_type: str

class AnomalyDetectionResult(BaseModel):
    """Complete result of anomaly detection"""
    has_anomalies: bool
    anomaly_count: int
    anomaly_regions: List[AnomalyRegion]
    overall_severity: float
    confidence_score: float
    annotated_image_base64: str

# THIS IS WHERE THE AI MODEL LIVES!
class AnomalyDetectionEngine:
    """
    This class contains our AI model and all the processing logic.
    In a real-world scenario, this is where you'd load your trained model.
    """
    
    def __init__(self):
        """
        Initialize the AI model
        This runs when the FastAPI app starts
        """
        self.temperature_threshold = 30.0  # Temperature difference threshold
        self.confidence_threshold = 0.6   # Confidence threshold
        self.model_version = "1.0.0"
        print("🧠 AI Model initialized!")
    
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess the image for analysis
        This is a crucial step in any AI pipeline
        """
        # Convert to grayscale if it's a color image
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image.copy()
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Normalize the image values
        normalized = cv2.normalize(blurred, None, 0, 255, cv2.NORM_MINMAX)
        
        return normalized
    
    def detect_anomalies(self, baseline_image: np.ndarray, current_image: np.ndarray) -> AnomalyDetectionResult:
        """
        Main AI function - this is where the magic happens!
        
        Args:
            baseline_image: The reference thermal image
            current_image: The current thermal image to analyze
            
        Returns:
            AnomalyDetectionResult: Complete analysis results
        """
        try:
            print("🔍 Starting anomaly detection...")
            
            # Step 1: Preprocess both images
            baseline_processed = self.preprocess_image(baseline_image)
            current_processed = self.preprocess_image(current_image)
            
            # Step 2: Make sure images are the same size
            if baseline_processed.shape != current_processed.shape:
                current_processed = cv2.resize(
                    current_processed, 
                    (baseline_processed.shape[1], baseline_processed.shape[0])
                )
            
            # Step 3: Calculate the difference between images
            diff = cv2.absdiff(baseline_processed, current_processed)
            
            # Step 4: Apply threshold to find significant changes
            threshold_value = int(self.temperature_threshold)
            _, thresh = cv2.threshold(diff, threshold_value, 255, cv2.THRESH_BINARY)
            
            # Step 5: Clean up noise using morphological operations
            kernel = np.ones((5, 5), np.uint8)
            cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
            cleaned = cv2.morphologyEx(cleaned, cv2.MORPH_OPEN, kernel)
            
            # Step 6: Find anomaly regions (contours)
            contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Step 7: Filter out small noise (minimum area)
            min_area = 100
            significant_contours = [c for c in contours if cv2.contourArea(c) > min_area]
            
            # Step 8: Create annotated image with bounding boxes
            annotated_image = current_image.copy()
            if len(annotated_image.shape) == 2:
                annotated_image = cv2.cvtColor(annotated_image, cv2.COLOR_GRAY2BGR)
            
            anomaly_regions = []
            total_severity = 0.0
            
            # Step 9: Process each detected anomaly
            for contour in significant_contours:
                # Get bounding rectangle
                x, y, w, h = cv2.boundingRect(contour)
                
                # Calculate severity based on intensity difference in this region
                roi_diff = diff[y:y+h, x:x+w]
                mean_intensity = np.mean(roi_diff)
                severity_score = min(mean_intensity / 255.0, 1.0)
                
                # Calculate confidence based on size and intensity
                area_factor = min(cv2.contourArea(contour) / 1000.0, 1.0)
                confidence = min(severity_score * area_factor * 2, 1.0)
                
                if confidence >= self.confidence_threshold:
                    # Determine anomaly type based on severity
                    if severity_score > 0.8:
                        color = (0, 0, 255)  # Red for critical
                        anomaly_type = "CRITICAL"
                    elif severity_score > 0.5:
                        color = (0, 165, 255)  # Orange for high
                        anomaly_type = "HIGH"
                    else:
                        color = (0, 255, 255)  # Yellow for medium
                        anomaly_type = "MEDIUM"
                    
                    # Draw bounding box on the image
                    cv2.rectangle(annotated_image, (x, y), (x + w, y + h), color, 2)
                    
                    # Add label
                    label = f"{anomaly_type}: {severity_score:.2f}"
                    cv2.putText(annotated_image, label, (x, y - 10), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                    
                    # Store the anomaly information
                    anomaly_regions.append(AnomalyRegion(
                        x=x, y=y, width=w, height=h,
                        severity_score=severity_score,
                        confidence_score=confidence,
                        anomaly_type=anomaly_type
                    ))
                    
                    total_severity += severity_score
            
            # Step 10: Calculate overall results
            has_anomalies = len(anomaly_regions) > 0
            overall_severity = total_severity / len(anomaly_regions) if anomaly_regions else 0.0
            overall_confidence = np.mean([r.confidence_score for r in anomaly_regions]) if anomaly_regions else 0.0
            
            # Step 11: Convert annotated image to base64 for sending to frontend
            _, buffer = cv2.imencode('.png', annotated_image)
            annotated_base64 = base64.b64encode(buffer).decode('utf-8')
            
            print(f"✅ Detection complete! Found {len(anomaly_regions)} anomalies")
            
            return AnomalyDetectionResult(
                has_anomalies=has_anomalies,
                anomaly_count=len(anomaly_regions),
                anomaly_regions=anomaly_regions,
                overall_severity=overall_severity,
                confidence_score=overall_confidence,
                annotated_image_base64=annotated_base64
            )
            
        except Exception as e:
            print(f"❌ Error in detection: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

# Initialize the AI model (this happens when the server starts)
ai_model = AnomalyDetectionEngine()

# API Routes
@app.get("/")
async def root():
    return {"message": "Thermal Anomaly Detection API with AI Model!", "version": "3.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "ai_model": "loaded", "version": ai_model.model_version}

@app.post("/upload-test", response_model=ImageInfo)
async def test_image_upload(file: UploadFile = File(...)):
    try:
        image_data = await file.read()
        pil_image = Image.open(io.BytesIO(image_data))
        opencv_image = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        height, width = opencv_image.shape[:2]
        
        return ImageInfo(
            filename=file.filename or "unknown",
            size=(width, height),
            format=pil_image.format or "unknown",
            has_processed=True
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")

# NEW: Main anomaly detection endpoint
@app.post("/detect-anomalies", response_model=AnomalyDetectionResult)
async def detect_anomalies(
    baseline_image: UploadFile = File(..., description="Reference thermal image"),
    current_image: UploadFile = File(..., description="Current thermal image to analyze"),
    temperature_threshold: Optional[float] = 30.0,
    confidence_threshold: Optional[float] = 0.6
):
    """
    Main endpoint for anomaly detection!
    This is where the frontend will send images for analysis.
    """
    try:
        # Update model parameters if provided
        ai_model.temperature_threshold = temperature_threshold
        ai_model.confidence_threshold = confidence_threshold
        
        # Read and process baseline image
        baseline_data = await baseline_image.read()
        baseline_np = np.frombuffer(baseline_data, np.uint8)
        baseline_img = cv2.imdecode(baseline_np, cv2.IMREAD_COLOR)
        
        # Read and process current image
        current_data = await current_image.read()
        current_np = np.frombuffer(current_data, np.uint8)
        current_img = cv2.imdecode(current_np, cv2.IMREAD_COLOR)
        
        # Validate images
        if baseline_img is None or current_img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Run the AI model!
        result = ai_model.detect_anomalies(baseline_img, current_img)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🚀 Starting FastAPI server...")
    print("📱 Server will be available at:")
    print("   - http://localhost:8001")
    print("   - http://127.0.0.1:8001")
    print("📚 API Documentation:")
    print("   - http://localhost:8001/docs")
    print("   - http://localhost:8001/redoc")
    
    # Use localhost for better Windows compatibility
    uvicorn.run(app, host="127.0.0.1", port=8001)
