package com.example.software_design_project_final.config;

import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * File Storage Configuration
 * Manages file upload settings and storage paths
 */
@Getter
@Component
@ConfigurationProperties(prefix = "file")
public class FileStorageConfig {
    // Getters and setters
    private String uploadDir = "./uploads/images/";
    private long maxFileSize = 10485760; // 10MB
    private String[] allowedFileTypes = {"jpg", "jpeg", "png", "tiff"};

    public void setUploadDir(String uploadDir) { this.uploadDir = uploadDir; }

    public void setMaxFileSize(long maxFileSize) { this.maxFileSize = maxFileSize; }

    public void setAllowedFileTypes(String[] allowedFileTypes) { this.allowedFileTypes = allowedFileTypes; }
}