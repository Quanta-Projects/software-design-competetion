import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Nav } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import AnnotationEditor from '../components/AnnotationEditor';
import AnnotationList from '../components/AnnotationList';
import { getRestApiUrl } from '../utils/config';

/**
 * Image Viewer Page with Annotation Management
 * Displays thermal images with editable annotations
 */
export default function ImageViewer() {
  const { imageId } = useParams();
  const navigate = useNavigate();
  
  const [imageData, setImageData] = useState(null);
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAnnotation, setSelectedAnnotation] = useState(null);
  const [activeTab, setActiveTab] = useState('editor');
  
  // Load image data and annotations
  useEffect(() => {
    if (imageId) {
      loadImageData();
      loadAnnotations();
      loadAnnotatedImage();
    }
  }, [imageId]);

  const loadImageData = async () => {
    try {
      const response = await fetch(getRestApiUrl(`images/${imageId}`));
      if (response.ok) {
        const image = await response.json();
        setImageData(image);
      } else {
        throw new Error('Failed to load image data');
      }
    } catch (error) {
      console.error('Error loading image:', error);
      setError('Failed to load image data. Please try again.');
    }
  };

  const loadAnnotations = async () => {
    try {
      const response = await fetch(getRestApiUrl(`annotations/image/${imageId}`));
      if (response.ok) {
        const annotationData = await response.json();
        setAnnotations(annotationData);
      } else {
        throw new Error('Failed to load annotations');
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
      setError('Failed to load annotations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadAnnotatedImage = async () => {
    try {
      // First get the original image data to get inspection/transformer info
      const originalResponse = await fetch(getRestApiUrl(`images/${imageId}`));
      if (!originalResponse.ok) return;
      
      const originalImage = await originalResponse.json();
      
      // Look for annotated image in the same inspection
      if (originalImage.inspectionId) {
        const inspectionResponse = await fetch(getRestApiUrl(`images/inspection/${originalImage.inspectionId}`));
        if (inspectionResponse.ok) {
          const images = await inspectionResponse.json();
          const annotatedImg = images.find(img => 
            img.imageType === 'ANNOTATED' && 
            img.transformerId === originalImage.transformerId
          );
          if (annotatedImg) {
            setAnnotatedImage(annotatedImg);
          }
        }
      } else if (originalImage.transformerId) {
        // If no inspection, look by transformer
        const transformerResponse = await fetch(getRestApiUrl(`images/transformer/${originalImage.transformerId}`));
        if (transformerResponse.ok) {
          const images = await transformerResponse.json();
          const annotatedImg = images.find(img => 
            img.imageType === 'ANNOTATED' &&
            // Find the most recent annotated image for this transformer
            new Date(img.uploadDate) >= new Date(originalImage.uploadDate)
          );
          if (annotatedImg) {
            setAnnotatedImage(annotatedImg);
          }
        }
      }
    } catch (error) {
      console.error('Error loading annotated image:', error);
      // Don't set error state for this, as annotated image is optional
    }
  };

  const handleAnnotationsChange = (updatedAnnotations) => {
    setAnnotations(updatedAnnotations);
    // Reload annotated image in case a new one was generated
    loadAnnotatedImage();
  };

  const handleAnnotationSelect = (annotation) => {
    setSelectedAnnotation(annotation);
    setActiveTab('editor');
    
    // Scroll to annotation editor
    const editorElement = document.getElementById('annotation-editor');
    if (editorElement) {
      editorElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBackToUpload = () => {
    // Navigate back to upload with proper state
    const state = {};
    
    if (imageData) {
      if (imageData.transformerId) {
        state.transformerId = imageData.transformerId;
      }
      if (imageData.inspectionId) {
        state.inspectionId = imageData.inspectionId;
      }
    }
    
    navigate('/upload', { state });
  };

  const getImageUrl = (imageType = 'ORIGINAL') => {
    if (!imageData) return '';
    
    switch (imageType) {
      case 'ANNOTATED':
        // Use the annotated image if available, otherwise fall back to original
        if (annotatedImage && annotatedImage.filePath) {
          return getRestApiUrl(`images/download/${annotatedImage.filePath}`);
        }
        // Fallback to original image if no annotated version exists
        return getRestApiUrl(`images/download/${imageData.filePath}`);
      case 'ORIGINAL':
      default:
        // Use the filePath (actual filename on disk) instead of fileName (original name)
        return getRestApiUrl(`images/download/${imageData.filePath}`);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Container className="py-4">
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading image and annotations...</p>
        </div>
      </Container>
    );
  }

  if (error || !imageData) {
    return (
      <Container className="py-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Image</Alert.Heading>
          <p>{error || 'Image not found.'}</p>
          <hr />
          <div className="d-flex justify-content-end">
            <Button variant="outline-danger" onClick={handleBackToUpload}>
              Go Back to Upload
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="py-4">
      <Row>
        {/* Main Content */}
        <Col lg={8}>
          <Card className="mb-4">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">{imageData.imageName}</h5>
                <small className="text-muted">
                  Uploaded: {formatDate(imageData.uploadTimestamp)} | 
                  Size: {formatFileSize(imageData.fileSize)} |
                  Type: {imageData.imageType}
                </small>
              </div>
              <div>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleBackToUpload}
                  className="me-2"
                >
                  Back to Upload
                </Button>
                {annotatedImage && (
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => window.open(getImageUrl('ANNOTATED'), '_blank')}
                  >
                    Download Annotated
                  </Button>
                )}
              </div>
            </Card.Header>
          </Card>

          {/* Tab Navigation */}
          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'editor'} 
                onClick={() => setActiveTab('editor')}
              >
                Annotation Editor
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'comparison'} 
                onClick={() => setActiveTab('comparison')}
              >
                Image Comparison
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* Tab Content */}
          {activeTab === 'editor' && (
            <Card id="annotation-editor">
              <Card.Body>
                <AnnotationEditor
                  imageUrl={getImageUrl('ORIGINAL')}
                  imageId={imageId}
                  annotations={annotations}
                  onAnnotationsChange={handleAnnotationsChange}
                  selectedAnnotation={selectedAnnotation}
                />
              </Card.Body>
            </Card>
          )}

          {activeTab === 'comparison' && (
            <Row>
              <Col md={6}>
                <Card>
                  <Card.Header>
                    <strong>Original Image</strong>
                  </Card.Header>
                  <Card.Body className="p-0">
                    <img
                      src={getImageUrl('ORIGINAL')}
                      alt="Original Thermal Image"
                      className="img-fluid w-100"
                      style={{ maxHeight: '500px', objectFit: 'contain' }}
                    />
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6}>
                <Card>
                  <Card.Header>
                    <strong>Annotated Image</strong>
                  </Card.Header>
                  <Card.Body className="p-0">
                    {annotatedImage ? (
                      <img
                        src={getImageUrl('ANNOTATED')}
                        alt="Annotated Thermal Image"
                        className="img-fluid w-100"
                        style={{ maxHeight: '500px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div className="text-center p-4 text-muted">
                        <p>No annotated version available</p>
                        <small>Annotations will be saved when you edit them</small>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}
        </Col>

        {/* Sidebar */}
        <Col lg={4}>
          {/* Image Details */}
          <Card className="mb-4">
            <Card.Header>
              <strong>Image Details</strong>
            </Card.Header>
            <Card.Body>
              <div className="mb-2">
                <strong>Filename:</strong> {imageData.imageName}
              </div>
              <div className="mb-2">
                <strong>File Size:</strong> {formatFileSize(imageData.fileSize)}
              </div>
              <div className="mb-2">
                <strong>Upload Date:</strong> {formatDate(imageData.uploadTimestamp)}
              </div>
              <div className="mb-2">
                <strong>Image Type:</strong> {imageData.imageType}
              </div>
              {imageData.description && (
                <div className="mb-2">
                  <strong>Description:</strong> {imageData.description}
                </div>
              )}
              <div className="mb-2">
                <strong>Has Annotations:</strong>{' '}
                <span className={annotations.filter(a => a.isActive).length > 0 ? 'text-success' : 'text-muted'}>
                  {annotations.filter(a => a.isActive).length > 0 ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="mb-2">
                <strong>Annotated Version:</strong>{' '}
                <span className={annotatedImage ? 'text-success' : 'text-muted'}>
                  {annotatedImage ? 'Available' : 'Not Available'}
                </span>
                {annotatedImage && (
                  <div>
                    <small className="text-muted">
                      Generated: {formatDate(annotatedImage.uploadDate)}
                    </small>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>

          {/* Annotation List */}
          <Card>
            <Card.Header>
              <strong>Annotations ({annotations.filter(a => a.isActive).length})</strong>
            </Card.Header>
            <Card.Body>
              <AnnotationList
                annotations={annotations}
                onAnnotationsChange={handleAnnotationsChange}
                onAnnotationSelect={handleAnnotationSelect}
              />
            </Card.Body>
          </Card>

          {/* Annotation Statistics */}
          {annotations.filter(a => a.isActive).length > 0 && (
            <Card className="mt-4">
              <Card.Header>
                <strong>Detection Summary</strong>
              </Card.Header>
              <Card.Body>
                <div className="mb-2">
                  <strong>Total Annotations:</strong> {annotations.filter(a => a.isActive).length}
                </div>
                <div className="mb-2">
                  <strong>Auto-Detected:</strong> {annotations.filter(a => a.isActive && a.annotationType === 'AUTO_DETECTED').length}
                </div>
                <div className="mb-2">
                  <strong>User Modified:</strong> {annotations.filter(a => a.isActive && ['USER_ADDED', 'USER_EDITED'].includes(a.annotationType)).length}
                </div>
                <div className="mb-2">
                  <strong>Confirmed:</strong> {annotations.filter(a => a.isActive && a.annotationType === 'USER_CONFIRMED').length}
                </div>
                
                <hr />
                
                <div className="mb-2">
                  <strong>Critical Issues:</strong> {annotations.filter(a => {
                    const classId = a.classId;
                    return a.isActive && (classId === 0 || classId === 2); // Faulty conditions
                  }).length}
                </div>
                <div className="mb-2">
                  <strong>Potential Issues:</strong> {annotations.filter(a => {
                    const classId = a.classId;
                    return a.isActive && (classId === 1 || classId === 3 || classId === 5); // Potential conditions
                  }).length}
                </div>
                <div className="mb-2">
                  <strong>Normal/Low Risk:</strong> {annotations.filter(a => {
                    const classId = a.classId;
                    return a.isActive && (classId === 4 || classId === 6); // Normal/cooling issues
                  }).length}
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>


    </Container>
  );
}