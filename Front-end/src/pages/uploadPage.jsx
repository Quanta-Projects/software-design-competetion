// src/pages/uploadPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Container, Button, Offcanvas, Alert, Row, Col, Card, Badge } from "react-bootstrap";
import InspectionHeader from "../components/InspectionHeader";
import ThermalImageUploader from "../components/thermalImageUploader";
import { getApiUrl, getImageUrl } from "../utils/config";

const JSON_CANDIDATES = ["/data/transformers_with_timestamps.json", "/data/transformers.json"];
const API_BASE = import.meta?.env?.VITE_API_URL ?? "";

// Fixed preview frame config
const PREVIEW_MAX_WIDTH = 1100;
const PREVIEW_HEIGHT = 420;
const FRAME_RADIUS = 16;

// Synchronized zoom settings
const SYNC_ZOOM_SCALE = 2.2;

export default function UploadPage() {
  const location = useLocation();
  const transformerId = location.state?.transformerId;

  const [record, setRecord] = useState(null);
  const [images, setImages] = useState([]);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  // Upload UI
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [showUploader, setShowUploader] = useState(true);
  const [imageUrl, setImageUrl] = useState("");

  // NEW: simple metadata states
  const [baselineMeta, setBaselineMeta] = useState({ uploadedAt: "" });
  const [currentMeta, setCurrentMeta] = useState({ uploadedAt: "" });

  // Individual pan/zoom for CURRENT image (used when sync zoom is OFF)
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panRef = useRef({ startX: 0, startY: 0, startOffset: { x: 0, y: 0 } });

  // Synchronized zoom state
  const [syncZoomOn, setSyncZoomOn] = useState(false);
  const [isHoveringSync, setIsHoveringSync] = useState(false);
  const [hoverNorm, setHoverNorm] = useState({ x: 0.5, y: 0.5 });

  const xhrRef = useRef(null);
  const simTimerRef = useRef(null);
  const previewRevokeRef = useRef(null);

  // ---------- Load selected transformer ----------
  useEffect(() => {
    let on = true;
    (async () => {
      try {
        setError(null);
        let json = null;
        for (const url of JSON_CANDIDATES) {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (res.ok) { json = await res.json(); break; }
          } catch {}
        }
        if (!json) throw new Error("Could not load transformer JSON.");
        const arr = Array.isArray(json) ? json : [json];
        const found = arr.find((x) => x.id === transformerId) || arr.find((x) => x.no === transformerId);
        if (!found) throw new Error(`Transformer not found for id: ${transformerId}`);
        if (on) {
          setRecord(found);
          // try to hydrate baseline meta from whatever your JSON might contain
          const baselineTs =
            found?.baselineUploadedAt ||
            found?.baselineImage?.uploadedAt ||
            found?.baselineDate ||
            "";
          if (baselineTs) setBaselineMeta({ uploadedAt: baselineTs });
        }
      } catch (e) {
        if (on) setError(e.message || String(e));
      }
    })();

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
      on = false;
      clearInterval(simTimerRef.current);
      if (previewRevokeRef.current) { previewRevokeRef.current(); previewRevokeRef.current = null; }
    };
  }, [transformerId]);

  const createdPretty = useMemo(() => (record?.createdAt ? formatPretty(record.createdAt) : "—"), [record]);
  const updatedPretty = useMemo(() => (record?.updatedAt ? formatPretty(record.updatedAt) : "—"), [record]);

  // ---------- Helpers ----------
  const getFile = (payload) => {
    if (payload instanceof FormData) {
      for (const [, v] of payload.entries()) if (v instanceof File) return v;
    }
    if (payload instanceof File || payload?.constructor?.name === "File") return payload;
    if (payload?.file instanceof File) return payload.file;
    if (Array.isArray(payload?.files) && payload.files[0] instanceof File) return payload.files[0];
    return null;
  };

  const toFormData = (payload) => {
    if (payload instanceof FormData) return payload;
    const fd = new FormData();
    const f = getFile(payload);
    if (f) fd.append("file", f, f.name);
    if (payload && typeof payload === "object" && !(payload instanceof File)) {
      Object.entries(payload).forEach(([k, v]) => {
        if (k !== "file" && k !== "files") fd.append(k, String(v));
      });
    }
    return fd;
  };

  const resetPanZoom = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setPanning(false);
  };

  const resetToUploader = (message = "") => {
    try { xhrRef.current?.abort(); } catch {}
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    if (previewRevokeRef.current) { previewRevokeRef.current(); previewRevokeRef.current = null; }
    setUploading(false);
    setProgress(0);
    setStatusText(message);
    setImageUrl("");
    setShowUploader(true);
    resetPanZoom();
    setCurrentMeta({ uploadedAt: "" });
  };

  // ---------- Simulated upload ----------
  const simulateUpload = () =>
    new Promise((resolve) => {
      setUploading(true);
      setProgress(0);
      setStatusText("Thermal image is being uploaded and reviewed.");
      const start = Date.now();
      const duration = 1800 + Math.random() * 1200;
      simTimerRef.current = setInterval(() => {
        const t = Date.now() - start;
        const pct = Math.min(100, Math.round((t / duration) * 100));
        setProgress(pct);
        if (pct >= 100) {
          clearInterval(simTimerRef.current);
          resolve();
        }
      }, 60);
    });

  // ---------- Real upload (return url + uploadedAt if provided) ----------
  const realUpload = (fd) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhrRef.current = xhr;
      xhr.open("POST", `${API_BASE}/api/images/thermal`);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          let hostedUrl = "";
          let uploadedAt = "";
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            hostedUrl = json.url || json.fileUrl || json.location || "";
            uploadedAt = json.uploadedAt || json.createdAt || json.timestamp || "";
          } catch {}
          resolve({ url: hostedUrl || "", uploadedAt });
        } else {
          if (xhr.status === 404) {
            const err = new Error("Not Found");
            err.status = 404;
            reject(err); return;
          }
          let detail = "";
          try { detail = JSON.parse(xhr.responseText)?.error || ""; } catch { detail = xhr.responseText || ""; }
          reject(new Error(`Upload failed (${xhr.status})${detail ? ` – ${detail}` : ""}`));
        }
      };
      xhr.onerror = () => reject(new Error("Network error during upload."));
      xhr.onabort  = () => reject(new Error("Upload cancelled"));
      xhr.send(fd);
    });

  // ---------- onUpload ----------
  const uploadToBackend = async (payload) => {
    const file = getFile(payload);
    if (!file) throw new Error("No image file provided.");

    setShowUploader(false);

    if (previewRevokeRef.current) { previewRevokeRef.current(); previewRevokeRef.current = null; }
    const previewUrl = URL.createObjectURL(file);
    previewRevokeRef.current = () => URL.revokeObjectURL(previewUrl);

    setUploading(true);
    setProgress(0);
    setStatusText("Thermal image is being uploaded and reviewed.");

    const fd = toFormData(payload);
    if (record?.id) fd.append("transformerId", record.id);
    if (record?.no) fd.append("transformerNo", record.no);

    try {
      if (API_BASE) {
        const { url, uploadedAt } = await realUpload(fd);
        setImageUrl(url || previewUrl);
        setCurrentMeta({ uploadedAt: uploadedAt || new Date().toISOString() });
      } else {
        await simulateUpload();
        setImageUrl(previewUrl);
        setCurrentMeta({ uploadedAt: new Date().toISOString() });
      }

      setUploading(false);
      setProgress(100);
      setStatusText("Upload complete.");
      resetPanZoom();
    } catch (err) {
      resetToUploader(err.message || "Upload error");
       }
  };

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

  const handleCancel = () => {
    if (uploading) {
      resetToUploader("Upload cancelled.");
    } else if (imageUrl) {
      resetToUploader("");
    }
  };

  // ----- Pan/Zoom handlers (when sync zoom is OFF) -----
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
    if (syncZoomOn || !panning) return;
    const dx = e.clientX - panRef.current.startX;
    const dy = e.clientY - panRef.current.startY;
    setOffset({
      x: panRef.current.startOffset.x + dx,
      y: panRef.current.startOffset.y + dy,
    });
  };

  const endPan = () => setPanning(false);
  const onDoubleClick = () => { if (!syncZoomOn) resetPanZoom(); };

  // ----- Synchronized zoom handlers -----
  const onSyncEnter = () => { if (syncZoomOn) setIsHoveringSync(true); };
  const onSyncLeave = () => { setIsHoveringSync(false); };
  const onSyncMove = (e) => {
    if (!syncZoomOn) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width;
    const ny = (e.clientY - rect.top) / rect.height;
    setHoverNorm({ x: Math.min(1, Math.max(0, nx)), y: Math.min(1, Math.max(0, ny)) });
  };

  const currentFrameHandlers = syncZoomOn
    ? { onMouseEnter: onSyncEnter, onMouseLeave: onSyncLeave, onMouseMove: onSyncMove }
    : { onWheel: onWheelZoom, onMouseDown, onMouseMove, onMouseUp: endPan, onMouseLeave: endPan, onDoubleClick };

  const baselineFrameHandlers = { onMouseEnter: onSyncEnter, onMouseLeave: onSyncLeave, onMouseMove: onSyncMove };

  const syncZoomStyle = (enabled) =>
    enabled && isHoveringSync
      ? {
          transformOrigin: `${hoverNorm.x * 100}% ${hoverNorm.y * 100}%`,
          transform: `scale(${SYNC_ZOOM_SCALE})`,
          transition: "transform 80ms ease-out",
        }
      : { transform: "scale(1)", transition: "transform 120ms ease-out" };

  // Reusable meta overlay
  const MetaOverlay = ({ text, dark = true }) => (
    <>
      <div
        style={{
          position: "absolute",
          left: 0, right: 0, bottom: 0,
          height: 42,
          background: "linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0))",
          zIndex: 3,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0, right: 0, bottom: 8,
          textAlign: "center",
          fontSize: 12,
          color: "#fff",
          textShadow: "0 1px 2px rgba(0,0,0,.6)",
          zIndex: 4,
          pointerEvents: "none",
        }}
      >
        {text || "—"}
      </div>
    </>
  );

  // ---------- UI ----------
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


      <Container style={{ maxWidth: PREVIEW_MAX_WIDTH }}>

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
                status={{ text: uploading ? "Uploading…" : "In progress", variant: "success" }}
              />
            </div>

            {showUploader && !uploading && !imageUrl && (
              <div className="mt-3" style={{ maxWidth: 720 }}>
                <ThermalImageUploader onUpload={uploadToBackend} />
              </div>
            )}

            {uploading && (
              <div className="mt-4">
                <div className="p-4 rounded-4 shadow-sm" style={{ background: "white", border: "1px solid #eee" }}>
                  <h5 className="mb-3">Thermal Image</h5>

                  <div className="text-center mb-3">
                    <div className="fw-semibold">Thermal image uploading.</div>
                    <div className="text-muted small">Thermal image is being uploaded and Reviewed.</div>
                  </div>

                  <div className="position-relative" style={{ height: 10, borderRadius: 8, background: "#e9ecef" }}>
                    <div
                      style={{
                        width: `${progress}%`,
                        height: "100%",
                        borderRadius: 8,
                        background: "#3b34d5",
                        transition: "width 120ms linear",
                      }}
                    />
                    <div className="position-absolute top-50 end-0 translate-middle-y pe-2 small text-muted">
                      {progress}%
                    </div>
                  </div>

                  <div className="d-flex justify-content-center mt-3">
                    <Button variant="light" className="px-4" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {imageUrl && !uploading && (
              <div className="mt-4">
                <div
                  className="p-4 rounded-4 shadow-sm position-relative"
                  style={{ background: "#fff", border: "1px solid #eee" }}
                >
                  <h5 className="mb-4">Thermal Image Comparison</h5>

                  {/* Zoom toggle button */}
                  <Button
                    size="sm"
                    variant={syncZoomOn ? "primary" : "light"}
                    onClick={() => setSyncZoomOn((v) => !v)}
                    className="position-absolute top-0 end-0 m-3 d-flex align-items-center gap-1"
                    aria-pressed={syncZoomOn}
                    title={syncZoomOn ? "Disable synchronized zoom" : "Enable synchronized zoom"}
                  >
                    <i className={`bi ${syncZoomOn ? "bi-zoom-out" : "bi-zoom-in"}`} />
                    Zoom
                  </Button>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    {/* Baseline (single frame) */}
                    <div
                      {...baselineFrameHandlers}
                      style={{
                        position: "relative",
                        width: "100%",
                        height: PREVIEW_HEIGHT,
                        border: "1px solid #eef0f3",
                        borderRadius: FRAME_RADIUS,
                        overflow: "hidden",
                        cursor: syncZoomOn && isHoveringSync ? "zoom-in" : "default",
                        background: "#0A2D9C",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          padding: "4px 10px",
                          fontSize: 12,
                          background: "rgba(108,117,125,0.95)",
                          color: "#fff",
                          borderRadius: 999,
                          zIndex: 2,
                        }}
                      >
                        Baseline
                      </span>

                      {/* Surface for sync zoom (just the placeholder) */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          ...syncZoomStyle(syncZoomOn),
                        }}
                      >
                        <div
                          style={{
                            width: "40%",
                            height: "40%",
                            border: "2px dashed rgba(255,255,255,0.35)",
                            borderRadius: 12,
                          }}
                        />
                      </div>

                      {/* Metadata overlay */}
                      <MetaOverlay text={formatUpload(currentOr(baselineMeta.uploadedAt))} />
                    </div>

                    {/* Current (single frame) */}
                    <div
                      {...currentFrameHandlers}
                      style={{
                        position: "relative",
                        width: "100%",
                        height: PREVIEW_HEIGHT,
                        border: "1px solid #eef0f3",
                        borderRadius: FRAME_RADIUS,
                        overflow: "hidden",
                        cursor: syncZoomOn
                          ? (isHoveringSync ? "zoom-in" : "default")
                          : (panning ? "grabbing" : zoom > 1 ? "grab" : "default"),
                        userSelect: "none",
                        background: "#fff",
                      }}
                      title={
                        syncZoomOn
                          ? "Move to zoom both images; click Zoom to turn off"
                          : "Scroll to zoom, drag to pan (when zoomed), double-click to reset"
                      }
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 12,
                          left: 12,
                          padding: "4px 10px",
                          fontSize: 12,
                          background: "rgba(59,52,213,0.95)",
                          color: "#fff",
                          borderRadius: 999,
                          zIndex: 2,
                        }}
                      >
                        Current
                      </span>

                      {/* Scaled surface with image */}
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          ...syncZoomStyle(syncZoomOn),
                        }}
                      >
                        <img
                          src={imageUrl}
                          alt="Current thermal"
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
                      </div>

                      {/* Metadata overlay */}
                      <MetaOverlay text={formatUpload(currentOr(currentMeta.uploadedAt))} />
                    </div>
                  </div>

                  <div className="d-flex justify-content-center mt-3">
                    <Button variant="light" className="px-4" onClick={handleCancel}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
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

/* Pretty date formatter for header (unchanged) */
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

/* Compact timestamp for image metadata like 5/7/2025 8:34:21 PM */
function formatUpload(iso) {
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

// Helper: if empty/undefined, return empty string to avoid "Invalid Date"
function currentOr(v) { return v ? v : ""; }
