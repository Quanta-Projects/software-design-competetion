import React from "react";
import { ToggleButtonGroup, ToggleButton ,Button} from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";

function CardTop({ onAdd, title = "Transformers", buttonText = "Add Transformer", showToggle = false, onBack, backPath, hideBack = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleBackClick = () => {
    if (onBack) {
      // Use custom back handler if provided
      onBack();
    } else if (backPath) {
      // Navigate to specific path if provided
      navigate(backPath);
    } else {
      // Default behavior based on current page
      if (location.pathname === "/inspections") {
        // If we're on inspections page and came from a transformer, go back to transformers
        if (location.state?.transformerId) {
          navigate("/transformers");
        } else {
          // If we're on general inspections page, go back to transformers
          navigate("/transformers");
        }
      } else {
        // Default to transformers page
        navigate("/transformers");
      }
    }
  };

  return (
    <div className="d-flex align-items-center">
      {/* Left icon button - only show if not hidden */}
      {!hideBack && (
        <Button
          onClick={handleBackClick}
          variant="light"
          className="rounded-circle p-0 d-flex align-items-center justify-content-center back-btn"
          style={{ width: 40, height: 40 }}
          aria-label="Back"
        >
          <i className="bi bi-chevron-left fs-5" />
        </Button>
      )}

      {/* Title */}
      <h4 className="card-title mb-0 me-3">{title}</h4>

      {/* Add button */}
      <button
        type="button"
        className="btn btn-primary shadow"
        onClick={onAdd}                 // <-- opens the modal
      >
        {buttonText}
      </button>

      {/* Right toggle buttons - only show on transformer list page */}
      {showToggle && (
        <ToggleButtonGroup
          type="radio"
          name="options"
          value={location.pathname === "/inspections" ? 2 : 1}
          className="ms-auto"
        >
          <ToggleButton
            id="tbg-radio-1"
            value={1}
            style={{
              backgroundColor: location.pathname === "/transformers" ? "#0d6efd" : "white",
              color: location.pathname === "/transformers" ? "white" : "#0d6efd",
              borderColor: "#0d6efd",
            }}
            onClick={() => navigate("/transformers")}
          >
            Transformers
          </ToggleButton>
          <ToggleButton
            id="tbg-radio-2"
            value={2}
            style={{
              backgroundColor: location.pathname === "/inspections" ? "#0d6efd" : "white",
              color: location.pathname === "/inspections" ? "white" : "#0d6efd",
              borderColor: "#0d6efd",
            }}
            onClick={() => navigate("/inspections")}
          >
            Inspections
          </ToggleButton>
        </ToggleButtonGroup>
      )}
    </div>
  );
}

export default CardTop;
