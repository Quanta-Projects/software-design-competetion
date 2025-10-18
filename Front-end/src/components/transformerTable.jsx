import { useNavigate } from "react-router-dom";
import React from "react";
import { Table, Dropdown, Button } from "react-bootstrap";
// import "bootstrap-icons/font/bootstrap-icons.css"; // Uncomment if you use Bootstrap icons

const KebabToggle = React.forwardRef(({ onClick }, ref) => (
  <button
    ref={ref}
    type="button"
    className="kebab-toggle"
    aria-label="Row actions"
    onClick={(e) => {
      e.preventDefault();
      onClick?.(e);
    }}
  >
    {/* vertical ellipsis (no icon lib needed) */}
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  </button>
));

// Helper function to format enum values for display
const formatDisplayValue = (value) => {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

export default function TransformerTable({
  transformers = [],
  favs,
  onToggleFav,
  onEdit,
  onDelete,
}) {
  const navigate = useNavigate();

  // send the transformer id to /inspections
  const handleViewInspectionsClick = (transformerId) => {
    navigate("/inspections", { state: { transformerId } });
  };

  return (
    <Table striped bordered hover className="align-middle">
      <thead>
        <tr>
          <th
            className="text-center"
            style={{ width: 60 }}
            aria-label="Favourite"
          />
          <th>Transformer No.</th>
          <th>Pole No.</th>
          <th>Region</th>
          <th>Type</th>
          <th style={{ width: 160 }} className="text-end"></th>
        </tr>
      </thead>

      <tbody>
        {transformers.map((t) => {
          const isFav = favs?.has(t.no);
          return (
            <tr key={t.id ?? t.no}>
              {/* Favourite column */}
              <td className="text-center align-middle">
                <div className="d-flex align-items-center justify-content-center">
                  <Button
                    type="button"
                    onClick={() => onToggleFav?.(t.no)}
                    aria-pressed={!!isFav}
                    aria-label={
                      isFav ? "Unmark favourite" : "Mark as favourite"
                    }
                    variant={isFav ? "warning" : "light"}
                    className={`ui-icon-btn ui-icon-btn--sm shadow-sm ${
                      isFav ? "text-dark" : ""
                    }`.trim()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "32px",
                      height: "32px",
                      borderRadius: "8px",
                      padding: 0,
                    }}
                  >
                    <i
                      className={isFav ? "bi bi-star-fill" : "bi bi-star"}
                      aria-hidden="true"
                      style={{ fontSize: "1.1rem" }}
                    />
                  </Button>
                </div>
              </td>

              {/* Transformer data */}
              <td>{t.no}</td>
              <td>{t.pole}</td>
              <td>{formatDisplayValue(t.region)}</td>
              <td>{formatDisplayValue(t.type)}</td>

              {/* Actions column */}
              <td className="text-end align-middle">
                <div className="d-inline-flex align-items-center gap-2">
                  <Button
                    type="button"
                    className="ui-btn-compact d-flex align-items-center justify-content-center"
                    variant="primary"
                    onClick={() => handleViewInspectionsClick(t.id)}
                    title="View Inspections"
                    style={{
                      minHeight: "36px",
                      lineHeight: "1.2",
                      padding: "0.4rem 0.9rem",
                    }}
                  >
                    Inspections
                  </Button>

                  <Dropdown align="end">
                    <Dropdown.Toggle
                      as={KebabToggle}
                      variant="light"
                      className="d-inline-flex align-items-center justify-content-center p-0"
                      aria-label="Row actions"
                    >
                      <i className="bi bi-three-dots-vertical" />
                    </Dropdown.Toggle>

                    <Dropdown.Menu className="kebab-menu shadow-sm">
                      <Dropdown.Item onClick={() => onEdit?.(t)}>
                        Edit
                      </Dropdown.Item>
                      <Dropdown.Item
                        className="text-danger"
                        onClick={() => onDelete?.(t)}
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
