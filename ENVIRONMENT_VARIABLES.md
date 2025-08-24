# Environment Variables Configuration

This document lists all environment variables used by the Transformer Management System for deployment configuration.

## Database Configuration

- **DB_URL**: Database connection URL
  - Default: `jdbc:mysql://localhost:3306/transformer_db`
  - Docker: `jdbc:mysql://mysql-db:3306/transformer_db`

- **DB_USERNAME**: Database username
  - Default: `root`
  - Recommended: `transformer_user`

- **DB_PASSWORD**: Database password
  - Default: `password`
  - **Required**: Set strong password for production

- **DB_DDL_AUTO**: Hibernate DDL mode
  - Default: `update`
  - Options: `create`, `create-drop`, `update`, `validate`, `none`

## Server Configuration

- **SERVER_PORT**: Application port
  - Default: `8080`

- **SERVER_SERVLET_CONTEXT_PATH**: Application context path
  - Default: `/` (root)
  - Example: `/api` for custom path

## File Upload Configuration

- **FILE_UPLOAD_DIR**: Directory for uploaded images
  - Default: `./uploads/images/`
  - Docker: `/app/uploads/images/`

- **FILE_MAX_FILE_SIZE**: Maximum file size in bytes
  - Default: `10485760` (10MB)

- **FILE_MAX_REQUEST_SIZE**: Maximum request size in bytes
  - Default: `10485760` (10MB)

## CORS Configuration

- **CORS_ALLOWED_ORIGINS**: Comma-separated list of allowed origins
  - Default: `http://localhost:3000`
  - Multiple: `http://localhost:3000,http://frontend:3000,https://yourdomain.com`

## Spring Boot Profiles

- **SPRING_PROFILES_ACTIVE**: Active Spring profile
  - Default: `default`
  - Docker: `docker`
  - Production: `prod`

## Logging Configuration

- **LOGGING_LEVEL_ROOT**: Root logging level
  - Default: `INFO`
  - Options: `TRACE`, `DEBUG`, `INFO`, `WARN`, `ERROR`

- **LOGGING_LEVEL_COM_EXAMPLE**: Application-specific logging level
  - Default: `DEBUG`

## Example .env file for local development:

```bash
# Database Configuration
DB_URL=jdbc:mysql://localhost:3306/transformer_db
DB_USERNAME=transformer_user
DB_PASSWORD=your_secure_password
DB_DDL_AUTO=update

# Server Configuration
SERVER_PORT=8080

# File Upload Configuration
FILE_UPLOAD_DIR=./uploads/images/
FILE_MAX_FILE_SIZE=10485760

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000

# Spring Profile
SPRING_PROFILES_ACTIVE=default
```

## Docker Environment Variables:

```bash
# Use these in docker-compose.yml or docker run commands
SPRING_PROFILES_ACTIVE=docker
DB_URL=jdbc:mysql://mysql-db:3306/transformer_db
DB_USERNAME=transformer_user
DB_PASSWORD=transformer_password
FILE_UPLOAD_DIR=/app/uploads/images/
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://frontend:3000
```

## Security Notes:

1. **Never commit sensitive values** like passwords to version control
2. Use **strong passwords** for database connections
3. **Restrict CORS origins** to only necessary domains in production
4. Consider using **secrets management** for production deployments
5. **Rotate passwords** regularly in production environments

## Deployment Commands:

### Local Development with Docker:
```bash
docker-compose up --build
```

### Production Deployment:
```bash
# Set environment variables first
export DB_PASSWORD=your_production_password
export CORS_ALLOWED_ORIGINS=https://your-production-domain.com

# Then start services
docker-compose -f docker-compose.prod.yml up -d
```
