# Transformer Management System - Deployment Guide

This guide provides comprehensive instructions for deploying the Transformer Management System using Docker containers.

## 🏗️ Architecture Overview

The system consists of:
- **Frontend**: React 18 application (Port 3000)
- **Backend**: Spring Boot 3.5.4 API (Port 8080) 
- **Database**: MySQL 8.0 (Port 3306)

## 📋 Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- At least 2GB available RAM
- 5GB available disk space

## 🚀 Quick Start (Development)

1. **Clone and navigate to the project:**
   ```bash
   cd "d:\ACCA Sem 7\Software Design Competetion\quanta-project\Fork\software-design-competetion"
   ```

2. **Start all services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the applications:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - API Documentation: http://localhost:8080/swagger-ui.html
   - Health Check: http://localhost:8080/actuator/health

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Database Configuration
MYSQL_ROOT_PASSWORD=secure_root_password
DB_PASSWORD=secure_user_password
DB_USERNAME=transformer_user
DB_URL=jdbc:mysql://mysql-db:3306/transformer_db

# Application Configuration
SERVER_PORT=8080
FILE_UPLOAD_DIR=/app/uploads/images/
FILE_MAX_FILE_SIZE=10485760

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://frontend:3000

# Security
SPRING_PROFILES_ACTIVE=docker
```

### Production Configuration

For production deployment:

1. **Update docker-compose.yml with production values:**
   ```yaml
   environment:
     - SPRING_PROFILES_ACTIVE=prod
     - DB_PASSWORD=${STRONG_DB_PASSWORD}
     - CORS_ALLOWED_ORIGINS=https://yourdomain.com
   ```

2. **Use secrets for sensitive data:**
   ```yaml
   secrets:
     db_password:
       external: true
   ```

## 🗄️ Database Setup

### Initial Database Schema

The application automatically creates the database schema on first run using JPA/Hibernate DDL.

### Manual Database Initialization (Optional)

If you need custom initialization:

1. Create `init-db/init.sql`:
   ```sql
   CREATE DATABASE IF NOT EXISTS transformer_db;
   USE transformer_db;
   
   -- Custom initialization scripts here
   ```

2. The init script will run automatically on first container start.

## 📁 Data Persistence

### Volume Mapping

- **Database Data**: `mysql_data` volume stores MySQL data
- **Image Uploads**: `backend_uploads` volume stores uploaded images
- **Logs**: Application logs are stored in containers

### Backup Strategy

1. **Database Backup:**
   ```bash
   docker exec transformer-mysql mysqldump -u transformer_user -p transformer_db > backup.sql
   ```

2. **File Uploads Backup:**
   ```bash
   docker cp transformer-backend:/app/uploads/images ./backup-images/
   ```

## 🔍 Monitoring & Health Checks

### Application Health

- **Backend Health**: http://localhost:8080/actuator/health
- **Database Status**: Included in health check endpoint
- **Container Status**: `docker-compose ps`

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs mysql-db

# Follow logs in real-time
docker-compose logs -f backend
```

## 🛠️ Troubleshooting

### Common Issues

1. **Port Already in Use:**
   ```bash
   # Check what's using the port
   netstat -ano | findstr :8080
   
   # Change ports in docker-compose.yml if needed
   ports:
     - "8081:8080"
   ```

2. **Database Connection Issues:**
   ```bash
   # Check database container
   docker-compose logs mysql-db
   
   # Verify database connectivity
   docker exec -it transformer-mysql mysql -u transformer_user -p
   ```

3. **File Upload Issues:**
   ```bash
   # Check upload directory permissions
   docker exec -it transformer-backend ls -la /app/uploads/images/
   
   # Verify volume mounting
   docker volume inspect software-design-competetion_backend_uploads
   ```

### Container Management

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (caution: deletes data)
docker-compose down -v

# Rebuild specific service
docker-compose build backend

# Scale services
docker-compose up --scale backend=2
```

## 🚀 Production Deployment

### Docker Swarm (Recommended for Production)

1. **Initialize Swarm:**
   ```bash
   docker swarm init
   ```

2. **Deploy Stack:**
   ```bash
   docker stack deploy -c docker-compose.prod.yml transformer-stack
   ```

### Kubernetes (Advanced)

1. **Create Kubernetes manifests:**
   ```bash
   # Convert docker-compose to Kubernetes
   kompose convert -f docker-compose.yml
   ```

2. **Deploy to Kubernetes:**
   ```bash
   kubectl apply -f .
   ```

## 🔒 Security Considerations

### Production Security Checklist

- [ ] Change default passwords
- [ ] Use environment-specific secrets
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up log monitoring
- [ ] Regular security updates
- [ ] Database access restrictions
- [ ] File upload validation

### SSL/HTTPS Setup

1. **Obtain SSL certificates**
2. **Configure reverse proxy (nginx):**
   ```nginx
   server {
       listen 443 ssl;
       server_name yourdomain.com;
       
       ssl_certificate /path/to/cert.pem;
       ssl_certificate_key /path/to/key.pem;
       
       location / {
           proxy_pass http://localhost:3000;
       }
       
       location /api {
           proxy_pass http://localhost:8080;
       }
   }
   ```

## 📈 Performance Optimization

### Production Recommendations

1. **Resource Limits:**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '1'
         memory: 1G
       reservations:
         cpus: '0.5'
         memory: 512M
   ```

2. **Database Optimization:**
   ```bash
   # MySQL configuration for production
   [mysqld]
   innodb_buffer_pool_size=1G
   max_connections=200
   ```

3. **Application Tuning:**
   ```properties
   # JVM options for production
   JAVA_OPTS=-Xms512m -Xmx1g -XX:+UseG1GC
   ```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section above
2. Review application logs: `docker-compose logs backend`
3. Verify environment variables: `docker-compose config`
4. Check container status: `docker-compose ps`

## 📄 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Spring Boot Docker Guide](https://spring.io/guides/gs/spring-boot-docker/)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/)
- [MySQL Docker Image](https://hub.docker.com/_/mysql)
