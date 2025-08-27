# Transformer Management System

> A comprehensive enterprise-grade web application for managing electrical transformers with advanced image management capabilities, built with modern React.js frontend and robust Spring Boot backend architecture.

[![Java](https://img.shields.io/badge/Java-17+-ED8B00?style=flat&logo=java&logoColor=white)](https://adoptopenjdk.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.4-6DB33F?style=flat&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## 📋 Table of Contents

- [Project Overview](#-project-overview)
- [Technology Stack](#-technology-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start Guide](#-quick-start-guide)
- [Frontend Setup](#-frontend-setup)
- [Backend Setup](#-backend-setup)
- [Database Configuration](#-database-configuration)
- [Environment Configuration](#-environment-configuration)
- [Docker Deployment](#-docker-deployment)
- [API Documentation](#-api-documentation)
- [Key Features](#-key-features)
- [Project Architecture](#-project-architecture)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

## 🚀 Project Overview

The **Transformer Management System** is a modern, full-stack web application designed for electrical utility companies and maintenance teams to efficiently manage their transformer infrastructure. The system provides comprehensive CRUD operations, advanced search capabilities, and multimedia support for transformer documentation.

### Key Capabilities
- **Comprehensive Asset Management** - Complete lifecycle management of electrical transformers
- **Advanced Search & Filtering** - Multi-criteria search by region, type, location, and custom attributes
- **Media Management** - Secure image upload, storage, and management with preview capabilities
- **Personalization** - User-specific favorites and bookmarking system
- **Responsive Design** - Cross-platform compatibility (Desktop, Tablet, Mobile)
- **Enterprise Security** - Built-in security features and data validation
- **Performance Optimized** - Efficient database queries and optimized frontend rendering

## 🛠️ Technology Stack

### Frontend Architecture
| Technology | Version | Purpose |
|------------|---------|---------|
| **React.js** | 19.1.1 | Core UI framework with hooks and modern patterns |
| **React Router** | 7.8.2 | Client-side routing and navigation |
| **React Bootstrap** | 2.10.10 | Professional UI components and styling |
| **Bootstrap** | 5.3.7 | CSS framework and responsive design |

### Backend Architecture
| Technology | Version | Purpose |
|------------|---------|---------|
| **Spring Boot** | 3.5.4 | Enterprise Java application framework |
| **Java** | 17+ | Programming language (LTS version) |
| **Spring Data JPA** | Latest | Object-relational mapping and data access |
| **Hibernate** | Latest | ORM implementation and database abstraction |
| **MySQL** | 8.0+ | Primary database for data persistence |
| **Maven** | 3.6+ | Build automation and dependency management |

### Development Tools
- **Git** - Version control system
- **Node.js** (18+) - JavaScript runtime for frontend development
- **npm** - Package manager for frontend dependencies

## 📋 Prerequisites

Before setting up the project, ensure your development environment meets the following requirements:

### System Requirements

#### Required Software
| Software | Minimum Version | Recommended | Download Link |
|----------|----------------|-------------|---------------|
| **Java JDK** | 17 | 21 (LTS) | [Eclipse Temurin](https://adoptium.net/) |
| **Node.js** | 18.0 | 20.x (LTS) | [Node.js Official](https://nodejs.org/) |
| **MySQL Server** | 8.0 | 8.0.35+ | [MySQL Community](https://dev.mysql.com/downloads/mysql/) |
| **Git** | 2.30+ | Latest | [Git SCM](https://git-scm.com/) |

#### Optional Tools
- **Maven** 3.8+ (Maven wrapper included in project)
- **MySQL Workbench** - Database management GUI
- **Postman** - API testing and development
- **VS Code** or **IntelliJ IDEA** - Recommended IDEs

### Installation Verification

Run the following commands to verify your installation:

```powershell
# Verify Java installation
java --version
# Expected output: openjdk 17.0.x or higher

# Verify Node.js and npm
node --version  # Should be 18.0 or higher
npm --version   # Should be 8.0 or higher

# Verify MySQL installation
mysql --version
# Expected: mysql Ver 8.0.x or higher

# Verify Git installation
git --version
# Expected: git version 2.30 or higher
```

## 🚀 Quick Start Guide

### 1. Repository Setup

```powershell
# Clone the repository
git clone https://github.com/NidulaGunawardana/software-design-competetion.git

# Navigate to the project directory
cd software-design-competetion

# Verify project structure
dir
```

### 2. Database Setup

```sql
-- Connect to MySQL as root user
mysql -u root -p

-- Create the application database
CREATE DATABASE transformer_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- (Optional) Create a dedicated user for the application
CREATE USER 'transformer_user'@'localhost' IDENTIFIED BY 'secure_password_123';
GRANT ALL PRIVILEGES ON transformer_db.* TO 'transformer_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify database creation
SHOW DATABASES;

-- Exit MySQL
EXIT;
```

## 🎨 Frontend Setup

### Installation and Configuration

```powershell
# Navigate to frontend directory
cd Front-end

# Install project dependencies
npm install

# Configure environment variables
# Create .env file in Front-end directory (if not exists)
echo "REACT_APP_API_BASE_URL=http://localhost:8080/api" > .env

# Start the React development server
npm start
```

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Starts development server on http://localhost:3000 |
| `npm run build` | Creates optimized production build |
| `npm test` | Runs the test suite |
| `npm run eject` | Ejects from create-react-app (one-way operation) |

### Frontend Configuration

The frontend uses the following environment variables:

```properties
# Frontend Environment (.env)
REACT_APP_API_BASE_URL=http://localhost:8080/api
REACT_APP_ENVIRONMENT=development
```

## ⚙️ Backend Setup

### Installation and Configuration

```powershell
# Navigate to backend directory
cd Back-end\software-design-project-final

# Configure environment variables
# Edit the .env file with your database settings
# See Environment Configuration section for details

# Build and run the Spring Boot application
.\mvnw.cmd clean spring-boot:run

# Alternative: Run with Maven directly (if Maven is installed globally)
mvn clean spring-boot:run
```

### Backend Configuration

Configure the `.env` file in `Back-end/software-design-project-final/`:

```properties
# Database Configuration
DB_URL=jdbc:mysql://localhost:3306/transformer_db
DB_USERNAME=transformer_user
DB_PASSWORD=secure_password_123

# Application Configuration
APP_PORT=8080
APP_PROFILE=development

# File Upload Configuration
FILE_UPLOAD_PATH=./uploads/images/
MAX_FILE_SIZE=10MB
```

### Available Maven Commands

| Command | Description |
|---------|-------------|
| `.\mvnw.cmd clean compile` | Compiles the project |
| `.\mvnw.cmd clean package` | Creates JAR file |
| `.\mvnw.cmd spring-boot:run` | Runs the application |
| `.\mvnw.cmd test` | Runs unit tests |

## 🗄️ Database Configuration

### Local Development Setup

1. **Install MySQL 8.0+**
2. **Create Database and User:**

```sql
-- Create database
CREATE DATABASE transformer_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (optional but recommended)
CREATE USER 'transformer_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON transformer_db.* TO 'transformer_user'@'localhost';
FLUSH PRIVILEGES;
```

3. **Update Backend Configuration:**
   - Edit `Back-end/software-design-project-final/.env`
   - Update database credentials

### Database Schema

The application automatically creates the following main tables:
- `transformers` - Main transformer data
- `images` - Image metadata and references
- `users` - User management (if authentication is implemented)

## 🔧 Environment Configuration

The project supports multiple environment configurations:

### Development Environment
Located in `Back-end/software-design-project-final/.env`:

```properties
# Database
DB_URL=jdbc:mysql://localhost:3306/transformer_db
DB_USERNAME=transformer_user
DB_PASSWORD=your_password

# Application
APP_PORT=8080
APP_PROFILE=development

# File Upload
FILE_UPLOAD_PATH=./uploads/images/
MAX_FILE_SIZE=10MB
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif
```

### Production Environment
For production deployment, see [ENV_SETUP.md](ENV_SETUP.md) for detailed configuration options.

## 🐳 Docker Deployment

### Option 1: Backend Only (Recommended for Development)

This option runs the backend and database in Docker while keeping the frontend local:

```powershell
# Start backend services
docker-compose -f docker-compose.backend.yml up --build -d

# Start frontend locally
cd Front-end
npm start
```

### Option 2: Full Stack Deployment

```powershell
# Start all services
docker-compose up --build -d
```

### Docker Configuration

The project includes several Docker Compose files:
- `docker-compose.yml` - Full stack deployment
- `docker-compose.backend.yml` - Backend and database only
- `docker-compose.prod.yml` - Production configuration

For detailed Docker deployment instructions, see [SIMPLE_DEPLOYMENT.md](SIMPLE_DEPLOYMENT.md).

## 📚 API Documentation

### Main Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transformers` | Get all transformers |
| `GET` | `/api/transformers/{id}` | Get transformer by ID |
| `POST` | `/api/transformers` | Create new transformer |
| `PUT` | `/api/transformers/{id}` | Update transformer |
| `DELETE` | `/api/transformers/{id}` | Delete transformer |
| `POST` | `/api/transformers/{id}/images` | Upload transformer images |
| `GET` | `/api/transformers/search` | Search transformers |

### API Testing

Access the interactive API documentation at:
- **Swagger UI**: http://localhost:8080/swagger-ui.html (if enabled)
- **Health Check**: http://localhost:8080/actuator/health

### Sample API Request

```javascript
// Create a new transformer
fetch('http://localhost:8080/api/transformers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'Main Transformer Unit A',
    type: 'Distribution',
    location: 'Substation 1',
    capacity: '500kVA',
    voltage: '11kV/400V'
  })
})
```

## 🎯 Key Features

### Transformer Management
- **CRUD Operations** - Create, read, update, and delete transformer records
- **Advanced Search** - Filter by multiple criteria (location, type, capacity, etc.)
- **Data Validation** - Comprehensive input validation and error handling
- **Bulk Operations** - Import/export transformer data

### Image Management
- **Secure Upload** - Support for multiple image formats (JPG, PNG, GIF)
- **Image Preview** - Thumbnail generation and gallery view
- **File Organization** - Organized storage with proper naming conventions
- **Size Limits** - Configurable file size restrictions

### User Interface
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Modern UI** - Clean, professional interface using Bootstrap components
- **Intuitive Navigation** - Easy-to-use routing and menu system
- **Real-time Updates** - Dynamic content updates without page refresh

## 🏗️ Project Architecture

```
software-design-competetion/
├── Front-end/                 # React.js Application
│   ├── public/               # Static assets
│   ├── src/                  # Source code
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components
│   │   ├── layouts/         # Layout components
│   │   └── utils/           # Utility functions
│   ├── package.json         # Frontend dependencies
│   └── .env                 # Frontend environment variables
│
├── Back-end/                 # Spring Boot Application
│   └── software-design-project-final/
│       ├── src/
│       │   ├── main/java/   # Java source code
│       │   └── main/resources/ # Configuration files
│       ├── pom.xml          # Maven configuration
│       └── .env             # Backend environment variables
│
├── docker-compose.yml        # Docker configuration
├── .env                     # Docker environment variables
└── uploads/                 # File upload directory
```

## 🚀 Deployment

### Local Development
1. Start MySQL database
2. Run backend: `cd Back-end/software-design-project-final && .\mvnw.cmd spring-boot:run`
3. Run frontend: `cd Front-end && npm start`

### Production Deployment
1. Build frontend: `cd Front-end && npm run build`
2. Package backend: `cd Back-end/software-design-project-final && .\mvnw.cmd clean package`
3. Deploy using Docker or traditional server setup

### Access Points
| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main user interface |
| **Backend API** | http://localhost:8080/api | RESTful API endpoints |
| **Health Check** | http://localhost:8080/actuator/health | Application health status |

## 🔧 Troubleshooting

### Common Issues

#### Frontend Issues
```powershell
# Clear npm cache and reinstall dependencies
npm cache clean --force
rm -rf node_modules package-lock.json  # Linux/Mac
rmdir /s node_modules & del package-lock.json  # Windows
npm install
```

#### Backend Issues
```powershell
# Clean and rebuild Maven project
.\mvnw.cmd clean compile

# Check Java version
java --version

# Verify database connection
mysql -u transformer_user -p -h localhost transformer_db
```

#### Database Connection Issues
1. Verify MySQL is running: `mysql -u root -p`
2. Check database exists: `SHOW DATABASES;`
3. Verify user permissions: `SHOW GRANTS FOR 'transformer_user'@'localhost';`

#### Port Conflicts
- **Frontend (3000)**: Change port with `PORT=3001 npm start`
- **Backend (8080)**: Update `APP_PORT` in `.env` file

### Log Files
- **Backend logs**: Check console output or configure logging in `application.properties`
- **Frontend logs**: Check browser console for React errors
- **Database logs**: Check MySQL error logs

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following our coding standards
4. Test your changes thoroughly
5. Commit with clear messages: `git commit -m "Add: description of changes"`
6. Push to your fork: `git push origin feature/your-feature-name`
7. Create a Pull Request

### Coding Standards
- **Frontend**: Follow React best practices and ESLint rules
- **Backend**: Follow Java coding conventions and Spring Boot guidelines
- **Database**: Use proper naming conventions and indexing



## 👥 Support

For support and questions:
- **Issues**: [GitHub Issues](https://github.com/NidulaGunawardana/software-design-competetion/issues)
- **Documentation**: Check the `docs/` directory for detailed guides
- **Wiki**: [Project Wiki](https://github.com/NidulaGunawardana/software-design-competetion/wiki)

## 📚 Additional Resources

- [Environment Setup Guide](ENV_SETUP.md)
- [Environment Variables Reference](ENVIRONMENT_VARIABLES.md)
- [Simple Deployment Guide](SIMPLE_DEPLOYMENT.md)
- [API Configuration](Front-end/API_CONFIG.md)
- [Backend README](Back-end/software-design-project-final/README_FK_FIX.md)

