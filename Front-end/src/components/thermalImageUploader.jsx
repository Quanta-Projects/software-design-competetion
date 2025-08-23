import { useRef, useState } from "react";
import { Card, Form, Button } from "react-bootstrap";

export default function ThermalImageUploader({ onUpload }) {
  const fileRef = useRef(null);
  const [condition, setCondition] = useState("sunny");
  const [fileName, setFileName] = useState("");

  const pickFile = () => fileRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    // If you want to actually upload here:
    if (onUpload) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("condition", condition);
      await onUpload(fd, { file, condition });
    }
  };

  return (
    <Card className="border-0 shadow-sm rounded-4 p-4 soft-card">
      <h5 className="mb-1">Thermal Image</h5>
      <p className="text-muted mb-4">
        Upload a thermal image of the transformer to identify potential issues.
      </p>

      <Form.Group className="mb-3">
        <Form.Label className="fw-medium">Weather Condition</Form.Label>
        <Form.Select
          className="pill-input"
          value={condition}
          onChange={(e) => setCondition(e.target.value)}
        >
          <option value="sunny">Sunny</option>
          <option value="cloudy">Cloudy</option>
          <option value="rainy">Rainy</option>
        </Form.Select>
      </Form.Group>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="d-none"
        onChange={handleFile}
      />

      <Button size="lg" className="w-100 rounded-4 btn-deep" onClick={pickFile}>
        Upload thermal Image
      </Button>

      {fileName && (
        <div className="small text-muted mt-2">Selected: {fileName}</div>
      )}
    </Card>
  );
}
