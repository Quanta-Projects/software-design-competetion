package com.example.software_design_project_final.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Data Transfer Object for Inspection requests
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InspectionRequest {
    
    @NotNull(message = "Transformer ID is required")
    private Integer transformerId;
    
    @NotBlank(message = "Inspection number is required")
    private String inspectionNo;
    
    private String branch;
    
    private LocalDateTime inspectedDate;
    
    private LocalDateTime maintenanceDate;
    
    private String status;
    
    private String inspectedBy;
    
    private String notes;
}
