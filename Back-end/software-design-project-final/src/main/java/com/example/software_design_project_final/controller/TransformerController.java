package com.example.software_design_project_final.controller;

import com.example.software_design_project_final.dto.TransformerRequest;
import com.example.software_design_project_final.dto.TransformerResponse;
import com.example.software_design_project_final.service.TransformerService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for Transformer operations
 * Handles HTTP requests for transformer management
 */
@RestController
@RequestMapping("/api/transformers")
public class TransformerController {

    @Autowired
    private TransformerService transformerService;

    /**
     * Get all transformers
     * GET /api/transformers
     */
    @GetMapping
    public ResponseEntity<List<TransformerResponse>> getAllTransformers() {
        List<TransformerResponse> transformers = transformerService.getAllTransformers();
        return ResponseEntity.ok(transformers);
    }

    /**
     * Get transformer by ID
     * GET /api/transformers/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<TransformerResponse> getTransformerById(@PathVariable Integer id) {
        TransformerResponse transformer = transformerService.getTransformerById(id);
        return ResponseEntity.ok(transformer);
    }

    /**
     * Add new transformer
     * POST /api/transformers
     */
    @PostMapping
    public ResponseEntity<TransformerResponse> addTransformer(@Valid @RequestBody TransformerRequest request) {
        TransformerResponse response = transformerService.addTransformer(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Update existing transformer
     * PUT /api/transformers/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<TransformerResponse> updateTransformer(@PathVariable Integer id,
                                                                 @Valid @RequestBody TransformerRequest request) {
        TransformerResponse response = transformerService.updateTransformer(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Delete transformer
     * DELETE /api/transformers/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransformer(@PathVariable Integer id) {
        transformerService.deleteTransformer(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Search transformers by location
     * GET /api/transformers/search?location={location}
     */
    @GetMapping("/search")
    public ResponseEntity<List<TransformerResponse>> searchTransformersByLocation(@RequestParam String location) {
        List<TransformerResponse> transformers = transformerService.searchByLocation(location);
        return ResponseEntity.ok(transformers);
    }
}
