
// src/components/transformerTable.jsx
import { useNavigate } from "react-router-dom";
import React from "react";
import { Table, Dropdown } from "react-bootstrap";
// If you use the icon below, make sure bootstrap-icons is loaded once in your app entry:
// import "bootstrap-icons/font/bootstrap-icons.css";

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

// Helper function to format enum values for display
const formatDisplayValue = (value) => {
  if (!value) return "";
  // Convert NUGEGODA -> Nugegoda, BULK -> Bulk, etc.
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};


export default function TransformerTable({ transformers = [], favs, onToggleFav, onEdit,          // <-- new (optional)
  onDelete,        // <-- new (optional)
}) {

  const navigate = useNavigate();

  // send the transformer id to /upload
  const handleViewClick = (transformerId) => {
    navigate("/upload", { state: { transformerId } });
  };

  // send the transformer id to /inspections
  const handleViewInspectionsClick = (transformerId) => {
    navigate("/inspections", { state: { transformerId } });
  };
  return (
    <Table striped bordered hover className="align-middle">
      <thead>
        <tr>
          <th style={{ width: 52 }} aria-label="Favourite" className="text-center" />
          <th>Transformer No.</th>
          <th>Pole NO.</th>
          <th>Region</th>
          <th>Type</th>
          <th style={{ width: 120 }} className="text-end"></th>
        </tr>
      </thead>

      <tbody>
        {transformers.map((t) => {
          const isFav = favs?.has(t.no);
          return (
            <tr key={t.id ?? t.no}>
              <td className="text-center align-middle">
                <button
                  type="button"
                  onClick={() => onToggleFav?.(t.no)}
                  aria-pressed={!!isFav}
                  aria-label={isFav ? "Unmark favourite" : "Mark as favourite"}
                  className={`btn ${isFav ? "btn-warning" : "btn-light"} d-inline-flex align-items-center justify-content-center p-0 shadow-sm`}
                  style={{ width: 25, height: 25, borderRadius: 8 }}
                >
                  <img src="/img/star.png" alt="favorites" width={20} height={20} style={{ display: "block", objectFit: "contain" }} />
                </button>
              </td>

              <td>{t.no}</td>
              <td>{t.pole}</td>
              <td>{formatDisplayValue(t.region)}</td>
              <td>{formatDisplayValue(t.type)}</td>
              {/* Last column: View + View Inspections + 3-dots actions */}
              <td className="text-end">
                <div className="d-inline-flex align-items-center gap-2">
    
                  <button
                    type="button"
                    className="btn btn-info d-inline-flex align-items-center justify-content-center px-3"
                    style={{ height: 25 }}
                    onClick={() => handleViewInspectionsClick(t.id)}
                    title="View Inspections"
                  >
                    Inspections
                  </button>

                  <Dropdown align="end">
                    <Dropdown.Toggle as={KebabToggle}
                      variant="light"
                      className="d-inline-flex align-items-center justify-content-center p-0"
                      style={{ width: 32, height: 32, borderRadius: 8 }}
                      aria-label="Row actions"
                    >
                      {/* If you don't use bootstrap-icons, replace with: <span style={{fontSize:18}}>⋮</span> */}
                      <i className="bi bi-three-dots-vertical" />
                    </Dropdown.Toggle>

                    <Dropdown.Menu className="kebab-menu">
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
