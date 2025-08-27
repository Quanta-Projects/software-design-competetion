package com.example.software_design_project_final.controller;

import com.example.software_design_project_final.dao.Inspection;
import com.example.software_design_project_final.dto.InspectionRequest;
import com.example.software_design_project_final.dto.InspectionResponse;
import com.example.software_design_project_final.service.InspectionService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for Inspection operations
 * Handles HTTP requests for inspection management
 */
@RestController
@RequestMapping("/api/inspections")
@CrossOrigin(origins = {"http://localhost:3000", "http://127.0.0.1:3000"})
public class InspectionController {

    @Autowired
    private InspectionService inspectionService;

    /**
     * Get all inspections
     * GET /api/inspections
     */
    @GetMapping
    public ResponseEntity<List<InspectionResponse>> getAllInspections() {
        List<InspectionResponse> inspections = inspectionService.getAllInspections();
        return ResponseEntity.ok(inspections);
    }

    /**
     * Get inspection by ID
     * GET /api/inspections/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<InspectionResponse> getInspectionById(@PathVariable Integer id) {
        InspectionResponse inspection = inspectionService.getInspectionById(id);
        return ResponseEntity.ok(inspection);
    }

    /**
     * Get inspections by transformer ID
     * GET /api/inspections/transformer/{transformerId}
     */
    @GetMapping("/transformer/{transformerId}")
    public ResponseEntity<List<InspectionResponse>> getInspectionsByTransformerId(@PathVariable Integer transformerId) {
        List<InspectionResponse> inspections = inspectionService.getInspectionsByTransformerId(transformerId);
        return ResponseEntity.ok(inspections);
    }

    /**
     * Add new inspection
     * POST /api/inspections
     */
    @PostMapping
    public ResponseEntity<InspectionResponse> addInspection(@Valid @RequestBody InspectionRequest request) {
        InspectionResponse response = inspectionService.addInspection(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Update existing inspection
     * PUT /api/inspections/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<InspectionResponse> updateInspection(@PathVariable Integer id,
                                                              @Valid @RequestBody InspectionRequest request) {
        InspectionResponse response = inspectionService.updateInspection(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete inspection
     * DELETE /api/inspections/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInspection(@PathVariable Integer id) {
        inspectionService.deleteInspection(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Search inspections
     * GET /api/inspections/search?query={query}
     */
    @GetMapping("/search")
    public ResponseEntity<List<InspectionResponse>> searchInspections(@RequestParam String query) {
        List<InspectionResponse> inspections = inspectionService.searchInspections(query);
        return ResponseEntity.ok(inspections);
    }

    /**
     * Get inspections by status
     * GET /api/inspections/status/{status}
     */
    @GetMapping("/status/{status}")
    public ResponseEntity<List<InspectionResponse>> getInspectionsByStatus(@PathVariable String status) {
        List<InspectionResponse> inspections = inspectionService.getInspectionsByStatus(status);
        return ResponseEntity.ok(inspections);
    }

    /**
     * Get available inspection statuses for dropdown
     * GET /api/inspections/statuses
     */
    @GetMapping("/statuses")
    public ResponseEntity<List<String>> getAvailableStatuses() {
        List<String> statuses = Arrays.stream(Inspection.Status.values())
                .map(Inspection.Status::name)
                .collect(Collectors.toList());
        return ResponseEntity.ok(statuses);
    }
}
