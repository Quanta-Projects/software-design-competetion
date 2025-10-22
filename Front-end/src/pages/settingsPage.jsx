// src/pages/SettingsPage.jsx
import { useState } from "react";
import { Button, Card, Alert, Spinner, Badge, Modal, Table } from "react-bootstrap";
import { getFastApiUrl } from "../utils/config";

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);

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

  return (
    <div className="container-fluid py-4">
      <h2 className="mb-4">⚙️ Settings & Tools</h2>

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
    </div>
  );
}