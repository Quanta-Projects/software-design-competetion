import { useEffect, useMemo, useRef, useState } from "react";
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

  // Progress view state
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const xhrRef = useRef(null);

  // NEW: show preview of just-uploaded image
  const [previewImage, setPreviewImage] = useState(null); // object returned by backend

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

        const [transformerRes, imagesRes] = await Promise.all([
          fetch(getApiUrl(`transformers/${transformerId}`)),
          fetch(getApiUrl(`images/transformer/${transformerId}`)),
        ]);

        if (!transformerRes.ok) throw new Error(`Failed to load transformer: ${transformerRes.status}`);
        if (!imagesRes.ok) throw new Error(`Failed to load images: ${imagesRes.status}`);

        const [transformerData, imagesData] = await Promise.all([
          transformerRes.json(),
          imagesRes.json(),
        ]);

        if (isMounted) {
          setRecord(transformerData);
          setImages(imagesData);
        }
      } catch (e) {
        if (isMounted) setError(e.message || String(e));
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadTransformerAndImages();

    return () => {
      isMounted = false;
      try { xhrRef.current?.abort(); } catch {}
    };
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

  // ---------------------------
  // Upload (fire-and-forget, with real abort using XHR)
  // ---------------------------
  const uploadToBackend = (formData) => {
    // ensure required fields (same behavior as before)
    if (transformerId && !formData.has("transformerId")) formData.append("transformerId", transformerId);
    if (!formData.has("envCondition")) formData.append("envCondition", "SUNNY");
    if (!formData.has("imageType")) formData.append("imageType", "BASELINE");

    // next tick so the uploader can clear its <input> safely before unmount
    setTimeout(() => {
      setIsUploading(true);
      setProgress(0);
      setError(null);
      setPreviewImage(null); // clear any prior preview

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.open("POST", getApiUrl("images/upload"));

      // progress (% at the top-right)
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(Math.min(100, Math.max(0, pct)));
        }
      };

      xhr.onload = async () => {
        // stop the bar where it landed
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100);

          // Parse the server's response (try to get the image record)
          let uploaded = null;
          try { uploaded = JSON.parse(xhr.responseText || "{}"); } catch {}

          // Refresh list (so counts are accurate)
          try {
            const imagesRes = await fetch(getApiUrl(`images/transformer/${transformerId}`));
            if (imagesRes.ok) {
              const newImages = await imagesRes.json();
              setImages(newImages);
              // If server didn't return the full record, fall back to
              // "latest by created time" from refreshed list.
              if (!uploaded || !uploaded.filePath) {
                const latest = [...newImages].sort((a, b) => {
                  const ta = new Date(a.uploadDate || a.createdAt || 0).getTime();
                  const tb = new Date(b.uploadDate || b.createdAt || 0).getTime();
                  return tb - ta;
                })[0];
                uploaded = latest || uploaded;
              }
            }
          } catch {
            // ignore refresh failure for preview; we still try to show uploaded
          }

          // Show preview
          setPreviewImage(uploaded || null);
        } else {
          let msg = `Upload failed (${xhr.status})`;
          try {
            const t = xhr.responseText || "";
            if (t) msg += `: ${t}`;
          } catch {}
          alert(msg);
        }

        // Stop progress mode (but we might be in preview)
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
        // aborted by user → stay canceled; do not refresh list or show preview
        setIsUploading(false);
        setProgress(0);
        xhrRef.current = null;
      };

      xhr.send(formData);
    }, 0);

    // return immediately so the child can clear its input
    return Promise.resolve();
  };

  const handleCancelUpload = () => {
    try { xhrRef.current?.abort(); } catch {}
  };

  // PREVIEW: leave preview and go back to normal page layout
  const handleClosePreview = () => {
    setPreviewImage(null);
  };

  const handleImageDelete = async (imageId) => {
    if (!window.confirm("Are you sure you want to delete this image?")) return;
    try {
      const res = await fetch(getApiUrl(`images/${imageId}`), { method: "DELETE" });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
      } else {
        throw new Error(`Failed to delete image: ${res.status}`);
      }
    } catch (error) {
      alert("Error deleting image: " + error.message);
    }
  };

  // Baseline image handlers
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

  // helper to resolve the preview URL regardless of server field naming
  const resolveImageUrl = (img) => {
    if (!img) return "";
    const p = img.filePath || img.path || img.url || img.fileUrl;
    return p ? (String(p).startsWith("http") ? p : getImageUrl(p)) : "";
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

      <Container style={{ maxWidth: 1100 }}>
        {loading && <Alert variant="info" className="mt-3">Loading transformer data...</Alert>}
        {error && !isUploading && !previewImage && <Alert variant="danger" className="mt-3">{error}</Alert>}

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
                status={{ text: isUploading ? "Uploading…" : "In progress", variant: "success" }}
                onViewBaseline={handleViewBaseline}
                onDeleteBaseline={handleDeleteBaseline}
                onOpenBaseline={handleOpenBaseline}
              />
            </div>

            {/* 1) Uploading */}
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

                  <div className="mx-auto" style={{ maxWidth: 800 }}>
                    <div className="position-relative mb-2">
                      <div className="progress" style={{ height: 10, borderRadius: 999 }}>
                        <div
                          className="progress-bar"
                          role="progressbar"
                          style={{ width: `${progress}%` }}
                          aria-valuenow={progress}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        />
                      </div>
                      <div
                        className="position-absolute"
                        style={{ top: -22, right: 0, fontWeight: 600, fontSize: 12 }}
                      >
                        {progress}%
                      </div>
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

            {/* 2) Preview just-uploaded image */}
            {!isUploading && previewImage && (
              <Card className="mt-4">
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Preview</h5>
                  <Button variant="outline-secondary" size="sm" onClick={handleClosePreview}>
                    Back to uploads
                  </Button>
                </Card.Header>
                <Card.Body>
                  <div className="text-muted small mb-3">
                    {previewImage.fileName || "New image"} •{" "}
                    {(previewImage.imageType || "—").toString()} •{" "}
                    {(previewImage.envCondition || "—").toString()}
                  </div>
                  <div className="border rounded p-2 d-flex justify-content-center" style={{ background: "#f8f9fa" }}>
                    {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
                    <img
                      src={resolveImageUrl(previewImage)}
                      alt="Uploaded image preview"
                      style={{ maxWidth: "100%", maxHeight: 520, objectFit: "contain" }}
                    />
                  </div>

                  <div className="d-flex justify-content-center mt-3">
                    <Button variant="light" className="px-4" onClick={handleClosePreview}>
                      Back to uploads
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* 3) Normal two-column page */}
            {!isUploading && !previewImage && (
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
                                    alt={image.fileName || "Uploaded image"}
                                    className="img-fluid"
                                    style={{ maxHeight: "200px", objectFit: "contain" }}
                                    onError={(e) => {
                                      e.target.style.display = "none";
                                      e.target.nextSibling.style.display = "block";
                                    }}
                                  />
                                  <div style={{ display: "none" }} className="text-muted">
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

/* Same pretty-date formatter used in the header mock */
function formatPretty(iso) {
  try {
    const d = new Date(iso);
    const weekday = d.toLocaleString("en-US", { weekday: "short" }); // Mon
    const day = d.getDate();                                         // 21
    const month = d.toLocaleString("en-US", { month: "long" });      // May
    const year = d.getFullYear();                                    // 2023
    let t = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    t = t.replace(" ", "").replace("AM", "am").replace("PM", "pm").replace(":", ".");
    return `${weekday}(${day}), ${month}, ${year} ${t}`;
  } catch {
    return iso;
  }
}
