import { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Container, Button, Alert, Spinner } from "react-bootstrap";

import "../App.css";
import "bootstrap/dist/css/bootstrap.min.css";

import Toolbar from "../components/toolbar";
import CardTop from "../components/cardTop";
import InspectionTable from "../components/InspectionTable";
import Pager from "../components/pager";
import AddInspectionModal from "../components/AddInspectionModal";
import EditInspectionModal from "../components/EditInspectionModal";
import { getRestApiUrl } from "../utils/config";

export default function InspectionsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const transformerId = location.state?.transformerId;

  // Data state
  const [allInspections, setAllInspections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Favorites
  const [favs, setFavs] = useState(new Set());

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingInspection, setEditingInspection] = useState(null);

  // Load data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        let inspectionsUrl;
        if (transformerId) {
          inspectionsUrl = getRestApiUrl(`inspections/transformer/${transformerId}`);
        } else {
          inspectionsUrl = getRestApiUrl("inspections");
        }

        const inspectionsRes = await fetch(inspectionsUrl);

        if (!inspectionsRes.ok) {
          throw new Error(`Failed to fetch inspections: ${inspectionsRes.status}`);
        }

        const inspectionsJson = await inspectionsRes.json();

        if (!cancelled) {
          console.log("Fetched inspections:", inspectionsJson);
          setAllInspections(inspectionsJson);
        }
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load inspections");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [transformerId]);

  // Toolbar state
  const [sortBy, setSortBy] = useState("number"); // number | status | date | branch
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all"); // all | 24h | 7d | 30d | ytd
  const [starOnly, setStarOnly] = useState(false);

  // Filter & sort
  const filteredAndSorted = useMemo(() => {
    let result = [...allInspections];

    // Favorites filter
    if (starOnly) {
      result = result.filter(insp => favs.has(insp.inspectionNo));
    }

    // Search filter
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(insp =>
        insp.inspectionNo.toLowerCase().includes(q) ||
        insp.branch?.toLowerCase().includes(q) ||
        insp.inspectedBy?.toLowerCase().includes(q) ||
        insp.transformerNo?.toLowerCase().includes(q)
      );
    }

    // Date range filter
    if (range !== "all") {
      const now = new Date();
      let cutoff;
      switch (range) {
        case "24h":
          cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case "7d":
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "ytd":
          cutoff = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          cutoff = null;
      }
      if (cutoff) {
        result = result.filter(insp =>
          insp.inspectedDate && new Date(insp.inspectedDate) >= cutoff
        );
      }
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "number":
          return (a.inspectionNo || "").localeCompare(b.inspectionNo || "");
        case "status":
          return (a.status || "").localeCompare(b.status || "");
        case "date":
          return new Date(b.inspectedDate || 0) - new Date(a.inspectedDate || 0);
        case "branch":
          return (a.branch || "").localeCompare(b.branch || "");
        default:
          return 0;
      }
    });

    return result;
  }, [allInspections, sortBy, query, range, starOnly, favs]);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const totalPages = Math.ceil(filteredAndSorted.length / pageSize);
  const paginatedInspections = filteredAndSorted.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Favorites toggle
  const handleToggleFav = (inspectionNo) => {
    setFavs(prev => {
      const updated = new Set(prev);
      if (updated.has(inspectionNo)) {
        updated.delete(inspectionNo);
      } else {
        updated.add(inspectionNo);
      }
      return updated;
    });
  };

  // Reset filters
  const handleResetFilters = () => {
    setSortBy("number");
    setQuery("");
    setRange("all");
    setStarOnly(false);
    setCurrentPage(1);
  };

  // Add inspection
  const handleAddInspection = () => {
    setShowAddModal(true);
  };

  // Navigate to preview page when View is clicked
  const handleViewInspection = async (inspectionId) => {
    // Find the inspection to get its transformerId
    const inspection = allInspections.find(insp => insp.id === inspectionId);
    if (!inspection) {
      alert("Inspection not found");
      return;
    }

    try {
      // Fetch images for this transformer to check availability
      const imagesRes = await fetch(getRestApiUrl(`images/transformer/${inspection.transformerId}`));
      
      if (!imagesRes.ok) {
        throw new Error(`Failed to fetch images: ${imagesRes.status}`);
      }

      const imagesData = await imagesRes.json();
      
      // Helper to find latest image by type
      const findLatestByType = (images, type) => {
        return images
          .filter(img => img.imageType?.toUpperCase() === type.toUpperCase())
          .sort((a, b) => {
            const dateA = new Date(a.uploadedAt || a.createdAt || a.uploadDate || 0).getTime();
            const dateB = new Date(b.uploadedAt || b.createdAt || b.uploadDate || 0).getTime();
            return dateB - dateA;
          })[0] || null;
      };

      const baselineImage = findLatestByType(imagesData, "BASELINE");
      const maintenanceImage = findLatestByType(imagesData, "MAINTENANCE");

      // Check what images are missing
      const missingBaseline = !baselineImage;
      const missingMaintenance = !maintenanceImage;

      if (missingBaseline || missingMaintenance) {
        // Redirect to upload page with appropriate message
        let message = "";
        if (missingBaseline && missingMaintenance) {
          message = "No thermal images available. Please upload both Baseline and Maintenance images to enable comparison.";
        } else if (missingBaseline) {
          message = "Baseline image not available. Please upload a Baseline thermal image to enable comparison.";
        } else if (missingMaintenance) {
          message = "Maintenance image not available. Please upload a Maintenance thermal image to enable comparison.";
        }

        navigate("/upload", { 
          state: { 
            inspectionId: inspectionId,
            transformerId: inspection.transformerId,
            message: message
          } 
        });
      } else {
        // Both images available, navigate to preview page
        navigate("/preview", { 
          state: { 
            transformerId: inspection.transformerId,
            inspectionId: inspectionId
          } 
        });
      }
    } catch (err) {
      alert(`Error checking images: ${err.message}`);
      // On error, navigate to upload page anyway
      navigate("/upload", { 
        state: { 
          inspectionId: inspectionId,
          transformerId: inspection.transformerId
        } 
      });
    }
  };

  // Edit inspection
  const handleEditInspection = (inspection) => {
    setEditingInspection(inspection);
    setShowEditModal(true);
  };

  // Delete inspection
  const handleDeleteInspection = async (inspection) => {
    if (window.confirm(`Are you sure you want to delete inspection ${inspection.inspectionNumber}?`)) {
      try {
        const response = await fetch(getRestApiUrl(`inspections/${inspection.id}`), {
          method: "DELETE"
        });

        if (response.ok) {
          // Remove from local state
          setAllInspections(prev => prev.filter(insp => insp.id !== inspection.id));
          console.log("Inspection deleted successfully");
        } else {
          const errorText = await response.text();
          alert(`Failed to delete inspection: ${response.status} - ${errorText}`);
        }
      } catch (err) {
        alert(`Error deleting inspection: ${err.message}`);
      }
    }
  };

  // Reload inspections after modal operations
  const handleInspectionAdded = (newInspection) => {
    setAllInspections(prev => [...prev, newInspection]);
    setShowAddModal(false);
  };

  // Handle inspection update
  const handleInspectionUpdated = (updatedInspection) => {
    setAllInspections(prev => 
      prev.map(insp => 
        insp.id === updatedInspection.id ? updatedInspection : insp
      )
    );
    setShowEditModal(false);
    setEditingInspection(null);
  };

  const handleBack = () => {
    navigate("/transformers");
  };

  if (loading) {
    return (
      <Container fluid className="d-flex justify-content-center align-items-center" style={{ height: "50vh" }}>
        <Spinner animation="border" variant="primary" />
      </Container>
    );
  }

  if (loadError) {
    return (
      <Container>
        <Alert variant="danger">{loadError}</Alert>
      </Container>
    );
  }

  const title = transformerId ? "Transformer Inspections" : "All Inspections";

  return (
    <Container fluid>
      
      <CardTop 
        onAdd={handleAddInspection} 
        title={title} 
        buttonText="Add Inspection"
        onBack={handleBack}
        showToggle={true}
      />

      <Toolbar
        sortBy={sortBy}
        setSortBy={setSortBy}
        query={query}
        setQuery={setQuery}
        range={range}
        setRange={setRange}
        starOnly={starOnly}
        setStarOnly={setStarOnly}
        onReset={handleResetFilters}
      />

      <InspectionTable
        inspections={paginatedInspections}
        favs={favs}
        onToggleFav={handleToggleFav}
        onView={handleViewInspection}
        onEdit={handleEditInspection}
        onDelete={handleDeleteInspection}
      />

      <Pager 
        page={currentPage} 
        totalPages={totalPages} 
        onChange={setCurrentPage}
      />

      <AddInspectionModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onInspectionAdded={handleInspectionAdded}
        defaultTransformerId={transformerId}
      />

      <EditInspectionModal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setEditingInspection(null);
        }}
        onInspectionUpdated={handleInspectionUpdated}
        inspection={editingInspection}
      />
    </Container>
  );
}
