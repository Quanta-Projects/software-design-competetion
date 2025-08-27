package com.example.software_design_project_final.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Data Transfer Object for Inspection responses
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InspectionResponse {
    
    private Integer id;
    
    private String inspectionNo;
    
    private Integer transformerId;
    
    private String transformerNo;
    
    private String branch;
    
    private LocalDateTime inspectedDate;
    
    private LocalDateTime maintenanceDate;
    
    private String status;
    
    private String statusDisplayName;
    
    private String inspectedBy;
    
    private String notes;
    
    private LocalDateTime createdAt;
    
    private LocalDateTime updatedAt;
    
    private List<ImageResponse> images;
    
    private Integer imageCount = 0;
}
