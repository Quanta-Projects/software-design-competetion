package com.example.software_design_project_final.controller;

import com.example.software_design_project_final.config.FileStorageConfig;
import com.example.software_design_project_final.dao.Image;
import com.example.software_design_project_final.dto.ImageRequest;
import com.example.software_design_project_final.dto.ImageResponse;
import com.example.software_design_project_final.exception.FileStorageException;
import com.example.software_design_project_final.exception.ResourceNotFoundException;
import com.example.software_design_project_final.service.ImageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * REST Controller for Image operations
 * Handles HTTP requests for image upload, retrieval, and management
 */
@RestController
@RequestMapping("/api/images")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"})
public class ImageController {

    @Autowired
    private ImageService imageService;

    /**
     * Upload image file
     * POST /api/images/upload
     */
    @PostMapping("/upload")
    public ResponseEntity<ImageResponse> uploadImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "transformerId", required = false) Integer transformerId,
            @RequestParam(value = "inspectionId", required = false) Integer inspectionId,
            @RequestParam("envCondition") Image.EnvironmentalCondition envCondition,
            @RequestParam("imageType") Image.ImageType imageType) {

        // Validation: Either transformerId or inspectionId must be provided
        if (transformerId == null && inspectionId == null) {
            throw new IllegalArgumentException("Either transformerId or inspectionId must be provided");
        }

        ImageRequest request = new ImageRequest();
        request.setTransformerId(transformerId);
        request.setInspectionId(inspectionId);
        request.setEnvCondition(envCondition);
        request.setImageType(imageType);

        ImageResponse response = imageService.uploadImage(file, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get all images
     * GET /api/images
     */
    @GetMapping
    public ResponseEntity<List<ImageResponse>> getAllImages() {
        List<ImageResponse> images = imageService.getAllImages();
        return ResponseEntity.ok(images);
    }

    /**
     * Get images by transformer ID
     * GET /api/images/transformer/{transformerId}
     */
    @GetMapping("/transformer/{transformerId}")
    public ResponseEntity<List<ImageResponse>> getImagesByTransformerId(@PathVariable Integer transformerId) {
        List<ImageResponse> images = imageService.getImagesByTransformerId(transformerId);
        return ResponseEntity.ok(images);
    }

    /**
     * Get images by inspection ID
     * GET /api/images/inspection/{inspectionId}
     */
    @GetMapping("/inspection/{inspectionId}")
    public ResponseEntity<List<ImageResponse>> getImagesByInspectionId(@PathVariable Integer inspectionId) {
        List<ImageResponse> images = imageService.getImagesByInspectionId(inspectionId);
        return ResponseEntity.ok(images);
    }

    /**
     * Get images by environmental condition
     * GET /api/images/condition/{condition}
     */
    @GetMapping("/condition/{condition}")
    public ResponseEntity<List<ImageResponse>> getImagesByCondition(@PathVariable Image.EnvironmentalCondition condition) {
        List<ImageResponse> images = imageService.getImagesByCondition(condition);
        return ResponseEntity.ok(images);
    }

    /**
     * Get images by type
     * GET /api/images/type/{type}
     */
    @GetMapping("/type/{type}")
    public ResponseEntity<List<ImageResponse>> getImagesByType(@PathVariable Image.ImageType type) {
        List<ImageResponse> images = imageService.getImagesByType(type);
        return ResponseEntity.ok(images);
    }

    /**
     * Download/view image file
     * GET /api/images/download/{fileName}
     */
    @GetMapping("/download/{fileName}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String fileName) {
        try {
            FileStorageConfig fileStorageConfig = new FileStorageConfig();
            Path filePath = Paths.get(fileStorageConfig.getUploadDir()).resolve(fileName).normalize();
            Resource resource = new UrlResource(filePath.toUri());

            if (resource.exists()) {
                // Determine content type based on file extension
                String contentType = "application/octet-stream";
                String fileExtension = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
                switch (fileExtension) {
                    case "jpg":
                    case "jpeg":
                        contentType = "image/jpeg";
                        break;
                    case "png":
                        contentType = "image/png";
                        break;
                    case "gif":
                        contentType = "image/gif";
                        break;
                    case "bmp":
                        contentType = "image/bmp";
                        break;
                    case "webp":
                        contentType = "image/webp";
                        break;
                }

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                        .body(resource);
            } else {
                throw new ResourceNotFoundException("File not found: " + fileName);
            }
        } catch (MalformedURLException ex) {
            throw new FileStorageException("File not found: " + fileName, ex);
        }
    }

    /**
     * Delete image
     * DELETE /api/images/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteImage(@PathVariable Integer id) {
        imageService.deleteImage(id);
        return ResponseEntity.noContent().build();
    }
}