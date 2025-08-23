package com.example.software_design_project_final.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO for Transformer creation/update requests
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TransformerRequest {

    @NotBlank(message = "Transformer Number is required")
    private String transformer_no;

    @NotBlank(message = "Location is required")
    private String location;

    @NotNull(message = "Pole Number is required")
    private String pole_no;

    @NotBlank(message = "Region need to be selected")
    private String region;
}