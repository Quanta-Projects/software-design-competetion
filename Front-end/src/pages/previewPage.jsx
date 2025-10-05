import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Button, Offcanvas, Alert, Card, Form } from "react-bootstrap";
import InspectionHeader from "../components/InspectionHeader";
import { getRestApiUrl, getImageUrl } from "../utils/config";

const DEFAULT_PREVIEW_HEIGHT = 420;
const MAX_PREVIEW_HEIGHT = 800;
const MIN_PREVIEW_HEIGHT = 300;
const FRAME_RADIUS = 16;
const SYNC_ZOOM_SCALE = 2.2;

function PanZoomContainFrame({
  src,
  label,
  metaText = "",
  badgeColor = "rgba(108,117,125,0.95)",
  syncZoomOn,
  isHoveringSync,
  onSyncEnter,
  onSyncLeave,
  onSyncMove,
  syncStyle,
  containerHeight = DEFAULT_PREVIEW_HEIGHT,
  resetTrigger,
  annotationTool,
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panRef = useRef({ startX: 0, startY: 0, startOffset: { x: 0, y: 0 } });

  // Reset zoom and offset when resetTrigger changes
  useEffect(() => {
    if (resetTrigger > 0) {
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    }
  }, [resetTrigger]);

  const onWheelZoom = (e) => {
    // Only allow zoom if move tool is selected
    if (annotationTool !== "move") return;
    if (syncZoomOn) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(6, Math.max(1, z * factor)));
  };

  const onMouseDown = (e) => {
    // Only allow panning if move tool is selected
    if (annotationTool !== "move") return;
    if (syncZoomOn || zoom <= 1) return;
    e.preventDefault();
    setPanning(true);
    panRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startOffset: { ...offset },
    };
  };

  const onMouseMove = (e) => {
    if (syncZoomOn) { onSyncMove?.(e); return; }
    if (!panning) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setOffset({
      x: panRef.current.startOffset.x + dx,
      y: panRef.current.startOffset.y + dy,
    });
  };

  const endPan = () => setPanning(false);
  const onDoubleClick = () => { 
    // Only allow double-click reset if move tool is selected
    if (annotationTool !== "move") return;
    if (!syncZoomOn) { setZoom(1); setOffset({ x: 0, y: 0 }); } 
  };

  const frameHandlers = syncZoomOn
    ? { onMouseEnter: onSyncEnter, onMouseLeave: onSyncLeave, onMouseMove }
    : { onWheel: onWheelZoom, onMouseDown, onMouseMove, onMouseUp: endPan, onMouseLeave: endPan, onDoubleClick };

  return (
    <div
      {...frameHandlers}
      style={{
        position: "relative",
        width: "100%",
        height: containerHeight,
        border: "1px solid #eef0f3",
        borderRadius: FRAME_RADIUS,
        overflow: "hidden",
        background: "#fff",
        userSelect: "none",
        cursor: syncZoomOn
          ? (isHoveringSync ? "zoom-in" : "default")
          : annotationTool === "move"
            ? (panning ? "grabbing" : zoom > 1 ? "grab" : "default")
            : "default",
      }}
      title={
        syncZoomOn
          ? "Move the mouse to zoom around the cursor • Click Zoom to turn off"
          : "Scroll to zoom, drag to pan (when zoomed), double-click to reset"
      }
    >
      {/* Label */}
      <span
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          padding: "4px 10px",
          fontSize: 12,
          background: badgeColor,
          color: "#fff",
          borderRadius: 999,
          zIndex: 2,
        }}
      >
        {label}
      </span>

      {/* Image surface */}
      <div style={{ position: "absolute", inset: 0, ...(syncStyle || {}) }}>
        {src ? (
          <img
            src={src}
            alt={label}
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              transform: syncZoomOn ? undefined : `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              transformOrigin: "center center",
            }}
          />
        ) : (
          <div
            className="text-muted small"
            style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            No image
          </div>
        )}
      </div>

    </div>
  );
}

export default function PreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const transformerId = location.state?.transformerId;
  const inspectionId = location.state?.inspectionId;
  const uploadedImage = location.state?.uploadedImage;

  const [record, setRecord] = useState(null);
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [containerHeight, setContainerHeight] = useState(DEFAULT_PREVIEW_HEIGHT);

  // Settings modal state
  const [showSettings, setShowSettings] = useState(false);
  const [tempDifference, setTempDifference] = useState("20%");
  const [rule2Enabled, setRule2Enabled] = useState(true);
  const [rule3Enabled, setRule3Enabled] = useState(true);
  const [rule2Expanded, setRule2Expanded] = useState(false);
  const [rule3Expanded, setRule3Expanded] = useState(false);

  // Annotation tools state
  const [annotationTool, setAnnotationTool] = useState(null); // null, "move", "zoom"
  const [weatherCondition, setWeatherCondition] = useState("SUNNY");
  const [resetTrigger, setResetTrigger] = useState(0);

  // Anomaly errors state
  const [anomalyErrors, setAnomalyErrors] = useState([]);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [expandedErrorId, setExpandedErrorId] = useState(null);
  const [selectedErrorId, setSelectedErrorId] = useState(null);
  const [currentNote, setCurrentNote] = useState("");
  const [errorNotes, setErrorNotes] = useState({}); // { errorId: [note1, note2, ...] }

  // zoom state
  const [syncZoomOn, setSyncZoomOn] = useState(false);
  const [isHoveringSync, setIsHoveringSync] = useState(false);
  const [hoverNorm, setHoverNorm] = useState({ x: 0.5, y: 0.5 });

  // Annotation tool handlers
  const handleResetView = () => {
    setResetTrigger(prev => prev + 1);
    setAnnotationTool(null);
    setSyncZoomOn(false);
  };

  const handleMoveMode = () => {
    if (annotationTool === "move") {
      setAnnotationTool(null);
    } else {
      setAnnotationTool("move");
    }
    setSyncZoomOn(false);
  };

  const handleZoomMode = () => {
    if (annotationTool === "zoom") {
      setAnnotationTool(null);
      setSyncZoomOn(false);
    } else {
      setAnnotationTool("zoom");
      setSyncZoomOn(true);
    }
  };

  // Settings handlers
  const handleSettingsConfirm = async () => {
    // Prepare the settings data to send to backend
    const settingsData = {
      temperatureDifferenceThreshold: parseInt(tempDifference), // Convert "20%" to 20
      looseJointDetection: rule2Enabled, // Rule 2: Loose Joint Condition
      overloadDetection: rule3Enabled,   // Rule 3: Overloaded Condition
      transformerId: transformerId,
      inspectionId: inspectionId,
      timestamp: new Date().toISOString()
    };

    console.log('Settings to be sent to backend:', settingsData);

    /*
     * BACKEND ENDPOINT DOCUMENTATION:
     * 
     * Endpoint: POST /api/analysis/settings
     * 
     * Request Body:
     * {
     *   "temperatureDifferenceThreshold": 20,        // Integer: 10-100 (percentage value)
     *   "looseJointDetection": true,                 // Boolean: Enable/disable Rule 2
     *   "overloadDetection": true,                   // Boolean: Enable/disable Rule 3
     *   "transformerId": "string",                   // ID of the transformer
     *   "inspectionId": "string",                    // ID of the inspection (optional)
     *   "timestamp": "2025-10-04T12:00:00.000Z"     // ISO timestamp
     * }
     * 
     * Expected Response (200 OK):
     * {
     *   "success": true,
     *   "message": "Settings saved successfully",
     *   "settingsId": "string",                      // Optional: ID of saved settings
     *   "appliedTo": {
     *     "transformerId": "string",
     *     "inspectionId": "string"
     *   }
     * }
     * 
     * Error Response (400/500):
     * {
     *   "success": false,
     *   "error": "Error message"
     * }
     */

    try {
      // Send settings to backend
      const response = await fetch(getRestApiUrl('analysis/settings'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Settings saved successfully:', result);
        alert('Settings saved successfully!');
      } else {
        const errorText = await response.text();
        console.error('Failed to save settings:', errorText);
        alert('Failed to save settings. The backend endpoint may not be implemented yet.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings: ' + error.message + '\n\nSettings data prepared:\n' + JSON.stringify(settingsData, null, 2));
    }

    setShowSettings(false);
  };

  const handleSettingsCancel = () => {
    setShowSettings(false);
  };

  // Notes handlers
  const handleAddNote = async () => {
    if (!selectedErrorId || !currentNote.trim()) return;
    
    const newNote = {
      text: currentNote.trim(),
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    };
    
    // Update local state first (optimistic update)
    setErrorNotes(prev => ({
      ...prev,
      [selectedErrorId]: [...(prev[selectedErrorId] || []), newNote]
    }));
    
    setCurrentNote("");

    /*
     * BACKEND ENDPOINT DOCUMENTATION:
     * 
     * Endpoint: POST /api/anomalies/{errorId}/notes
     * 
     * Request Body:
     * {
     *   "errorId": "mock-1",
     *   "transformerId": "string",
     *   "inspectionId": "string",
     *   "note": "This needs immediate attention",
     *   "timestamp": "2025-10-04T12:00:00.000Z"
     * }
     * 
     * Expected Response (200 OK):
     * {
     *   "success": true,
     *   "noteId": "string",                    // ID of the saved note
     *   "message": "Note added successfully"
     * }
     * 
     * Error Response (400/500):
     * {
     *   "success": false,
     *   "error": "Error message"
     * }
     */

    // Send to backend
    try {
      const response = await fetch(getRestApiUrl(`anomalies/${selectedErrorId}/notes`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          errorId: selectedErrorId,
          transformerId: transformerId,
          inspectionId: inspectionId,
          note: newNote.text,
          timestamp: newNote.timestamp
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Note saved successfully:', result);
        // Optionally update the note ID from backend
        if (result.noteId) {
          setErrorNotes(prev => ({
            ...prev,
            [selectedErrorId]: prev[selectedErrorId].map((n, idx) => 
              idx === prev[selectedErrorId].length - 1 ? { ...n, id: result.noteId } : n
            )
          }));
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to save note:', errorText);
        alert('Failed to save note to server. The note is saved locally but may not persist.');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      console.log('Note data that failed to save:', {
        errorId: selectedErrorId,
        transformerId,
        inspectionId,
        note: newNote.text,
        timestamp: newNote.timestamp
      });
      // Note remains in local state even if backend save fails
    }
  };

  const handleCancelNote = () => {
    setCurrentNote("");
    setSelectedErrorId(null);
  };

  const handleWeatherChange = async (newWeather) => {
    setWeatherCondition(newWeather);
    
    // Update the maintenance image weather condition if it exists
    const maintenanceImg = comparisonSources.current;
    if (maintenanceImg && maintenanceImg.id) {
      try {
        const response = await fetch(getRestApiUrl(`images/${maintenanceImg.id}/weather`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ weatherCondition: newWeather }),
        });

        if (response.ok) {
          // Reload images to reflect the change
          const imagesRes = await fetch(getRestApiUrl(`images/transformer/${transformerId}`));
          if (imagesRes.ok) {
            const updatedImages = await imagesRes.json();
            setImages(updatedImages);
          }
        }
      } catch (err) {
        console.error('Error updating weather condition:', err);
      }
    }
  };

  const onSyncEnter = () => { if (syncZoomOn) setIsHoveringSync(true); };
  const onSyncLeave = () => { setIsHoveringSync(false); };
  const onSyncMove = (e) => {
    if (!syncZoomOn) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setHoverNorm({ x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) });
  };
  const syncZoomStyle = (enabled) =>
    enabled && isHoveringSync
      ? {
          transformOrigin: `${hoverNorm.x * 100}% ${hoverNorm.y * 100}%`,
          transform: `scale(${SYNC_ZOOM_SCALE})`,
          transition: "transform 80ms ease-out",
        }
      : { transform: "scale(1)", transition: "transform 120ms ease-out" };

  useEffect(() => {
    let on = true;

    (async () => {
      if (!transformerId) { setError("No transformer selected."); setLoading(false); return; }
      try {
        setError(null);
        setLoading(true);
        const [transformerRes, imagesRes] = await Promise.all([
          fetch(getRestApiUrl(`transformers/${transformerId}`)),
          fetch(getRestApiUrl(`images/transformer/${transformerId}`)),
        ]);
        if (!transformerRes.ok) throw new Error(`Failed to load transformer: ${transformerRes.status}`);
        if (!imagesRes.ok) throw new Error(`Failed to load images: ${imagesRes.status}`);

        const [transformerData, imagesData] = await Promise.all([transformerRes.json(), imagesRes.json()]);
        if (on) {
          setRecord(transformerData);
          setImages(imagesData);
        }
      } catch (e) {
        if (on) setError(e.message || String(e));
      } finally {
        if (on) setLoading(false);
      }
    })();

    return () => { on = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformerId]);

  const createdPretty = useMemo(
    () => (record?.createdAt ? formatPretty(record.createdAt) : "—"),
    [record]
  );
  const updatedPretty = useMemo(
    () => (record?.updatedAt ? formatPretty(record.updatedAt) : "—"),
    [record]
  );

  const resolveImageUrl = (img) => {
    if (!img) return "";
    const p = img.filePath || img.path || img.url || img.fileUrl;
    return p ? (String(p).startsWith("http") ? p : getImageUrl(p)) : "";
  };

  const getUploadedAt = (img) =>
    (img?.uploadDate || img?.createdAt || img?.uploadedAt || img?.timestamp || "") || "";

  const findLatestByType = (type) =>
    [...images]
      .filter((i) => i.imageType?.toUpperCase() === type.toUpperCase())
      .sort((a, b) => {
        const ta = new Date(getUploadedAt(a) || 0).getTime();
        const tb = new Date(getUploadedAt(b) || 0).getTime();
        return tb - ta;
      })[0] || null;

  // Find the best maintenance image - prioritize ANNOTATED over MAINTENANCE
  const findBestMaintenanceImage = () => {
    // First try to find an annotated image
    const annotatedImage = findLatestByType("ANNOTATED");
    if (annotatedImage) {
      console.log("Preview: Using ANNOTATED image for maintenance view:", annotatedImage.fileName);
      return annotatedImage;
    }
    // Fallback to regular maintenance image
    const maintenanceImage = findLatestByType("MAINTENANCE");
    if (maintenanceImage) {
      console.log("Preview: Using MAINTENANCE image (no annotated version found):", maintenanceImage.fileName);
    }
    return maintenanceImage;
  };

  // Calculate dynamic container height based on image dimensions
  useEffect(() => {
    const baseline = uploadedImage?.imageType?.toUpperCase() === "BASELINE" 
      ? uploadedImage 
      : findLatestByType("BASELINE");
    const current = uploadedImage?.imageType?.toUpperCase() !== "BASELINE" && uploadedImage
      ? uploadedImage 
      : findBestMaintenanceImage();

    // Get the image URL to load
    const imageToMeasure = baseline || current;
    if (!imageToMeasure) {
      setContainerHeight(DEFAULT_PREVIEW_HEIGHT);
      return;
    }

    const imgUrl = resolveImageUrl(imageToMeasure);
    if (!imgUrl) {
      setContainerHeight(DEFAULT_PREVIEW_HEIGHT);
      return;
    }

    // Load image to get its natural dimensions
    const img = new Image();
    img.onload = () => {
      // Calculate container width (roughly half of the card width minus gap)
      // Assuming card max-width is 1100px, each frame gets ~512px
      const containerWidth = 512;
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      
      // Calculate height based on aspect ratio
      let calculatedHeight = containerWidth * aspectRatio;
      
      // Clamp to min/max values
      calculatedHeight = Math.max(MIN_PREVIEW_HEIGHT, Math.min(MAX_PREVIEW_HEIGHT, calculatedHeight));
      
      setContainerHeight(Math.round(calculatedHeight));
    };
    img.onerror = () => {
      // Fallback to default height on error
      setContainerHeight(DEFAULT_PREVIEW_HEIGHT);
    };
    img.src = imgUrl;
  }, [images, uploadedImage, resolveImageUrl, findLatestByType, findBestMaintenanceImage, getUploadedAt]);

  const comparisonSources = (() => {
    if (!images.length) return { baseline: null, current: null };
    if (uploadedImage) {
      const type = (uploadedImage.imageType || "").toUpperCase();
      if (type === "BASELINE") {
        return { baseline: uploadedImage, current: findBestMaintenanceImage() };
      }
      // If uploaded image is MAINTENANCE or ANNOTATED, use it as current
      if (type === "MAINTENANCE" || type === "ANNOTATED") {
        return { baseline: findLatestByType("BASELINE"), current: uploadedImage };
      }
      return { baseline: findLatestByType("BASELINE"), current: uploadedImage };
    }
    return { baseline: findLatestByType("BASELINE"), current: findBestMaintenanceImage() };
  })();

  // Set initial weather condition from maintenance image
  useEffect(() => {
    const maintenanceImg = comparisonSources.current;
    if (maintenanceImg && maintenanceImg.envCondition) {
      setWeatherCondition(maintenanceImg.envCondition.toUpperCase());
    }
  }, [comparisonSources.current]);

  // Helper function to determine severity level
  const getSeverityLevel = (className) => {
    const classLower = className.toLowerCase();
    if (classLower.includes('faulty') || classLower.includes('critical')) {
      return 'CRITICAL';
    } else if (classLower.includes('potential') || classLower.includes('warning')) {
      return 'HIGH';
    } else if (classLower.includes('cooling') || classLower.includes('moderate')) {
      return 'MEDIUM';
    } else {
      return 'LOW';
    }
  };

  // Helper function to get severity color
  const getSeverityColor = (severityLevel) => {
    switch (severityLevel) {
      case 'CRITICAL':
        return '#dc3545'; // Red
      case 'HIGH':
        return '#fd7e14'; // Orange
      case 'MEDIUM':
        return '#ffc107'; // Yellow
      case 'LOW':
        return '#28a745'; // Green
      default:
        return '#6c757d'; // Gray
    }
  };

  // Fetch anomaly errors from backend
  useEffect(() => {
    if (!transformerId || !inspectionId) return;

    // setAnomalyErrors([
    //   {
    //     id: "mock-1",
    //     errorType: "Thermal Anomaly",
    //     timestamp: "2025-08-15T10:15:00Z",
    //     detectedBy: "Mark Henry",
    //     description: "High temperature difference detected"
    //   },
    //   {
    //     id: "mock-2",
    //     errorType: "Loose Joint",
    //     timestamp: "2025-08-15T10:15:00Z",
    //     detectedBy: "AI"
    //   }
    // ]);
    // return;

    const fetchAnomalyErrors = async () => {
      setLoadingErrors(true);
      try {
        /*
         * BACKEND ENDPOINT DOCUMENTATION:
         * 
         * Endpoint: GET /api/annotations/inspection/{inspectionId}
         * 
         * Expected Response (200 OK):
         * [
         *   {
         *     "id": number,
         *     "imageId": number,
         *     "classId": number,
         *     "className": "string",           // e.g., "Thermal Anomaly", "Cooling Issue"
         *     "confidenceScore": number,       // 0.0 to 1.0
         *     "bboxX1": number, "bboxY1": number, "bboxX2": number, "bboxY2": number,
         *     "centerX": number, "centerY": number,
         *     "width": number, "height": number,
         *     "annotationType": "AUTO_DETECTED" | "USER_ADDED" | "USER_EDITED",
         *     "userId": "string",
         *     "comments": "string",
         *     "createdAt": "2025-08-15T10:15:00",
         *     "updatedAt": "2025-08-15T10:15:00",
         *     "isActive": boolean
         *   }
         * ]
         */
        const response = await fetch(
          getRestApiUrl(`annotations/inspection/${inspectionId}`),
          { method: 'GET' }
        );

        if (response.ok) {
          const annotations = await response.json();
          
          // Transform annotations to anomaly error format for display
          const transformedAnomalies = annotations
            .filter(annotation => annotation.isActive)
            .map(annotation => ({
              id: annotation.id,
              errorType: annotation.className,
              timestamp: annotation.createdAt,
              detectedBy: annotation.annotationType === 'AUTO_DETECTED' ? 'AI' : 
                         (annotation.userId || 'Manual Review'),
              description: annotation.comments || `${annotation.className} detected with ${(annotation.confidenceScore * 100).toFixed(1)}% confidence`,
              confidence: annotation.confidenceScore,
              severityLevel: getSeverityLevel(annotation.className),
              boundingBox: {
                x1: annotation.bboxX1,
                y1: annotation.bboxY1,
                x2: annotation.bboxX2,
                y2: annotation.bboxY2
              },
              center: {
                x: annotation.centerX,
                y: annotation.centerY
              },
              dimensions: {
                width: annotation.width,
                height: annotation.height
              },
              imageId: annotation.imageId,
              annotationType: annotation.annotationType
            }));

          setAnomalyErrors(transformedAnomalies);
          console.log(`Loaded ${transformedAnomalies.length} detected anomalies from database`);
        } else {
          console.log('No anomaly annotations available for this inspection');
          setAnomalyErrors([]);
        }
      } catch (err) {
        console.error('Error fetching anomaly annotations:', err);
        setAnomalyErrors([]);
      } finally {
        setLoadingErrors(false);
      }
    };

    fetchAnomalyErrors();
  }, [transformerId, inspectionId]);

  const baselineMeta = formatUpload(getUploadedAt(comparisonSources.baseline));
  const currentMeta  = formatUpload(getUploadedAt(comparisonSources.current));

  const goBackToUploads = () => {
    const state = { transformerId };
    if (inspectionId) {
      state.inspectionId = inspectionId;
    }
    navigate("/upload", { state });
  };

  const handleViewBaseline = () => {
    // Navigate to upload page when "Baseline Image" button is clicked
    goBackToUploads();
  };

  const handleDeleteBaseline = async () => {
    const baselineImage = comparisonSources.baseline;
    
    if (!baselineImage || !baselineImage.id) {
      alert('No baseline image to delete');
      return;
    }

    if (!window.confirm('Are you sure you want to delete the baseline image? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(getRestApiUrl(`images/${baselineImage.id}`), {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('Baseline image deleted successfully');
        // Redirect to upload page after successful deletion
        goBackToUploads();
      } else {
        const errorText = await response.text();
        console.error('Failed to delete baseline image:', errorText);
        alert('Failed to delete baseline image. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting baseline image:', error);
      alert('Error deleting baseline image: ' + error.message);
    }
  };

  return (
    <div className="page-bg min-vh-100">
      <div className="topbar">
        <Container className="d-flex align-items-center gap-3">
          <Button
            variant="light"
            onClick={() => setShowMenu(true)}
            className="rounded-circle d-flex align-items-center justify-content-center nav-burger"
            aria-label="Open menu"
          >
            <i className="bi bi-list fs-4" />
          </Button>
          <h5 className="mb-0 title">Transformer</h5>
        </Container>
      </div>

      <Container style={{ maxWidth: 1100 }}>
        {loading && <Alert variant="info" className="mt-3">Loading preview…</Alert>}
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        {record && (
          <>
            <div className="mt-3">
              <InspectionHeader
                id={record.id}
                dateLabel={createdPretty}
                lastUpdated={updatedPretty}
                transformerNo={record.transformerNo}
                poleNo={record.pole_no}
                branch={record.region}
                inspectedBy={"A-110"}
                status={{ text: "In progress", variant: "success" }}
                onBack={goBackToUploads}
                onViewBaseline={handleViewBaseline}
                onDeleteBaseline={handleDeleteBaseline}
              />
            </div>

            <Card className="mt-4">
              <Card.Body className="position-relative">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="mb-0">Thermal Image Comparison</h5>
                  <Button
                    variant="light"
                    size="sm"
                    className="d-flex align-items-center justify-content-center"
                    onClick={() => setShowSettings(true)}
                    style={{ 
                      width: "36px", 
                      height: "36px", 
                      borderRadius: "8px",
                      padding: 0,
                      background: "#f6f7fb",
                      border: "1px solid #eceff5"
                    }}
                    title="Settings"
                  >
                    <i className="bi bi-gear" style={{ fontSize: "18px" }}></i>
                  </Button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  <PanZoomContainFrame
                    src={resolveImageUrl(comparisonSources.baseline)}
                    label="Baseline"
                    metaText={baselineMeta}
                    badgeColor="rgba(108,117,125,0.95)"
                    syncZoomOn={syncZoomOn}
                    isHoveringSync={isHoveringSync}
                    onSyncEnter={onSyncEnter}
                    onSyncLeave={onSyncLeave}
                    onSyncMove={onSyncMove}
                    syncStyle={syncZoomStyle(syncZoomOn)}
                    containerHeight={containerHeight}
                    resetTrigger={resetTrigger}
                    annotationTool={annotationTool}
                  />
                  <PanZoomContainFrame
                    src={resolveImageUrl(comparisonSources.current)}
                    label={comparisonSources.current?.imageType?.toUpperCase() === "ANNOTATED" ? "Current (Annotated)" : "Current"}
                    metaText={currentMeta}
                    badgeColor={comparisonSources.current?.imageType?.toUpperCase() === "ANNOTATED" ? "rgba(40,167,69,0.95)" : "rgba(59,52,213,0.95)"}
                    syncZoomOn={syncZoomOn}
                    isHoveringSync={isHoveringSync}
                    onSyncEnter={onSyncEnter}
                    onSyncLeave={onSyncLeave}
                    onSyncMove={onSyncMove}
                    syncStyle={syncZoomStyle(syncZoomOn)}
                    containerHeight={containerHeight}
                    resetTrigger={resetTrigger}
                    annotationTool={annotationTool}
                  />
                </div>

                {/* Weather Condition and Annotation Tools Row */}
                <div className="d-flex justify-content-between align-items-end mt-3">
                  {/* Weather Condition Dropdown */}
                  <div style={{ width: "250px" }}>
                    <Form.Label className="mb-2 fw-semibold">Weather Condition</Form.Label>
                    <Form.Select 
                      value={weatherCondition} 
                      onChange={(e) => handleWeatherChange(e.target.value)}
                      style={{ 
                        borderRadius: "8px",
                        padding: "8px 12px"
                      }}
                    >
                      <option value="SUNNY">Sunny</option>
                      <option value="RAINY">Rainy</option>
                      <option value="CLOUDY">Cloudy</option>
                    </Form.Select>
                  </div>

                  {/* Right Side: Add Maintenance Button and Annotation Tools */}
                  <div className="d-flex flex-column align-items-end gap-2">
                    {/* Add Maintenance Image Button */}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate("/upload", { 
                        state: { 
                          transformerId, 
                          inspectionId,
                          defaultImageType: "MAINTENANCE" 
                        } 
                      })}
                      className="d-flex align-items-center"
                      style={{ 
                        borderRadius: "6px",
                        padding: "6px 12px",
                        backgroundColor: "#3b34d5",
                        border: "none",
                        fontWeight: "500",
                        fontSize: "0.8rem"
                      }}
                      title="Add a new maintenance image"
                    >
                      <i className="bi bi-plus-circle me-1" style={{ fontSize: "14px" }}></i>
                      Add Maintenance
                    </Button>

                    {/* Annotation Tools */}
                    <div className="d-flex align-items-center gap-2">
                      <div className="fw-semibold" style={{ fontSize: "0.95rem" }}>Annotation Tools</div>
                      <div className="d-flex gap-2">
                        <Button
                          variant="light"
                          size="sm"
                          onClick={handleResetView}
                          className="d-flex align-items-center justify-content-center"
                          style={{ 
                            width: "40px", 
                            height: "40px", 
                            borderRadius: "8px",
                            padding: 0,
                            background: "#f6f7fb",
                            border: "1px solid #eceff5"
                          }}
                          title="Reset View"
                        >
                          <i className="bi bi-arrow-clockwise" style={{ fontSize: "18px" }}></i>
                        </Button>
                        <Button
                          variant="light"
                          size="sm"
                          onClick={handleMoveMode}
                          className="d-flex align-items-center justify-content-center"
                          style={{ 
                            width: "40px", 
                            height: "40px", 
                            borderRadius: "8px",
                            padding: 0,
                            background: annotationTool === "move" ? "#007bff" : "#f6f7fb",
                            border: annotationTool === "move" ? "1px solid #007bff" : "1px solid #eceff5",
                            color: annotationTool === "move" ? "#fff" : "inherit"
                          }}
                          title="Move (Click and Drag)"
                        >
                          <i className="bi bi-arrows-move" style={{ fontSize: "18px" }}></i>
                        </Button>
                        <Button
                          variant="light"
                          size="sm"
                          onClick={handleZoomMode}
                          className="d-flex align-items-center justify-content-center"
                          style={{ 
                            width: "40px", 
                            height: "40px", 
                            borderRadius: "8px",
                            padding: 0,
                            background: annotationTool === "zoom" ? "#007bff" : "#f6f7fb",
                            border: annotationTool === "zoom" ? "1px solid #007bff" : "1px solid #eceff5",
                            color: annotationTool === "zoom" ? "#fff" : "inherit"
                          }}
                          title="Zoom"
                        >
                          <i className="bi bi-search" style={{ fontSize: "18px" }}></i>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {/* Errors Section */}
            <Card className="mt-4">
              <Card.Body>
                <div className="mb-3">
                  <h5 className="mb-0">Errors</h5>
                </div>

                {loadingErrors ? (
                  <div className="text-center py-3 text-muted">
                    <i className="bi bi-hourglass-split me-2"></i>
                    Loading errors...
                  </div>
                ) : anomalyErrors.length === 0 ? (
                  <div className="text-center py-4 text-muted">
                    <i className="bi bi-check-circle me-2" style={{ fontSize: "1.2rem", color: "#28a745" }}></i>
                    No errors detected
                  </div>
                ) : (
                  <>
                    <div className="d-flex flex-column gap-3">
                      {anomalyErrors.map((error, index) => {
                        const isExpanded = expandedErrorId === error.id;
                        const isSelected = selectedErrorId === error.id;
                        const notes = errorNotes[error.id] || [];
                        return (
                        <div 
                          key={error.id || index}
                          onClick={() => {
                            setExpandedErrorId(isExpanded ? null : error.id);
                            setSelectedErrorId(error.id);
                          }}
                          className="p-3"
                          style={{ 
                            backgroundColor: isSelected ? "#e7f3ff" : "#f8f9fa",
                            borderRadius: "8px",
                            border: isSelected ? "2px solid #007bff" : "1px solid #e9ecef",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = "#e9ecef";
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) e.currentTarget.style.backgroundColor = "#f8f9fa";
                          }}
                        >
                          {/* Basic Info - Always Visible */}
                          <div className="d-flex align-items-center gap-3">
                            <span 
                              className="badge"
                              style={{
                                backgroundColor: getSeverityColor(error.severityLevel),
                                color: "white",
                                fontSize: "0.85rem",
                                padding: "6px 12px",
                                borderRadius: "6px",
                                fontWeight: "600"
                              }}
                            >
                              {error.severityLevel} #{index + 1}
                            </span>
                            <div className="d-flex flex-column">
                              <span style={{ color: "#495057", fontSize: "0.95rem", fontWeight: "500" }}>
                                {error.errorType}
                              </span>
                              <span style={{ color: "#6c757d", fontSize: "0.8rem" }}>
                                {new Date(error.timestamp).toLocaleString('en-US', {
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })} • {error.detectedBy || 'AI'}
                                {error.confidence && (
                                  <span className="ms-2">
                                    • {(error.confidence * 100).toFixed(1)}% confidence
                                  </span>
                                )}
                              </span>
                            </div>
                            <i 
                              className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} ms-auto`}
                              style={{ color: "#6c757d" }}
                            ></i>
                          </div>

                          {/* Expanded Details - Show on Click */}
                          {isExpanded && (
                            <div className="mt-3 pt-3" style={{ borderTop: "1px solid #dee2e6" }}>
                              <div className="row">
                                <div className="col-md-6">
                                  {error.description && (
                                    <div className="mb-3">
                                      <strong style={{ color: "#495057", fontSize: "0.9rem" }}>Description:</strong>
                                      <p className="mb-0 mt-1" style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                                        {error.description}
                                      </p>
                                    </div>
                                  )}
                                  <div className="mb-2">
                                    <strong style={{ color: "#495057", fontSize: "0.9rem" }}>Detection Type:</strong>
                                    <span className="ms-2" style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                                      <i className={`bi ${error.annotationType === 'AUTO_DETECTED' ? 'bi-cpu' : 'bi-person'} me-1`}></i>
                                      {error.annotationType === 'AUTO_DETECTED' ? 'AI Detection' : 'Manual Detection'}
                                    </span>
                                  </div>
                                  {error.confidence && (
                                    <div className="mb-2">
                                      <strong style={{ color: "#495057", fontSize: "0.9rem" }}>Confidence:</strong>
                                      <span className="ms-2" style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                                        {(error.confidence * 100).toFixed(1)}%
                                      </span>
                                      <div className="progress mt-1" style={{ height: "4px" }}>
                                        <div 
                                          className="progress-bar" 
                                          style={{ 
                                            width: `${error.confidence * 100}%`,
                                            backgroundColor: error.confidence > 0.8 ? "#28a745" : error.confidence > 0.6 ? "#ffc107" : "#dc3545"
                                          }}
                                        ></div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="col-md-6">
                                  {error.boundingBox && (
                                    <div className="mb-3">
                                      <strong style={{ color: "#495057", fontSize: "0.9rem" }}>Location:</strong>
                                      <div className="mt-1" style={{ fontSize: "0.8rem", color: "#6c757d" }}>
                                        <div>Bounding Box: ({error.boundingBox.x1?.toFixed(1)}, {error.boundingBox.y1?.toFixed(1)}) to ({error.boundingBox.x2?.toFixed(1)}, {error.boundingBox.y2?.toFixed(1)})</div>
                                        {error.center && (
                                          <div>Center: ({error.center.x?.toFixed(1)}, {error.center.y?.toFixed(1)})</div>
                                        )}
                                        {error.dimensions && (
                                          <div>Size: {error.dimensions.width?.toFixed(1)} × {error.dimensions.height?.toFixed(1)}</div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                  {error.imageId && (
                                    <div className="mb-2">
                                      <strong style={{ color: "#495057", fontSize: "0.9rem" }}>Image ID:</strong>
                                      <span className="ms-2" style={{ color: "#6c757d", fontSize: "0.9rem" }}>
                                        #{error.imageId}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {notes.length > 0 && (
                                <div className="mt-3">
                                  <strong style={{ color: "#495057", fontSize: "0.9rem" }}>Notes:</strong>
                                  <div className="mt-2">
                                    {notes.map((note, noteIndex) => (
                                      <div 
                                        key={note.id}
                                        className="mb-2 p-2"
                                        style={{
                                          backgroundColor: "#fff",
                                          borderRadius: "6px",
                                          border: "1px solid #dee2e6",
                                          fontSize: "0.85rem"
                                        }}
                                      >
                                        <div style={{ color: "#495057" }}>{note.text}</div>
                                        <div className="mt-1" style={{ color: "#adb5bd", fontSize: "0.75rem" }}>
                                          {new Date(note.timestamp).toLocaleString('en-US', {
                                            month: '2-digit',
                                            day: '2-digit',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Notes Section */}
                  <div className="mt-4 pt-4" style={{ borderTop: "2px solid #e9ecef" }}>
                    <h6 className="mb-3">Notes</h6>
                    
                    {!selectedErrorId ? (
                      <div className="text-center py-3 text-muted" style={{ fontSize: "0.9rem" }}>
                        <i className="bi bi-info-circle me-2"></i>
                        Select an error above to add notes
                      </div>
                    ) : (
                      <div>
                        <div className="mb-2">
                          <small className="text-muted">
                            Adding note to <strong>Error {anomalyErrors.findIndex(e => e.id === selectedErrorId) + 1}</strong>
                          </small>
                        </div>
                        <Form.Control
                          as="textarea"
                          rows={3}
                          placeholder="Type here to add notes..."
                          value={currentNote}
                          onChange={(e) => setCurrentNote(e.target.value)}
                          style={{
                            borderRadius: "8px",
                            border: "1px solid #dee2e6",
                            fontSize: "0.9rem",
                            resize: "none"
                          }}
                        />
                        <div className="d-flex gap-2 mt-3">
                          <Button
                            onClick={handleAddNote}
                            disabled={!currentNote.trim()}
                            style={{
                              padding: "8px 24px",
                              borderRadius: "8px",
                              backgroundColor: "#3b34d5",
                              border: "none",
                              fontWeight: "500",
                              fontSize: "0.9rem"
                            }}
                          >
                            Confirm
                          </Button>
                          <Button
                            variant="light"
                            onClick={handleCancelNote}
                            style={{
                              padding: "8px 24px",
                              borderRadius: "8px",
                              border: "1px solid #dee2e6",
                              fontWeight: "500",
                              fontSize: "0.9rem",
                              color: "#6c757d"
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
                )}
              </Card.Body>
            </Card>
          </>
        )}
      </Container>

      <Offcanvas show={showMenu} onHide={() => setShowMenu(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body />
      </Offcanvas>

      {/* Settings Modal */}
      <Offcanvas show={showSettings} onHide={handleSettingsCancel} placement="end" style={{ width: "500px" }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title style={{ fontSize: "1.5rem", color: "#6c757d" }}>Error Ruleset</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="d-flex flex-column h-100">
            {/* Settings Content */}
            <div className="flex-grow-1">
              {/* Temperature Difference */}
              <div className="mb-4">
                <h6 className="fw-bold mb-2" style={{ fontSize: "1.1rem" }}>Temperature Difference</h6>
                <p className="text-muted small mb-3">Temperature difference between baseline and maintenance images.</p>
                <Form.Select 
                  value={tempDifference} 
                  onChange={(e) => setTempDifference(e.target.value)}
                  style={{ 
                    borderRadius: "8px",
                    padding: "10px 12px",
                    fontSize: "1rem"
                  }}
                >
                  <option value="10%">10%</option>
                  <option value="20%">20%</option>
                  <option value="30%">30%</option>
                  <option value="40%">40%</option>
                  <option value="50%">50%</option>
                  <option value="60%">60%</option>
                  <option value="70%">70%</option>
                  <option value="80%">80%</option>
                  <option value="90%">90%</option>
                  <option value="100%">100%</option>
                </Form.Select>
              </div>

              {/* Rule 2 - Loose Joint Condition */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0" style={{ fontSize: "1.1rem" }}>Rule 2</h6>
                  <Form.Check 
                    type="switch"
                    id="rule2-switch"
                    checked={rule2Enabled}
                    onChange={(e) => setRule2Enabled(e.target.checked)}
                    style={{ transform: "scale(1.3)" }}
                  />
                </div>
                <p 
                  className="text-muted small mb-2" 
                  onClick={() => setRule2Expanded(!rule2Expanded)}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  {rule2Expanded ? "▼" : "▶"} Rule Description
                </p>
                {rule2Expanded && (
                  <div className="p-3 bg-light rounded" style={{ fontSize: "0.9rem" }}>
                    <h6 className="fw-semibold mb-2">Loose Joint Condition</h6>
                    <p className="mb-2">
                      A loose joint creates a hotspot at the connection point.
                    </p>
                    <p className="mb-2">
                      <strong>Faulty:</strong> If the middle of the joint appears reddish or orange-yellowish, 
                      compared to a blue/black background, it is a clear fault.
                    </p>
                    <p className="mb-0">
                      <strong>Potentially Faulty:</strong> If the middle of the joint is yellowish (not reddish or orange) 
                      compared to the blue/black background, it is potentially faulty.
                    </p>
                  </div>
                )}
              </div>

              {/* Rule 3 - Overloaded Condition */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <h6 className="fw-bold mb-0" style={{ fontSize: "1.1rem" }}>Rule 3</h6>
                  <Form.Check 
                    type="switch"
                    id="rule3-switch"
                    checked={rule3Enabled}
                    onChange={(e) => setRule3Enabled(e.target.checked)}
                    style={{ transform: "scale(1.3)" }}
                  />
                </div>
                <p 
                  className="text-muted small mb-2" 
                  onClick={() => setRule3Expanded(!rule3Expanded)}
                  style={{ cursor: "pointer", userSelect: "none" }}
                >
                  {rule3Expanded ? "▼" : "▶"} Rule Description
                </p>
                {rule3Expanded && (
                  <div className="p-3 bg-light rounded" style={{ fontSize: "0.9rem" }}>
                    <h6 className="fw-semibold mb-2">Overloaded Condition</h6>
                    <p className="mb-2">
                      Overloading causes heating along a wire.
                    </p>
                    <p className="mb-2">
                      <strong>Point Overload (Faulty):</strong> If a small point or small area on the wire appears 
                      reddish or orange-yellowish, while the rest of the wire is in black/blue or yellowish, 
                      it is a faulty case.
                    </p>
                    <p className="mb-2">
                      <strong>Point Overload (Potentially Faulty):</strong> If a small point or small area on the wire 
                      appears yellowish, while the rest of the wire is in black/blue, it is a potentially faulty case.
                    </p>
                    <p className="mb-0">
                      <strong>Full Wire Overload (Potentially Faulty):</strong> If the entire wire appears in reddish 
                      or yellowish colors, it is considered potentially faulty. This could be due to operational load 
                      rather than a permanent fault.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex gap-3 mt-4">
              <Button 
                onClick={handleSettingsConfirm}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  backgroundColor: "#3b34d5",
                  border: "none",
                  fontWeight: "500"
                }}
              >
                Confirm
              </Button>
              <Button 
                variant="light"
                onClick={handleSettingsCancel}
                style={{
                  padding: "12px 32px",
                  borderRadius: "8px",
                  border: "1px solid #dee2e6",
                  fontWeight: "500",
                  color: "#3b34d5"
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}

/* Pretty date for header (unchanged) */
function formatPretty(iso) {
  try {
    const d = new Date(iso);
    const weekday = d.toLocaleString("en-US", { weekday: "short" });
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "long" });
    const year = d.getFullYear();
    let t = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    t = t.replace(" ", "").replace("AM", "am").replace("PM", "pm").replace(":", ".");
    return `${weekday}(${day}), ${month}, ${year} ${t}`;
  } catch {
    return iso;
  }
}

/* Compact timestamp for image metadata like 5/7/2025, 8:34:21 PM */
function formatUpload(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}
