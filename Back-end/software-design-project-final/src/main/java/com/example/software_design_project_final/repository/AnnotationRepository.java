package com.example.software_design_project_final.repository;

import com.example.software_design_project_final.dao.Annotation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Repository interface for Annotation entity
 * Provides database operations for thermal image annotations
 */
@Repository
public interface AnnotationRepository extends JpaRepository<Annotation, Integer> {

    /**
     * Find all active annotations for a specific image
     */
    @Query("SELECT a FROM Annotation a WHERE a.image.id = :imageId AND a.isActive = true")
    List<Annotation> findActiveAnnotationsByImageId(@Param("imageId") Integer imageId);

    /**
     * Find all annotations (including inactive) for a specific image
     */
    @Query("SELECT a FROM Annotation a WHERE a.image.id = :imageId")
    List<Annotation> findAllAnnotationsByImageId(@Param("imageId") Integer imageId);

    /**
     * Find annotations by image and annotation type
     */
    @Query("SELECT a FROM Annotation a WHERE a.image.id = :imageId AND a.annotationType = :annotationType AND a.isActive = true")
    List<Annotation> findAnnotationsByImageIdAndType(@Param("imageId") Integer imageId, 
                                                     @Param("annotationType") Annotation.AnnotationType annotationType);

    /**
     * Find annotations by user ID
     */
    @Query("SELECT a FROM Annotation a WHERE a.userId = :userId AND a.isActive = true ORDER BY a.updatedAt DESC")
    List<Annotation> findAnnotationsByUserId(@Param("userId") String userId);

    /**
     * Find recent annotations by date range
     */
    @Query("SELECT a FROM Annotation a WHERE a.createdAt BETWEEN :startDate AND :endDate AND a.isActive = true ORDER BY a.createdAt DESC")
    List<Annotation> findAnnotationsByDateRange(@Param("startDate") LocalDateTime startDate, 
                                               @Param("endDate") LocalDateTime endDate);

    /**
     * Count annotations by type for statistics
     */
    @Query("SELECT a.annotationType, COUNT(a) FROM Annotation a WHERE a.isActive = true GROUP BY a.annotationType")
    List<Object[]> countAnnotationsByType();

    /**
     * Find annotations by transformer ID through image relationship
     */
    @Query("SELECT a FROM Annotation a WHERE a.image.transformer.id = :transformerId AND a.isActive = true")
    List<Annotation> findAnnotationsByTransformerId(@Param("transformerId") Integer transformerId);

    /**
     * Find annotations by inspection ID through image relationship
     */
    @Query("SELECT a FROM Annotation a WHERE a.image.inspection.id = :inspectionId AND a.isActive = true")
    List<Annotation> findAnnotationsByInspectionId(@Param("inspectionId") Integer inspectionId);

    /**
     * Find annotations with high confidence (for quality control)
     */
    @Query("SELECT a FROM Annotation a WHERE a.confidenceScore >= :minConfidence AND a.isActive = true ORDER BY a.confidenceScore DESC")
    List<Annotation> findHighConfidenceAnnotations(@Param("minConfidence") Float minConfidence);

    /**
     * Find annotations by class name (anomaly type)
     */
    @Query("SELECT a FROM Annotation a WHERE a.className = :className AND a.isActive = true")
    List<Annotation> findAnnotationsByClassName(@Param("className") String className);

    /**
     * Soft delete annotation (mark as inactive)
     */
    @Query("UPDATE Annotation a SET a.isActive = false, a.updatedAt = CURRENT_TIMESTAMP WHERE a.id = :annotationId")
    void softDeleteAnnotation(@Param("annotationId") Integer annotationId);

    /**
     * Find user-modified annotations for audit trail
     */
    @Query("SELECT a FROM Annotation a WHERE a.annotationType IN ('USER_ADDED', 'USER_EDITED', 'USER_DELETED') AND a.isActive = true ORDER BY a.updatedAt DESC")
    List<Annotation> findUserModifiedAnnotations();

    /**
     * Find user-modified annotations for audit trail
     */
    @Query("SELECT a FROM Annotation a WHERE a.isActive = true ORDER BY a.updatedAt DESC")
    List<Annotation> findAllAnnotations();
}