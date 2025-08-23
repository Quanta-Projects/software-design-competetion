package com.example.software_design_project_final.dto;

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
    private String transformer_no;
    private String location;
    private String pole_no;
    private String region;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<ImageResponse> images;
    private Integer imageCount;
}