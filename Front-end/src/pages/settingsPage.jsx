// src/pages/SettingsPage.jsx
import { useState, useEffect, useRef } from "react";
import { Button, Card, Alert, Spinner, Badge, Modal, Table, Form, Row, Col, ProgressBar, Toast, ToastContainer } from "react-bootstrap";
import { getFastApiUrl } from "../utils/config";

export default function SettingsPage() {
  // Dataset preparation state
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

  // Training state
  const [isTraining, setIsTraining] = useState(false);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [trainingError, setTrainingError] = useState(null);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const eventSourceRef = useRef(null);

  // Model selection state
  const [showModelModal, setShowModelModal] = useState(false);
  const [models, setModels] = useState([]);
  const [activeModel, setActiveModel] = useState(null);
  const [selectedModelPath, setSelectedModelPath] = useState(null);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelError, setModelError] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastVariant, setToastVariant] = useState("success");

  // Training configuration
  const [trainingConfig, setTrainingConfig] = useState({
    epochs: 50,
    batch_size: 16,
    learning_rate: 0.001,
    image_size: 640,
    use_gpu: true,
    seed: 42
  });

  const handlePrepareDataset = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(
        getFastApiUrl("/tools/retrain/prepare-dataset"),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to prepare dataset: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      setResult(data);
      setShowResultModal(true);
    } catch (err) {
      console.error("Error preparing dataset:", err);
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowResultModal(false);
  };

  // Training functions
  const connectSSE = () => {
    // Close existing connection if any
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(getFastApiUrl("/tools/retrain/logs/stream"));
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setTrainingStatus(data);

        if (data.status === "done") {
          setIsTraining(false);
          eventSource.close();
          eventSourceRef.current = null;
          console.log("✅ Training completed successfully!");
        } else if (data.status === "error") {
          setIsTraining(false);
          setTrainingError(data.error || "Training failed");
          eventSource.close();
          eventSourceRef.current = null;
          console.error("❌ Training failed:", data.error);
        }
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE connection error:", err);
      setIsTraining(false);
      eventSource.close();
      eventSourceRef.current = null;
      
      // Fallback to polling
      pollTrainingStatus();
    };
  };

  const pollTrainingStatus = async () => {
    try {
      const response = await fetch(getFastApiUrl("/tools/retrain/status"));
      if (response.ok) {
        const data = await response.json();
        setTrainingStatus(data);

        if (data.status === "running") {
          // Continue polling
          setTimeout(pollTrainingStatus, 3000);
        } else if (data.status === "done") {
          setIsTraining(false);
        } else if (data.status === "error") {
          setIsTraining(false);
          setTrainingError(data.error || "Training failed");
        }
      }
    } catch (err) {
      console.error("Error polling training status:", err);
    }
  };

  const handleStartTraining = async () => {
    setIsTraining(true);
    setTrainingError(null);
    setTrainingStatus(null);
    setShowTrainingModal(true);

    try {
      const response = await fetch(getFastApiUrl("/tools/retrain/start"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(trainingConfig),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Failed to start training: ${response.status}`);
      }

      const data = await response.json();
      console.log("Training started:", data);

      // Connect to SSE stream for real-time updates
      connectSSE();
    } catch (err) {
      console.error("Error starting training:", err);
      
      // Check if it's a network error (FastAPI server not running)
      if (err.message === "Failed to fetch" || err.name === "TypeError") {
        setTrainingError(
          "Cannot connect to FastAPI server. Please ensure:\n" +
          "1. FastAPI server is running (python fastapi_server.py)\n" +
          "2. Server is accessible at http://localhost:8001\n" +
          "3. CORS is properly configured"
        );
      } else {
        setTrainingError(err.message || "Failed to start training");
      }
      
      setIsTraining(false);
    }
  };

  const handleStopTraining = async () => {
    try {
      const response = await fetch(getFastApiUrl("/tools/retrain/stop"), {
        method: "POST",
      });

      if (response.ok) {
        setIsTraining(false);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }
    } catch (err) {
      console.error("Error stopping training:", err);
    }
  };

  const handleCloseTrainingModal = () => {
    setShowTrainingModal(false);
  };

  // Model management functions
  const fetchModels = async () => {
    setLoadingModels(true);
    setModelError(null);
    try {
      const response = await fetch(getFastApiUrl("/tools/models/list"));
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      const data = await response.json();
      setModels(data.models || []);
      setActiveModel(data.active_model);
      if (data.active_model) {
        setSelectedModelPath(data.active_model.path);
      }
    } catch (err) {
      console.error("Error fetching models:", err);
      setModelError(err.message);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleOpenModelModal = () => {
    setShowModelModal(true);
    fetchModels();
  };

  const handleSelectModel = async () => {
    if (!selectedModelPath) {
      setModelError("Please select a model");
      return;
    }

    setLoadingModels(true);
    setModelError(null);
    try {
      const response = await fetch(getFastApiUrl("/tools/models/select"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: selectedModelPath }),
      });

      const data = await response.json();
      
      if (!data.ok) {
        throw new Error(data.error || "Failed to select model");
      }

      setActiveModel(data.active_model);
      setShowModelModal(false);
      
      // Show success toast
      setToastMessage(`🤖 Model switched successfully to: ${data.active_model.name} (${data.active_model.dir === "updated_defect" ? "Updated Model" : "Base Model"})`);
      setToastVariant("success");
      setShowToast(true);
      
      // Also log to console for verification
      console.log("✅ Active model changed:", {
        name: data.active_model.name,
        path: data.active_model.path,
        directory: data.active_model.dir,
        selectedAt: data.active_model.selected_at
      });
    } catch (err) {
      console.error("Error selecting model:", err);
      setModelError(err.message);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleCloseModelModal = () => {
    setShowModelModal(false);
    setModelError(null);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (isoString) => {
    return new Date(isoString).toLocaleString();
  };

  // Cleanup SSE connection on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Fetch active model on mount
  useEffect(() => {
    const fetchActiveModel = async () => {
      try {
        const response = await fetch(getFastApiUrl("/tools/models/active"));
        if (response.ok) {
          const data = await response.json();
          setActiveModel(data);
        }
      } catch (err) {
        // Silently fail - model might not be loaded yet
        console.log("No active model loaded");
      }
    };
    fetchActiveModel();
  }, []);

  return (
    <div className="container-fluid py-4">
      <h2 className="mb-4">⚙️ Settings & Tools</h2>

      {/* Model Selection Card */}
      <Card className="mb-4">
        <Card.Header className="bg-info text-white">
          <h5 className="mb-0">
            <i className="bi bi-diagram-3-fill me-2"></i>
            Active Defect Detection Model
          </h5>
        </Card.Header>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              {activeModel ? (
                <>
                  <h6 className="mb-1">
                    <Badge bg="success" className="me-2">Active</Badge>
                    {activeModel.name}
                  </h6>
                  <p className="text-muted mb-0 small">
                    <i className="bi bi-folder me-1"></i>
                    {activeModel.dir === "updated_defect" ? "Updated Model" : "Base Model"} 
                    {activeModel.selected_at && (
                      <> • Selected: {formatDate(activeModel.selected_at)}</>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-muted mb-0">No model currently loaded</p>
              )}
            </div>
            <Button
              variant="outline-info"
              onClick={handleOpenModelModal}
            >
              <i className="bi bi-list-ul me-2"></i>
              Choose Model
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Dataset Preparation Card */}
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <i className="bi bi-database-fill me-2"></i>
            Model Retraining Dataset
          </h5>
        </Card.Header>
        <Card.Body>
          <p className="text-muted">
            Prepare a retraining dataset from user-modified annotations. This will:
          </p>
          <ul className="text-muted mb-3">
            <li>Fetch all images from the database</li>
            <li>Skip already annotated images</li>
            <li><strong>Segment transformer regions using AI model</strong></li>
            <li><strong>Apply binary mask to extract ROI</strong></li>
            <li>Download segmented images to the training directory</li>
            <li>Convert annotations to YOLO format (adjusted for cropped regions)</li>
            <li>Generate label files for model retraining</li>
          </ul>

          {error && (
            <Alert variant="danger" dismissible onClose={() => setError(null)}>
              <Alert.Heading>Error</Alert.Heading>
              <p className="mb-0">{error}</p>
            </Alert>
          )}

          <div className="d-flex gap-2 align-items-center">
            <Button
              variant="primary"
              size="lg"
              onClick={handlePrepareDataset}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Preparing Dataset...
                </>
              ) : (
                <>
                  <i className="bi bi-play-circle-fill me-2"></i>
                  Prepare Retraining Dataset
                </>
              )}
            </Button>

            {result && (
              <Badge bg="success" className="fs-6">
                <i className="bi bi-check-circle-fill me-1"></i>
                Dataset Prepared Successfully
              </Badge>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Model Retraining Card */}
      <Card className="mb-4">
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0">
            <i className="bi bi-cpu-fill me-2"></i>
            Model Retraining
          </h5>
        </Card.Header>
        <Card.Body>
          <p className="text-muted">
            Train a new defect detection model using the prepared dataset. This will:
          </p>
          <ul className="text-muted mb-3">
            <li>Merge new_dataset with existing training data</li>
            <li>Train the YOLO model with your configuration</li>
            <li>Track training progress and metrics in real-time</li>
            <li>Save the best model weights with timestamp</li>
            <li>Generate training metrics and validation results</li>
          </ul>

          {/* Training Configuration */}
          <Card className="mb-3 border-secondary">
            <Card.Header className="bg-light">
              <h6 className="mb-0">
                <i className="bi bi-gear-fill me-2"></i>
                Training Configuration
              </h6>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Epochs</Form.Label>
                    <Form.Control
                      type="number"
                      value={trainingConfig.epochs}
                      onChange={(e) =>
                        setTrainingConfig({
                          ...trainingConfig,
                          epochs: parseInt(e.target.value),
                        })
                      }
                      disabled={isTraining}
                      min="1"
                      max="1000"
                    />
                    <Form.Text className="text-muted">
                      Recommended: 50-100 for testing, 100-200 for production
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Batch Size</Form.Label>
                    <Form.Control
                      type="number"
                      value={trainingConfig.batch_size}
                      onChange={(e) =>
                        setTrainingConfig({
                          ...trainingConfig,
                          batch_size: parseInt(e.target.value),
                        })
                      }
                      disabled={isTraining}
                      min="1"
                      max="64"
                    />
                    <Form.Text className="text-muted">
                      Adjust based on GPU memory (8-16 for 8GB GPU)
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Learning Rate</Form.Label>
                    <Form.Control
                      type="number"
                      step="0.0001"
                      value={trainingConfig.learning_rate}
                      onChange={(e) =>
                        setTrainingConfig({
                          ...trainingConfig,
                          learning_rate: parseFloat(e.target.value),
                        })
                      }
                      disabled={isTraining}
                      min="0.0001"
                      max="0.1"
                    />
                    <Form.Text className="text-muted">
                      Default: 0.001 (try 0.0001 for fine-tuning)
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Image Size</Form.Label>
                    <Form.Select
                      value={trainingConfig.image_size}
                      onChange={(e) =>
                        setTrainingConfig({
                          ...trainingConfig,
                          image_size: parseInt(e.target.value),
                        })
                      }
                      disabled={isTraining}
                    >
                      <option value="320">320x320</option>
                      <option value="416">416x416</option>
                      <option value="640">640x640 (Recommended)</option>
                      <option value="1280">1280x1280</option>
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Larger = better accuracy but slower
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Random Seed</Form.Label>
                    <Form.Control
                      type="number"
                      value={trainingConfig.seed}
                      onChange={(e) =>
                        setTrainingConfig({
                          ...trainingConfig,
                          seed: e.target.value ? parseInt(e.target.value) : null,
                        })
                      }
                      disabled={isTraining}
                      placeholder="Leave empty for random"
                    />
                    <Form.Text className="text-muted">
                      Set for reproducible results
                    </Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="switch"
                      id="use-gpu-switch"
                      label="Use GPU Acceleration"
                      checked={trainingConfig.use_gpu}
                      onChange={(e) =>
                        setTrainingConfig({
                          ...trainingConfig,
                          use_gpu: e.target.checked,
                        })
                      }
                      disabled={isTraining}
                    />
                    <Form.Text className="text-muted">
                      Disable if you don't have a compatible GPU
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {trainingError && (
            <Alert variant="danger" dismissible onClose={() => setTrainingError(null)}>
              <Alert.Heading>Training Error</Alert.Heading>
              <pre style={{ whiteSpace: 'pre-wrap', marginBottom: 0 }}>{trainingError}</pre>
            </Alert>
          )}

          {/* Training Status Display */}
          {trainingStatus && trainingStatus.status !== "idle" && (
            <Card className="mb-3 border-info">
              <Card.Header className="bg-info text-white">
                <h6 className="mb-0">
                  <i className="bi bi-activity me-2"></i>
                  Training Status: <Badge bg="light" text="dark">{trainingStatus.status.toUpperCase()}</Badge>
                </h6>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-2">
                    <span>
                      Epoch {trainingStatus.current_epoch || 0} / {trainingStatus.total_epochs}
                    </span>
                    <span>
                      {trainingStatus.current_epoch && trainingStatus.total_epochs
                        ? `${((trainingStatus.current_epoch / trainingStatus.total_epochs) * 100).toFixed(1)}%`
                        : "0%"}
                    </span>
                  </div>
                  <ProgressBar
                    now={
                      trainingStatus.current_epoch && trainingStatus.total_epochs
                        ? (trainingStatus.current_epoch / trainingStatus.total_epochs) * 100
                        : 0
                    }
                    variant={
                      trainingStatus.status === "done"
                        ? "success"
                        : trainingStatus.status === "error"
                        ? "danger"
                        : "primary"
                    }
                    animated={trainingStatus.status === "running"}
                    striped
                  />
                </div>

                {/* Latest Metrics */}
                {trainingStatus.metrics && (
                  <Row className="text-center">
                    <Col xs={6} md={3}>
                      <div className="mb-2">
                        <small className="text-muted">Train Loss</small>
                        <div className="fw-bold text-primary">
                          {trainingStatus.metrics.train_loss?.toFixed(4) || "N/A"}
                        </div>
                      </div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="mb-2">
                        <small className="text-muted">Precision</small>
                        <div className="fw-bold text-success">
                          {trainingStatus.metrics.precision?.toFixed(3) || "N/A"}
                        </div>
                      </div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="mb-2">
                        <small className="text-muted">Recall</small>
                        <div className="fw-bold text-info">
                          {trainingStatus.metrics.recall?.toFixed(3) || "N/A"}
                        </div>
                      </div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="mb-2">
                        <small className="text-muted">mAP50</small>
                        <div className="fw-bold text-warning">
                          {trainingStatus.metrics.mAP50?.toFixed(3) || "N/A"}
                        </div>
                      </div>
                    </Col>
                  </Row>
                )}

                {trainingStatus.warnings && trainingStatus.warnings.length > 0 && (
                  <Alert variant="warning" className="mb-0 mt-3">
                    <Alert.Heading className="h6">Warnings:</Alert.Heading>
                    <ul className="mb-0">
                      {trainingStatus.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </Alert>
                )}

                {trainingStatus.status === "done" && trainingStatus.weights_path && (
                  <Alert variant="success" className="mb-0 mt-3">
                    <Alert.Heading className="h6">
                      <i className="bi bi-check-circle-fill me-2"></i>
                      Training Complete!
                    </Alert.Heading>
                    <p className="mb-0">
                      <strong>Weights saved to:</strong>
                      <br />
                      <code>{trainingStatus.weights_path}</code>
                    </p>
                  </Alert>
                )}
              </Card.Body>
            </Card>
          )}

          <div className="d-flex gap-2">
            <Button
              variant={isTraining ? "danger" : "success"}
              size="lg"
              onClick={isTraining ? handleStopTraining : handleStartTraining}
              disabled={loading}
            >
              {isTraining ? (
                <>
                  <i className="bi bi-stop-circle-fill me-2"></i>
                  Stop Training
                </>
              ) : (
                <>
                  <i className="bi bi-play-circle-fill me-2"></i>
                  Start Training
                </>
              )}
            </Button>

            {trainingStatus && (
              <Button
                variant="outline-info"
                size="lg"
                onClick={() => setShowTrainingModal(true)}
              >
                <i className="bi bi-bar-chart-fill me-2"></i>
                View Details
              </Button>
            )}
          </div>
        </Card.Body>
      </Card>

      {/* Quick Stats Card (if result exists) */}
      {result && !showResultModal && (
        <Card className="mb-4 border-success">
          <Card.Header className="bg-success text-white">
            <h5 className="mb-0">
              <i className="bi bi-graph-up me-2"></i>
              Last Preparation Summary
            </h5>
          </Card.Header>
          <Card.Body>
            <div className="row text-center">
              <div className="col-md-3">
                <div className="mb-2">
                  <i className="bi bi-images text-primary fs-3"></i>
                </div>
                <h4>{result.totalImages}</h4>
                <p className="text-muted mb-0">Total Images</p>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <i className="bi bi-download text-success fs-3"></i>
                </div>
                <h4>{result.downloaded}</h4>
                <p className="text-muted mb-0">Downloaded</p>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <i className="bi bi-tag text-info fs-3"></i>
                </div>
                <h4>{result.labeled}</h4>
                <p className="text-muted mb-0">Labeled</p>
              </div>
              <div className="col-md-3">
                <div className="mb-2">
                  <i className="bi bi-exclamation-triangle text-warning fs-3"></i>
                </div>
                <h4>{result.errors?.length || 0}</h4>
                <p className="text-muted mb-0">Errors</p>
              </div>
            </div>

            <div className="mt-3 text-center">
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => setShowResultModal(true)}
              >
                <i className="bi bi-eye me-1"></i>
                View Details
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Result Modal */}
      <Modal show={showResultModal} onHide={handleCloseModal} size="lg" centered>
        <Modal.Header closeButton className="bg-success text-white">
          <Modal.Title>
            <i className="bi bi-check-circle-fill me-2"></i>
            Dataset Preparation Complete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {result && (
            <>
              {/* Summary Stats */}
              <div className="row mb-4">
                <div className="col-6 col-md-3 text-center mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="fs-2 text-primary mb-1">
                      {result.totalImages}
                    </div>
                    <small className="text-muted">Total Images</small>
                  </div>
                </div>
                <div className="col-6 col-md-3 text-center mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="fs-2 text-warning mb-1">
                      {result.skippedAnnotated}
                    </div>
                    <small className="text-muted">Skipped</small>
                  </div>
                </div>
                <div className="col-6 col-md-3 text-center mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="fs-2 text-success mb-1">
                      {result.downloaded}
                    </div>
                    <small className="text-muted">Downloaded</small>
                  </div>
                </div>
                <div className="col-6 col-md-3 text-center mb-3">
                  <div className="p-3 bg-light rounded">
                    <div className="fs-2 text-info mb-1">
                      {result.labeled}
                    </div>
                    <small className="text-muted">Labeled</small>
                  </div>
                </div>
              </div>

              {/* Success Rate */}
              {result.totalImages > 0 && (
                <div className="mb-4">
                  <h6>Success Rate</h6>
                  <div className="progress" style={{ height: "25px" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{
                        width: `${
                          (result.downloaded /
                            (result.totalImages - result.skippedAnnotated)) *
                          100
                        }%`,
                      }}
                      aria-valuenow={result.downloaded}
                      aria-valuemin="0"
                      aria-valuemax={result.totalImages - result.skippedAnnotated}
                    >
                      {(
                        (result.downloaded /
                          (result.totalImages - result.skippedAnnotated)) *
                        100
                      ).toFixed(1)}
                      %
                    </div>
                  </div>
                </div>
              )}

              {/* Errors Table */}
              {result.errors && result.errors.length > 0 && (
                <>
                  <h6 className="text-danger">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Errors Encountered ({result.errors.length})
                  </h6>
                  <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                    <Table striped bordered hover size="sm">
                      <thead>
                        <tr>
                          <th>Image ID</th>
                          <th>Stage</th>
                          <th>Message</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.errors.map((err, idx) => (
                          <tr key={idx}>
                            <td>{err.imageId}</td>
                            <td>
                              <Badge
                                bg={
                                  err.stage === "download" ? "danger" : "warning"
                                }
                              >
                                {err.stage}
                              </Badge>
                            </td>
                            <td className="text-break">{err.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}

              {/* Output Location */}
              <Alert variant="info" className="mt-3 mb-0">
                <Alert.Heading className="h6">
                  <i className="bi bi-folder-fill me-2"></i>
                  Dataset Location
                </Alert.Heading>
                <p className="mb-1">
                  <strong>Images:</strong>{" "}
                  <code>tf_model/new_dataset/images/</code>
                </p>
                <p className="mb-0">
                  <strong>Labels:</strong>{" "}
                  <code>tf_model/new_dataset/labels/</code>
                </p>
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Training Details Modal */}
      <Modal show={showTrainingModal} onHide={handleCloseTrainingModal} size="xl" centered>
        <Modal.Header closeButton className="bg-info text-white">
          <Modal.Title>
            <i className="bi bi-bar-chart-fill me-2"></i>
            Training Details & Metrics
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {trainingStatus && (
            <>
              {/* Status Banner */}
              <Alert
                variant={
                  trainingStatus.status === "done"
                    ? "success"
                    : trainingStatus.status === "error"
                    ? "danger"
                    : trainingStatus.status === "running"
                    ? "info"
                    : "secondary"
                }
                className="mb-4"
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Status:</strong>{" "}
                    {trainingStatus.status === "done" && (
                      <span>
                        <i className="bi bi-check-circle-fill me-1"></i>
                        Training Completed Successfully
                      </span>
                    )}
                    {trainingStatus.status === "running" && (
                      <span>
                        <Spinner animation="border" size="sm" className="me-1" />
                        Training in Progress...
                      </span>
                    )}
                    {trainingStatus.status === "error" && (
                      <span>
                        <i className="bi bi-x-circle-fill me-1"></i>
                        Training Failed
                      </span>
                    )}
                    {trainingStatus.status === "idle" && <span>Idle</span>}
                  </div>
                  <div>
                    <Badge bg="light" text="dark" className="fs-6">
                      Epoch {trainingStatus.current_epoch || 0} /{" "}
                      {trainingStatus.total_epochs}
                    </Badge>
                  </div>
                </div>
              </Alert>

              {/* Training Progress */}
              <div className="mb-4">
                <h6>Overall Progress</h6>
                <ProgressBar
                  now={
                    trainingStatus.current_epoch && trainingStatus.total_epochs
                      ? (trainingStatus.current_epoch / trainingStatus.total_epochs) * 100
                      : 0
                  }
                  label={`${
                    trainingStatus.current_epoch && trainingStatus.total_epochs
                      ? ((trainingStatus.current_epoch / trainingStatus.total_epochs) * 100).toFixed(1)
                      : 0
                  }%`}
                  variant={
                    trainingStatus.status === "done"
                      ? "success"
                      : trainingStatus.status === "error"
                      ? "danger"
                      : "primary"
                  }
                  animated={trainingStatus.status === "running"}
                  striped
                  style={{ height: "30px" }}
                />
              </div>

              {/* Time Information */}
              {trainingStatus.started_at && (
                <Row className="mb-4">
                  <Col md={6}>
                    <Card className="border-0 bg-light">
                      <Card.Body>
                        <small className="text-muted">Started At</small>
                        <div className="fw-bold">
                          {new Date(trainingStatus.started_at).toLocaleString()}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  {trainingStatus.finished_at && (
                    <Col md={6}>
                      <Card className="border-0 bg-light">
                        <Card.Body>
                          <small className="text-muted">Finished At</small>
                          <div className="fw-bold">
                            {new Date(trainingStatus.finished_at).toLocaleString()}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  )}
                </Row>
              )}

              {/* Metrics Table */}
              {trainingStatus.metrics && trainingStatus.metrics.length > 0 && (
                <>
                  <h6>Training Metrics History</h6>
                  <div style={{ maxHeight: "400px", overflowY: "auto" }} className="mb-4">
                    <Table striped bordered hover size="sm">
                      <thead className="sticky-top bg-white">
                        <tr>
                          <th>Epoch</th>
                          <th>Train Loss</th>
                          <th>Val Loss</th>
                          <th>Precision</th>
                          <th>Recall</th>
                          <th>mAP50</th>
                          <th>mAP50-95</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trainingStatus.metrics.map((metric, idx) => (
                          <tr key={idx}>
                            <td>
                              <Badge bg="secondary">{metric.epoch}</Badge>
                            </td>
                            <td className="text-primary fw-bold">
                              {metric.train_loss?.toFixed(4) || "N/A"}
                            </td>
                            <td className="text-danger fw-bold">
                              {metric.val_loss?.toFixed(4) || "N/A"}
                            </td>
                            <td className="text-success">
                              {metric.precision?.toFixed(3) || "N/A"}
                            </td>
                            <td className="text-info">
                              {metric.recall?.toFixed(3) || "N/A"}
                            </td>
                            <td className="text-warning fw-bold">
                              {metric.mAP50?.toFixed(3) || "N/A"}
                            </td>
                            <td>{metric.mAP50_95?.toFixed(3) || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </>
              )}

              {/* Latest Metrics Cards */}
              {trainingStatus.metrics && trainingStatus.metrics.length > 0 && (
                <>
                  <h6>Latest Epoch Metrics</h6>
                  <Row className="mb-4">
                    <Col xs={6} md={4} lg={2}>
                      <Card className="border-primary">
                        <Card.Body className="text-center p-2">
                          <small className="text-muted d-block">Train Loss</small>
                          <div className="fs-5 fw-bold text-primary">
                            {trainingStatus.metrics[trainingStatus.metrics.length - 1].train_loss?.toFixed(4) || "N/A"}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6} md={4} lg={2}>
                      <Card className="border-danger">
                        <Card.Body className="text-center p-2">
                          <small className="text-muted d-block">Val Loss</small>
                          <div className="fs-5 fw-bold text-danger">
                            {trainingStatus.metrics[trainingStatus.metrics.length - 1].val_loss?.toFixed(4) || "N/A"}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6} md={4} lg={2}>
                      <Card className="border-success">
                        <Card.Body className="text-center p-2">
                          <small className="text-muted d-block">Precision</small>
                          <div className="fs-5 fw-bold text-success">
                            {trainingStatus.metrics[trainingStatus.metrics.length - 1].precision?.toFixed(3) || "N/A"}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6} md={4} lg={2}>
                      <Card className="border-info">
                        <Card.Body className="text-center p-2">
                          <small className="text-muted d-block">Recall</small>
                          <div className="fs-5 fw-bold text-info">
                            {trainingStatus.metrics[trainingStatus.metrics.length - 1].recall?.toFixed(3) || "N/A"}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6} md={4} lg={2}>
                      <Card className="border-warning">
                        <Card.Body className="text-center p-2">
                          <small className="text-muted d-block">mAP50</small>
                          <div className="fs-5 fw-bold text-warning">
                            {trainingStatus.metrics[trainingStatus.metrics.length - 1].mAP50?.toFixed(3) || "N/A"}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col xs={6} md={4} lg={2}>
                      <Card className="border-secondary">
                        <Card.Body className="text-center p-2">
                          <small className="text-muted d-block">mAP50-95</small>
                          <div className="fs-5 fw-bold">
                            {trainingStatus.metrics[trainingStatus.metrics.length - 1].mAP50_95?.toFixed(3) || "N/A"}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  </Row>
                </>
              )}

              {/* Warnings */}
              {trainingStatus.warnings && trainingStatus.warnings.length > 0 && (
                <Alert variant="warning" className="mb-4">
                  <Alert.Heading className="h6">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    Warnings
                  </Alert.Heading>
                  <ul className="mb-0">
                    {trainingStatus.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {/* Error */}
              {trainingStatus.error && (
                <Alert variant="danger" className="mb-4">
                  <Alert.Heading className="h6">
                    <i className="bi bi-x-circle-fill me-2"></i>
                    Error
                  </Alert.Heading>
                  <p className="mb-0 text-break">{trainingStatus.error}</p>
                </Alert>
              )}

              {/* Weights Path */}
              {trainingStatus.weights_path && (
                <Alert variant="success" className="mb-0">
                  <Alert.Heading className="h6">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    Model Weights Saved
                  </Alert.Heading>
                  <p className="mb-0">
                    <strong>Path:</strong>
                    <br />
                    <code className="d-block mt-1 p-2 bg-light text-dark rounded">
                      {trainingStatus.weights_path}
                    </code>
                  </p>
                </Alert>
              )}

              {/* Configuration */}
              {trainingStatus.config && (
                <Card className="mt-4 border-secondary">
                  <Card.Header className="bg-light">
                    <h6 className="mb-0">
                      <i className="bi bi-gear-fill me-2"></i>
                      Training Configuration
                    </h6>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={6}>
                        <small className="text-muted">Epochs:</small>
                        <div className="fw-bold">{trainingStatus.config.epochs}</div>
                      </Col>
                      <Col md={6}>
                        <small className="text-muted">Batch Size:</small>
                        <div className="fw-bold">{trainingStatus.config.batch_size}</div>
                      </Col>
                      <Col md={6}>
                        <small className="text-muted">Learning Rate:</small>
                        <div className="fw-bold">{trainingStatus.config.learning_rate}</div>
                      </Col>
                      <Col md={6}>
                        <small className="text-muted">Image Size:</small>
                        <div className="fw-bold">{trainingStatus.config.image_size}x{trainingStatus.config.image_size}</div>
                      </Col>
                      <Col md={6}>
                        <small className="text-muted">GPU:</small>
                        <div className="fw-bold">
                          {trainingStatus.config.use_gpu ? (
                            <Badge bg="success">Enabled</Badge>
                          ) : (
                            <Badge bg="secondary">Disabled</Badge>
                          )}
                        </div>
                      </Col>
                      {trainingStatus.config.seed && (
                        <Col md={6}>
                          <small className="text-muted">Random Seed:</small>
                          <div className="fw-bold">{trainingStatus.config.seed}</div>
                        </Col>
                      )}
                    </Row>
                  </Card.Body>
                </Card>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseTrainingModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Model Selection Modal */}
      <Modal show={showModelModal} onHide={handleCloseModelModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-diagram-3-fill me-2"></i>
            Choose Defect Detection Model
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modelError && (
            <Alert variant="danger" dismissible onClose={() => setModelError(null)}>
              {modelError}
            </Alert>
          )}

          {loadingModels ? (
            <div className="text-center py-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading models...</span>
              </Spinner>
              <p className="mt-3 text-muted">Loading available models...</p>
            </div>
          ) : (
            <>
              {models.length === 0 ? (
                <Alert variant="info">
                  <i className="bi bi-info-circle me-2"></i>
                  No models found. Train a model first.
                </Alert>
              ) : (
                <>
                  <p className="text-muted mb-3">
                    Select a model to use for defect detection. Models are sorted by modification date (newest first).
                  </p>

                  {/* Updated Models Section */}
                  {models.filter(m => m.dir === "updated_defect").length > 0 && (
                    <>
                      <h6 className="text-primary mb-2">
                        <i className="bi bi-stars me-2"></i>
                        Updated Models (Retrained)
                      </h6>
                      <Table hover size="sm" className="mb-4">
                        <thead>
                          <tr>
                            <th style={{width: "40px"}}></th>
                            <th>Model Name</th>
                            <th>Size</th>
                            <th>Last Modified</th>
                          </tr>
                        </thead>
                        <tbody>
                          {models.filter(m => m.dir === "updated_defect").map((model) => (
                            <tr
                              key={model.path}
                              onClick={() => setSelectedModelPath(model.path)}
                              style={{ cursor: "pointer" }}
                              className={selectedModelPath === model.path ? "table-active" : ""}
                            >
                              <td>
                                <Form.Check
                                  type="radio"
                                  name="modelSelection"
                                  checked={selectedModelPath === model.path}
                                  onChange={() => setSelectedModelPath(model.path)}
                                />
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <i className="bi bi-file-earmark-arrow-up text-primary me-2"></i>
                                  {model.name}
                                  {activeModel && activeModel.path === model.path && (
                                    <Badge bg="success" className="ms-2">Active</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="text-muted">{formatBytes(model.size_bytes)}</td>
                              <td className="text-muted small">{formatDate(model.modified)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  )}

                  {/* Base Models Section */}
                  {models.filter(m => m.dir === "defects").length > 0 && (
                    <>
                      <h6 className="text-secondary mb-2">
                        <i className="bi bi-box me-2"></i>
                        Base Models
                      </h6>
                      <Table hover size="sm">
                        <thead>
                          <tr>
                            <th style={{width: "40px"}}></th>
                            <th>Model Name</th>
                            <th>Size</th>
                            <th>Last Modified</th>
                          </tr>
                        </thead>
                        <tbody>
                          {models.filter(m => m.dir === "defects").map((model) => (
                            <tr
                              key={model.path}
                              onClick={() => setSelectedModelPath(model.path)}
                              style={{ cursor: "pointer" }}
                              className={selectedModelPath === model.path ? "table-active" : ""}
                            >
                              <td>
                                <Form.Check
                                  type="radio"
                                  name="modelSelection"
                                  checked={selectedModelPath === model.path}
                                  onChange={() => setSelectedModelPath(model.path)}
                                />
                              </td>
                              <td>
                                <div className="d-flex align-items-center">
                                  <i className="bi bi-file-earmark text-secondary me-2"></i>
                                  {model.name}
                                  {activeModel && activeModel.path === model.path && (
                                    <Badge bg="success" className="ms-2">Active</Badge>
                                  )}
                                </div>
                              </td>
                              <td className="text-muted">{formatBytes(model.size_bytes)}</td>
                              <td className="text-muted small">{formatDate(model.modified)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModelModal}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSelectModel}
            disabled={!selectedModelPath || loadingModels}
          >
            {loadingModels ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  className="me-2"
                />
                Loading...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Select Model
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="p-3" style={{ zIndex: 9999 }}>
        <Toast
          show={showToast}
          onClose={() => setShowToast(false)}
          delay={5000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header>
            <strong className="me-auto">Model Selection</strong>
          </Toast.Header>
          <Toast.Body className="text-white">
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>
    </div>
  );
}