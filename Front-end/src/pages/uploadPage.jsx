import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Container, Button, Offcanvas, Alert, Row, Col, Card, Badge } from "react-bootstrap";
import InspectionHeader from "../components/InspectionHeader";
import ThermalImageUploader from "../components/thermalImageUploader";
import { getApiUrl, getImageUrl } from "../utils/config";

export default function UploadPage() {
  const location = useLocation();
  const transformerId = location.state?.transformerId; // sent from table

  const [record, setRecord] = useState(null);
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTransformerAndImages = async () => {
      if (!transformerId) {
        setError("No transformer selected.");
        setLoading(false);
        return;
      }

      try {
        setError(null);
        setLoading(true);

        // Fetch transformer data and images in parallel
        const [transformerRes, imagesRes] = await Promise.all([
          fetch(getApiUrl(`transformers/${transformerId}`)),
          fetch(getApiUrl(`images/transformer/${transformerId}`))
        ]);

        if (!transformerRes.ok) {
          throw new Error(`Failed to load transformer: ${transformerRes.status}`);
        }

        if (!imagesRes.ok) {
          throw new Error(`Failed to load images: ${imagesRes.status}`);
        }

        const [transformerData, imagesData] = await Promise.all([
          transformerRes.json(),
          imagesRes.json()
        ]);

        if (isMounted) {
          setRecord(transformerData);
          setImages(imagesData);
        }
      } catch (e) {
        if (isMounted) {
          setError(e.message || String(e));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTransformerAndImages();

    return () => {
      isMounted = false;
    };
  }, [transformerId]);

  const createdPretty = useMemo(() => (record?.createdAt ? formatPretty(record.createdAt) : "—"), [record]);
  const updatedPretty = useMemo(() => (record?.updatedAt ? formatPretty(record.updatedAt) : "—"), [record]);

  const uploadToBackend = async (formData) => {
    try {
      // Add transformer ID to the form data
      if (transformerId) {
        formData.append("transformerId", transformerId);
      }
      
      // Add default values for required fields if not present
      if (!formData.has("envCondition")) {
        formData.append("envCondition", "SUNNY");
      }
      if (!formData.has("imageType")) {
        formData.append("imageType", "BASELINE");
      }

      const res = await fetch(getApiUrl("images/upload"), {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        let errorMessage = `Upload failed (${res.status})`;
        try {
          const errorText = await res.text();
          if (errorText) {
            errorMessage += `: ${errorText}`;
          }
        } catch (e) {
          // If we can't read the error text, use the status message
          errorMessage += `: ${res.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      // Refresh images after successful upload
      const imagesRes = await fetch(getApiUrl(`images/transformer/${transformerId}`));
      if (imagesRes.ok) {
        const newImages = await imagesRes.json();
        setImages(newImages);
      }
      
      return res.json();
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleImageDelete = async (imageId) => {
    if (!window.confirm("Are you sure you want to delete this image?")) {
      return;
    }
    
    try {
      const res = await fetch(getApiUrl(`images/${imageId}`), {
        method: "DELETE",
      });
      
      if (res.ok) {
        setImages(prev => prev.filter(img => img.id !== imageId));
      } else {
        throw new Error(`Failed to delete image: ${res.status}`);
      }
    } catch (error) {
      alert("Error deleting image: " + error.message);
    }
  };

  // Baseline image handlers
  const handleViewBaseline = () => {
    const baselineImage = images.find(img => img.imageType === 'BASELINE');
    if (baselineImage) {
      window.open(getImageUrl(baselineImage.filePath), '_blank');
    } else {
      alert('No baseline image found for this transformer.');
    }
  };

  const handleDeleteBaseline = async () => {
    const baselineImage = images.find(img => img.imageType === 'BASELINE');
    if (!baselineImage) {
      alert('No baseline image found for this transformer.');
      return;
    }
    
    if (window.confirm("Are you sure you want to delete the baseline image?")) {
      await handleImageDelete(baselineImage.id);
    }
  };

  const handleOpenBaseline = () => {
    const baselineImage = images.find(img => img.imageType === 'BASELINE');
    if (baselineImage) {
      // Scroll to the baseline image in the gallery
      const baselineElement = document.getElementById(`image-${baselineImage.id}`);
      if (baselineElement) {
        baselineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        baselineElement.style.border = '2px solid #007bff';
        setTimeout(() => {
          baselineElement.style.border = '';
        }, 3000);
      }
    } else {
      alert('No baseline image found. Please upload a baseline image first.');
    }
  };

  return (
    <div className="page-bg min-vh-100">
      {/* Top bar (burger + title only) */}
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
        {loading && <Alert variant="info" className="mt-3">Loading transformer data...</Alert>}
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
                onViewBaseline={handleViewBaseline}
                onDeleteBaseline={handleDeleteBaseline}
                onOpenBaseline={handleOpenBaseline}
              />
            </div>

            <Row className="mt-4">
              <Col md={6}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Upload New Image</h5>
                  </Card.Header>
                  <Card.Body>
                    <ThermalImageUploader onUpload={uploadToBackend} />
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6}>
                <Card>
                  <Card.Header>
                    <h5 className="mb-0">Existing Images ({images.length})</h5>
                  </Card.Header>
                  <Card.Body style={{ maxHeight: "500px", overflowY: "auto" }}>
                    {images.length === 0 ? (
                      <p className="text-muted">No images uploaded yet.</p>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {images.map((image) => (
                          <div key={image.id} id={`image-${image.id}`} className="border rounded p-3">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <strong>{image.fileName}</strong>
                                {image.imageType === 'BASELINE' && (
                                  <Badge bg="primary" className="ms-2">Baseline</Badge>
                                )}
                                <div className="text-muted small">
                                  Type: {image.imageType} | Condition: {image.envCondition}
                                </div>
                                <div className="text-muted small">
                                  Uploaded: {image.uploadDate ? formatPretty(image.uploadDate) : "Unknown"}
                                </div>
                                <div className="text-muted small">
                                  File Type: {image.fileType} | Size: {image.fileSize ? Math.round(image.fileSize / 1024) + ' KB' : 'Unknown'}
                                </div>
                              </div>
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleImageDelete(image.id)}
                              >
                                Delete
                              </Button>
                            </div>
                            {image.filePath && (
                              <div className="mt-2">
                                <img 
                                  src={getImageUrl(image.filePath)}
                                  alt={image.fileName || 'Uploaded image'}
                                  className="img-fluid"
                                  style={{ maxHeight: "200px", objectFit: "contain" }}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                                <div style={{ display: 'none' }} className="text-muted">
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

/* Same pretty-date formatter used in the header mock */
function formatPretty(iso) {
  try {
    const d = new Date(iso);
    const weekday = d.toLocaleString("en-US", { weekday: "short" });      // Mon
    const day = d.getDate();                                              // 21
    const month = d.toLocaleString("en-US", { month: "long" });           // May
    const year = d.getFullYear();                                         // 2023
    let t = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    t = t.replace(" ", "").replace("AM", "am").replace("PM", "pm").replace(":", ".");
    return `${weekday}(${day}), ${month}, ${year} ${t}`;
  } catch {
    return iso;
  }
}
