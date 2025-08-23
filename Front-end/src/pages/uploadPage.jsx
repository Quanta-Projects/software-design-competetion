// src/pages/uploadPage.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Container, Button, Offcanvas, Alert } from "react-bootstrap";
import InspectionHeader from "../components/InspectionHeader";
import ThermalImageUploader from "../components/thermalImageUploader";

const JSON_CANDIDATES = ["/data/transformers_with_timestamps.json", "/data/transformers.json"];
// If you have a backend (e.g., http://localhost:8080), set VITE_API_URL in .env
const API_BASE = import.meta?.env?.VITE_API_URL ?? "";

// --- Fixed preview frame config (adjust as you like) ---
const PREVIEW_MAX_WIDTH = 1100; // card width
const PREVIEW_HEIGHT = 420;     // fixed height of each image viewport
const FRAME_PADDING = 18;       // inner padding that acts as the “border margin”
const FRAME_RADIUS = 16;

export default function UploadPage() {
  const location = useLocation();
  const transformerId = location.state?.transformerId;

  const [record, setRecord] = useState(null);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  // Upload UI
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [showUploader, setShowUploader] = useState(true);
  const [imageUrl, setImageUrl] = useState(""); // preview after success

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
        if (on) setRecord(found);
      } catch (e) {
        if (on) setError(e.message || String(e));
      }
    })();
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
    if (f) fd.append("file", f, f.name); // change key if backend expects different
    if (payload && typeof payload === "object" && !(payload instanceof File)) {
      Object.entries(payload).forEach(([k, v]) => {
        if (k !== "file" && k !== "files") fd.append(k, String(v));
      });
    }
    return fd;
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
  };

  // ---------- Simulated upload (no backend) ----------
  const simulateUpload = () =>
    new Promise((resolve) => {
      setUploading(true);
      setProgress(0);
      setStatusText("Thermal image is being uploaded and reviewed.");
      const start = Date.now();
      const duration = 1800 + Math.random() * 1200; // 1.8–3.0s
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

  // ---------- Real upload (with progress) ----------
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
          try {
            const json = JSON.parse(xhr.responseText || "{}");
            hostedUrl = json.url || json.fileUrl || json.location || "";
          } catch {}
          resolve(hostedUrl || "");
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

  // ---------- onUpload from ThermalImageUploader ----------
  const uploadToBackend = async (payload) => {
    const file = getFile(payload);
    if (!file) throw new Error("No image file provided.");

    // Hide uploader immediately after selection
    setShowUploader(false);

    // Prepare a local preview URL (revealed on success)
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
      let hosted = "";
      if (API_BASE) hosted = await realUpload(fd);
      else await simulateUpload();

      setUploading(false);
      setProgress(100);
      setStatusText("Upload complete.");
      setImageUrl(hosted || previewUrl);
    } catch (err) {
      resetToUploader(err.message || "Upload error");
    }
  };

  // Cancel button:
  const handleCancel = () => {
    if (uploading) {
      resetToUploader("Upload cancelled.");
    } else if (imageUrl) {
      resetToUploader("");
    }
  };

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
        {error && <Alert variant="danger" className="mt-3">{error}</Alert>}

        {record && (
          <>
            <div className="mt-3">
              <InspectionHeader
                id={record.id}
                dateLabel={createdPretty}
                lastUpdated={updatedPretty}
                transformerNo={record.no}
                poleNo={record.pole}
                branch={record.region}
                inspectedBy={"A-110"}
                status={{ text: uploading ? "Uploading…" : "In progress", variant: "success" }}
              />
            </div>

            {/* Uploader (only when idle and no preview) */}
            {showUploader && !uploading && !imageUrl && (
              <div className="mt-3" style={{ maxWidth: 720 }}>
                <ThermalImageUploader onUpload={uploadToBackend} />
              </div>
            )}

            {/* Progress card — ONLY while actively uploading */}
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

            {/* Comparison view after success: ENTIRE block inside a single white card */}
            {imageUrl && !uploading && (
              <div className="mt-4">
                <div
                  className="p-4 rounded-4 shadow-sm"
                  style={{ background: "#fff", border: "1px solid #eee" }}
                >
                  <h5 className="mb-4">Thermal Image Comparison</h5>

                  {/* Two equal columns with fixed-height viewports */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 24,
                    }}
                  >
                    {/* Baseline frame (empty for now) */}
                    <div
                      style={{
                        padding: FRAME_PADDING,
                        borderRadius: FRAME_RADIUS,
                        background: "#fff",
                        border: "1px solid #eef0f3",
                        height: PREVIEW_HEIGHT + FRAME_PADDING * 2,
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: PREVIEW_HEIGHT,
                          background: "#0A2D9C", // keep blue only for empty baseline
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
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
                          }}
                        >
                          Baseline
                        </span>

                        <div
                          style={{
                            width: "50%",
                            height: "50%",
                            border: "2px dashed rgba(255,255,255,0.35)",
                            borderRadius: 12,
                            background: "transparent",
                          }}
                        />
                      </div>
                    </div>

                    {/* Current (uploaded) frame */}
                    <div
                      style={{
                        padding: FRAME_PADDING,
                        borderRadius: FRAME_RADIUS,
                        background: "#fff",
                        border: "1px solid #eef0f3",
                        height: PREVIEW_HEIGHT + FRAME_PADDING * 2,
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: "100%",
                          height: PREVIEW_HEIGHT,
                          // IMPORTANT: no blue background when an image exists
                          background: imageUrl ? "transparent" : "#0A2D9C",
                          borderRadius: 12,
                          overflow: "hidden",
                        }}
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
                            zIndex: 1,
                          }}
                        >
                          Current
                        </span>

                        {/* Fill the whole viewport and avoid letterboxing */}
                        <img
                          src={imageUrl}
                          alt="Current thermal"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",        // <-- fills the frame (may crop a little)
                            objectPosition: "center",
                            display: "block",
                          }}
                        />
                      </div>
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

/* Pretty date formatter */
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
