import React from "react";
import { ToggleButtonGroup, ToggleButton } from "react-bootstrap";

function CardTop() {
  return (
    <div className="d-flex align-items-center">
      {/* Left icon button */}
      <button
        type="button"
        className="btn btn-primary btn-sm d-inline-flex align-items-center me-2"
      >
        <img
          src="/img/left.png"
          alt="icon"
          style={{ width: 20, height: 20 }}
        />
      </button>

      {/* Title */}
      <h4 className="card-title mb-0 me-3">Transformers</h4>

      {/* Add button */}
      <button type="button" className="btn btn-primary shadow">
        Add Transformer
      </button>

      {/* Right toggle buttons */}
      <ToggleButtonGroup
        type="radio"
        name="options"
        defaultValue={1}
        className="ms-auto"
      >
        <ToggleButton
          id="tbg-radio-1"
          value={1}
          style={{
            backgroundColor: "#0d6efd",
            color: "white",
            borderColor: "#0d6efd",
          }}
        >
          Transformers
        </ToggleButton>
        <ToggleButton
          id="tbg-radio-2"
          value={2}
          style={{
            color: "#0d6efd",
            borderColor: "#0d6efd",
            backgroundColor: "white",
          }}
        >
          Inspections
        </ToggleButton>
      </ToggleButtonGroup>
    </div>
  );
}

export default CardTop;
