# Environment Variables Setup Guide

This guide explains how to configure environment variables for the Transformer Management System across different deployment scenarios.

## 🏗️ Environment Structure

The project supports three environment configurations:
- **Development** (`./Back-end/software-design-project-final/.env`)
- **Docker** (`./.env` in root directory)
- **Production** (`./Back-end/software-design-project-final/.env.production`)

## 🔧 Quick Setup

### For Development (Local Spring Boot)
1. Navigate to backend directory:
   ```bash
   cd "Back-end/software-design-project-final"
   ```
2. Copy and customize the development `.env` file
3. Update database credentials:
   ```properties
   DB_PASSWORD=your_local_db_password
   ```

### For Docker (Development Containers)
1. Use the root `.env` file (already configured)
2. Start with Docker Compose:
   ```bash
   # Windows
   setup-env.bat docker
   
   # Linux/Mac
   ./setup-env.sh docker
   ```

### For Production
1. Copy `.env.production` and update all `CHANGE_ME` values
2. Deploy with production compose:
   ```bash
   # Windows
   setup-env.bat prod
   
   # Linux/Mac
   ./setup-env.sh prod
   ```

## 📋 Required Environment Variables

### Database Configuration
```properties
DB_URL=jdbc:mysql://localhost:3306/transformer_db
DB_USERNAME=transformer_user
DB_PASSWORD=your_secure_password_here
DB_DDL_AUTO=update
```

### Security Settings
```properties
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
MYSQL_ROOT_PASSWORD=secure_root_password
```

### File Upload Configuration
```properties
FILE_UPLOAD_DIR=./uploads/images/
FILE_MAX_FILE_SIZE=10485760
```

## 🚀 Automated Setup Scripts

### Windows Users
```batch
setup-env.bat docker    # Start Docker environment
setup-env.bat prod      # Start production environment
setup-env.bat stop      # Stop all containers
setup-env.bat status    # Check container status
setup-env.bat logs      # View container logs
```

### Linux/Mac Users
```bash
./setup-env.sh docker   # Start Docker environment
./setup-env.sh prod     # Start production environment
./setup-env.sh stop     # Stop all containers
./setup-env.sh status   # Check container status
./setup-env.sh logs     # View container logs
```

## 🔒 Security Best Practices

### Development
- Use different passwords than production
- Keep database credentials secure
- Don't commit `.env` files to version control

### Production
1. **Change all default passwords**:
   ```properties
   DB_PASSWORD=strong_production_password_2025
   MYSQL_ROOT_PASSWORD=secure_mysql_root_password
   ```

2. **Restrict CORS origins**:
   ```properties
   CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```

3. **Use secure logging levels**:
   ```properties
   LOG_ROOT_LEVEL=WARN
   LOG_APP_LEVEL=INFO
   ```

## 🐳 Docker Environment Variables

### Development Docker
The `.env` file in the root directory is automatically loaded by `docker-compose.yml`:

```properties
SPRING_PROFILES_ACTIVE=docker
DB_URL=jdbc:mysql://mysql-db:3306/transformer_db
SERVER_PORT=8080
FILE_UPLOAD_DIR=/app/uploads/images/
```

### Production Docker
Uses `docker-compose.prod.yml` with `.env.production`:

```properties
SPRING_PROFILES_ACTIVE=prod
DB_DDL_AUTO=validate
LOG_ROOT_LEVEL=WARN
CORS_ALLOWED_ORIGINS=https://yourdomain.com
```

## 🔍 Verification

### Check Configuration
1. **Verify environment loading**:
   ```bash
   docker-compose config
   ```

2. **Check application health**:
   ```bash
   curl http://localhost:8080/actuator/health
   ```

3. **View environment in container**:
   ```bash
   docker exec transformer-backend env | grep DB_
   ```

## 🛠️ Troubleshooting

### Common Issues

1. **Environment variables not loading**:
   - Ensure `.env` file is in correct location
   - Check for syntax errors in `.env` file
   - Verify `env_file` directive in docker-compose.yml

2. **Database connection failed**:
   ```bash
   # Check database container
   docker-compose logs mysql-db
   
   # Verify database credentials
   docker exec -it transformer-mysql mysql -u transformer_user -p
   ```

3. **File upload issues**:
   - Verify `FILE_UPLOAD_DIR` path
   - Check volume mounting in docker-compose.yml
   - Ensure proper permissions

### Debug Commands
```bash
# View all environment variables in container
docker exec transformer-backend printenv

# Check Spring Boot configuration
docker exec transformer-backend curl localhost:8080/actuator/configprops

# View application logs
docker-compose logs -f backend
```

## 📁 File Structure
```
project-root/
├── .env                           # Docker environment variables
├── .env.example                   # Template for environment variables
├── docker-compose.yml             # Development containers
├── docker-compose.prod.yml        # Production containers
├── setup-env.sh                   # Linux/Mac setup script
├── setup-env.bat                  # Windows setup script
└── Back-end/software-design-project-final/
    ├── .env                       # Development environment
    └── .env.production            # Production environment
```

## 🔄 Environment Migration

### From Development to Docker
1. Copy development `.env` values to root `.env`
2. Update paths and URLs for containerized services
3. Test with `setup-env.bat docker`

### From Docker to Production
1. Copy `.env.production.example` to `.env.production`
2. Update all security-sensitive values
3. Deploy with `setup-env.bat prod`

## 📞 Support

If you encounter issues with environment configuration:
1. Check this guide first
2. Verify all required variables are set
3. Test connectivity with health check endpoints
4. Review container logs for detailed error messages

For additional help, refer to:
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Complete deployment guide
- [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md) - Detailed variable reference
