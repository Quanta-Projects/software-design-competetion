package com.example.software_design_project_final.repository;

import com.example.software_design_project_final.dao.Image;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository interface for Image entity operations
 */
@Repository
public interface ImageRepository extends JpaRepository<Image, Integer> {

    /**
     * Find all images for a specific transformer
     */
    List<Image> findByTransformerId(Integer transformerId);

    /**
     * Find all images for a specific inspection
     */
    List<Image> findByInspectionId(Integer inspectionId);

    /**
     * Find images by environmental condition
     */
    List<Image> findByEnvCondition(Image.EnvironmentalCondition condition);

    /**
     * Find images by type (baseline/maintenance)
     */
    List<Image> findByImageType(Image.ImageType imageType);

    /**
     * Find images by transformer and condition
     */
    List<Image> findByTransformerIdAndEnvCondition(Integer transformerId, Image.EnvironmentalCondition condition);

    /**
     * Find images by transformer and type
     */
    List<Image> findByTransformerIdAndImageType(Integer transformerId, Image.ImageType imageType);

    /**
     * Count images for a transformer
     */
    @Query("SELECT COUNT(i) FROM Image i WHERE i.transformer.id = :transformerId")
    Long countByTransformerId(@Param("transformerId") Integer transformerId);

    /**
     * Find images with transformer details
     */
    @Query("SELECT i FROM Image i JOIN FETCH i.transformer WHERE i.id = :id")
    Image findByIdWithTransformer(@Param("id") Integer id);
}
