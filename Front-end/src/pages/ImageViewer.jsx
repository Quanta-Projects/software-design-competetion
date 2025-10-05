import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Nav, Badge } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import AnnotationEditor from '../components/AnnotationEditor';
import AnnotationList from '../components/AnnotationList';
import { getRestApiUrl } from '../utils/config';

/**
 * ImageViewer Component
 * 
 * Purpose: Display thermal images with annotation capabilities
 * Features:
 * - View original and annotated thermal images side-by-side
 * - Edit and manage AI-detected annotations
 * - View detection statistics and image details
 */
export default function ImageViewer() {
  // Get the image ID from the URL
  const { imageId } = useParams();
  const navigate = useNavigate();
  
  // State management for image and annotations
  const [imageData, setImageData] = useState(null);           // Main image data
  const [annotatedImage, setAnnotatedImage] = useState(null); // AI-annotated version (if exists)
  const [annotations, setAnnotations] = useState([]);         // List of all annotations
  const [loading, setLoading] = useState(true);               // Loading state
  const [error, setError] = useState(null);                   // Error messages
  const [selectedAnnotation, setSelectedAnnotation] = useState(null); // Currently selected annotation
  const [activeTab, setActiveTab] = useState('editor');       // Active tab: 'editor' or 'comparison'
  
  
  // ========================================
  // DATA LOADING FUNCTIONS
  // ========================================
  
  /**
   * Load all data when component mounts or imageId changes
   */
  useEffect(() => {
    if (imageId) {
      loadImageData();
      loadAnnotations();
      loadAnnotatedImage();
    }
  }, [imageId]);

  /**
   * Fetch the main image data from the backend
   */
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

  /**
   * Fetch all annotations for this image
   */
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

  /**
   * Try to find and load the AI-annotated version of this image
   * Searches by inspection ID first, then by transformer ID
   */
  const loadAnnotatedImage = async () => {
    try {
      // Get the original image data to find related annotated images
      const originalResponse = await fetch(getRestApiUrl(`images/${imageId}`));
      if (!originalResponse.ok) return;
      
      const originalImage = await originalResponse.json();
      
      // Strategy 1: Search by inspection ID (most accurate)
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
            return; // Found it, exit early
          }
        }
      }
      
      // Strategy 2: Search by transformer ID (fallback)
      if (originalImage.transformerId) {
        const transformerResponse = await fetch(getRestApiUrl(`images/transformer/${originalImage.transformerId}`));
        if (transformerResponse.ok) {
          const images = await transformerResponse.json();
          // Find the most recent annotated image for this transformer
          const annotatedImg = images.find(img => 
            img.imageType === 'ANNOTATED' &&
            new Date(img.uploadDate) >= new Date(originalImage.uploadDate)
          );
          if (annotatedImg) {
            setAnnotatedImage(annotatedImg);
          }
        }
      }
    } catch (error) {
      console.error('Error loading annotated image:', error);
      // Don't show error to user - annotated image is optional
    }
  };

  // ========================================
  // EVENT HANDLERS
  // ========================================

  /**
   * Handle when annotations are updated in the editor
   */
  const handleAnnotationsChange = (updatedAnnotations) => {
    setAnnotations(updatedAnnotations);
    // Refresh annotated image in case a new one was generated
    loadAnnotatedImage();
  };

  /**
   * Handle when user clicks on an annotation in the list
   * Switches to editor tab and scrolls to the annotation editor
   */
  const handleAnnotationSelect = (annotation) => {
    setSelectedAnnotation(annotation);
    setActiveTab('editor');
    
    // Smoothly scroll to the annotation editor
    setTimeout(() => {
      const editorElement = document.getElementById('annotation-editor');
      if (editorElement) {
        editorElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100); // Small delay to ensure tab switch completes
  };

  /**
   * Clear selection when switching tabs
   */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'editor') {
      setSelectedAnnotation(null); // Clear selection when leaving editor
    }
  };

  /**
   * Navigate back to the upload page with proper context
   */
  const handleBackToUpload = () => {
    const state = {};
    
    // Pass transformer and inspection IDs for context
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

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  /**
   * Get the URL for displaying an image
   * @param {string} imageType - Either 'ORIGINAL' or 'ANNOTATED'
   * @returns {string} The full URL to download the image
   */
  const getImageUrl = (imageType = 'ORIGINAL') => {
    if (!imageData) return '';
    
    if (imageType === 'ANNOTATED') {
      // Use annotated image if available, otherwise use original
      if (annotatedImage && annotatedImage.filePath) {
        return getRestApiUrl(`images/download/${annotatedImage.filePath}`);
      }
      return getRestApiUrl(`images/download/${imageData.filePath}`);
    }
    
    // Return original image URL
    return getRestApiUrl(`images/download/${imageData.filePath}`);
  };

  /**
   * Format file size from bytes to human-readable format
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted file size (e.g., "2.5 MB")
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format date to local string
   * @param {string} dateString - ISO date string
   * @returns {string} Formatted date and time
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  /**
   * Get count of active annotations (not deleted)
   */
  const getActiveAnnotations = () => {
    return annotations.filter(a => a.isActive);
  };

  // ========================================
  // RENDER LOADING STATE
  // ========================================

  // Show loading spinner while fetching data
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

  // ========================================
  // RENDER ERROR STATE
  // ========================================

  // Show error message if something went wrong
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

  // ========================================
  // RENDER MAIN CONTENT
  // ========================================

  return (
    <Container fluid className="py-4">
      <Row>
        {/* ========================================
            LEFT COLUMN - IMAGE VIEWER & EDITOR
            ======================================== */}
        <Col lg={8}>
          {/* Header with image info and actions */}
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

          {/* Tab Navigation - Switch between editor and comparison views */}
          <Nav variant="tabs" className="mb-3">
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'editor'} 
                onClick={() => handleTabChange('editor')}
              >
                Annotation Editor
              </Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'comparison'} 
                onClick={() => handleTabChange('comparison')}
              >
                Image Comparison
              </Nav.Link>
            </Nav.Item>
          </Nav>

          {/* Tab 1: Annotation Editor */}
          {activeTab === 'editor' && (
            <Card id="annotation-editor">
              <Card.Body>
                {/* Show selected annotation info with clear button */}
                {selectedAnnotation && (
                  <Alert variant="info" dismissible onClose={() => setSelectedAnnotation(null)} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>
                        <strong>Selected:</strong> {selectedAnnotation.className} 
                        <Badge bg="secondary" className="ms-2">
                          {(selectedAnnotation.confidenceScore * 100).toFixed(0)}%
                        </Badge>
                      </span>
                    </div>
                  </Alert>
                )}
                
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

          {/* Tab 2: Side-by-side comparison of original and annotated images */}
          {activeTab === 'comparison' && (
            <Row>
              {/* Original Image */}
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

              {/* Annotated Image */}
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

        {/* ========================================
            RIGHT COLUMN - SIDEBAR WITH DETAILS
            ======================================== */}
        <Col lg={4}>
          {/* Image Details Card */}
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
                <span className={getActiveAnnotations().length > 0 ? 'text-success' : 'text-muted'}>
                  {getActiveAnnotations().length > 0 ? 'Yes' : 'No'}
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

          {/* Annotation List Card - Click an annotation to highlight it in the editor */}
          <Card>
            <Card.Header>
              <strong>Annotations ({getActiveAnnotations().length})</strong>
              <div>
                <small className="text-muted">Click to highlight in image</small>
              </div>
            </Card.Header>
            <Card.Body>
              <AnnotationList
                annotations={annotations}
                onAnnotationsChange={handleAnnotationsChange}
                onAnnotationSelect={handleAnnotationSelect}
              />
            </Card.Body>
          </Card>

          {/* Detection Summary - Only show if there are annotations */}
          {getActiveAnnotations().length > 0 && (
            <Card className="mt-4">
              <Card.Header>
                <strong>Detection Summary</strong>
              </Card.Header>
              <Card.Body>
                {/* Total counts by source */}
                <div className="mb-2">
                  <strong>Total Annotations:</strong> {getActiveAnnotations().length}
                </div>
                <div className="mb-2">
                  <strong>Auto-Detected:</strong>{' '}
                  {getActiveAnnotations().filter(a => a.annotationType === 'AUTO_DETECTED').length}
                </div>
                <div className="mb-2">
                  <strong>User Modified:</strong>{' '}
                  {getActiveAnnotations().filter(a => 
                    ['USER_ADDED', 'USER_EDITED'].includes(a.annotationType)
                  ).length}
                </div>
                <div className="mb-2">
                  <strong>Confirmed:</strong>{' '}
                  {getActiveAnnotations().filter(a => a.annotationType === 'USER_CONFIRMED').length}
                </div>
                
                <hr />
                
                {/* Severity breakdown */}
                <div className="mb-2">
                  <strong>Critical Issues:</strong>{' '}
                  <span className="text-danger">
                    {getActiveAnnotations().filter(a => 
                      [0, 2].includes(a.classId) // Faulty conditions
                    ).length}
                  </span>
                </div>
                <div className="mb-2">
                  <strong>Potential Issues:</strong>{' '}
                  <span className="text-warning">
                    {getActiveAnnotations().filter(a => 
                      [1, 3, 5].includes(a.classId) // Potentially faulty
                    ).length}
                  </span>
                </div>
                <div className="mb-2">
                  <strong>Normal/Low Risk:</strong>{' '}
                  <span className="text-success">
                    {getActiveAnnotations().filter(a => 
                      [4, 6].includes(a.classId) // Normal/cooling issues
                    ).length}
                  </span>
                </div>
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}