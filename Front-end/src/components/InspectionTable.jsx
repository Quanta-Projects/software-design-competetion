import { useNavigate } from "react-router-dom";
import React from "react";
import { Table, Dropdown, Badge } from "react-bootstrap";

const KebabToggle = React.forwardRef(({ onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    className="kebab-toggle"
    aria-label="Row actions"
    onClick={(e) => { e.preventDefault(); onClick?.(e); }}
  >
    {/* vertical ellipsis (no icon lib needed) */}
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  </button>
));

// Helper function to format date for display
const formatDate = (dateString) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  } catch {
    return "—";
  }
};

// Helper function to get status badge variant
const getStatusVariant = (status) => {
  switch (status?.toLowerCase()) {
    case "completed":
      return "success";
    case "in_progress":
    case "in progress":
      return "primary";
    case "missing":
      return "warning";
    case "cancelled":
      return "danger";
    default:
      return "secondary";
  }
};

// Helper function to format status display
const formatStatus = (status) => {
  if (!status) return "Unknown";
  return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
};

export default function InspectionTable({ 
  inspections = [], 
  favs, 
  onToggleFav, 
  onView,
  onEdit,
  onDelete
}) {
  // Show empty state if no inspections
  if (!inspections || inspections.length === 0) {
    return (
      <div className="text-center py-5">
        <div className="mb-3">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" className="text-muted">
            <path d="M9 11H15M9 15H15M9 7H15M6 3H18C19.1046 3 20 3.89543 20 5V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V5C4 3.89543 4.89543 3 6 3Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h5 className="text-muted">No Inspections Found</h5>
        <p className="text-muted mb-0">
          No inspections have been created yet. Click "Add Inspection" to create your first inspection.
        </p>
      </div>
    );
  }

  return (
    <Table striped bordered hover className="align-middle">
      <thead>
        <tr>
          <th style={{ width: 52 }} aria-label="Favourite" className="text-center" />
          <th>Inspection No.</th>
          <th>Inspected Date</th>
          <th>Maintenance Date</th>
          <th>Status</th>
          <th>Branch</th>
          <th style={{ width: 120 }} className="text-end"></th>
        </tr>
      </thead>

      <tbody>
        {inspections.map((insp) => {
          const isFav = favs?.has(insp.inspectionNo);
          return (
            <tr key={insp.id}>
              <td className="text-center align-middle">
                <button
                  type="button"
                  onClick={() => onToggleFav?.(insp.inspectionNo)}
                  aria-pressed={!!isFav}
                  aria-label={isFav ? "Unmark favourite" : "Mark as favourite"}
                  className={`btn ${isFav ? "btn-warning" : "btn-light"} d-inline-flex align-items-center justify-content-center p-0 shadow-sm`}
                  style={{ width: 25, height: 25, borderRadius: 8 }}
                >
                  <img src="/img/star.png" alt="favorites" width={20} height={20} style={{ display: "block", objectFit: "contain" }} />
                </button>
              </td>

              <td>
                <div>
                  <strong>{insp.inspectionNo}</strong>
                  {insp.transformerNo && (
                    <div className="text-muted small">Transformer: {insp.transformerNo}</div>
                  )}
                </div>
              </td>
              <td>{formatDate(insp.inspectedDate)}</td>
              <td>{formatDate(insp.maintenanceDate)}</td>
              <td>
                <Badge bg={getStatusVariant(insp.status)}>
                  {formatStatus(insp.status)}
                </Badge>
              </td>
              <td>{insp.branch || "—"}</td>
              
              {/* Last column: View + 3-dots actions */}
              <td className="text-end">
                <div className="d-inline-flex align-items-center gap-2">
                  <button
                    type="button"
                    className="btn btn-primary d-inline-flex align-items-center justify-content-center px-3"
                    style={{ height: 25 }}
                    onClick={() => onView?.(insp.id)}
                  >
                    View
                  </button>

                  <Dropdown align="end">
                    <Dropdown.Toggle as={KebabToggle}
                      variant="light"
                      className="d-inline-flex align-items-center justify-content-center p-0"
                      style={{ width: 32, height: 32, borderRadius: 8 }}
                      aria-label="Row actions"
                    >
                      <i className="bi bi-three-dots-vertical" />
                    </Dropdown.Toggle>

                    <Dropdown.Menu className="kebab-menu">
                      <Dropdown.Item onClick={() => onEdit?.(insp)}>
                        Edit
                      </Dropdown.Item>
                      <Dropdown.Item
                        className="text-danger"
                        onClick={() => onDelete?.(insp)}
                      >
                        Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}
