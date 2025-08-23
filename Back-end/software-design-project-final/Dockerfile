# =============================================================================
# Multi-stage Dockerfile for Transformer Management System Backend
# =============================================================================

# Stage 1: Build the application
FROM eclipse-temurin:17-jdk-alpine AS build

# Set build working directory
WORKDIR /build

# Install Maven
RUN apk add --no-cache maven

# Copy Maven configuration first for better Docker layer caching
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# Download dependencies (this layer will be cached if pom.xml doesn't change)
RUN mvn dependency:go-offline -B

# Copy source code and build the application
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Create the runtime image
FROM eclipse-temurin:17-jre-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user for security
RUN addgroup -g 1001 -S appuser && adduser -S appuser -u 1001 -G appuser

# Set application working directory
WORKDIR /app

# Create uploads directory and set permissions
RUN mkdir -p /app/uploads/images && chown -R appuser:appuser /app

# Copy the built JAR from build stage
COPY --from=build /build/target/software-design-project-final-*.jar app.jar

# Change ownership of the app directory
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose the application port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]