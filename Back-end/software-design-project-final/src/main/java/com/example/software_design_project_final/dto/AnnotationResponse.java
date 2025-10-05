package com.example.software_design_project_final.dto;

import com.example.software_design_project_final.dao.Annotation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Response DTO for annotation data
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AnnotationResponse {

    private Integer id;
    private Integer imageId;
    private Integer classId;
    private String className;
    private Float confidenceScore;
    
    // Bounding box coordinates
    private Float bboxX1;
    private Float bboxY1;
    private Float bboxX2;
    private Float bboxY2;
    
    // Center coordinates
    private Float centerX;
    private Float centerY;
    
    // Derived properties
    private Float width;
    private Float height;
    
    // Metadata
    private Annotation.AnnotationType annotationType;
    private String userId;
    private String comments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isActive;

    /**
     * Constructor from Annotation entity
     */
    public AnnotationResponse(Annotation annotation) {
        this.id = annotation.getId();
        this.imageId = annotation.getImage().getId();
        this.classId = annotation.getClassId();
        this.className = annotation.getClassName();
        this.confidenceScore = annotation.getConfidenceScore();
        
        this.bboxX1 = annotation.getBboxX1();
        this.bboxY1 = annotation.getBboxY1();
        this.bboxX2 = annotation.getBboxX2();
        this.bboxY2 = annotation.getBboxY2();
        
        this.centerX = annotation.getCenterX();
        this.centerY = annotation.getCenterY();
        
        this.width = annotation.getWidth();
        this.height = annotation.getHeight();
        
        this.annotationType = annotation.getAnnotationType();
        this.userId = annotation.getUserId();
        this.comments = annotation.getComments();
        this.createdAt = annotation.getCreatedAt();
        this.updatedAt = annotation.getUpdatedAt();
        this.isActive = annotation.getIsActive();
    }

    // Helper methods for frontend
    public Float[] getBoundingBoxArray() {
        return new Float[]{bboxX1, bboxY1, bboxX2, bboxY2};
    }

    public Float[] getCenterArray() {
        return new Float[]{centerX, centerY};
    }

    public boolean isUserModified() {
        return annotationType == Annotation.AnnotationType.USER_ADDED ||
               annotationType == Annotation.AnnotationType.USER_EDITED ||
               annotationType == Annotation.AnnotationType.USER_DELETED;
    }

    public boolean isAutoDetected() {
        return annotationType == Annotation.AnnotationType.AUTO_DETECTED;
    }

    public String getSeverityLevel() {
        if (className.toLowerCase().contains("faulty")) {
            return "CRITICAL";
        } else if (className.toLowerCase().contains("potential")) {
            return "HIGH";
        } else if (className.toLowerCase().contains("cooling")) {
            return "MEDIUM";
        } else {
            return "LOW";
        }
    }
}