package com.example.software_design_project_final.dto;

import com.example.software_design_project_final.dao.Image;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * DTO for Image response data
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class ImageResponse {
    private Integer id;
    private String fileName;
    private String filePath;
    private String fileType;
    private Long fileSize;
    private Image.EnvironmentalCondition envCondition;
    private Image.ImageType imageType;
    private LocalDateTime uploadDate;
    private Integer transformerId;
    private String transformerNo;
    private Integer inspectionId;
}