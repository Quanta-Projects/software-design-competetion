// UploadPage.jsx
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Container, Button, Offcanvas } from "react-bootstrap";
import InspectionHeader from "../components/InspectionHeader";
import ThermalImageUploader from "../components/thermalImageUploader";

export default function UploadPage() {
  const location = useLocation();
  const transformerNo = location.state?.transformerNo || "AZ-8370";

  const [showMenu, setShowMenu] = useState(false);
  const openMenu = () => setShowMenu(true);
  const closeMenu = () => setShowMenu(false);

  const uploadToBackend = async (formData /*, { file, condition } */) => {
    // replace with real endpoint
    const res = await fetch("/api/images/thermal", {
      method: "POST",
      body: formData, // browser sets multipart boundary
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  };

  return (
    <div className="page-bg min-vh-100">
      {/* Top bar: burger + title only */}
      <div className="topbar">
        <Container className="d-flex align-items-center gap-3">
          <Button
            variant="light"
            onClick={openMenu}
            className="rounded-circle d-flex align-items-center justify-content-center nav-burger"
            aria-label="Open menu"
          >
            <i className="bi bi-list fs-4" />
          </Button>
          <h3 className="mb-0 title">Transformer</h3>
        </Container>
      </div>

      {/* Main content */}
      <Container style={{ maxWidth: 1100 }}>
        <div className="mt-3">
          <InspectionHeader transformerNo={transformerNo} />
        </div>

        <div className="mt-3" style={{ maxWidth: 520 }}>
          <ThermalImageUploader onUpload={uploadToBackend} />
        </div>
      </Container>

      {/* (Optional) Offcanvas opened by burger */}
      <Offcanvas show={showMenu} onHide={closeMenu}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          {/* add nav links if/when needed */}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
