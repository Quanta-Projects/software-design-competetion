import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Container, Button, Offcanvas, Alert } from "react-bootstrap";
import InspectionHeader from "../components/InspectionHeader";
import ThermalImageUploader from "../components/thermalImageUploader";

const JSON_CANDIDATES = [ 
  "/data/transformers_with_timestamps.json",  // fallback if you keep the plural
];

export default function UploadPage() {
  const location = useLocation();
  const transformerId = location.state?.transformerId; // sent from table

  const [record, setRecord] = useState(null);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        setError(null);
        let json = null;

        // try candidates in order
        for (const url of JSON_CANDIDATES) {
          try {
            const res = await fetch(url, { cache: "no-store" });
            if (res.ok) {
              json = await res.json();
              break;
            }
          } catch (_) {}
        }

        if (!json) throw new Error("Could not load transformer JSON.");

        const arr = Array.isArray(json) ? json : [json];
        const found =
          arr.find((x) => x.id === transformerId) ||
          arr.find((x) => x.no === transformerId); // fallback if you pass no

        if (!found) throw new Error(`Transformer not found for id: ${transformerId}`);

        if (isMounted) setRecord(found);
      } catch (e) {
        if (isMounted) setError(e.message || String(e));
      }
    };

    if (transformerId) load();
    else setError("No transformer selected.");

    return () => {
      isMounted = false;
    };
  }, [transformerId]);

  const createdPretty = useMemo(() => (record?.createdAt ? formatPretty(record.createdAt) : "—"), [record]);
  const updatedPretty = useMemo(() => (record?.updatedAt ? formatPretty(record.updatedAt) : "—"), [record]);

  const uploadToBackend = async (formData /*, { file, condition } */) => {
    // attach useful metadata for your backend
    if (record?.id) formData.append("transformerId", record.id);
    if (record?.no) formData.append("transformerNo", record.no);

    const res = await fetch("/api/images/thermal", {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
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
                inspectedBy={"A-110"}  // not in JSON; change if you store it
                status={{ text: "In progress", variant: "success" }}
              />
            </div>

            <div className="mt-3" style={{ maxWidth: 520 }}>
              <ThermalImageUploader onUpload={uploadToBackend} />
            </div>
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
