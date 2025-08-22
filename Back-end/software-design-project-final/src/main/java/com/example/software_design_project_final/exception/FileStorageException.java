package com.example.software_design_project_final.exception;

/**
 * Exception thrown when file storage operations fail
 */
public class FileStorageException extends RuntimeException {
    public FileStorageException(String message) {
        super(message);
    }

    public FileStorageException(String message, Throwable cause) {
        super(message, cause);
    }
}