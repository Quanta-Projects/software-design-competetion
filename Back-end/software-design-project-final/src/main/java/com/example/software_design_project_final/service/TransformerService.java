package com.example.software_design_project_final.service;

import com.example.software_design_project_final.dao.Transformer;
import com.example.software_design_project_final.dto.TransformerRequest;
import com.example.software_design_project_final.dto.TransformerResponse;
import com.example.software_design_project_final.dto.ImageResponse;
import com.example.software_design_project_final.repository.TransformerRepository;
import com.example.software_design_project_final.exception.ResourceNotFoundException;
import com.example.software_design_project_final.exception.DuplicateResourceException;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service class for Transformer business logic
 * Handles CRUD operations and business rules for transformers
 */
@Service
@Transactional
public class TransformerService {

    @Autowired
    private ModelMapper mapper;

    @Autowired
    private TransformerRepository transformerRepository;

    /**
     * Retrieve all transformers with their image counts
     */
    @Transactional(readOnly = true)
    public List<TransformerResponse> getAllTransformers() {
        return transformerRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get transformer by ID
     */
    @Transactional(readOnly = true)
    public TransformerResponse getTransformerById(Integer id) {
        Transformer transformer = transformerRepository.findByIdWithImages(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transformer not found with id: " + id));
        return convertToResponse(transformer);
    }

    /**
     * Add new transformer
     */
    public TransformerResponse addTransformer(TransformerRequest request) {
        // Check for duplicate name
        if (transformerRepository.existsByTransformerNoIgnoreCase(request.getTransformerNo())) {
            throw new DuplicateResourceException("Transformer with name '" + request.getTransformerNo() + "' already exists");
        }

        Transformer transformer = mapper.map(request, Transformer.class);
        Transformer savedTransformer = transformerRepository.save(transformer);
        return convertToResponse(savedTransformer);
    }

    /**
     * Update existing transformer
     */
    public TransformerResponse updateTransformer(Integer id, TransformerRequest request) {
        Transformer existingTransformer = transformerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transformer not found with id: " + id));

        // Check for duplicate name (excluding current transformer)
        if (!existingTransformer.getTransformerNo().equalsIgnoreCase(request.getTransformerNo()) &&
                transformerRepository.existsByTransformerNoIgnoreCase(request.getTransformerNo())) {
            throw new DuplicateResourceException("Transformer with name '" + request.getTransformerNo() + "' already exists");
        }

        existingTransformer.setTransformerNo(request.getTransformerNo());
        existingTransformer.setLocation(request.getLocation());
        existingTransformer.setPole_no(request.getPole_no());
        existingTransformer.setRegion(request.getRegion());
        existingTransformer.setTransformerType(request.getTransformerType());

        Transformer updatedTransformer = transformerRepository.save(existingTransformer);
        return convertToResponse(updatedTransformer);
    }

    /**
     * Delete transformer
     */
    public void deleteTransformer(Integer id) {
        if (!transformerRepository.existsById(id)) {
            throw new ResourceNotFoundException("Transformer not found with id: " + id);
        }
        transformerRepository.deleteById(id);
    }

    /**
     * Search transformers by location
     */
    @Transactional(readOnly = true)
    public List<TransformerResponse> searchByLocation(String location) {
        return transformerRepository.findByLocationContainingIgnoreCase(location).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Convert Transformer entity to TransformerResponse DTO
     */
    private TransformerResponse convertToResponse(Transformer transformer) {
        TransformerResponse response = mapper.map(transformer, TransformerResponse.class);

        // Map images to ImageResponse DTOs
        if (transformer.getImages() != null) {
            List<ImageResponse> imageResponses = transformer.getImages().stream()
                    .map(image -> {
                        ImageResponse imageResponse = mapper.map(image, ImageResponse.class);
                        imageResponse.setTransformerId(transformer.getId());
                        imageResponse.setTransformerNo(transformer.getTransformerNo());
                        return imageResponse;
                    })
                    .collect(Collectors.toList());
            response.setImages(imageResponses);
            response.setImageCount(imageResponses.size());
        } else {
            response.setImageCount(0);
        }

        // Set inspection count
        if (transformer.getInspections() != null) {
            response.setInspectionCount(transformer.getInspections().size());
        } else {
            response.setInspectionCount(0);
        }

        return response;
    }
}