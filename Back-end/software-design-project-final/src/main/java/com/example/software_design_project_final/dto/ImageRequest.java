package com.example.software_design_project_final.dto;

import com.example.software_design_project_final.dao.Image;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * DTO for Image upload requests
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ImageRequest {

    @NotNull(message = "Transformer ID is required")
    private Integer transformerId;

    @NotNull(message = "Environmental condition is required")
    private Image.EnvironmentalCondition envCondition;

    @NotNull(message = "Image type is required")
    private Image.ImageType imageType;

    private String description;
}