import React from "react";
import { ToggleButtonGroup, ToggleButton, Button } from "react-bootstrap";
import { useLocation, useNavigate } from "react-router-dom";

const DEFAULT_TOGGLE_OPTIONS = [
  { value: "transformers", label: "Transformers", path: "/transformers" },
  { value: "inspections", label: "Inspections", path: "/inspections" },
];

function CardTop({
  onAdd,
  title = "Transformers",
  buttonText = "Add Transformer",
  showToggle = false,
  onBack,
  backPath,
  hideBack = false,
  toggleOptions = DEFAULT_TOGGLE_OPTIONS,
}) {
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

  const activeTogglePath = toggleOptions.find((opt) => opt.path === location.pathname)?.path;

  return (
    <div className="ui-section-header w-100">
      {/* Left icon button - only show if not hidden */}
      {!hideBack && (
        <Button
          onClick={handleBackClick}
          variant="light"
          className="ui-circle-btn ui-circle-btn--soft back-btn"
          aria-label="Back"
        >
          <i className="bi bi-chevron-left fs-5" />
        </Button>
      )}

      {/* Title */}
      <h4 className="ui-section-header__title card-title">{title}</h4>

      {/* Add button */}
      <Button type="button" variant="primary" className="shadow" onClick={onAdd}>
        {buttonText}
      </Button>

      {/* Right toggle buttons */}
      {showToggle && toggleOptions.length > 0 && (
        <div className="ui-section-header__actions ms-auto">
          <ToggleButtonGroup
            type="radio"
            name="page-toggle"
            value={activeTogglePath || toggleOptions[0].path}
            className="ui-segmented"
          >
            {toggleOptions.map((option) => (
              <ToggleButton
                key={option.value}
                id={`card-toggle-${option.value}`}
                value={option.path}
                variant={location.pathname === option.path ? "primary" : "outline-primary"}
                className="ui-toggle-btn"
                onClick={() => navigate(option.path)}
              >
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </div>
      )}
    </div>
  );
}

export default CardTop;
