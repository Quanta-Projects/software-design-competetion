package com.example.software_design_project_final.config;

import org.modelmapper.ModelMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Application Configuration Class
 * Defines beans and CORS configuration for the application
 */
@Configuration
public class AppConfig implements WebMvcConfigurer {

    @Bean
    public ModelMapper getMapper() {
        ModelMapper mapper = new ModelMapper();
        // Configure mapping properties if needed
        return mapper;
    }

    /**
     * Configure CORS to allow frontend communication
     */
    @Override
    public void addCorsMappings(@org.jetbrains.annotations.NotNull CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000") // React frontend URL
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}