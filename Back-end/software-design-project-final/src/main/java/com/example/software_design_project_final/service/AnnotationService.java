package com.example.software_design_project_final.service;

import com.example.software_design_project_final.dao.Annotation;
import com.example.software_design_project_final.dao.Image;
import com.example.software_design_project_final.dto.AnnotationRequest;
import com.example.software_design_project_final.dto.AnnotationResponse;
import com.example.software_design_project_final.exception.ResourceNotFoundException;
import com.example.software_design_project_final.repository.AnnotationRepository;
import com.example.software_design_project_final.repository.ImageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Service class for managing thermal image annotations
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AnnotationService {

    private final AnnotationRepository annotationRepository;
    private final ImageRepository imageRepository;

    /**
     * Create a new annotation
     */
    public AnnotationResponse createAnnotation(AnnotationRequest request) {
        // Validate bounding box
        if (!request.isValidBoundingBox()) {
            throw new IllegalArgumentException("Invalid bounding box coordinates");
        }

        // Find the associated image
        Image image = imageRepository.findById(request.getImageId())
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with id: " + request.getImageId()));

        // Create annotation entity
        Annotation annotation = new Annotation();
        annotation.setImage(image);
        annotation.setClassId(request.getClassId());
        annotation.setClassName(request.getClassName());
        annotation.setConfidenceScore(request.getConfidenceScore());
        annotation.setBoundingBox(request.getBboxX1(), request.getBboxY1(), 
                                 request.getBboxX2(), request.getBboxY2());
        annotation.setAnnotationType(request.getAnnotationType());
        annotation.setUserId(request.getUserId());
        annotation.setComments(request.getComments());

        // Save and return response
        Annotation savedAnnotation = annotationRepository.save(annotation);
        return new AnnotationResponse(savedAnnotation);
    }

    /**
     * Update an existing annotation
     */
    public AnnotationResponse updateAnnotation(Integer annotationId, AnnotationRequest request) {
        Annotation annotation = annotationRepository.findById(annotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Annotation not found with id: " + annotationId));

        // Validate bounding box
        if (!request.isValidBoundingBox()) {
            throw new IllegalArgumentException("Invalid bounding box coordinates");
        }

        // Update fields
        annotation.setClassId(request.getClassId());
        annotation.setClassName(request.getClassName());
        annotation.setConfidenceScore(request.getConfidenceScore());
        annotation.setBoundingBox(request.getBboxX1(), request.getBboxY1(), 
                                 request.getBboxX2(), request.getBboxY2());
        annotation.setAnnotationType(Annotation.AnnotationType.USER_EDITED);
        annotation.setUserId(request.getUserId());
        annotation.setComments(request.getComments());

        Annotation updatedAnnotation = annotationRepository.save(annotation);
        return new AnnotationResponse(updatedAnnotation);
    }

    /**
     * Get all active annotations for an image
     */
    @Transactional(readOnly = true)
    public List<AnnotationResponse> getAnnotationsByImageId(Integer imageId) {
        List<Annotation> annotations = annotationRepository.findActiveAnnotationsByImageId(imageId);
        return annotations.stream()
                .map(AnnotationResponse::new)
                .collect(Collectors.toList());
    }

    /**
     * Get annotation by ID
     */
    @Transactional(readOnly = true)
    public AnnotationResponse getAnnotationById(Integer annotationId) {
        Annotation annotation = annotationRepository.findById(annotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Annotation not found with id: " + annotationId));
        return new AnnotationResponse(annotation);
    }

    /**
     * Soft delete annotation (mark as inactive)
     */
    public void deleteAnnotation(Integer annotationId, String userId) {
        Annotation annotation = annotationRepository.findById(annotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Annotation not found with id: " + annotationId));

        annotation.setIsActive(false);
        annotation.setAnnotationType(Annotation.AnnotationType.USER_DELETED);
        annotation.setUserId(userId);
        annotation.setUpdatedAt(LocalDateTime.now());
        
        annotationRepository.save(annotation);
    }

    /**
     * Get annotations by transformer ID
     */
    @Transactional(readOnly = true)
    public List<AnnotationResponse> getAnnotationsByTransformerId(Integer transformerId) {
        List<Annotation> annotations = annotationRepository.findAnnotationsByTransformerId(transformerId);
        return annotations.stream()
                .map(AnnotationResponse::new)
                .collect(Collectors.toList());
    }

    /**
     * Get annotations by inspection ID
     */
    @Transactional(readOnly = true)
    public List<AnnotationResponse> getAnnotationsByInspectionId(Integer inspectionId) {
        List<Annotation> annotations = annotationRepository.findAnnotationsByInspectionId(inspectionId);
        return annotations.stream()
                .map(AnnotationResponse::new)
                .collect(Collectors.toList());
    }

    /**
     * Create batch annotations from YOLO detection results
     */
    public List<AnnotationResponse> createBatchAnnotations(Integer imageId, List<AnnotationRequest> requests) {
        Image image = imageRepository.findById(imageId)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with id: " + imageId));

        List<Annotation> annotations = requests.stream()
                .filter(request -> request.isValidBoundingBox())
                .map(request -> {
                    Annotation annotation = new Annotation();
                    annotation.setImage(image);
                    annotation.setClassId(request.getClassId());
                    annotation.setClassName(request.getClassName());
                    annotation.setConfidenceScore(request.getConfidenceScore());
                    annotation.setBoundingBox(request.getBboxX1(), request.getBboxY1(), 
                                             request.getBboxX2(), request.getBboxY2());
                    annotation.setAnnotationType(Annotation.AnnotationType.AUTO_DETECTED);
                    annotation.setUserId(request.getUserId());
                    annotation.setComments(request.getComments());
                    return annotation;
                })
                .collect(Collectors.toList());

        List<Annotation> savedAnnotations = annotationRepository.saveAll(annotations);
        return savedAnnotations.stream()
                .map(AnnotationResponse::new)
                .collect(Collectors.toList());
    }

    /**
     * Get user modification history
     */
    @Transactional(readOnly = true)
    public List<AnnotationResponse> getUserModifiedAnnotations() {
        List<Annotation> annotations = annotationRepository.findUserModifiedAnnotations();
        return annotations.stream()
                .map(AnnotationResponse::new)
                .collect(Collectors.toList());
    }

    /**
     * Get high confidence annotations for quality control
     */
    @Transactional(readOnly = true)
    public List<AnnotationResponse> getHighConfidenceAnnotations(Float minConfidence) {
        List<Annotation> annotations = annotationRepository.findHighConfidenceAnnotations(minConfidence);
        return annotations.stream()
                .map(AnnotationResponse::new)
                .collect(Collectors.toList());
    }

    /**
     * Confirm auto-detected annotation as correct
     */
    public AnnotationResponse confirmAnnotation(Integer annotationId, String userId) {
        Annotation annotation = annotationRepository.findById(annotationId)
                .orElseThrow(() -> new ResourceNotFoundException("Annotation not found with id: " + annotationId));

        annotation.setAnnotationType(Annotation.AnnotationType.USER_CONFIRMED);
        annotation.setUserId(userId);
        annotation.setUpdatedAt(LocalDateTime.now());

        Annotation updatedAnnotation = annotationRepository.save(annotation);
        return new AnnotationResponse(updatedAnnotation);
    }
}