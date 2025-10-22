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

## Annotation System

### Overview

The **Annotation System** is a critical component that enables users to review, edit, and manage thermal defect detections identified by the YOLO11 AI model. It provides an interactive interface for creating, modifying, and validating bounding boxes around thermal anomalies on transformer images.

### What Are Annotations?

Annotations are **labeled bounding boxes** that mark thermal anomalies (defects) on transformer thermal images. Each annotation contains:
- **Bounding Box Coordinates**: (x1, y1, x2, y2) defining the rectangular region around a defect
- **Class Information**: Defect type (e.g., "Loose Joint F", "Point Overload PF")
- **Confidence Score**: AI model's confidence level (0.0-1.0) in the detection
- **Annotation Type**: Source of the annotation (auto-detected, user-added, user-edited, etc.)
- **Metadata**: Timestamps, user ID, comments

### Annotation Types

The system supports five distinct annotation types:

| Type | Description | Use Case |
|------|-------------|----------|
| **AUTO_DETECTED** | Automatically created by YOLO11 AI model | Initial AI detection results |
| **USER_ADDED** | Manually added by inspector | Defects missed by AI |
| **USER_EDITED** | AI detection modified by user (position, size, or class) | Correcting AI mistakes |
| **USER_CONFIRMED** | AI detection verified as correct by user | Quality assurance workflow |
| **USER_DELETED** | AI detection marked as false positive | Removing incorrect detections |

### Defect Classes (6 Types)

Each annotation is assigned to one of six thermal anomaly classes:

| Class ID | Class Name | Color Code | Severity | Description |
|----------|-----------|------------|----------|-------------|
| 0 | Full Wire Overload PF | `#dc3545` (Red) | CRITICAL | Entire wire section shows elevated temperature |
| 1 | Loose Joint F | `#fd7e14` (Orange) | HIGH | Connection point with critical heat - immediate attention required |
| 2 | Loose Joint PF | `#dc3545` (Red) | CRITICAL | Connection point with moderate heat - potential failure |
| 3 | Point Overload F | `#fd7e14` (Orange) | HIGH | Localized hotspot indicating imminent failure |
| 4 | Point Overload PF | `#28a745` (Green) | LOW | Localized hotspot indicating potential failure |
| 5 | Transformer Overload | `#ffc107` (Yellow) | MEDIUM | Overall transformer temperature exceeds safe limits |

### How the Annotation System Works

#### 1. **AI Detection Flow**
```
1. User uploads thermal image
2. YOLO11 AI model processes image
3. Detections returned as JSON (class, confidence, bbox coordinates)
4. Backend creates AUTO_DETECTED annotations in database
5. Frontend displays annotations as bounding boxes on image
```

#### 2. **User Interaction Flow**
```
1. Inspector reviews AI detections on thermal image
2. Options available:
   - ✅ Confirm correct detection → USER_CONFIRMED
   - ✏️ Edit bounding box or class → USER_EDITED
   - ➕ Add missed defect → USER_ADDED
   - ❌ Delete false positive → USER_DELETED (soft delete)
3. Changes saved to database via REST API
4. Annotations used for model retraining
```

#### 3. **Interactive Annotation Editor**

The frontend provides an interactive canvas-based editor with the following features:

**Viewing:**
- Display all annotations as color-coded bounding boxes
- Hover tooltips showing defect class and confidence
- Zoom/pan controls for detailed inspection

**Editing:**
- Click and drag to resize bounding boxes
- Move annotations by dragging center point
- Change defect class via dropdown
- Add comments/notes to annotations

**Adding:**
- Click "Add Annotation" button
- Draw new bounding box on image
- Select defect class from dropdown
- System assigns USER_ADDED type

**Deleting:**
- Click trash icon on annotation
- Soft delete (marks `isActive = false`)
- Annotation preserved for audit trail

### REST API Endpoints

The backend exposes comprehensive annotation management APIs:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/annotations` | POST | Create new annotation |
| `/api/annotations/{id}` | GET | Get annotation by ID |
| `/api/annotations/{id}` | PUT | Update existing annotation |
| `/api/annotations/{id}` | DELETE | Soft delete annotation |
| `/api/annotations/image/{imageId}` | GET | Get all annotations for specific image |
| `/api/annotations/transformer/{id}` | GET | Get annotations by transformer |
| `/api/annotations/inspection/{id}` | GET | Get annotations by inspection |
| `/api/annotations/batch/{imageId}` | POST | Create batch annotations from YOLO results |
| `/api/annotations/{id}/confirm` | POST | Confirm auto-detected annotation |
| `/api/annotations/user-modifications` | GET | Get user-modified annotations for retraining |
| `/api/annotations/all` | GET | Export all annotations (CSV/JSON) |
| `/api/annotations/high-confidence` | GET | Get high-confidence annotations (quality control) |

### Data Export & Model Retraining

**CSV Export:**
- Users can download all annotations as CSV from Settings page
- Filename format: `annotations_YYYY-MM-DD.csv`
- Includes all annotation metadata for analysis

**Model Retraining Workflow:**
1. Users review and correct AI detections
2. Modified annotations marked as `USER_EDITED` or `USER_ADDED`
3. System prepares retraining dataset from user-modified annotations
4. Annotations converted to YOLO format with adjusted coordinates
5. New model trained with improved accuracy

---

## Backend Architecture for Annotations

### Entity-Relationship Model

```
Transformer (1) ──→ (N) Image (1) ──→ (N) Annotation
           │                │
           └──→ (N) Inspection (1) ──→ (N) Image
```

### Database Schema

#### `annotations` Table

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | INT (PK) | No | Auto-increment primary key |
| `image_id` | INT (FK) | No | References `images.id` |
| `class_id` | INT | No | Defect class ID (0-5) |
| `class_name` | VARCHAR(100) | No | Human-readable class name |
| `confidence_score` | FLOAT | No | AI confidence (0.0-1.0) |
| `bbox_x1` | FLOAT | No | Bounding box top-left X |
| `bbox_y1` | FLOAT | No | Bounding box top-left Y |
| `bbox_x2` | FLOAT | No | Bounding box bottom-right X |
| `bbox_y2` | FLOAT | No | Bounding box bottom-right Y |
| `center_x` | FLOAT | No | Bounding box center X (calculated) |
| `center_y` | FLOAT | No | Bounding box center Y (calculated) |
| `annotation_type` | ENUM | No | AUTO_DETECTED, USER_ADDED, USER_EDITED, USER_DELETED, USER_CONFIRMED |
| `user_id` | VARCHAR(100) | Yes | ID of user who created/modified annotation |
| `comments` | TEXT | Yes | Inspector notes/comments |
| `created_at` | TIMESTAMP | No | Creation timestamp |
| `updated_at` | TIMESTAMP | Yes | Last update timestamp |
| `is_active` | BOOLEAN | No | Soft delete flag (default: true) |

**Foreign Keys:**
- `FK_annotation_image`: `image_id` → `images.id` (CASCADE DELETE)

**Indexes:**
- Primary key on `id`
- Index on `image_id` for fast image-based queries
- Index on `annotation_type` for filtering by type
- Composite index on `(is_active, updated_at)` for active annotation queries

### Backend Architecture Layers

#### 1. **Entity Layer** (`dao/Annotation.java`)
- JPA entity mapping database table
- Lombok annotations for getters/setters
- Lifecycle hooks: `@PrePersist`, `@PreUpdate` for auto-calculating center coordinates
- Helper methods: `getWidth()`, `getHeight()`, `setBoundingBox()`
- Enum for `AnnotationType`

#### 2. **Repository Layer** (`repository/AnnotationRepository.java`)
- Extends `JpaRepository<Annotation, Integer>`
- Custom JPQL queries for complex filtering:
  - `findActiveAnnotationsByImageId()`
  - `findAnnotationsByTransformerId()`
  - `findAnnotationsByInspectionId()`
  - `findHighConfidenceAnnotations()`
  - `findUserModifiedAnnotations()`
  - `countAnnotationsByType()`
  - `softDeleteAnnotation()`

#### 3. **Service Layer** (`service/AnnotationService.java`)
- Business logic for annotation management
- Validation: Bounding box coordinates, confidence scores
- Soft delete implementation (marks `isActive = false`)
- Batch annotation creation from YOLO results
- User modification tracking
- Transaction management with `@Transactional`

#### 4. **Controller Layer** (`controller/AnnotationController.java`)
- RESTful API endpoints
- Request validation with `@Valid`
- Exception handling
- HTTP status code management
- JSON response formatting

#### 5. **DTO Layer** (`dto/AnnotationRequest.java`, `dto/AnnotationResponse.java`)
- **AnnotationRequest**: Validates incoming annotation data
  - `@NotNull` validation for required fields
  - `@DecimalMin`/`@DecimalMax` for confidence score
  - `isValidBoundingBox()` helper method
- **AnnotationResponse**: Formats outgoing annotation data
  - Excludes sensitive fields
  - Includes calculated fields (width, height, center)

### Persistence Strategy

**Soft Delete:**
- Annotations are never permanently deleted from database
- Delete operations set `is_active = false`
- Preserves audit trail for:
  - User modifications (what was deleted and why)
  - Model retraining (learn from false positives)
  - Quality control analysis

**Cascade Operations:**
- Deleting an `Image` cascades to delete all associated `Annotation` records
- Deleting a `Transformer` cascades to `Image` → `Annotation`
- Ensures referential integrity

**Automatic Timestamp Management:**
- `created_at`: Set automatically on insert (`@PrePersist`)
- `updated_at`: Updated automatically on modification (`@PreUpdate`)
- No manual timestamp management required

### Data Flow

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────┐
│   Frontend  │ ───→ │  Controller  │ ───→ │    Service      │
│  (React)    │ ←─── │  (REST API)  │ ←─── │  (Business)     │
└─────────────┘      └──────────────┘      └─────────────────┘
                                                     │
                                                     ↓
                                            ┌─────────────────┐
                                            │   Repository    │
                                            │  (Data Access)  │
                                            └─────────────────┘
                                                     │
                                                     ↓
                                            ┌─────────────────┐
                                            │   MySQL DB      │
                                            │  (annotations)  │
                                            └─────────────────┘
```

**Example: Creating an Annotation**
1. Frontend sends POST request with annotation data
2. Controller validates request with `@Valid`
3. Service layer:
   - Validates bounding box coordinates
   - Checks if image exists
   - Creates `Annotation` entity
   - Saves to database via repository
4. Repository executes JPA insert
5. Database generates auto-increment ID
6. `@PrePersist` hook calculates center coordinates
7. Response DTO sent back to frontend

---

## Known Bugs and Limitations

### Known Issues

#### 1. **Annotation Editor Performance** ⚠️
**Issue:** Canvas rendering slows down with >50 annotations on a single image  
**Impact:** Lag when drawing/editing annotations on heavily annotated images  
**Workaround:** Filter annotations by class or confidence threshold  
**Status:** Optimization planned (virtual scrolling, WebGL rendering)

#### 2. **Bounding Box Coordinate System** ⚠️
**Issue:** AI model uses normalized coordinates (0-1), but database stores pixel coordinates  
**Impact:** Coordinate conversion required during batch annotation import  
**Workaround:** `AnnotationService` handles conversion automatically  
**Status:** Working as designed, no fix needed

#### 3. **Concurrent Annotation Editing** 🐛
**Issue:** Two users editing the same annotation simultaneously causes last-write-wins  
**Impact:** One user's changes may be overwritten  
**Workaround:** None - rare occurrence in single-user deployment  
**Status:** Feature request: Add optimistic locking with version field

#### 4. **CSV Export Memory Usage** ⚠️
**Issue:** Exporting >10,000 annotations may cause high memory usage  
**Impact:** Slow export or browser crash on large datasets  
**Workaround:** Export with date range filters or by transformer  
**Status:** Consider streaming export for large datasets

#### 5. **Annotation Deletion Cascade** 🐛
**Issue:** Deleting an image permanently removes all annotations (hard delete via CASCADE)  
**Impact:** Loss of user modifications for retraining  
**Workaround:** Backup annotations before deleting images  
**Status:** Consider separate annotation archive table

### Limitations

#### 1. **No Multi-User Collaboration**
- System does not support real-time collaborative annotation editing
- No annotation locking mechanism
- User IDs tracked but no permission system
- **Recommendation:** Implement annotation versioning for audit trail

#### 2. **No Undo/Redo Functionality**
- Annotation edits are immediately persisted to database
- No client-side undo stack
- **Workaround:** User can manually revert changes by re-editing
- **Recommendation:** Add command pattern with undo stack

#### 3. **Limited Annotation Filtering**
- Frontend shows all annotations for an image (no real-time filtering)
- Cannot filter by confidence score, class, or annotation type in UI
- **Workaround:** Use backend API filters and refresh page
- **Recommendation:** Add client-side filtering controls

#### 4. **No Annotation Version History**
- Only current state stored, no edit history
- Cannot see who changed an annotation or when
- **Workaround:** Check `updated_at` timestamp and `user_id`
- **Recommendation:** Add annotation audit log table

#### 5. **AI Model Confidence Threshold Not User-Configurable**
- Hardcoded threshold (0.5) in FastAPI service
- Users cannot adjust sensitivity
- **Workaround:** Modify `fastapi_server.py` and restart service
- **Recommendation:** Add threshold setting to Settings page

#### 6. **Browser Compatibility**
- Annotation Editor tested only on modern browsers (Chrome 90+, Firefox 88+, Edge 90+)
- May not work on Internet Explorer
- Canvas API required (no fallback for older browsers)
- **Recommendation:** Display compatibility warning on unsupported browsers

#### 7. **Mobile Device Support**
- Annotation Editor not optimized for touch interfaces
- Small screens make precise annotation editing difficult
- **Workaround:** Use desktop or tablet with stylus
- **Recommendation:** Add touch gesture support and responsive canvas

#### 8. **No Batch Annotation Operations**
- Cannot delete or modify multiple annotations at once
- Must edit annotations individually
- **Workaround:** Use backend API with custom scripts for bulk operations
- **Recommendation:** Add multi-select and bulk edit UI

#### 9. **Image Size Constraints**
- Very large images (>4000×4000 pixels) may cause canvas rendering issues
- No automatic downscaling for display
- **Workaround:** Pre-process images to recommended size (2048×2048 max)
- **Recommendation:** Add automatic image scaling with coordinate adjustment

#### 10. **Database Query Performance**
- No pagination on `/api/annotations/all` endpoint
- Fetching all annotations at once may be slow with >100,000 records
- **Workaround:** Use filtered endpoints (by image, transformer, date range)
- **Recommendation:** Add pagination with `?page=1&size=100` parameters

### Data Integrity Constraints

#### Foreign Key Dependencies
- Cannot delete `Image` without cascading to `Annotation` (by design)
- Cannot create `Annotation` for non-existent `Image` (enforced by FK)
- Database consistency maintained via foreign key constraints

#### Validation Rules
- Bounding box coordinates must satisfy: `x2 > x1` and `y2 > y1`
- Confidence score must be between 0.0 and 1.0
- Class ID must be 0-5 (validated in service layer)
- `annotation_type` must be valid enum value

### Performance Benchmarks

| Operation | Avg Time | Notes |
|-----------|----------|-------|
| Create annotation | <50ms | Single annotation insert |
| Update annotation | <60ms | Single annotation update with validation |
| Fetch annotations (1 image) | <100ms | Typically 5-20 annotations per image |
| Fetch annotations (all) | 500ms - 5s | Depends on total count (100-10,000) |
| Batch create (50 annotations) | <500ms | From YOLO detection results |
| Soft delete annotation | <40ms | Update `is_active` flag |
| CSV export (1,000 annotations) | <2s | JSON→CSV conversion on client |

### Future Enhancements

**Planned Features:**
- [ ] Annotation version history and audit log
- [ ] Real-time collaborative editing with WebSockets
- [ ] Advanced filtering UI (by class, confidence, user, date)
- [ ] Annotation templates for common defect patterns
- [ ] Keyboard shortcuts for faster editing (arrow keys to move bbox)
- [ ] Annotation quality scoring (inter-annotator agreement)
- [ ] Export to additional formats (COCO JSON, Pascal VOC XML)
- [ ] Annotation statistics dashboard (defects by class, over time)

**Technical Debt:**
- Optimize canvas rendering for large annotation sets
- Add database indexing for faster queries on large datasets
- Implement annotation caching (Redis) for frequently accessed images
- Migrate to TypeScript for better type safety in frontend
- Add comprehensive unit tests for annotation service layer

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


