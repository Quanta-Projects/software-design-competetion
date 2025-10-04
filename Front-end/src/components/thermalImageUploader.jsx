import { useRef, useState } from "react";
import { Card, Form, Button } from "react-bootstrap";

export default function ThermalImageUploader({ onUpload, defaultImageType }) {
  const fileRef = useRef(null);
  const [envCondition, setEnvCondition] = useState("SUNNY");
  const [imageType, setImageType] = useState(defaultImageType || "BASELINE");
  const [fileName, setFileName] = useState("");
  const [uploading, setUploading] = useState(false);

  const pickFile = () => fileRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (10MB limit to match backend)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      alert(`File size too large. Maximum allowed size is 10MB. Your file is ${Math.round(file.size / (1024 * 1024))}MB.`);
      return;
    }
    
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please select an image file (JPEG, PNG, GIF, BMP, WEBP).');
      return;
    }
    
    setFileName(file.name);

    // If you want to actually upload here:
    if (onUpload) {
      try {
        setUploading(true);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("envCondition", envCondition);
        fd.append("imageType", imageType);
        await onUpload(fd);
        setFileName(""); // Reset after successful upload
        fileRef.current.value = ""; // Reset file input
      } catch (error) {
        alert("Upload failed: " + error.message);
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <Card className="border-0 shadow-sm rounded-4 p-4 soft-card">
      <h5 className="mb-1">Thermal Image</h5>
      <p className="text-muted mb-4">
        Upload a thermal image of the transformer to identify potential issues.
      </p>

      <Form.Group className="mb-3">
        <Form.Label className="fw-medium">Environmental Condition</Form.Label>
        <Form.Select
          className="pill-input"
          value={envCondition}
          onChange={(e) => setEnvCondition(e.target.value)}
        >
          <option value="SUNNY">Sunny</option>
          <option value="CLOUDY">Cloudy</option>
          <option value="RAINY">Rainy</option>
        </Form.Select>
      </Form.Group>

      <Form.Group className="mb-3">
        <Form.Label className="fw-medium">Image Type</Form.Label>
        <Form.Select
          className="pill-input"
          value={imageType}
          onChange={(e) => setImageType(e.target.value)}
        >
          <option value="BASELINE">Baseline</option>
          <option value="MAINTENANCE">Maintenance</option>
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

      <Button 
        size="lg" 
        className="w-100 rounded-4 btn-deep" 
        onClick={pickFile}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Upload Thermal Image"}
      </Button>

      {fileName && (
        <div className="small text-muted mt-2">Selected: {fileName}</div>
      )}
    </Card>
  );
}
