import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Button, Offcanvas, Alert, Row, Col, Card, Badge } from "react-bootstrap";
import InspectionHeader from "../components/InspectionHeader";
import ThermalImageUploader from "../components/thermalImageUploader";
import { getRestApiUrl, getImageUrl } from "../utils/config";

export default function UploadPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const transformerId = location.state?.transformerId;
  const inspectionId = location.state?.inspectionId;
  const defaultImageType = location.state?.defaultImageType; // Default image type from navigation
  const [infoMessage, setInfoMessage] = useState(location.state?.message || ""); // Message from inspection view

  const [record, setRecord] = useState(null);
  const [inspection, setInspection] = useState(null);
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInfoMessage, setShowInfoMessage] = useState(!!location.state?.message); // Control message visibility

  // Progress view state
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const xhrRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!transformerId && !inspectionId) {
        setError("No transformer or inspection selected.");
        setLoading(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);

        if (inspectionId) {
          // Load inspection and its related data
          const [inspectionRes, imagesRes] = await Promise.all([
            fetch(getRestApiUrl(`inspections/${inspectionId}`)),
            fetch(getRestApiUrl(`images/inspection/${inspectionId}`)),
          ]);

          if (!inspectionRes.ok) throw new Error(`Failed to load inspection: ${inspectionRes.status}`);
          if (!imagesRes.ok) throw new Error(`Failed to load images: ${imagesRes.status}`);

          const [inspectionData, imagesData] = await Promise.all([inspectionRes.json(), imagesRes.json()]);

          // Also load transformer data
          const transformerRes = await fetch(getRestApiUrl(`transformers/${inspectionData.transformerId}`));
          if (!transformerRes.ok) throw new Error(`Failed to load transformer: ${transformerRes.status}`);
          const transformerData = await transformerRes.json();

          if (isMounted) {
            setInspection(inspectionData);
            setRecord(transformerData);
            setImages(imagesData);
          }
        } else if (transformerId) {
          // Load transformer and its images
          const [transformerRes, imagesRes] = await Promise.all([
            fetch(getRestApiUrl(`transformers/${transformerId}`)),
            fetch(getRestApiUrl(`images/transformer/${transformerId}`)),
          ]);

          if (!transformerRes.ok) throw new Error(`Failed to load transformer: ${transformerRes.status}`);
          if (!imagesRes.ok) throw new Error(`Failed to load images: ${imagesRes.status}`);

          const [transformerData, imagesData] = await Promise.all([transformerRes.json(), imagesRes.json()]);

          if (isMounted) {
            setRecord(transformerData);
            setImages(imagesData);
          }
        }
      } catch (e) {
        if (isMounted) setError(e.message || String(e));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
      try { xhrRef.current?.abort(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformerId, inspectionId]);

  const createdPretty = useMemo(
    () => (record?.createdAt ? formatPretty(record.createdAt) : "—"),
    [record]
  );
  const updatedPretty = useMemo(
    () => (record?.updatedAt ? formatPretty(record.updatedAt) : "—"),
    [record]
  );

  // ---------------------------
  // Upload with Anomaly Detection Integration
  // ---------------------------
  const uploadToBackend = async (formData) => {
    // Validate formData
    if (!formData) {
      setError("No form data provided");
      return;
    }

    // Get transformerId from either state or loaded inspection data
    const effectiveTransformerId = transformerId || (inspection?.transformerId);
    
    if (effectiveTransformerId && !formData.has("transformerId")) {
      formData.append("transformerId", effectiveTransformerId);
    }
    if (inspectionId && !formData.has("inspectionId")) {
      formData.append("inspectionId", inspectionId);
    }
    if (!formData.has("envCondition")) formData.append("envCondition", "SUNNY");
    if (!formData.has("imageType")) formData.append("imageType", "BASELINE");

    // Step 1: First detect anomalies using AI service
    const imageFile = formData.get('file');
    if (!imageFile) {
      setError("No image file found in form data");
      return;
    }
    
    // Keep the original 'file' field for FastAPI, but add 'image' field for Spring Boot
    formData.append('image', imageFile);  // Spring Boot expects 'image'

    let anomalyDetectionResult = null;
    let annotatedImageBlob = null;

    setIsUploading(true);
    setProgress(10);
    setError(null);

    // Get the image type from form data
    const imageType = formData.get('imageType')?.toUpperCase();

    try {
      // Only run anomaly detection for MAINTENANCE images
      if (imageType === 'MAINTENANCE') {
        // Send image to anomaly detection service (FastAPI expects 'file')
        const detectionFormData = new FormData();
        detectionFormData.append('file', imageFile);
        detectionFormData.append('confidence_threshold', '0.25');

        console.log("Sending MAINTENANCE image to anomaly detection service...");
        console.log("Image file name:", imageFile.name);
        console.log("Image file size:", imageFile.size);
        setProgress(25);

        const detectionResponse = await fetch('http://127.0.0.1:8001/detect-thermal-anomalies', {
          method: 'POST',
          body: detectionFormData
        });

        if (detectionResponse.ok) {
          const result = await detectionResponse.json();
          if (result && result.success) {
            anomalyDetectionResult = result;
            console.log("Detection results:", anomalyDetectionResult);
            
            // Convert base64 annotated image to blob
            if (result.annotated_image_base64) {
              try {
                const base64Response = await fetch(`data:image/jpeg;base64,${result.annotated_image_base64}`);
                annotatedImageBlob = await base64Response.blob();
              } catch (base64Error) {
                console.warn("Failed to process annotated image:", base64Error);
              }
            }
          } else {
            console.warn("Detection returned unsuccessful result:", result);
          }
          setProgress(50);
        } else {
          const errorText = await detectionResponse.text();
          console.warn(`Anomaly detection failed (${detectionResponse.status}):`, errorText);
          setProgress(50);
        }
      } else {
        console.log("Skipping anomaly detection for", imageType, "image type. Anomaly detection only runs on MAINTENANCE images.");
        setProgress(50);
      }
    } catch (error) {
      console.warn("Anomaly detection service unavailable:", error);
      console.warn("This could be due to model loading issues or service being offline");
      setProgress(50);
    }

    // Step 2: Upload original image to backend
    setTimeout(() => {
      const xhr = new XMLHttpRequest();
      if (!xhr) {
        setError("Failed to create upload request");
        setIsUploading(false);
        return;
      }
      
      xhrRef.current = xhr;

      xhr.open("POST", getRestApiUrl("images/upload"));

      if (xhr.upload) {
        xhr.upload.onprogress = (e) => {
          if (e && e.lengthComputable && e.total > 0) {
            const uploadPct = Math.round((e.loaded / e.total) * 40);
            setProgress(Math.min(90, Math.max(50, 50 + uploadPct)));
          }
        };
      }

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(90);

          let uploaded = null;
          try { uploaded = JSON.parse(xhr.responseText || "{}"); } catch {}

          // Step 3: Save anomaly detection results and upload annotated image
          let newImages = [];
          try {
            // Get effective transformerId for API calls
            const effectiveTransformerId = transformerId || (inspection?.transformerId);
            const imagesEndpoint = inspectionId ? 
              `images/inspection/${inspectionId}` : 
              `images/transformer/${effectiveTransformerId}`;
            const imagesRes = await fetch(getRestApiUrl(imagesEndpoint));
            if (imagesRes.ok) {
              newImages = await imagesRes.json();
              setImages(newImages);
              if (!uploaded || !uploaded.filePath) {
                const latest = [...newImages].sort((a, b) => {
                  const ta = new Date(a.uploadDate || a.createdAt || 0).getTime();
                  const tb = new Date(b.uploadDate || b.createdAt || 0).getTime();
                  return tb - ta;
                })[0];
                uploaded = latest || uploaded;
              }
            }

            // Step 4: Save annotations if detection was successful
            if (anomalyDetectionResult && anomalyDetectionResult.success && uploaded?.id) {
              console.log("Saving annotations for image ID:", uploaded.id);
              
              try {
                // Convert YOLO detections to annotation format
                const annotationRequests = anomalyDetectionResult.detections.map(detection => ({
                  imageId: uploaded.id,
                  classId: detection.class_id,
                  className: detection.class_name,
                  confidenceScore: detection.confidence,
                  bboxX1: detection.bbox[0],
                  bboxY1: detection.bbox[1],
                  bboxX2: detection.bbox[2],
                  bboxY2: detection.bbox[3],
                  annotationType: "AUTO_DETECTED",
                  userId: "system",
                  comments: `Auto-detected with confidence ${detection.confidence.toFixed(3)}`
                }));

                // Save annotations to backend
                const annotationsResponse = await fetch(getRestApiUrl(`annotations/batch/${uploaded.id}`), {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(annotationRequests)
                });

                if (annotationsResponse.ok) {
                  console.log("Annotations saved successfully");
                } else {
                  console.warn("Failed to save annotations:", await annotationsResponse.text());
                }

                // Step 5: Upload annotated image if available
                if (annotatedImageBlob && uploaded.id) {
                  const annotatedFormData = new FormData();
                  annotatedFormData.append('image', annotatedImageBlob, `${uploaded.fileName}_annotated.jpg`);
                  annotatedFormData.append('transformerId', effectiveTransformerId);
                  if (inspectionId) annotatedFormData.append('inspectionId', inspectionId);
                  annotatedFormData.append('envCondition', formData.get('envCondition') || 'SUNNY');
                  annotatedFormData.append('imageType', 'ANNOTATED');

                  const annotatedUploadResponse = await fetch(getRestApiUrl("images/upload"), {
                    method: 'POST',
                    body: annotatedFormData
                  });

                  if (annotatedUploadResponse.ok) {
                    console.log("Annotated image uploaded successfully");
                    // Refresh image list to include annotated image
                    const refreshedImagesRes = await fetch(getRestApiUrl(imagesEndpoint));
                    if (refreshedImagesRes.ok) {
                      const refreshedImages = await refreshedImagesRes.json();
                      setImages(refreshedImages);
                    }
                  }
                }
              } catch (error) {
                console.error("Error saving annotations:", error);
              }
            }
          } catch {}

          setProgress(100);
          setIsUploading(false);
          setTimeout(() => setProgress(0), 1000);
          xhrRef.current = null;

          // Check if both Baseline and Maintenance images are available
          const hasBaseline = newImages.some(img => img.imageType?.toUpperCase() === "BASELINE");
          const hasMaintenance = newImages.some(img => img.imageType?.toUpperCase() === "MAINTENANCE");

          // Show success message with anomaly detection results
          let message = "";
          if (anomalyDetectionResult && anomalyDetectionResult.success) {
            const detectionCount = anomalyDetectionResult.total_detections;
            const severityLevel = anomalyDetectionResult.severity_level;
            message = `Image uploaded successfully! AI detected ${detectionCount} thermal anomalies (${severityLevel} severity). `;
          } else {
            message = "Image uploaded successfully! ";
          }

          // Navigate to image viewer if anomaly detection was successful
          if (anomalyDetectionResult && anomalyDetectionResult.success && uploaded?.id) {
            message += "View and edit detected anomalies.";
            setInfoMessage(message);
            setShowInfoMessage(true);
            
            // Navigate to image viewer after a short delay to show the message
            setTimeout(() => {
              navigate(`/image-viewer/${uploaded.id}`);
            }, 2000);
          } else if (hasBaseline && hasMaintenance) {
            message += "Both images are now available for comparison.";
            setInfoMessage(message);
            setShowInfoMessage(true);
            
            // Navigate to preview page after a short delay to show the message
            setTimeout(() => {
              navigate("/preview", { 
                state: { 
                  transformerId: transformerId || (inspection?.transformerId), 
                  inspectionId,
                  uploadedImage: uploaded,
                  anomalyDetection: anomalyDetectionResult
                } 
              });
            }, 2000);
          } else {
            // One or both images missing - update message and stay on upload page
            if (!hasBaseline && !hasMaintenance) {
              message += "Please upload both Baseline and Maintenance images to enable comparison.";
            } else if (!hasBaseline) {
              message += "Please upload a Baseline image to enable comparison.";
            } else if (!hasMaintenance) {
              message += "Please upload a Maintenance image to enable comparison.";
            }
            
            setInfoMessage(message);
            setShowInfoMessage(true);
            
            // Scroll to top to show the message
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
          return;
        } else {
          let msg = `Upload failed (${xhr.status})`;
          try { 
            const t = xhr.responseText || ""; 
            if (t) msg += `: ${t}`;
            console.error("Upload error details:", {
              status: xhr.status,
              statusText: xhr.statusText,
              response: t
            });
          } catch {}
          alert(msg);
        }

        setIsUploading(false);
        setProgress(0);
        xhrRef.current = null;
      };

      xhr.onerror = () => {
        if (xhr.aborted) return;
        alert("Network error while uploading.");
        setIsUploading(false);
        setProgress(0);
        xhrRef.current = null;
      };

      xhr.onabort = () => {
        setIsUploading(false);
        setProgress(0);
        xhrRef.current = null;
      };

      xhr.send(formData);
    }, 0);

    return Promise.resolve();
  };

  const handleCancelUpload = () => {
    try { xhrRef.current?.abort(); } catch {}
  };

  // Simple annotation viewing
  const handleViewAnnotations = (image) => {
    // For now, just show a simple alert - can be enhanced later
    alert(`Viewing annotations for ${image.fileName}\nThis feature will be implemented to show AI-detected anomalies.`);
  };

  const handleImageDelete = async (imageId) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      const res = await fetch(getRestApiUrl(`images/${imageId}`), { method: "DELETE" });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
      } else {
        throw new Error(`Failed to delete image: ${res.status}`);
      }
    } catch (error) {
      alert("Error deleting image: " + error.message);
    }
  };

  const handleViewBaseline = () => {
    const baselineImage = images.find((img) => img.imageType === "BASELINE");
    if (baselineImage) window.open(getImageUrl(baselineImage.filePath), "_blank");
    else alert("No baseline image found for this transformer.");
  };

  const handleDeleteBaseline = async () => {
    const baselineImage = images.find((img) => img.imageType === "BASELINE");
    if (!baselineImage) return alert("No baseline image found for this transformer.");
    if (window.confirm("Are you sure you want to delete the baseline image?")) {
      await handleImageDelete(baselineImage.id);
    }
  };

  const handleOpenBaseline = () => {
    const baselineImage = images.find((img) => img.imageType === "BASELINE");
    if (!baselineImage) return alert("No baseline image found. Please upload a baseline image first.");
    const el = document.getElementById(`image-${baselineImage.id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.style.border = "2px solid #007bff";
      setTimeout(() => { el.style.border = ""; }, 3000);
    }
  };

  // Handle back navigation based on available images
  const handleBack = () => {
    // Check if images are available for this inspection/transformer
    const hasImages = images.length > 0;
    
    if (hasImages) {
      // If images are available, go to preview page
      const effectiveTransformerId = transformerId || inspection?.transformerId;
      navigate("/preview", { 
        state: { 
          transformerId: effectiveTransformerId, 
          inspectionId 
        } 
      });
    } else {
      // If no images, go to inspections page for this transformer
      const effectiveTransformerId = transformerId || inspection?.transformerId;
      navigate("/inspections", { 
        state: { 
          transformerId: effectiveTransformerId 
        } 
      });
    }
  };

  return (
    <div className="page-bg min-vh-100">
      {/* Top bar */}
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

  <Container className="ui-page-container">
        {loading && <Alert variant="info" className="mt-3">Loading transformer data...</Alert>}
        {error && !isUploading && <Alert variant="danger" className="mt-3">{error}</Alert>}
        {showInfoMessage && infoMessage && (
          <Alert 
            variant={infoMessage.includes("successfully") ? "success" : "warning"}
            className="mt-3" 
            dismissible 
            onClose={() => setShowInfoMessage(false)}
          >
            <i className={`bi ${infoMessage.includes("successfully") ? "bi-check-circle-fill" : "bi-exclamation-triangle-fill"} me-2`}></i>
            {infoMessage}
          </Alert>
        )}

        {record && (
          <>
            <div className="mt-3">
              <InspectionHeader
                id={record.id}
                dateLabel={inspection ? formatPretty(inspection.inspectedDate) : createdPretty}
                lastUpdated={inspection ? formatPretty(inspection.updatedAt) : updatedPretty}
                transformerNo={record.transformerNo}
                poleNo={record.pole_no}
                branch={inspection ? inspection.branch : record.region}
                inspectedBy={inspection ? inspection.inspectedBy : "A-110"}
                status={{ 
                  text: isUploading ? "Uploading…" : 
                        inspection ? formatInspectionStatus(inspection.status) : "In progress", 
                  variant: "success" 
                }}
                onViewBaseline={handleViewBaseline}
                onDeleteBaseline={handleDeleteBaseline}
                onOpenBaseline={handleOpenBaseline}
                onBack={handleBack}
              />
            </div>

            {/* Uploading state with progress */}
            {isUploading && (
              <Card className="mt-4">
                <Card.Header>
                  <h5 className="mb-0">Thermal Image</h5>
                </Card.Header>
                <Card.Body className="py-5">
                  <div className="text-center mb-3">
                    <h6 className="mb-1">Thermal image uploading.</h6>
                    <div className="text-muted">Thermal image is being uploaded and reviewed.</div>
                  </div>

                  <div className="mx-auto ui-container-narrow">
                    <div className="position-relative mb-2">
                      <div className="ui-progress">
                        <div
                          className={`progress-bar ui-progress__bar ${isUploading ? "progress-bar-striped progress-bar-animated" : ""}`}
                          role="progressbar"
                          style={{ width: `${progress}%` }}
                          aria-valuenow={progress}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
                      </div>
                      <span className="text-muted ui-progress__label">
                        {progress}%
                      </span>
                    </div>

                    <div className="d-flex justify-content-center mt-4">
                      <Button variant="outline-secondary" onClick={handleCancelUpload}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Normal two-column page (when not uploading) */}
            {!isUploading && (
              <Row className="mt-4">
                <Col md={6}>
                  <Card>
                    <Card.Header>
                      <h5 className="mb-0">Upload New Image</h5>
                    </Card.Header>
                    <Card.Body>
                      <ThermalImageUploader 
                        onUpload={uploadToBackend} 
                        defaultImageType={defaultImageType}
                      />
                    </Card.Body>
                  </Card>
                </Col>

                <Col md={6}>
                  <Card>
                    <Card.Header>
                      <h5 className="mb-0">Existing Images ({images.length})</h5>
                    </Card.Header>
                    <Card.Body className="ui-scroll-panel">
                      {images.length === 0 ? (
                        <p className="text-muted">No images uploaded yet.</p>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {images.map((image) => (
                            <div key={image.id} id={`image-${image.id}`} className="border rounded p-3">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <div>
                                  <strong>{image.fileName}</strong>
                                  {image.imageType === "BASELINE" && (
                                    <Badge bg="primary" className="ms-2">Baseline</Badge>
                                  )}
                                  <div className="text-muted small">
                                    Type: {image.imageType} | Condition: {image.envCondition}
                                  </div>
                                  <div className="text-muted small">
                                    Uploaded: {image.uploadDate ? formatPretty(image.uploadDate) : "Unknown"}
                                  </div>
                                  <div className="text-muted small">
                                    File Type: {image.fileType} | Size: {image.fileSize ? Math.round(image.fileSize / 1024) + " KB" : "Unknown"}
                                  </div>
                                </div>
                                <div className="d-flex gap-2">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleViewAnnotations(image)}
                                  >
                                    <i className="bi bi-eye me-1"></i>
                                    View Annotations
                                  </Button>
                                  <Button
                                    variant="outline-danger"
                                    size="sm"
                                    onClick={() => handleImageDelete(image.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                              {image.filePath && (
                                <div className="mt-2">
                                  <img
                                    src={getImageUrl(image.filePath)}
                                    alt={image.fileName || "Uploaded image"}
                                    className="img-fluid ui-image-fit"
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "block";
                                    }}
                                  />
                                  <div className="text-muted d-none">
                                    Image preview not available
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            )}
          </>
        )}
      </Container>

      <Offcanvas show={showMenu} onHide={() => setShowMenu(false)}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body />
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

/* Format inspection status for display */
function formatInspectionStatus(status) {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
}
