package com.example.software_design_project_final.config;

import java.util.Arrays;
import java.util.List;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * File Storage Configuration
 * Provides strongly typed access to file storage properties defined under the
 * {@code file} prefix. Default values are supplied here and can be overridden
 * through {@code application.properties} or environment variables.
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "file")
public class FileStorageConfig {

    /**
     * Base directory where uploaded files will be stored.
     */
    private String uploadDir = "./uploads/images/";

    /**
     * Maximum file size allowed for uploads (in bytes).
     */
    private long maxFileSize = 10 * 1024 * 1024L; // 10MB

    /**
     * Allowed file extensions for uploads. Values are bound from a comma
     * separated property string.
     */
    private List<String> allowedFileTypes = Arrays.asList("jpg", "jpeg", "png", "tiff", "gif", "bmp", "webp");
}