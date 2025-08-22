package com.example.software_design_project_final.repository;

import com.example.software_design_project_final.dao.Transformer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Transformer entity operations
 */
@Repository
public interface TransformerRepository extends JpaRepository<Transformer, Integer> {

    /**
     * Find transformer by name (case-insensitive)
     */
    Optional<Transformer> findByNameIgnoreCase(String name);

    /**
     * Find transformers by location containing keyword
     */
    List<Transformer> findByLocationContainingIgnoreCase(String location);

    /**
     * Find transformers with capacity greater than specified value
     */
    List<Transformer> findByCapacityGreaterThan(Double capacity);

    /**
     * Check if transformer name already exists
     */
    boolean existsByNameIgnoreCase(String name);

    /**
     * Custom query to find transformers with image count
     */
    @Query("SELECT t FROM Transformer t LEFT JOIN FETCH t.images WHERE t.id = :id")
    Optional<Transformer> findByIdWithImages(@Param("id") Integer id);
}