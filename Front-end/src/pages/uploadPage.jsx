import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Container, Button, Offcanvas, Alert, Row, Col, Card, Badge } from "react-bootstrap";
import InspectionHeader from "../components/InspectionHeader";
import ThermalImageUploader from "../components/thermalImageUploader";
import { getApiUrl, getImageUrl } from "../utils/config";

const PREVIEW_HEIGHT = 420;        // fixed frame height
const FRAME_RADIUS = 16;
const SYNC_ZOOM_SCALE = 2.2;       // zoom factor when Zoom mode is ON

/** Fixed-size frame:
 *  - objectFit: 'contain' (no cropping)
 *  - Normal mode: wheel zoom + drag pan
 *  - Zoom mode (from parent): cursor-hover magnifies around pointer
 *  - Bottom metadata overlay (upload date/time)
 */
function PanZoomContainFrame({
  src,
  label,
  metaText = "",
  badgeColor = "rgba(108,117,125,0.95)",
  // sync-zoom props from parent
  syncZoomOn,
  isHoveringSync,
  onSyncEnter,
  onSyncLeave,
  onSyncMove,
  syncStyle,
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panRef = useRef({ startX: 0, startY: 0, startOffset: { x: 0, y: 0 } });

  // --- Normal (independent) pan/zoom handlers ---
  const onWheelZoom = (e) => {
    if (syncZoomOn) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(6, Math.max(1, z * factor)));
  };

  const onMouseDown = (e) => {
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
  const onDoubleClick = () => { if (!syncZoomOn) { setZoom(1); setOffset({ x: 0, y: 0 }); } };

  const frameHandlers = syncZoomOn
    ? { onMouseEnter: onSyncEnter, onMouseLeave: onSyncLeave, onMouseMove }
    : { onWheel: onWheelZoom, onMouseDown, onMouseMove, onMouseUp: endPan, onMouseLeave: endPan, onDoubleClick };

  return (
    <div
      {...frameHandlers}
      style={{
        position: "relative",
        width: "100%",
        height: PREVIEW_HEIGHT,
        border: "1px solid #eef0f3",
        borderRadius: FRAME_RADIUS,
        overflow: "hidden",
        background: "#fff",
        userSelect: "none",
        cursor: syncZoomOn
          ? (isHoveringSync ? "zoom-in" : "default")
          : (panning ? "grabbing" : zoom > 1 ? "grab" : "default"),
      }}
      title={
        syncZoomOn
          ? "Move the mouse to zoom around the cursor • Click Zoom to turn off"
          : "Scroll to zoom, drag to pan (when zoomed), double-click to reset"
      }
    >
      {/* Label pill */}
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

      {/* Scaled surface containing the image */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          ...(syncStyle || {}),
        }}
      >
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
              transform: syncZoomOn
                ? undefined
                : `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
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

      {/* Metadata overlay (bottom-center) */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 42,
          background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 8,
          textAlign: "center",
          fontSize: 12,
          color: "#fff",
          textShadow: "0 1px 2px rgba(0,0,0,.6)",
          zIndex: 4,
          pointerEvents: "none",
        }}
      >
        {metaText || "—"}
      </div>
    </div>
  );
}

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

  // Show preview of just-uploaded image (object returned by backend or resolved from refresh)
  const [previewImage, setPreviewImage] = useState(null);

  // --- Zoom toggle & synchronized hover state (shared by both frames) ---
  const [syncZoomOn, setSyncZoomOn] = useState(false);
  const [isHoveringSync, setIsHoveringSync] = useState(false);
  const [hoverNorm, setHoverNorm] = useState({ x: 0.5, y: 0.5 });

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
    if (transformerId && !formData.has("transformerId")) formData.append("transformerId", transformerId);
    if (!formData.has("envCondition")) formData.append("envCondition", "SUNNY");
    if (!formData.has("imageType")) formData.append("imageType", "BASELINE");

    setTimeout(() => {
      setIsUploading(true);
      setProgress(0);
      setError(null);
      setPreviewImage(null); // clear any prior preview

      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;

      xhr.open("POST", getApiUrl("images/upload"));

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(Math.min(100, Math.max(0, pct)));
        }
      };

      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setProgress(100);

          let uploaded = null;
          try { uploaded = JSON.parse(xhr.responseText || "{}"); } catch {}

          try {
            const imagesRes = await fetch(getApiUrl(`images/transformer/${transformerId}`));
            if (imagesRes.ok) {
              const newImages = await imagesRes.json();
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
          } catch {}

          setPreviewImage(uploaded || null);
        } else {
          let msg = `Upload failed (${xhr.status})`;
          try { const t = xhr.responseText || ""; if (t) msg += `: ${t}`; } catch {}
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

  // helpers
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

  // Compute the two preview sources based on uploaded image type
  const comparisonSources = (() => {
    if (!previewImage) return { baseline: null, current: null };
    const type = (previewImage.imageType || "").toUpperCase();
    if (type === "BASELINE") {
      return { baseline: previewImage, current: findLatestByType("MAINTENANCE") };
    }
    // treat anything else as “current/maintenance”
    return { baseline: findLatestByType("BASELINE"), current: previewImage };
  })();

  const baselineMeta = formatUpload(getUploadedAt(comparisonSources.baseline));
  const currentMeta  = formatUpload(getUploadedAt(comparisonSources.current));

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

            {/* 2) Thermal Image Comparison preview (NO separate header; title + Zoom inside component) */}
            {!isUploading && previewImage && (
              <Card className="mt-4">
                <Card.Body className="position-relative">
                  {/* Top inline bar inside the preview component */}
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Thermal Image Comparison</h5>
                    <Button
                      size="sm"
                      variant={syncZoomOn ? "primary" : "outline-secondary"}
                      onClick={() => setSyncZoomOn((v) => !v)}
                      className="d-flex align-items-center gap-1"
                      aria-pressed={syncZoomOn}
                      title={syncZoomOn ? "Disable synchronized Zoom" : "Enable synchronized Zoom"}
                    >
                      <i className={`bi ${syncZoomOn ? "bi-zoom-out" : "bi-zoom-in"}`} />
                      Zoom
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
                    />
                    <PanZoomContainFrame
                      src={resolveImageUrl(comparisonSources.current)}
                      label="Current"
                      metaText={currentMeta}
                      badgeColor="rgba(59,52,213,0.95)"
                      syncZoomOn={syncZoomOn}
                      isHoveringSync={isHoveringSync}
                      onSyncEnter={onSyncEnter}
                      onSyncLeave={onSyncLeave}
                      onSyncMove={onSyncMove}
                      syncStyle={syncZoomStyle(syncZoomOn)}
                    />
                  </div>

                  {/* Bottom action row with Back to uploads only */}
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
