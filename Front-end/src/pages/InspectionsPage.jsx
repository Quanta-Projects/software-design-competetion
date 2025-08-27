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
import { getApiUrl } from "../utils/config";

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

  // Load data
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError("");
      try {
        let inspectionsUrl;
        if (transformerId) {
          inspectionsUrl = getApiUrl(`inspections/transformer/${transformerId}`);
        } else {
          inspectionsUrl = getApiUrl("inspections");
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

  // Filter & sort
  const filteredAndSorted = useMemo(() => {
    let result = [...allInspections];

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
  }, [allInspections, sortBy, query, range]);

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

  // Add inspection
  const handleAddInspection = () => {
    setShowAddModal(true);
  };

  // Navigate to upload page when View is clicked
  const handleViewInspection = (inspectionId) => {
    navigate("/upload", { state: { inspectionId } });
  };

  // Edit inspection
  const handleEditInspection = (inspection) => {
    console.log("Edit inspection:", inspection);
    // TODO: Implement edit modal
  };

  // Delete inspection
  const handleDeleteInspection = (inspection) => {
    if (window.confirm(`Delete inspection ${inspection.inspectionNo}?`)) {
      console.log("Delete inspection:", inspection);
      // TODO: Implement delete API call
    }
  };

  // Reload inspections after modal operations
  const handleInspectionAdded = (newInspection) => {
    setAllInspections(prev => [...prev, newInspection]);
    setShowAddModal(false);
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
      {transformerId && (
        <div className="mb-3">
          <Button variant="outline-secondary" onClick={handleBack}>
            ← Back to Transformers
          </Button>
        </div>
      )}
      
      <CardTop 
        onAdd={handleAddInspection} 
        title={title} 
        buttonText="Add Inspection" 
      />

      <Toolbar
        sortBy={sortBy}
        setSortBy={setSortBy}
        query={query}
        setQuery={setQuery}
        range={range}
        setRange={setRange}
        placeholder="Search inspections..."
        sortOptions={[
          { value: "number", label: "Inspection No." },
          { value: "date", label: "Inspection Date" },
          { value: "status", label: "Status" },
          { value: "branch", label: "Branch" }
        ]}
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
    </Container>
  );
}
