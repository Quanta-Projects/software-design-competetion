package com.example.software_design_project_final.dto;

import com.example.software_design_project_final.dao.Annotation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

/**
 * Request DTO for creating or updating annotations
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AnnotationRequest {

    @NotNull(message = "Image ID is required")
    private Integer imageId;

    @NotNull(message = "Class ID is required")
    private Integer classId;

    @NotNull(message = "Class name is required")
    private String className;

    @NotNull(message = "Confidence score is required")
    @DecimalMin(value = "0.0", message = "Confidence score must be at least 0.0")
    @DecimalMax(value = "1.0", message = "Confidence score must be at most 1.0")
    private Float confidenceScore;

    @NotNull(message = "Bounding box X1 coordinate is required")
    private Float bboxX1;

    @NotNull(message = "Bounding box Y1 coordinate is required")
    private Float bboxY1;

    @NotNull(message = "Bounding box X2 coordinate is required")
    private Float bboxX2;

    @NotNull(message = "Bounding box Y2 coordinate is required")
    private Float bboxY2;

    @NotNull(message = "Annotation type is required")
    private Annotation.AnnotationType annotationType;

    private String userId;

    private String comments;

    // Helper method to validate bounding box
    public boolean isValidBoundingBox() {
        return bboxX1 != null && bboxY1 != null && bboxX2 != null && bboxY2 != null &&
               bboxX2 > bboxX1 && bboxY2 > bboxY1;
    }

    // Helper methods to get derived values
    public Float getCenterX() {
        return (bboxX1 + bboxX2) / 2;
    }

    public Float getCenterY() {
        return (bboxY1 + bboxY2) / 2;
    }

    public Float getWidth() {
        return bboxX2 - bboxX1;
    }

    public Float getHeight() {
        return bboxY2 - bboxY1;
    }
}