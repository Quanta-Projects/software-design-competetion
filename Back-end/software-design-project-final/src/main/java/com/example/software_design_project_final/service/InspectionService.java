package com.example.software_design_project_final.service;

import com.example.software_design_project_final.dao.Inspection;
import com.example.software_design_project_final.dao.Transformer;
import com.example.software_design_project_final.dto.InspectionRequest;
import com.example.software_design_project_final.dto.InspectionResponse;
import com.example.software_design_project_final.dto.ImageResponse;
import com.example.software_design_project_final.repository.InspectionRepository;
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
 * Service class for Inspection business logic
 * Handles CRUD operations and business rules for inspections
 */
@Service
@Transactional
public class InspectionService {

    @Autowired
    private ModelMapper mapper;

    @Autowired
    private InspectionRepository inspectionRepository;

    @Autowired
    private TransformerRepository transformerRepository;

    /**
     * Retrieve all inspections with their image counts
     */
    @Transactional(readOnly = true)
    public List<InspectionResponse> getAllInspections() {
        return inspectionRepository.findAll().stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get inspection by ID
     */
    @Transactional(readOnly = true)
    public InspectionResponse getInspectionById(Integer id) {
        Inspection inspection = inspectionRepository.findByIdWithImages(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection not found with id: " + id));
        return convertToResponse(inspection);
    }

    /**
     * Get inspections by transformer ID
     */
    @Transactional(readOnly = true)
    public List<InspectionResponse> getInspectionsByTransformerId(Integer transformerId) {
        if (!transformerRepository.existsById(transformerId)) {
            throw new ResourceNotFoundException("Transformer not found with id: " + transformerId);
        }
        return inspectionRepository.findByTransformerIdWithImages(transformerId).stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Add new inspection
     */
    public InspectionResponse addInspection(InspectionRequest request) {
        // Check if transformer exists
        Transformer transformer = transformerRepository.findById(request.getTransformerId())
                .orElseThrow(() -> new ResourceNotFoundException("Transformer not found with id: " + request.getTransformerId()));

        // Check if inspectionNo already exists
        if (inspectionRepository.existsByInspectionNoIgnoreCase(request.getInspectionNo())) {
            throw new DuplicateResourceException("Inspection already exists with number: " + request.getInspectionNo());
        }

        Inspection inspection = new Inspection();
        inspection.setInspectionNo(request.getInspectionNo());
        inspection.setTransformer(transformer);
        inspection.setBranch(request.getBranch());
        inspection.setInspectedDate(request.getInspectedDate());
        inspection.setMaintenanceDate(request.getMaintenanceDate());
        inspection.setInspectedBy(request.getInspectedBy());
        inspection.setNotes(request.getNotes());

        // Set status
        if (request.getStatus() != null) {
            try {
                inspection.setStatus(Inspection.Status.valueOf(request.getStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                inspection.setStatus(Inspection.Status.IN_PROGRESS);
            }
        } else {
            inspection.setStatus(Inspection.Status.IN_PROGRESS);
        }

        Inspection savedInspection = inspectionRepository.save(inspection);
        return convertToResponse(savedInspection);
    }

    /**
     * Update existing inspection
     */
    public InspectionResponse updateInspection(Integer id, InspectionRequest request) {
        Inspection inspection = inspectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inspection not found with id: " + id));

        // Check if transformer exists (if being updated)
        if (!request.getTransformerId().equals(inspection.getTransformer().getId())) {
            Transformer transformer = transformerRepository.findById(request.getTransformerId())
                    .orElseThrow(() -> new ResourceNotFoundException("Transformer not found with id: " + request.getTransformerId()));
            inspection.setTransformer(transformer);
        }

        // Check if inspectionNo already exists (if being updated)
        if (!request.getInspectionNo().equalsIgnoreCase(inspection.getInspectionNo())) {
            if (inspectionRepository.existsByInspectionNoIgnoreCase(request.getInspectionNo())) {
                throw new DuplicateResourceException("Inspection already exists with number: " + request.getInspectionNo());
            }
            inspection.setInspectionNo(request.getInspectionNo());
        }

        // Update fields
        inspection.setBranch(request.getBranch());
        inspection.setInspectedDate(request.getInspectedDate());
        inspection.setMaintenanceDate(request.getMaintenanceDate());
        inspection.setInspectedBy(request.getInspectedBy());
        inspection.setNotes(request.getNotes());

        // Set status
        if (request.getStatus() != null) {
            try {
                inspection.setStatus(Inspection.Status.valueOf(request.getStatus().toUpperCase()));
            } catch (IllegalArgumentException e) {
                // Keep existing status if invalid
            }
        }

        Inspection updatedInspection = inspectionRepository.save(inspection);
        return convertToResponse(updatedInspection);
    }

    /**
     * Delete inspection
     */
    public void deleteInspection(Integer id) {
        if (!inspectionRepository.existsById(id)) {
            throw new ResourceNotFoundException("Inspection not found with id: " + id);
        }
        inspectionRepository.deleteById(id);
    }

    /**
     * Search inspections by various criteria
     */
    @Transactional(readOnly = true)
    public List<InspectionResponse> searchInspections(String query) {
        List<Inspection> inspections = inspectionRepository.findByInspectionNoIgnoreCase(query)
                .map(List::of)
                .orElse(inspectionRepository.findByBranchContainingIgnoreCase(query));
        
        if (inspections.isEmpty()) {
            inspections = inspectionRepository.findByInspectedByContainingIgnoreCase(query);
        }
        
        return inspections.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Get inspections by status
     */
    @Transactional(readOnly = true)
    public List<InspectionResponse> getInspectionsByStatus(String status) {
        try {
            Inspection.Status statusEnum = Inspection.Status.valueOf(status.toUpperCase());
            return inspectionRepository.findByStatus(statusEnum).stream()
                    .map(this::convertToResponse)
                    .collect(Collectors.toList());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid status: " + status);
        }
    }

    /**
     * Convert Inspection entity to InspectionResponse DTO
     */
    private InspectionResponse convertToResponse(Inspection inspection) {
        InspectionResponse response = mapper.map(inspection, InspectionResponse.class);

        // Set transformer info
        response.setTransformerId(inspection.getTransformer().getId());
        response.setTransformerNo(inspection.getTransformer().getTransformerNo());

        // Set status display name
        response.setStatus(inspection.getStatus().name());
        response.setStatusDisplayName(inspection.getStatus().getDisplayName());

        // Map images to ImageResponse DTOs
        if (inspection.getImages() != null) {
            List<ImageResponse> imageResponses = inspection.getImages().stream()
                    .map(image -> {
                        ImageResponse imageResponse = mapper.map(image, ImageResponse.class);
                        imageResponse.setTransformerId(inspection.getTransformer().getId());
                        imageResponse.setTransformerNo(inspection.getTransformer().getTransformerNo());
                        return imageResponse;
                    })
                    .collect(Collectors.toList());
            response.setImages(imageResponses);
            response.setImageCount(imageResponses.size());
        } else {
            response.setImageCount(0);
        }

        return response;
    }
}
