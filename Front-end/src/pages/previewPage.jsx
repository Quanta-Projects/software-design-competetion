import { useEffect, useMemo, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Button, Offcanvas, Alert, Card } from "react-bootstrap";
import InspectionHeader from "../components/InspectionHeader";
import { getApiUrl, getImageUrl } from "../utils/config";

const PREVIEW_HEIGHT = 420;
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
}) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const panRef = useRef({ startX: 0, startY: 0, startOffset: { x: 0, y: 0 } });

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

      {/* Metadata overlay */}
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
        {metaText || "—"}
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

  // zoom state
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
    let on = true;

    (async () => {
      if (!transformerId) { setError("No transformer selected."); setLoading(false); return; }
      try {
        setError(null);
        setLoading(true);
        const [transformerRes, imagesRes] = await Promise.all([
          fetch(getApiUrl(`transformers/${transformerId}`)),
          fetch(getApiUrl(`images/transformer/${transformerId}`)),
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

  const comparisonSources = (() => {
    if (!images.length) return { baseline: null, current: null };
    if (uploadedImage) {
      const type = (uploadedImage.imageType || "").toUpperCase();
      if (type === "BASELINE") {
        return { baseline: uploadedImage, current: findLatestByType("MAINTENANCE") };
      }
      return { baseline: findLatestByType("BASELINE"), current: uploadedImage };
    }
    return { baseline: findLatestByType("BASELINE"), current: findLatestByType("MAINTENANCE") };
  })();

  const baselineMeta = formatUpload(getUploadedAt(comparisonSources.baseline));
  const currentMeta  = formatUpload(getUploadedAt(comparisonSources.current));

  const goBackToUploads = () => {
    const state = { transformerId };
    if (inspectionId) {
      state.inspectionId = inspectionId;
    }
    navigate("/upload", { state });
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
              />
            </div>

            <Card className="mt-4">
              <Card.Body className="position-relative">
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

                <div className="d-flex justify-content-center mt-3">
                  <Button variant="light" className="px-4" onClick={goBackToUploads}>
                    Back to uploads
                  </Button>
                </div>
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
