package com.example.software_design_project_final.dao;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Image Entity
 * Represents thermal images associated with transformers
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "images")
public class Image {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transformer_id", nullable = false, 
                foreignKey = @ForeignKey(name = "FK_image_transformer"))
    @JsonBackReference
    private Transformer transformer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inspection_id", nullable = true, 
                foreignKey = @ForeignKey(name = "FK_image_inspection"))
    @JsonBackReference
    private Inspection inspection;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Column(name = "file_path", nullable = false)
    private String filePath;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(name = "file_size")
    private Long fileSize;

    @Enumerated(EnumType.STRING)
    @Column(name = "env_condition", nullable = false)
    private EnvironmentalCondition envCondition;

    @Enumerated(EnumType.STRING)
    @Column(name = "image_type", nullable = false, length = 20)
    private ImageType imageType; // BASELINE, MAINTENANCE, or ANNOTATED

    @Column(name = "upload_date")
    private LocalDateTime uploadDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    // One-to-many relationship with annotations - cascade delete to prevent foreign key constraints
    @OneToMany(mappedBy = "image", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    private List<Annotation> annotations = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (uploadDate == null) {
            uploadDate = LocalDateTime.now();
        }
    }

    /**
     * Environmental Condition Enum
     */
    public enum EnvironmentalCondition {
        SUNNY, CLOUDY, RAINY
    }

    /**
     * Image Type Enum
     */
    public enum ImageType {
        BASELINE, MAINTENANCE, ANNOTATED
    }
}