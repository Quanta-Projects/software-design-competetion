import { useState, useMemo, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

export default function AddTransformerModal({
  show,
  onClose,
  onSubmit,
  regions = [],
  types = ["BULK", "DISTRIBUTION"], // Use enum values directly
  initialData = null, // when set, we're editing
}) {
  const [form, setForm] = useState({
    region: "",
    no: "",
    pole: "",
    type: "",
    location: "",
  });

  // Helper function to format enum values for display
  const formatDisplayName = (enumValue) => {
    if (!enumValue) return "";
    // Convert NUGEGODA -> Nugegoda, BULK -> Bulk, etc.
    return enumValue.charAt(0).toUpperCase() + enumValue.slice(1).toLowerCase();
  };

  // Prefill when editing (or when modal opens)
  useEffect(() => {
    if (show) {
      console.log("Modal opening with initialData:", initialData);
      const newForm = {
        region:   initialData?.region   ?? "",
        no:       initialData?.no       ?? "",
        pole:     initialData?.pole     ?? "",
        type:     initialData?.type     ?? "",
        location: initialData?.location ?? "",
      };
      console.log("Setting form to:", newForm);
      setForm(newForm);
    } else {
      // Reset form when modal is closed
      setForm({
        region: "",
        no: "",
        pole: "",
        type: "",
        location: "",
      });
    }
  }, [initialData, show]);

  const canSubmit = useMemo(() => {
    return form.region && form.no && form.pole && form.type;
  }, [form]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Let the page decide whether to add or update.
    onSubmit({
      ...form,
      // You can include updatedAt here; page also stamps it.
      updatedAt: new Date().toISOString(),
    });
  };

  const isEdit = !!initialData;

  return (
    <Modal show={show} onHide={onClose} centered size="lg">
      <Form onSubmit={handleConfirm}>
        <Modal.Header closeButton>
          <Modal.Title>{isEdit ? "Edit Transformer" : "Add Transformer"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="d-grid gap-3">
            <Form.Group>
              <Form.Label>Regions</Form.Label>
              <Form.Select
                name="region"
                value={form.region}
                onChange={handleChange}
                placeholder="Region"
              >
                <option value="">Select Region</option>
                {regions.map((r) => (
                  <option key={r} value={r}>{formatDisplayName(r)}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>Transformer No</Form.Label>
              <Form.Control
                name="no"
                value={form.no}
                onChange={handleChange}
                placeholder="Transformer No"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Pole No</Form.Label>
              <Form.Control
                name="pole"
                value={form.pole}
                onChange={handleChange}
                placeholder="Pole No"
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>Type</Form.Label>
              <Form.Select
                name="type"
                value={form.type}
                onChange={handleChange}
                placeholder="Type"
              >
                <option value="">Select Type</option>
                {types.map((t) => (
                  <option key={t} value={t}>{formatDisplayName(t)}</option>
                ))}
              </Form.Select>
            </Form.Group>

            <Form.Group>
              <Form.Label>Location Details</Form.Label>
              <Form.Control
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Location Details"
              />
            </Form.Group>
          </div>
        </Modal.Body>

        <Modal.Footer className="justify-content-between">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="px-4"
            style={{ borderRadius: 12 }}
          >
            {isEdit ? "Save" : "Confirm"}
          </Button>
          <Button variant="link" onClick={onClose} className="text-muted">
            Cancel
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
