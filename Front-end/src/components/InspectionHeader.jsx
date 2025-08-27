import { useNavigate } from "react-router-dom";
import { Card, Row, Col, Button, Dropdown, Stack, Badge } from "react-bootstrap";
import { getApiUrl } from "../utils/config";

export default function InspectionHeader({
  // Props from parent component (uploadPage.jsx)
  id,
  dateLabel = "—",
  lastUpdated = "—",
  status = { text: "In progress", variant: "success" },
  transformerNo = "—",
  poleNo = "—", 
  branch = "—",
  inspectedBy = "A-110",
  onViewBaseline = () => {},
  onDeleteBaseline = () => {},
  onOpenBaseline = () => {},
  onBack, // New prop for custom back navigation
}) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate("/transformers"); // Default behavior
    }
  };

  const handleRename = async () => {
    const newName = prompt("Enter new transformer number:", transformerNo);
    if (newName && newName.trim() && newName !== transformerNo) {
      try {
        const response = await fetch(getApiUrl(`transformers/${id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transformerNo: newName.trim(),
            // Keep other fields the same - you'd need to pass more props if you want to update them
          }),
        });

        if (response.ok) {
          alert('Transformer renamed successfully!');
          // Optionally refresh the page or update the UI
          window.location.reload();
        } else {
          throw new Error(`Failed to rename: ${response.status}`);
        }
      } catch (error) {
        alert('Error renaming transformer: ' + error.message);
      }
    }
  };

  const handleDuplicate = () => {
    // For now, just show a message - this would require backend support
    alert('Duplicate functionality coming soon!');
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete transformer ${transformerNo}? This action cannot be undone.`)) {
      try {
        const response = await fetch(getApiUrl(`transformers/${id}`), {
          method: 'DELETE',
        });

        if (response.ok) {
          alert('Transformer deleted successfully!');
          navigate("/transformers");
        } else {
          throw new Error(`Failed to delete: ${response.status}`);
        }
      } catch (error) {
        alert('Error deleting transformer: ' + error.message);
      }
    }
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
            aria-label="Back to transformers"
          >
            <i className="bi bi-chevron-left fs-5" />
          </Button>
        </Col>

        <Col className="d-flex align-items-center">
          <div>
            <div className="d-flex align-items-center">
              <span className="fw-semibold fs-5 me-2">{transformerNo || "—"}</span>
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
                  <Dropdown.Item onClick={handleRename}>
                    <i className="bi bi-pencil me-2" />
                    Rename
                  </Dropdown.Item>
                  <Dropdown.Item onClick={handleDuplicate}>
                    <i className="bi bi-copy me-2" />
                    Duplicate
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item className="text-danger" onClick={handleDelete}>
                    <i className="bi bi-trash me-2" />
                    Delete
                  </Dropdown.Item>
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
          <InfoChip value={branch} label="Region" />
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
              title="Open baseline image"
            >
              <i className="bi bi-image me-2" />
              <span>Baseline Image</span>
            </Button>

            <Button
              variant="light"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center soft-icon"
              style={{ width: 40, height: 40 }}
              onClick={onViewBaseline}
              aria-label="View baseline image"
              title="View baseline image"
            >
              <i className="bi bi-eye" />
            </Button>

            <Button
              variant="light"
              className="rounded-circle p-0 d-flex align-items-center justify-content-center soft-icon text-danger"
              style={{ width: 40, height: 40 }}
              onClick={onDeleteBaseline}
              aria-label="Delete baseline image"
              title="Delete baseline image"
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
  // Handle empty or null values gracefully
  const displayValue = value && value !== "null" && value !== "undefined" ? value : "—";
  
  return (
    <div className="px-3 py-2 rounded-4 soft-chip">
      <div className="fw-semibold" title={`${label}: ${displayValue}`}>
        {displayValue}
      </div>
      <div className="text-muted" style={{ fontSize: 12 }}>
        {label}
      </div>
    </div>
  );
}

function StatusPill({ text, variant = "success" }) {
  const statusConfig = {
    success: { 
      bg: "bg-success-subtle", 
      fg: "text-success-emphasis", 
      icon: "bi-check-circle" 
    },
    warning: { 
      bg: "bg-warning-subtle", 
      fg: "text-warning-emphasis", 
      icon: "bi-exclamation-triangle" 
    },
    secondary: { 
      bg: "bg-secondary-subtle", 
      fg: "text-secondary-emphasis", 
      icon: "bi-clock" 
    },
    info: { 
      bg: "bg-info-subtle", 
      fg: "text-info-emphasis", 
      icon: "bi-info-circle" 
    },
    danger: { 
      bg: "bg-danger-subtle", 
      fg: "text-danger-emphasis", 
      icon: "bi-x-circle" 
    },
  };
  
  const config = statusConfig[variant] || statusConfig.success;

  return (
    <Badge className={`px-3 py-2 rounded-pill ${config.bg} ${config.fg} fw-medium`}>
      <i className={`bi ${config.icon} me-2`} />
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
