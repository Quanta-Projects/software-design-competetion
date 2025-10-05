import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Badge, Alert } from 'react-bootstrap';
import { getRestApiUrl } from '../utils/config';

/**
 * Interactive Annotation Editor Component
 * Allows users to view, edit, add, and delete thermal anomaly annotations
 */
export default function AnnotationEditor({ 
  imageUrl, 
  imageId, 
  annotations = [], 
  onAnnotationsChange,
  readOnly = false,
  selectedAnnotation = null  // Annotation to highlight (from external selection)
}) {
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragState, setDragState] = useState(null);
  const [newAnnotation, setNewAnnotation] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState(null);

  // Anomaly class definitions (matching YOLO model)
  const anomalyClasses = [
    { id: 0, name: "Loose Joint (Faulty)", color: "#dc3545", severity: "CRITICAL" },
    { id: 1, name: "Loose Joint (Potential)", color: "#fd7e14", severity: "HIGH" },
    { id: 2, name: "Overheating (Faulty)", color: "#dc3545", severity: "CRITICAL" },
    { id: 3, name: "Overheating (Potential)", color: "#fd7e14", severity: "HIGH" },
    { id: 4, name: "Warm Area (Likely Normal)", color: "#28a745", severity: "LOW" },
    { id: 5, name: "Warm Area (Potential Issue)", color: "#ffc107", severity: "MEDIUM" },
    { id: 6, name: "Cooling System Issue", color: "#007bff", severity: "MEDIUM" }
  ];

  const getClassById = (classId) => anomalyClasses.find(c => c.id === classId) || anomalyClasses[0];

  // Initialize canvas and image
  useEffect(() => {
    if (imageUrl && imageRef.current && canvasRef.current) {
      const img = imageRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      const handleImageLoad = () => {
        // Set canvas size to match image
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        
        // Calculate scale to fit container
        const containerWidth = canvas.parentElement.clientWidth;
        const containerHeight = Math.min(600, img.naturalHeight * (containerWidth / img.naturalWidth));
        
        const scaleX = containerWidth / img.naturalWidth;
        const scaleY = containerHeight / img.naturalHeight;
        const newScale = Math.min(scaleX, scaleY);
        
        setScale(newScale);
        canvas.style.width = `${img.naturalWidth * newScale}px`;
        canvas.style.height = `${img.naturalHeight * newScale}px`;
        
        setIsLoaded(true);
        drawAnnotations();
      };

      if (img.complete) {
        handleImageLoad();
      } else {
        img.onload = handleImageLoad;
      }
    }
  }, [imageUrl, annotations]);

  // When selectedAnnotation changes, scroll it into view and highlight it
  useEffect(() => {
    if (selectedAnnotation && isLoaded) {
      // Redraw to highlight the selected annotation
      drawAnnotations();
    }
  }, [selectedAnnotation, isLoaded]);

  // Draw annotations on canvas
  const drawAnnotations = useCallback(() => {
    if (!canvasRef.current || !imageRef.current || !isLoaded) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0);

    // Draw annotations
    annotations.forEach((annotation, index) => {
      if (!annotation.isActive) return;

      const classInfo = getClassById(annotation.classId);
      // Highlight if either editing OR selected from list
      const isEditing = editingAnnotation?.id === annotation.id;
      const isHighlighted = selectedAnnotation?.id === annotation.id;
      const shouldHighlight = isEditing || isHighlighted;
      
      // Draw bounding box with highlight
      ctx.strokeStyle = shouldHighlight ? '#00ff00' : classInfo.color;
      ctx.lineWidth = shouldHighlight ? 4 : 2;
      ctx.setLineDash(shouldHighlight ? [5, 5] : []);
      
      const x = annotation.bboxX1;
      const y = annotation.bboxY1;
      const width = annotation.bboxX2 - annotation.bboxX1;
      const height = annotation.bboxY2 - annotation.bboxY1;
      
      ctx.strokeRect(x, y, width, height);

      // Draw label background
      const label = `${annotation.className} (${(annotation.confidenceScore * 100).toFixed(0)}%)`;
      ctx.font = '14px Arial';
      const textMetrics = ctx.measureText(label);
      const labelHeight = 20;
      
      ctx.fillStyle = classInfo.color;
      ctx.fillRect(x, y - labelHeight, textMetrics.width + 8, labelHeight);
      
      // Draw label text
      ctx.fillStyle = 'white';
      ctx.fillText(label, x + 4, y - 6);

      // Draw resize handles if being edited (not just highlighted from list)
      if (isEditing && !readOnly) {
        const handleSize = 8;
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize);
        ctx.fillRect(x + width - handleSize/2, y - handleSize/2, handleSize, handleSize);
        ctx.fillRect(x - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
        ctx.fillRect(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleSize);
      }
    });

    // Draw new annotation being created
    if (newAnnotation) {
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        newAnnotation.startX,
        newAnnotation.startY,
        newAnnotation.currentX - newAnnotation.startX,
        newAnnotation.currentY - newAnnotation.startY
      );
    }
  }, [annotations, editingAnnotation, newAnnotation, isLoaded, readOnly, selectedAnnotation]);

  // Redraw when annotations change
  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  // Convert canvas coordinates to image coordinates
  const canvasToImageCoords = (canvasX, canvasY) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (canvasX - rect.left) / scale;
    const y = (canvasY - rect.top) / scale;
    return { x, y };
  };

  // Handle mouse events for annotation editing
  const handleMouseDown = (e) => {
    if (readOnly) return;

    const { x, y } = canvasToImageCoords(e.clientX, e.clientY);
    
    // Check if clicking on an existing annotation
    const clickedAnnotation = annotations.find(ann => 
      ann.isActive &&
      x >= ann.bboxX1 && x <= ann.bboxX2 &&
      y >= ann.bboxY1 && y <= ann.bboxY2
    );

    if (clickedAnnotation) {
      setEditingAnnotation(clickedAnnotation);
      
      // Check if clicking on resize handle
      const handleSize = 8 / scale;
      const isNearCorner = (cornerX, cornerY) => 
        Math.abs(x - cornerX) < handleSize && Math.abs(y - cornerY) < handleSize;

      if (isNearCorner(clickedAnnotation.bboxX1, clickedAnnotation.bboxY1)) {
        setDragState({ type: 'resize', corner: 'tl', annotation: clickedAnnotation });
      } else if (isNearCorner(clickedAnnotation.bboxX2, clickedAnnotation.bboxY1)) {
        setDragState({ type: 'resize', corner: 'tr', annotation: clickedAnnotation });
      } else if (isNearCorner(clickedAnnotation.bboxX1, clickedAnnotation.bboxY2)) {
        setDragState({ type: 'resize', corner: 'bl', annotation: clickedAnnotation });
      } else if (isNearCorner(clickedAnnotation.bboxX2, clickedAnnotation.bboxY2)) {
        setDragState({ type: 'resize', corner: 'br', annotation: clickedAnnotation });
      } else {
        setDragState({ type: 'move', annotation: clickedAnnotation, startX: x, startY: y });
      }
    } else {
      // Start drawing new annotation
      setNewAnnotation({ startX: x, startY: y, currentX: x, currentY: y });
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e) => {
    if (readOnly) return;

    const { x, y } = canvasToImageCoords(e.clientX, e.clientY);

    if (isDrawing && newAnnotation) {
      setNewAnnotation(prev => ({ ...prev, currentX: x, currentY: y }));
      drawAnnotations();
    } else if (dragState) {
      handleAnnotationDrag(x, y);
    }
  };

  const handleMouseUp = (e) => {
    if (readOnly) return;

    if (isDrawing && newAnnotation) {
      const { x, y } = canvasToImageCoords(e.clientX, e.clientY);
      
      // Ensure minimum size
      const minSize = 20;
      if (Math.abs(x - newAnnotation.startX) > minSize && Math.abs(y - newAnnotation.startY) > minSize) {
        const bbox = {
          bboxX1: Math.min(newAnnotation.startX, x),
          bboxY1: Math.min(newAnnotation.startY, y),
          bboxX2: Math.max(newAnnotation.startX, x),
          bboxY2: Math.max(newAnnotation.startY, y)
        };
        
        // Show edit modal for new annotation
        setEditingAnnotation({
          ...bbox,
          classId: 1, // Default to "Loose Joint (Potential)"
          className: "Loose Joint (Potential)",
          confidenceScore: 0.8,
          annotationType: "USER_ADDED",
          isNew: true
        });
        setShowEditModal(true);
      }
      
      setNewAnnotation(null);
      setIsDrawing(false);
    }
    
    setDragState(null);
  };

  const handleAnnotationDrag = (x, y) => {
    if (!dragState) return;

    const { annotation } = dragState;
    let updatedAnnotation = { ...annotation };

    if (dragState.type === 'move') {
      const deltaX = x - dragState.startX;
      const deltaY = y - dragState.startY;
      
      updatedAnnotation.bboxX1 += deltaX;
      updatedAnnotation.bboxX2 += deltaX;
      updatedAnnotation.bboxY1 += deltaY;
      updatedAnnotation.bboxY2 += deltaY;
      
      setDragState(prev => ({ ...prev, startX: x, startY: y }));
    } else if (dragState.type === 'resize') {
      switch (dragState.corner) {
        case 'tl':
          updatedAnnotation.bboxX1 = x;
          updatedAnnotation.bboxY1 = y;
          break;
        case 'tr':
          updatedAnnotation.bboxX2 = x;
          updatedAnnotation.bboxY1 = y;
          break;
        case 'bl':
          updatedAnnotation.bboxX1 = x;
          updatedAnnotation.bboxY2 = y;
          break;
        case 'br':
          updatedAnnotation.bboxX2 = x;
          updatedAnnotation.bboxY2 = y;
          break;
      }
    }

    // Update annotation in the list
    const updatedAnnotations = annotations.map(ann => 
      ann.id === annotation.id ? updatedAnnotation : ann
    );
    onAnnotationsChange(updatedAnnotations);
  };

  // Save annotation changes to backend
  const saveAnnotation = async (annotationData) => {
    try {
      const url = annotationData.isNew 
        ? getRestApiUrl('annotations')
        : getRestApiUrl(`annotations/${annotationData.id}`);
      
      const method = annotationData.isNew ? 'POST' : 'PUT';
      
      const requestData = {
        imageId: imageId,
        classId: annotationData.classId,
        className: annotationData.className,
        confidenceScore: annotationData.confidenceScore,
        bboxX1: annotationData.bboxX1,
        bboxY1: annotationData.bboxY1,
        bboxX2: annotationData.bboxX2,
        bboxY2: annotationData.bboxY2,
        annotationType: annotationData.annotationType || 'USER_EDITED',
        userId: 'current_user', // Replace with actual user ID
        comments: annotationData.comments
      };

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (response.ok) {
        const savedAnnotation = await response.json();
        
        if (annotationData.isNew) {
          onAnnotationsChange([...annotations, savedAnnotation]);
        } else {
          const updatedAnnotations = annotations.map(ann => 
            ann.id === annotationData.id ? savedAnnotation : ann
          );
          onAnnotationsChange(updatedAnnotations);
        }
        
        setShowEditModal(false);
        setEditingAnnotation(null);
        setError(null);
      } else {
        throw new Error('Failed to save annotation');
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
      setError('Failed to save annotation. Please try again.');
    }
  };

  // Delete annotation
  const deleteAnnotation = async (annotationId) => {
    try {
      const response = await fetch(getRestApiUrl(`annotations/${annotationId}?userId=current_user`), {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedAnnotations = annotations.filter(ann => ann.id !== annotationId);
        onAnnotationsChange(updatedAnnotations);
        setShowEditModal(false);
        setEditingAnnotation(null);
        setError(null);
      } else {
        throw new Error('Failed to delete annotation');
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
      setError('Failed to delete annotation. Please try again.');
    }
  };

  return (
    <div className="annotation-editor">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Thermal Anomaly Annotations ({annotations.filter(a => a.isActive).length})</h6>
        {!readOnly && (
          <small className="text-muted">
            Click and drag to create new annotations. Click existing annotations to edit.
          </small>
        )}
      </div>

      <div className="position-relative border rounded overflow-hidden" style={{ backgroundColor: '#f8f9fa' }}>
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Thermal Image"
          style={{ display: 'none' }}
          crossOrigin="anonymous"
        />
        <canvas
          ref={canvasRef}
          className="d-block"
          style={{ cursor: readOnly ? 'default' : 'crosshair', maxWidth: '100%' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      {/* Annotation Legend */}
      <div className="mt-3">
        <small className="text-muted d-block mb-2">Anomaly Types:</small>
        <div className="d-flex flex-wrap gap-2">
          {anomalyClasses.map(classInfo => {
            const count = annotations.filter(a => a.isActive && a.classId === classInfo.id).length;
            return count > 0 ? (
              <Badge 
                key={classInfo.id} 
                style={{ backgroundColor: classInfo.color }}
                className="d-flex align-items-center"
              >
                {classInfo.name} ({count})
              </Badge>
            ) : null;
          })}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {editingAnnotation?.isNew ? 'Add New' : 'Edit'} Annotation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingAnnotation && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Anomaly Type</Form.Label>
                <Form.Select
                  value={editingAnnotation.classId}
                  onChange={(e) => {
                    const classId = parseInt(e.target.value);
                    const classInfo = getClassById(classId);
                    setEditingAnnotation(prev => ({
                      ...prev,
                      classId: classId,
                      className: classInfo.name
                    }));
                  }}
                >
                  {anomalyClasses.map(classInfo => (
                    <option key={classInfo.id} value={classInfo.id}>
                      {classInfo.name} ({classInfo.severity})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Confidence Score</Form.Label>
                <Form.Range
                  min="0"
                  max="1"
                  step="0.01"
                  value={editingAnnotation.confidenceScore}
                  onChange={(e) => setEditingAnnotation(prev => ({
                    ...prev,
                    confidenceScore: parseFloat(e.target.value)
                  }))}
                />
                <small className="text-muted">
                  {(editingAnnotation.confidenceScore * 100).toFixed(1)}%
                </small>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Comments</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={editingAnnotation.comments || ''}
                  onChange={(e) => setEditingAnnotation(prev => ({
                    ...prev,
                    comments: e.target.value
                  }))}
                  placeholder="Optional comments about this annotation..."
                />
              </Form.Group>

              <div className="text-muted small">
                Position: ({editingAnnotation.bboxX1?.toFixed(0)}, {editingAnnotation.bboxY1?.toFixed(0)}) 
                to ({editingAnnotation.bboxX2?.toFixed(0)}, {editingAnnotation.bboxY2?.toFixed(0)})
              </div>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          {!editingAnnotation?.isNew && (
            <Button 
              variant="danger" 
              onClick={() => deleteAnnotation(editingAnnotation.id)}
            >
              Delete
            </Button>
          )}
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => saveAnnotation(editingAnnotation)}>
            {editingAnnotation?.isNew ? 'Add' : 'Save'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}