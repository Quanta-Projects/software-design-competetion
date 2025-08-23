import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Row, Col, Button, Dropdown, Stack, Badge } from "react-bootstrap";

export default function InspectionHeader({
  // existing defaults (used as fallback if JSON missing)
  id: idProp = "000123589",
  dateLabel: dateLabelProp = "Mon(21), May, 2023 12.55pm",
  lastUpdated: lastUpdatedProp = "Mon(21), May, 2023 12.55pm",
  status = { text: "In progress", variant: "success" },
  transformerNo: transformerNoProp = "AZ-8370",
  poleNo: poleNoProp = "EN-122-A",
  branch: branchProp = "Nugegoda",
  inspectedBy = "A-110",
  onViewBaseline = () => {},
  onDeleteBaseline = () => {},
  onOpenBaseline = () => {},
}) {
  const navigate = useNavigate();
  const [rec, setRec] = useState(null);

  useEffect(() => {
    // Try singular filename first, then plural as a fallback
    const load = async () => {
      let json = null;

      try {
        let res2 = await fetch("/transformers_with_timestamps.json", { cache: "no-store" });
        if (res2.ok) json = await res2.json();
      } catch (_) {}

      if (!json) return; // keep using prop fallbacks

      const obj = Array.isArray(json) ? json[0] : json;

      // Expecting fields like:
      // { id, no, pole, region, type, createdAt, updatedAt }
      setRec({
        id: obj?.id ?? null,
        transformerNo: obj?.no ?? null,
        poleNo: obj?.pole ?? null,
        branch: obj?.region ?? null,
        createdAt: obj?.createdAt ?? null,
        updatedAt: obj?.updatedAt ?? null,
      });
    };

    load();
  }, []);

  const handleBack = () => navigate("/transformers");

  // Derive display values (JSON first, then props)
  const displayId = rec?.id ?? idProp;
  const displayTransformerNo = rec?.transformerNo ?? transformerNoProp;
  const displayPoleNo = rec?.poleNo ?? poleNoProp;
  const displayBranch = rec?.branch ?? branchProp;

  const displayCreated = rec?.createdAt ? formatPretty(rec.createdAt) : dateLabelProp;
  const displayUpdated = rec?.updatedAt ? formatPretty(rec.updatedAt) : lastUpdatedProp;

  return (
    <Card className="border-0 shadow-sm rounded-4 p-3 bg-white">
      {/* Top row: Back, ID + date, menu, last updated + status */}
      <Row className="align-items-center g-2">
        <Col md="auto" className="d-flex">
          <Button
            onClick={handleBack}
            variant="light"
            className="rounded-circle p-0 d-flex align-items-center justify-content-center back-btn"
            style={{ width: 40, height: 40 }}
            aria-label="Back"
          >
            <i className="bi bi-chevron-left fs-5" />
          </Button>
        </Col>

        <Col className="d-flex align-items-center">
          <div>
            <div className="d-flex align-items-center">
              <span className="fw-semibold fs-5 me-2">{displayId}</span>
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="link"
                  className="p-0 text-muted"
                  bsPrefix="btn"
                  aria-label="More options"
                >
                  <i className="bi bi-three-dots-vertical" />
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item>Rename</Dropdown.Item>
                  <Dropdown.Item>Duplicate</Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item className="text-danger">Delete</Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div>
            <small className="text-muted">{displayCreated}</small>
          </div>
        </Col>

        <Col md="auto" className="ms-auto">
          <Stack direction="horizontal" gap={2} className="justify-content-end">
            <small className="text-muted">Last updated: {displayUpdated}</small>
            <StatusPill text={status.text} variant={status.variant} />
          </Stack>
        </Col>
      </Row>

      {/* Bottom row: info chips + Baseline actions */}
      <Row className="align-items-center g-2 mt-3">
        <Col md="auto">
          <InfoChip value={displayTransformerNo} label="Transformer No" />
        </Col>
        <Col md="auto">
          <InfoChip value={displayPoleNo} label="Pole No" />
        </Col>
        <Col md="auto">
          <InfoChip value={displayBranch} label="Branch" />
        </Col>
        <Col md="auto">
          <InfoChip value={"—"} label="Inspected By" />
        </Col>

        <Col md="auto" className="ms-auto">
          <Stack direction="horizontal" gap={2}>
            <Button
              variant="light"
              className="rounded-4 d-flex align-items-center soft-chip"
              onClick={onOpenBaseline}
            >
              <i className="bi bi-image me-2" />
              <span>Baseline Image</span>
            </Button>

            <Button
              variant="light"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center soft-icon"
              style={{ width: 40, height: 40 }}
              onClick={onViewBaseline}
              aria-label="View"
            >
              <i className="bi bi-eye" />
            </Button>

            <Button
              variant="light"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center soft-icon text-danger"
              style={{ width: 40, height: 40 }}
              onClick={onDeleteBaseline}
              aria-label="Delete"
            >
              <i className="bi bi-trash" />
            </Button>
          </Stack>
        </Col>
      </Row>
    </Card>
  );
}

/* ===== Helper subcomponents ===== */

function InfoChip({ value, label }) {
  return (
    <div className="px-3 py-2 rounded-4 soft-chip">
      <div className="fw-semibold">{value}</div>
      <div className="text-muted" style={{ fontSize: 12 }}>
        {label}
      </div>
    </div>
  );
}

function StatusPill({ text, variant = "success" }) {
  const map = {
    success: { bg: "bg-success-subtle", fg: "text-success-emphasis" },
    warning: { bg: "bg-warning-subtle", fg: "text-warning-emphasis" },
    secondary: { bg: "bg-secondary-subtle", fg: "text-secondary-emphasis" },
    info: { bg: "bg-info-subtle", fg: "text-info-emphasis" },
    danger: { bg: "bg-danger-subtle", fg: "text-danger-emphasis" },
  };
  const c = map[variant] || map.success;

  return (
    <Badge className={`px-3 py-2 rounded-pill ${c.bg} ${c.fg} fw-medium`}>
      <i className="bi bi-check-circle me-2" />
      {text}
    </Badge>
  );
}

/* Pretty date like: Mon(21), May, 2023 12.55pm */
function formatPretty(iso) {
  try {
    const d = new Date(iso);
    const weekday = d.toLocaleString("en-US", { weekday: "short" });      // Mon
    const day = d.getDate();                                              // 21
    const month = d.toLocaleString("en-US", { month: "long" });           // May
    const year = d.getFullYear();                                         // 2023
    let t = d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    t = t.replace(" ", "").replace("AM", "am").replace("PM", "pm").replace(":", "."); // 12.55pm
    return `${weekday}(${day}), ${month}, ${year} ${t}`;
  } catch {
    return iso;
  }
}
