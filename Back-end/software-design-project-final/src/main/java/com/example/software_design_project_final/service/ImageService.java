package com.example.software_design_project_final.service;

import com.example.software_design_project_final.dao.Image;
import com.example.software_design_project_final.dao.Transformer;
import com.example.software_design_project_final.dto.ImageRequest;
import com.example.software_design_project_final.dto.ImageResponse;
import com.example.software_design_project_final.repository.ImageRepository;
import com.example.software_design_project_final.repository.TransformerRepository;
import com.example.software_design_project_final.config.FileStorageConfig;
import com.example.software_design_project_final.exception.ResourceNotFoundException;
import com.example.software_design_project_final.exception.FileStorageException;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Arrays;

/**
 * Service class for Image business logic
 * Handles file upload, storage, and image metadata management
 */
@Service
@Transactional
public class ImageService {

    @Autowired
    private ImageRepository imageRepository;

    @Autowired
    private TransformerRepository transformerRepository;

    @Autowired
    private ModelMapper mapper;

    @Autowired
    private FileStorageConfig fileStorageConfig;

    private Path fileStorageLocation;

    /**
     * Initialize file storage directory after dependency injection
     */
    @PostConstruct
    public void init() {
        this.fileStorageLocation = Paths.get(fileStorageConfig.getUploadDir())
                .toAbsolutePath().normalize();

        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (Exception ex) {
            throw new FileStorageException("Could not create the directory where the uploaded files will be stored.", ex);
        }
    }

    /**
     * Upload image file and save metadata
     */
    public ImageResponse uploadImage(MultipartFile file, ImageRequest request) {
        validateFile(file);

        // Find the transformer
        Transformer transformer = transformerRepository.findById(request.getTransformerId())
                .orElseThrow(() -> new ResourceNotFoundException("Transformer not found with id: " + request.getTransformerId()));

        // Generate unique filename
        String originalFileName = file.getOriginalFilename();
        String fileExtension = getFileExtension(originalFileName);
        String uniqueFileName = UUID.randomUUID().toString() + "." + fileExtension;

        try {
            // Store file on disk
            Path targetLocation = this.fileStorageLocation.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            // Create and save image metadata
            Image image = new Image();
            image.setTransformer(transformer);
            image.setFileName(originalFileName);
            image.setFilePath(uniqueFileName);
            image.setFileType(file.getContentType());
            image.setFileSize(file.getSize());
            image.setEnvCondition(request.getEnvCondition());
            image.setImageType(request.getImageType());

            Image savedImage = imageRepository.save(image);
            return convertToResponse(savedImage);

        } catch (IOException ex) {
            throw new FileStorageException("Could not store file " + originalFileName + ". Please try again!", ex);
        }
    }

    /**
     * Get all images
     */
    @Transactional(readOnly = true)
    public List<ImageResponse> getAllImages() {
        return imageRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get images by transformer ID
     */
    @Transactional(readOnly = true)
    public List<ImageResponse> getImagesByTransformerId(Integer transformerId) {
        return imageRepository.findByTransformerId(transformerId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get images by environmental condition
     */
    @Transactional(readOnly = true)
    public List<ImageResponse> getImagesByCondition(Image.EnvironmentalCondition condition) {
        return imageRepository.findByEnvCondition(condition).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get images by type
     */
    @Transactional(readOnly = true)
    public List<ImageResponse> getImagesByType(Image.ImageType imageType) {
        return imageRepository.findByImageType(imageType).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Delete image
     */
    public void deleteImage(Integer id) {
        Image image = imageRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Image not found with id: " + id));

        // Delete file from storage
        try {
            Path filePath = this.fileStorageLocation.resolve(image.getFilePath());
            Files.deleteIfExists(filePath);
        } catch (IOException ex) {
            // Log the error but don't fail the operation
            System.err.println("Could not delete file: " + image.getFilePath());
        }

        imageRepository.delete(image);
    }

    /**
     * Get file storage location for file download
     */
    public Path getFileStorageLocation() {
        return this.fileStorageLocation;
    }

    /**
     * Validate uploaded file
     */
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new FileStorageException("Cannot upload empty file");
        }

        if (file.getSize() > fileStorageConfig.getMaxFileSize()) {
            throw new FileStorageException("File size exceeds maximum allowed size of " +
                    fileStorageConfig.getMaxFileSize() + " bytes");
        }

        String fileExtension = getFileExtension(file.getOriginalFilename());
        if (!Arrays.asList(fileStorageConfig.getAllowedFileTypes()).contains(fileExtension.toLowerCase())) {
            throw new FileStorageException("File type not allowed. Allowed types: " +
                    Arrays.toString(fileStorageConfig.getAllowedFileTypes()));
        }
    }

    /**
     * Extract file extension from filename
     */
    private String getFileExtension(String fileName) {
        if (fileName == null || fileName.lastIndexOf(".") == -1) {
            throw new FileStorageException("Invalid file name: " + fileName);
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1);
    }

    /**
     * Convert Image entity to ImageResponse DTO
     */
    private ImageResponse convertToResponse(Image image) {
        ImageResponse response = mapper.map(image, ImageResponse.class);
        response.setTransformerId(image.getTransformer().getId());
        response.setTransformer_no(image.getTransformer().getTransformer_no());
        return response;
    }
}