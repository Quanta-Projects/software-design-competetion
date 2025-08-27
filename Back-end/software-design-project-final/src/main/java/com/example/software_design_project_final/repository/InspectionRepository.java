package com.example.software_design_project_final.repository;

import com.example.software_design_project_final.dao.Inspection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Inspection entity operations
 */
@Repository
public interface InspectionRepository extends JpaRepository<Inspection, Integer> {

    /**
     * Find inspection by inspectionNo (case-insensitive)
     */
    Optional<Inspection> findByInspectionNoIgnoreCase(String inspectionNo);

    /**
     * Find all inspections for a specific transformer
     */
    List<Inspection> findByTransformerId(Integer transformerId);

    /**
     * Find inspections by status
     */
    List<Inspection> findByStatus(Inspection.Status status);

    /**
     * Find inspections by transformer and status
     */
    List<Inspection> findByTransformerIdAndStatus(Integer transformerId, Inspection.Status status);

    /**
     * Check if inspectionNo already exists
     */
    boolean existsByInspectionNoIgnoreCase(String inspectionNo);

    /**
     * Custom query to find inspection with images
     */
    @Query("SELECT i FROM Inspection i LEFT JOIN FETCH i.images WHERE i.id = :id")
    Optional<Inspection> findByIdWithImages(@Param("id") Integer id);

    /**
     * Custom query to find inspections by transformer with images
     */
    @Query("SELECT i FROM Inspection i LEFT JOIN FETCH i.images WHERE i.transformer.id = :transformerId")
    List<Inspection> findByTransformerIdWithImages(@Param("transformerId") Integer transformerId);

    /**
     * Count inspections for a transformer
     */
    @Query("SELECT COUNT(i) FROM Inspection i WHERE i.transformer.id = :transformerId")
    Long countByTransformerId(@Param("transformerId") Integer transformerId);

    /**
     * Find inspections by inspected by
     */
    List<Inspection> findByInspectedByContainingIgnoreCase(String inspectedBy);

    /**
     * Find inspections by branch
     */
    List<Inspection> findByBranchContainingIgnoreCase(String branch);
}
