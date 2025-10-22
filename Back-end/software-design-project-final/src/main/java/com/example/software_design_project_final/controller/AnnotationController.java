package com.example.software_design_project_final.controller;

import com.example.software_design_project_final.dto.AnnotationRequest;
import com.example.software_design_project_final.dto.AnnotationResponse;
import com.example.software_design_project_final.service.AnnotationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;

/**
 * REST Controller for managing thermal image annotations
 */
@Slf4j
@RestController
@RequestMapping("/api/annotations")
@RequiredArgsConstructor
public class AnnotationController {

    private final AnnotationService annotationService;

    /**
     * Create a new annotation
     */
    @PostMapping
    public ResponseEntity<AnnotationResponse> createAnnotation(@Valid @RequestBody AnnotationRequest request) {
        try {
            AnnotationResponse response = annotationService.createAnnotation(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException e) {
            log.warn("Invalid annotation request: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            log.error("Error creating annotation", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Update an existing annotation
     */
    @PutMapping("/{annotationId}")
    public ResponseEntity<AnnotationResponse> updateAnnotation(
            @PathVariable Integer annotationId,
            @Valid @RequestBody AnnotationRequest request) {
        try {
            AnnotationResponse response = annotationService.updateAnnotation(annotationId, request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get annotation by ID
     */
    @GetMapping("/{annotationId}")
    public ResponseEntity<AnnotationResponse> getAnnotationById(@PathVariable Integer annotationId) {
        try {
            AnnotationResponse response = annotationService.getAnnotationById(annotationId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete annotation (soft delete)
     */
    @DeleteMapping("/{annotationId}")
    public ResponseEntity<Void> deleteAnnotation(
            @PathVariable Integer annotationId,
            @RequestParam(required = false) String userId) {
        try {
            annotationService.deleteAnnotation(annotationId, userId);
            return ResponseEntity.noContent().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get all annotations for a specific image
     */
    @GetMapping("/image/{imageId}")
    public ResponseEntity<List<AnnotationResponse>> getAnnotationsByImageId(@PathVariable Integer imageId) {
        try {
            List<AnnotationResponse> annotations = annotationService.getAnnotationsByImageId(imageId);
            return ResponseEntity.ok(annotations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all annotations for a specific transformer
     */
    @GetMapping("/transformer/{transformerId}")
    public ResponseEntity<List<AnnotationResponse>> getAnnotationsByTransformerId(@PathVariable Integer transformerId) {
        try {
            List<AnnotationResponse> annotations = annotationService.getAnnotationsByTransformerId(transformerId);
            return ResponseEntity.ok(annotations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all annotations for a specific inspection
     */
    @GetMapping("/inspection/{inspectionId}")
    public ResponseEntity<List<AnnotationResponse>> getAnnotationsByInspectionId(@PathVariable Integer inspectionId) {
        try {
            List<AnnotationResponse> annotations = annotationService.getAnnotationsByInspectionId(inspectionId);
            return ResponseEntity.ok(annotations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Create batch annotations from YOLO detection results
     */
    @PostMapping("/batch/{imageId}")
    public ResponseEntity<List<AnnotationResponse>> createBatchAnnotations(
            @PathVariable Integer imageId,
            @Valid @RequestBody List<AnnotationRequest> requests) {
        try {
            List<AnnotationResponse> responses = annotationService.createBatchAnnotations(imageId, requests);
            return ResponseEntity.status(HttpStatus.CREATED).body(responses);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Confirm auto-detected annotation as correct
     */
    @PostMapping("/{annotationId}/confirm")
    public ResponseEntity<AnnotationResponse> confirmAnnotation(
            @PathVariable Integer annotationId,
            @RequestParam(required = false) String userId) {
        try {
            AnnotationResponse response = annotationService.confirmAnnotation(annotationId, userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get user modification history
     */
    @GetMapping("/user-modifications")
    public ResponseEntity<List<AnnotationResponse>> getUserModifiedAnnotations() {
        try {
            List<AnnotationResponse> annotations = annotationService.getUserModifiedAnnotations();
            return ResponseEntity.ok(annotations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get all annotations (for admin/audit purposes)
     */
    @GetMapping("/all")
    public ResponseEntity<List<AnnotationResponse>> getAllAnnotations() {
        try {
            List<AnnotationResponse> annotations = annotationService.getAllAnnotations();
            return ResponseEntity.ok(annotations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get high confidence annotations for quality control
     */
    @GetMapping("/high-confidence")
    public ResponseEntity<List<AnnotationResponse>> getHighConfidenceAnnotations(
            @RequestParam(defaultValue = "0.8") Float minConfidence) {
        try {
            List<AnnotationResponse> annotations = annotationService.getHighConfidenceAnnotations(minConfidence);
            return ResponseEntity.ok(annotations);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Health check endpoint for annotations API
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "annotation-management",
            "timestamp", java.time.LocalDateTime.now().toString()
        ));
    }
}