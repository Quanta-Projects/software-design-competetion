import React, { useState } from 'react';
import { Card, Badge, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { getRestApiUrl } from '../utils/config';

/**
 * Annotation List Component
 * Displays annotations in a searchable/filterable list
 */
export default function AnnotationList({ 
  annotations = [], 
  onAnnotationsChange, 
  onAnnotationSelect,
  readOnly = false 
}) {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingAnnotation, setEditingAnnotation] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Anomaly class definitions
  const anomalyClasses = [
    { id: 0, name: "Full Wire Overload PF", color: "#dc3545", severity: "CRITICAL" },
    { id: 1, name: "Loose Joint F", color: "#fd7e14", severity: "HIGH" },
    { id: 2, name: "Loose Joint PF", color: "#dc3545", severity: "CRITICAL" },
    { id: 3, name: "Point Overload F", color: "#fd7e14", severity: "HIGH" },
    { id: 4, name: "Point Overload PF", color: "#28a745", severity: "LOW" },
    { id: 5, name: "Transformer Overload", color: "#ffc107", severity: "MEDIUM" },
  ];

  const getClassById = (classId) => anomalyClasses.find(c => c.id === classId) || anomalyClasses[0];

  // Filter annotations based on search and filter criteria
  const filteredAnnotations = annotations.filter(annotation => {
    if (!annotation.isActive) return false;
    
    // Apply filter
    if (filter !== 'all') {
      const classInfo = getClassById(annotation.classId);
      if (filter !== classInfo.severity) return false;
    }
    
    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        annotation.className.toLowerCase().includes(searchLower) ||
        (annotation.comments && annotation.comments.toLowerCase().includes(searchLower)) ||
        annotation.annotationType.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // Group annotations by severity
  const groupedAnnotations = filteredAnnotations.reduce((groups, annotation) => {
    const classInfo = getClassById(annotation.classId);
    const severity = classInfo.severity;
    
    if (!groups[severity]) {
      groups[severity] = [];
    }
    groups[severity].push(annotation);
    return groups;
  }, {});

  // Sort severity levels
  const severityOrder = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const sortedGroups = severityOrder.filter(severity => groupedAnnotations[severity]);

  // Format timestamp
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  // Handle annotation confirmation
  const confirmAnnotation = async (annotationId) => {
    setLoading(true);
    try {
      const response = await fetch(getRestApiUrl(`annotations/${annotationId}/confirm?userId=current_user`), {
        method: 'POST'
      });

      if (response.ok) {
        const updatedAnnotation = await response.json();
        const updatedAnnotations = annotations.map(ann => 
          ann.id === annotationId ? updatedAnnotation : ann
        );
        onAnnotationsChange(updatedAnnotations);
        setError(null);
      } else {
        throw new Error('Failed to confirm annotation');
      }
    } catch (error) {
      console.error('Error confirming annotation:', error);
      setError('Failed to confirm annotation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle annotation edit
  const handleEdit = (annotation) => {
    setEditingAnnotation({ ...annotation });
    setShowEditModal(true);
  };

  // Save annotation changes
  const saveAnnotation = async () => {
    setLoading(true);
    try {
      const response = await fetch(getRestApiUrl(`annotations/${editingAnnotation.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editingAnnotation,
          annotationType: 'USER_EDITED',
          userId: 'current_user'
        })
      });

      if (response.ok) {
        const updatedAnnotation = await response.json();
        const updatedAnnotations = annotations.map(ann => 
          ann.id === editingAnnotation.id ? updatedAnnotation : ann
        );
        onAnnotationsChange(updatedAnnotations);
        setShowEditModal(false);
        setEditingAnnotation(null);
        setError(null);
      } else {
        throw new Error('Failed to save annotation');
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
      setError('Failed to save annotation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete annotation
  const deleteAnnotation = async (annotationId) => {
    if (!window.confirm('Are you sure you want to delete this annotation?')) return;

    setLoading(true);
    try {
      const response = await fetch(getRestApiUrl(`annotations/${annotationId}?userId=current_user`), {
        method: 'DELETE'
      });

      if (response.ok) {
        const updatedAnnotations = annotations.filter(ann => ann.id !== annotationId);
        onAnnotationsChange(updatedAnnotations);
        setError(null);
      } else {
        throw new Error('Failed to delete annotation');
      }
    } catch (error) {
      console.error('Error deleting annotation:', error);
      setError('Failed to delete annotation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'CRITICAL': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'secondary';
    }
  };

  const getAnnotationTypeColor = (type) => {
    switch (type) {
      case 'AUTO_DETECTED': return 'primary';
      case 'USER_ADDED': return 'success';
      case 'USER_EDITED': return 'info';
      case 'USER_CONFIRMED': return 'dark';
      default: return 'secondary';
    }
  };

  return (
    <div className="annotation-list">
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search and Filter Controls */}
      <div className="mb-3">
        <div className="row g-2">
          <div className="col-md-6">
            <Form.Control
              type="text"
              placeholder="Search annotations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <Form.Select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All Severities</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </Form.Select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="mb-3">
        <div className="d-flex flex-wrap gap-2">
          <Badge bg="secondary">
            Total: {annotations.filter(a => a.isActive).length}
          </Badge>
          {severityOrder.map(severity => {
            const count = annotations.filter(a => {
              const classInfo = getClassById(a.classId);
              return a.isActive && classInfo.severity === severity;
            }).length;
            return count > 0 ? (
              <Badge key={severity} bg={getSeverityColor(severity)}>
                {severity}: {count}
              </Badge>
            ) : null;
          })}
        </div>
      </div>

      {/* Annotations List */}
      {filteredAnnotations.length === 0 ? (
        <Card className="text-center p-4">
          <Card.Body>
            <p className="text-muted mb-0">
              {annotations.length === 0 ? 'No annotations found.' : 'No annotations match your search criteria.'}
            </p>
          </Card.Body>
        </Card>
      ) : (
        <div>
          {sortedGroups.map(severity => (
            <div key={severity} className="mb-4">
              <h6 className="border-bottom pb-2">
                <Badge bg={getSeverityColor(severity)} className="me-2">
                  {severity}
                </Badge>
                ({groupedAnnotations[severity].length} annotations)
              </h6>
              
              {groupedAnnotations[severity].map(annotation => {
                const classInfo = getClassById(annotation.classId);
                
                return (
                  <Card
                    key={annotation.id}
                    className="mb-2 annotation-card"
                    onClick={() => onAnnotationSelect && onAnnotationSelect(annotation)}
                  >
                    <Card.Body className="py-2">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="d-flex align-items-center mb-1">
                            <div
                              className="annotation-color-indicator me-2"
                              style={{ backgroundColor: classInfo.color }}
                            />
                            <strong>{annotation.className}</strong>
                            <Badge 
                              bg={getAnnotationTypeColor(annotation.annotationType)} 
                              className="ms-2 small"
                            >
                              {annotation.annotationType.replace('_', ' ')}
                            </Badge>
                          </div>
                          
                          <div className="small text-muted mb-1">
                            Confidence: {(annotation.confidenceScore * 100).toFixed(1)}% | 
                            Position: ({annotation.bboxX1?.toFixed(0)}, {annotation.bboxY1?.toFixed(0)})
                            to ({annotation.bboxX2?.toFixed(0)}, {annotation.bboxY2?.toFixed(0)})
                          </div>
                          
                          {annotation.comments && (
                            <div className="small text-muted mb-1">
                              <em>"{annotation.comments}"</em>
                            </div>
                          )}
                          
                          <div className="small text-muted">
                            {annotation.annotationType === 'AUTO_DETECTED' ? 'Detected' : 'Modified'}: {formatDate(annotation.createdAt)}
                            {annotation.userId && ` by ${annotation.userId}`}
                          </div>
                        </div>
                        
                        {!readOnly && (
                          <div className="d-flex gap-1">
                            {annotation.annotationType === 'AUTO_DETECTED' && (
                              <Button
                                size="sm"
                                variant="outline-success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  confirmAnnotation(annotation.id);
                                }}
                                disabled={loading}
                                title="Confirm Detection"
                              >
                                {loading ? <Spinner size="sm" /> : '✓'}
                              </Button>
                            )}
                            
                            <Button
                              size="sm"
                              variant="outline-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(annotation);
                              }}
                              title="Edit Annotation"
                            >
                              ✏️
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="outline-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteAnnotation(annotation.id);
                              }}
                              disabled={loading}
                              title="Delete Annotation"
                            >
                              🗑️
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Annotation</Modal.Title>
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
                  rows={3}
                  value={editingAnnotation.comments || ''}
                  onChange={(e) => setEditingAnnotation(prev => ({
                    ...prev,
                    comments: e.target.value
                  }))}
                  placeholder="Optional comments about this annotation..."
                />
              </Form.Group>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={saveAnnotation} disabled={loading}>
            {loading ? <Spinner size="sm" className="me-2" /> : null}
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>


    </div>
  );
}