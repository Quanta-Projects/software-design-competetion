package com.example.software_design_project_final.dto;

import com.example.software_design_project_final.dao.Transformer;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
    private String transformerNo;

    @NotBlank(message = "Location is required")
    private String location;

    @NotBlank(message = "Pole Number is required")
    private String pole_no;

    @NotNull(message = "Region must be selected")
    private Transformer.Region region;

    @NotNull(message = "Transformer Type is required")
    private Transformer.TransformerType transformerType;
}