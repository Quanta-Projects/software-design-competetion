package com.example.software_design_project_final.dao;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Annotation Entity
 * Represents anomaly annotations on thermal images with user edit tracking
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "annotations")
public class Annotation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "image_id", nullable = false, 
                foreignKey = @ForeignKey(name = "FK_annotation_image"))
    @JsonBackReference
    private Image image;

    @Column(name = "class_id", nullable = false)
    private Integer classId;

    @Column(name = "class_name", nullable = false)
    private String className;

    @Column(name = "confidence_score", nullable = false)
    private Float confidenceScore;

    // Bounding box coordinates (x1, y1, x2, y2)
    @Column(name = "bbox_x1", nullable = false)
    private Float bboxX1;

    @Column(name = "bbox_y1", nullable = false)
    private Float bboxY1;

    @Column(name = "bbox_x2", nullable = false)
    private Float bboxX2;

    @Column(name = "bbox_y2", nullable = false)
    private Float bboxY2;

    // Center coordinates for easier manipulation
    @Column(name = "center_x", nullable = false)
    private Float centerX;

    @Column(name = "center_y", nullable = false)
    private Float centerY;

    @Enumerated(EnumType.STRING)
    @Column(name = "annotation_type", nullable = false)
    private AnnotationType annotationType;

    @Column(name = "user_id")
    private String userId;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true; // For soft delete of user-deleted annotations

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (isActive == null) {
            isActive = true;
        }
        // Calculate center coordinates from bbox
        if (centerX == null && bboxX1 != null && bboxX2 != null) {
            centerX = (bboxX1 + bboxX2) / 2;
        }
        if (centerY == null && bboxY1 != null && bboxY2 != null) {
            centerY = (bboxY1 + bboxY2) / 2;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        // Recalculate center coordinates
        if (bboxX1 != null && bboxX2 != null) {
            centerX = (bboxX1 + bboxX2) / 2;
        }
        if (bboxY1 != null && bboxY2 != null) {
            centerY = (bboxY1 + bboxY2) / 2;
        }
    }

    /**
     * Annotation Type Enum
     * Tracks how the annotation was created or modified
     */
    public enum AnnotationType {
        AUTO_DETECTED,      // Automatically detected by YOLO
        USER_ADDED,         // Added by user
        USER_EDITED,        // Modified by user (position, size, class)
        USER_DELETED,       // Marked as deleted by user
        USER_CONFIRMED      // User confirmed auto-detection as correct
    }

    // Helper methods for easier coordinate manipulation
    public Float getWidth() {
        return bboxX2 - bboxX1;
    }

    public Float getHeight() {
        return bboxY2 - bboxY1;
    }

    public void setBoundingBox(Float x1, Float y1, Float x2, Float y2) {
        this.bboxX1 = x1;
        this.bboxY1 = y1;
        this.bboxX2 = x2;
        this.bboxY2 = y2;
        this.centerX = (x1 + x2) / 2;
        this.centerY = (y1 + y2) / 2;
    }

    public Float[] getBoundingBoxArray() {
        return new Float[]{bboxX1, bboxY1, bboxX2, bboxY2};
    }

    public Float[] getCenterArray() {
        return new Float[]{centerX, centerY};
    }
}