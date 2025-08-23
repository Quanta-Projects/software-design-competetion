package com.example.software_design_project_final.dto;

import com.example.software_design_project_final.dao.Transformer;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO for Transformer response data
 */
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class TransformerResponse {
    private Integer id;
    private String transformerNo;
    private String location;
    private String pole_no;
    private Transformer.Region region;
    private Transformer.TransformerType transformerType;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ImageResponse> images;
    private Integer imageCount;
}