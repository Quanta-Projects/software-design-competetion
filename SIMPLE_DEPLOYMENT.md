# Simple Backend Docker Deployment Guide

This guide shows you how to deploy **only the backend** in Docker containers while running the frontend on localhost.

## 🎯 Deployment Architecture

```
┌─────────────────────┐    HTTP Requests    ┌─────────────────────┐
│   Frontend (Local)  │ ──────────────────► │  Backend (Docker)   │
│  React on :3000     │                     │  Spring Boot :8080  │
└─────────────────────┘                     └─────────────────────┘
                                                       │
                                            ┌─────────────────────┐
                                            │  MySQL (Docker)     │
                                            │  Database :3306     │
                                            └─────────────────────┘
```

## 🚀 Quick Start

### 1. **Start Backend Services**
```cmd
# Windows (Double-click or run in cmd)
start-backend.bat

# Manual command
docker-compose -f docker-compose.backend.yml up --build -d
```

### 2. **Start Frontend Locally**
```cmd
cd Front-end
npm start
```

### 3. **Access Applications**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080
- API Documentation: http://localhost:8080/swagger-ui.html

## 🔧 Configuration

### Environment Variables (.env)

The `.env` file contains all necessary configuration:

```properties
# Database Connection (Docker internal network)
DB_URL=jdbc:mysql://mysql-db:3306/transformer_db
DB_USERNAME=transformer_user
DB_PASSWORD=transformer_secure_password_2025

# CORS - Allow frontend access
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# File Upload (mounted to host directory)
FILE_UPLOAD_DIR=/app/uploads/images/

# Server Port
SERVER_PORT=8080
```

### Database Connection

The environment variables automatically configure:
- **MySQL Database**: Running in Docker container
- **Connection URL**: Internal Docker network (`mysql-db:3306`)
- **Credentials**: From environment variables
- **Auto Schema**: Creates tables automatically (`DB_DDL_AUTO=update`)

### File Upload

- **Container Path**: `/app/uploads/images/`
- **Host Mount**: `./uploads/images/` (created automatically)
- **Max Size**: 10MB per file
- **Access**: Files accessible from both container and host

## 🌐 Server Deployment

### For Remote Server Deployment:

1. **Copy `.env.server` to `.env`**:
   ```cmd
   copy .env.server .env
   ```

2. **Update Server IP in .env**:
   ```properties
   CORS_ALLOWED_ORIGINS=http://localhost:3000,http://YOUR_SERVER_IP:3000
   ```

3. **Update Frontend Config**:
   Copy `Front-end/public/config.server.js` to `Front-end/public/config.js` and update:
   ```javascript
   window.APP_CONFIG = {
     API_BASE_URL: 'http://YOUR_SERVER_IP:8080/api'
   };
   ```

4. **Deploy to Server**:
   ```bash
   # On your server
   scp -r project-folder/ user@server:/path/to/deployment/
   ssh user@server "cd /path/to/deployment && ./start-backend.bat"
   ```

## 📁 File Structure

```
project-root/
├── .env                           # Docker environment config
├── .env.server                    # Server deployment template
├── docker-compose.backend.yml     # Backend-only containers
├── start-backend.bat              # Simple startup script
├── stop-backend.bat               # Stop script
├── uploads/                       # Image uploads (auto-created)
│   └── images/
└── Front-end/
    ├── public/
    │   └── config.server.js       # Server connection template
    └── src/
        └── utils/
            └── config.js          # Frontend API configuration
```

## 🔍 Verification Steps

### 1. **Check Backend Health**
```bash
curl http://localhost:8080/actuator/health
# Should return: {"status":"UP"}
```

### 2. **Test Database Connection**
```bash
docker exec -it transformer-mysql mysql -u transformer_user -p
# Enter password: transformer_secure_password_2025
# Should connect to MySQL
```

### 3. **Test File Upload**
- Open frontend: http://localhost:3000
- Try uploading an image
- Check `./uploads/images/` directory for uploaded files

### 4. **Test API Endpoints**
```bash
# Get all transformers
curl http://localhost:8080/api/transformers

# Get transformer types
curl http://localhost:8080/api/transformers/types
```

## 🛠️ Troubleshooting

### Backend Won't Start
```cmd
# Check Docker status
docker ps

# View backend logs
docker-compose -f docker-compose.backend.yml logs backend

# Check environment variables
docker exec transformer-backend env | findstr DB_
```

### Database Connection Issues
```cmd
# Check MySQL logs
docker-compose -f docker-compose.backend.yml logs mysql-db

# Test database connectivity
docker exec -it transformer-mysql mysqladmin -u transformer_user -p ping
```

### CORS Errors from Frontend
1. Check CORS configuration in `.env`:
   ```properties
   CORS_ALLOWED_ORIGINS=http://localhost:3000
   ```
2. Restart backend containers:
   ```cmd
   docker-compose -f docker-compose.backend.yml restart backend
   ```

### File Upload Issues
```cmd
# Check upload directory
dir uploads\images

# Check container volume mount
docker exec transformer-backend ls -la /app/uploads/images/

# Check file permissions
docker exec transformer-backend ls -la /app/uploads/
```

## 🔒 Security Notes

### Development Security
- Database credentials are in environment variables
- CORS allows localhost access only
- File uploads limited to 10MB

### Production Security
1. **Change default passwords** in `.env`
2. **Restrict CORS** to your domain only
3. **Use HTTPS** in production
4. **Secure database** access
5. **Regular backups** of database and uploads

## 📊 Management Commands

### Container Management
```cmd
# Start services
start-backend.bat

# Stop services
stop-backend.bat

# View status
docker-compose -f docker-compose.backend.yml ps

# View logs
docker-compose -f docker-compose.backend.yml logs -f

# Restart specific service
docker-compose -f docker-compose.backend.yml restart backend
```

### Database Management
```cmd
# Backup database
docker exec transformer-mysql mysqldump -u transformer_user -p transformer_db > backup.sql

# Restore database
docker exec -i transformer-mysql mysql -u transformer_user -p transformer_db < backup.sql

# Connect to database
docker exec -it transformer-mysql mysql -u transformer_user -p
```

## 🎉 Success!

Your setup provides:
- ✅ **Simple deployment**: One command starts backend
- ✅ **Environment variables**: All config externalized
- ✅ **Database connectivity**: Automatic MySQL setup
- ✅ **File uploads**: Working image upload with host mounting
- ✅ **CORS configured**: Frontend can access backend API
- ✅ **Health monitoring**: Built-in health checks
- ✅ **Flexible**: Easy to deploy locally or on server

The backend runs in Docker with database connectivity via environment variables, while your frontend runs locally and can connect to the backend API with proper CORS configuration!
