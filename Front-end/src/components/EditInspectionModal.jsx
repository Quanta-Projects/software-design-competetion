import { useState, useEffect } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import { getApiUrl } from "../utils/config";

export default function EditInspectionModal({ 
  show, 
  onHide, 
  onInspectionUpdated,
  inspection // The inspection to edit
}) {
  const [formData, setFormData] = useState({
    transformerId: "",
    inspectionNo: "",
    branch: "",
    inspectedDate: "",
    maintenanceDate: "",
    status: "IN_PROGRESS",
    inspectedBy: "",
    notes: ""
  });

  const [transformers, setTransformers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingData, setLoadingData] = useState(false);

  // Load transformers and statuses when modal opens
  useEffect(() => {
    if (show) {
      loadInitialData();
    }
  }, [show]);

  // Populate form when inspection prop changes
  useEffect(() => {
    if (inspection && show) {
      console.log("Loading inspection data:", inspection);
      setFormData({
        transformerId: inspection.transformerId || "",
        inspectionNo: inspection.inspectionNo || inspection.inspectionNumber || "",
        branch: inspection.branch || "",
        inspectedDate: inspection.inspectedDate ? formatDateTimeForInput(inspection.inspectedDate) : "",
        maintenanceDate: inspection.maintenanceDate ? formatDateTimeForInput(inspection.maintenanceDate) : "",
        status: inspection.status || "IN_PROGRESS",
        inspectedBy: inspection.inspectedBy || inspection.inspectorName || "",
        notes: inspection.notes || inspection.description || ""
      });
    } else if (show) {
      // Reset form when opening modal without inspection data
      setFormData({
        transformerId: "",
        inspectionNo: "",
        branch: "",
        inspectedDate: "",
        maintenanceDate: "",
        status: "IN_PROGRESS",
        inspectedBy: "",
        notes: ""
      });
    }
  }, [inspection, show]);

  // Helper function to format datetime for input
  const formatDateTimeForInput = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      // Format as YYYY-MM-DDTHH:mm (datetime-local format)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      const [transformersRes, statusesRes] = await Promise.all([
        fetch(getApiUrl("transformers")),
        fetch(getApiUrl("inspections/statuses"))
      ]);

      if (transformersRes.ok && statusesRes.ok) {
        const [transformersData, statusesData] = await Promise.all([
          transformersRes.json(),
          statusesRes.json()
        ]);
        
        setTransformers(transformersData);
        setStatuses(statusesData);
      } else {
        // Fallback statuses if API doesn't exist
        setStatuses(["IN_PROGRESS", "COMPLETED", "MISSING", "CANCELLED"]);
        if (transformersRes.ok) {
          const transformersData = await transformersRes.json();
          setTransformers(transformersData);
        }
      }
    } catch (err) {
      console.error("Error loading data:", err);
      // Fallback statuses
      setStatuses(["IN_PROGRESS", "COMPLETED", "MISSING", "CANCELLED"]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Prepare the data
      const submitData = {
        ...formData,
        transformerId: parseInt(formData.transformerId),
        inspectedDate: formData.inspectedDate ? new Date(formData.inspectedDate).toISOString() : null,
        maintenanceDate: formData.maintenanceDate ? new Date(formData.maintenanceDate).toISOString() : null
      };

      const response = await fetch(getApiUrl(`inspections/${inspection.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to update inspection: ${errorData}`);
      }

      const updatedInspection = await response.json();
      onInspectionUpdated?.(updatedInspection);
      handleClose();
    } catch (err) {
      setError(err.message || "Failed to update inspection");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      transformerId: "",
      inspectionNo: "",
      branch: "",
      inspectedDate: "",
      maintenanceDate: "",
      status: "IN_PROGRESS",
      inspectedBy: "",
      notes: ""
    });
    setError("");
    onHide();
  };

  const formatStatusForDisplay = (status) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Edit Inspection</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        {loadingData ? (
          <div className="text-center p-4">
            <Spinner animation="border" />
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Inspection No. *</Form.Label>
              <Form.Control
                type="text"
                name="inspectionNo"
                value={formData.inspectionNo}
                onChange={handleChange}
                placeholder="e.g., 00023589"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Transformer *</Form.Label>
              <Form.Select
                name="transformerId"
                value={formData.transformerId}
                onChange={handleChange}
                required
              >
                <option value="">Select Transformer</option>
                {transformers.map(transformer => (
                  <option key={transformer.id} value={transformer.id}>
                    {transformer.transformerNo} - {transformer.location}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Branch</Form.Label>
              <Form.Control
                type="text"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                placeholder="Branch name"
              />
            </Form.Group>

            <div className="row">
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Inspected Date</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="inspectedDate"
                    value={formData.inspectedDate}
                    onChange={handleChange}
                  />
                </Form.Group>
              </div>
              <div className="col-md-6">
                <Form.Group className="mb-3">
                  <Form.Label>Maintenance Date</Form.Label>
                  <Form.Control
                    type="datetime-local"
                    name="maintenanceDate"
                    value={formData.maintenanceDate}
                    onChange={handleChange}
                  />
                </Form.Group>
              </div>
            </div>

            <Form.Group className="mb-3">
              <Form.Label>Status</Form.Label>
              <Form.Select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {formatStatusForDisplay(status)}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Inspected By</Form.Label>
              <Form.Control
                type="text"
                name="inspectedBy"
                value={formData.inspectedBy}
                onChange={handleChange}
                placeholder="e.g., A-110"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Notes</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes or comments"
              />
            </Form.Group>
          </Form>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={loading || loadingData}
        >
          {loading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Updating...
            </>
          ) : (
            "Update Inspection"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
