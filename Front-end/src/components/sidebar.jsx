// src/components/Sidebar.jsx
// import React from "react";
import { Nav } from "react-bootstrap";
import { NavLink, useLocation } from "react-router-dom";

export default function Sidebar() {
  const { pathname } = useLocation();

  return (
    <div className="bg-white vh-100 p-3 text-dark">
      {/* Logo */}
      <img
        src="/img/Q-Sight.png"
        alt="Q-Sight Logo"
        className="mb-4"
        style={{ width: 200, height: "auto" }}
      />

      {/* Navigation (pills behave like a toggle) */}
      <Nav variant="pills" className="flex-column" activeKey={pathname}>
        <Nav.Link
          as={NavLink}
          to="/transformers"
          eventKey="/transformers"
          className="d-flex align-items-center gap-2"
          end
        >
          <img src="/img/transformer.png" alt="icon" width={14} />
          Transformer
        </Nav.Link>

        <Nav.Link
          as={NavLink}
          to="/settings"
          eventKey="/settings"
          className="d-flex align-items-center gap-2"
          end
        >
          <img src="/img/settings.png" alt="icon" width={14} />
          Settings
        </Nav.Link>
      </Nav>
    </div>
  );
}
