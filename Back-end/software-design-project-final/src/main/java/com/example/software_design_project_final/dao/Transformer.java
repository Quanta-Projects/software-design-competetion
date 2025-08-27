package com.example.software_design_project_final.dao;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Transformer Entity
 * Represents electrical transformers in the system
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "transformers")
public class Transformer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "transformerNo", nullable = false)
    private String transformerNo;

    @Column(name = "location", nullable = false)
    private String location;

    @Enumerated(EnumType.STRING)
    @Column(name = "region", nullable = false)
    private Region region;

    @Column(name = "pole_no", nullable = false) // in MVA or kVA
    private String pole_no;

    @Enumerated(EnumType.STRING)
    @Column(name = "transformer_type", nullable = false)
    private TransformerType transformerType;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "transformer", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonManagedReference
    private List<Image> images = new ArrayList<>();

    @OneToMany(mappedBy = "transformer", cascade = CascadeType.ALL, fetch = FetchType.LAZY, orphanRemoval = true)
    @JsonManagedReference
    private List<Inspection> inspections = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    /**
     * Predefined regions enum
     */
    public enum Region {
        NUGEGODA, MAHARAGAMA, KOTTE, DEHIWALA, RAJAGIRIYA, NAWALA, BATTARAMULLA, PELAWATTE, BORALESGAMUWA;
    }

    /**
     * Transformer types enum
     */
    public enum TransformerType {
        BULK, DISTRIBUTION;
    }
}