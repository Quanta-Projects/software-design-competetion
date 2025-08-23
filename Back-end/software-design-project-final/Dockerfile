# Use OpenJDK 17 slim base image
FROM openjdk:17-jdk-slim

# Set the working directory inside the container
WORKDIR /app

# Create a non-root user for security
RUN useradd --create-home --shell /bin/bash springuser && \
    mkdir -p /app/uploads/images && \
    chown -R springuser:springuser /app

# Copy Maven wrapper and pom.xml for dependency caching
COPY mvnw ./
COPY mvnw.cmd ./
COPY .mvn .mvn
COPY pom.xml ./

# Make Maven wrapper executable
RUN chmod +x mvnw

# Download dependencies (for Docker layer caching)
RUN ./mvnw dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application
RUN ./mvnw clean package -DskipTests

# Switch to non-root user
USER springuser

# Expose the port the app runs on
EXPOSE 8080

# Set environment variables with defaults
ENV SPRING_PROFILES_ACTIVE=docker
ENV DB_URL=jdbc:mysql://mysql-db:3306/transformer_db
ENV DB_USERNAME=transformer_user
ENV DB_PASSWORD=transformer_password
ENV DB_DDL_AUTO=update
ENV SERVER_PORT=8080
ENV FILE_UPLOAD_DIR=/app/uploads/images/
ENV FILE_MAX_FILE_SIZE=10485760
ENV CORS_ALLOWED_ORIGINS=http://localhost:3000,http://frontend:3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the application
CMD ["java", "-jar", "target/software-design-project-final-0.0.1-SNAPSHOT.jar"]
