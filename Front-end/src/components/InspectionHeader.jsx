// InspectionHeader.jsx
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Dropdown, Stack, Badge } from "react-bootstrap";

// If you're using Bootstrap Icons, include the CDN in index.html <head>:
// <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css">

export default function InspectionHeader({
  id = "000123589",
  dateLabel = "Mon(21), May, 2023 12.55pm",
  lastUpdated = "Mon(21), May, 2023 12.55pm",
  status = { text: "In progress", variant: "success" },
  transformerNo = "AZ-8370",
  poleNo = "EN-122-A",
  branch = "Nugegoda",
  inspectedBy = "A-110",
  onBack = () => {},
  onViewBaseline = () => {},
  onDeleteBaseline = () => {},
  onOpenBaseline = () => {},
}) {
  
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/transformers');
  };

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
              <span className="fw-semibold fs-5 me-2">{id}</span>
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
            <small className="text-muted">{dateLabel}</small>
          </div>
        </Col>

        <Col md="auto" className="ms-auto">
          <Stack direction="horizontal" gap={2} className="justify-content-end">
            <small className="text-muted">Last updated: {lastUpdated}</small>
            <StatusPill text={status.text} variant={status.variant} />
          </Stack>
        </Col>
      </Row>

      {/* Bottom row: info chips + Baseline actions */}
      <Row className="align-items-center g-2 mt-3">
        <Col md="auto">
          <InfoChip value={transformerNo} label="Transformer No" />
        </Col>
        <Col md="auto">
          <InfoChip value={poleNo} label="Pole No" />
        </Col>
        <Col md="auto">
          <InfoChip value={branch} label="Branch" />
        </Col>
        <Col md="auto">
          <InfoChip value={inspectedBy} label="Inspected By" />
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
  // success | warning | secondary etc.
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
