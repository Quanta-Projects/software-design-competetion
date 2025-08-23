package com.example.software_design_project_final.config;

import lombok.Getter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * File Storage Configuration
 * Manages file upload settings and storage paths using environment variables
 */
@Getter
@Component
@ConfigurationProperties(prefix = "file")
public class FileStorageConfig {
    // Default values with environment variable support
    private String uploadDir = System.getenv("FILE_UPLOAD_DIR") != null ? 
        System.getenv("FILE_UPLOAD_DIR") : "./uploads/images/";
    
    private long maxFileSize = System.getenv("FILE_MAX_FILE_SIZE") != null ? 
        Long.parseLong(System.getenv("FILE_MAX_FILE_SIZE")) : 10485760L; // 10MB
    
    private String[] allowedFileTypes = {"jpg", "jpeg", "png", "tiff", "gif", "bmp", "webp"};

    public void setUploadDir(String uploadDir) { 
        this.uploadDir = uploadDir; 
    }

    public void setMaxFileSize(long maxFileSize) { 
        this.maxFileSize = maxFileSize; 
    }

    public void setAllowedFileTypes(String[] allowedFileTypes) { 
        this.allowedFileTypes = allowedFileTypes; 
    }
}