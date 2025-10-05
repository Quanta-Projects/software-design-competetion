# Transformer Management System

A comprehensive enterprise-grade web application for managing electrical transformers and inspection operations, built with modern React.js frontend and robust Spring Boot backend architecture.

[![Java](https://img.shields.io/badge/Java-17+-ED8B00?style=flat&logo=java&logoColor=white)](https://adoptopenjdk.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.4-6DB33F?style=flat&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=flat&logo=mysql&logoColor=white)](https://www.mysql.com/)

## Table of Contents

- [Project Overview](#project-overview)
- [Key Features](#key-features)
- [Latest Updates](#latest-updates)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [Troubleshooting](#troubleshooting)

## Project Overview

The **Transformer Management System** is a modern, full-stack web application designed for electrical utility companies and maintenance teams to efficiently manage their transformer infrastructure and inspection operations. The system provides comprehensive CRUD operations, advanced search capabilities, multimedia support, and complete inspection lifecycle management.

## Latest Updates

- **Unified design system** powered by `styles/uiTokens.css`, giving every page shared colors, spacing, and component tokens for quicker theming.
- **Reusable UI options** moved into `utils/uiOptions.js`, so dropdowns, toggles, and filters stay consistent across transformers, inspections, and uploads.
- **Refreshed upload experience** with responsive containers, updated progress indicators, and simplified image previews that scale on any device.

### Core Capabilities
- **Transformer Asset Management** - Complete lifecycle management of electrical transformers with detailed specifications
- **Inspection Management** - Full CRUD operations for transformer inspections with status tracking
- **Image Management** - Secure image upload, storage, and management with preview capabilities for transformers and inspections
- **Advanced Search & Filtering** - Multi-criteria search by region, type, location, status, and custom attributes
- **Responsive Design** - Cross-platform compatibility (Desktop, Tablet, Mobile)
- **Enterprise Security** - Built-in security features and comprehensive data validation

## Key Features

### Transformer Management
- **Complete CRUD Operations** - Create, read, update, and delete transformer records
- **Advanced Search & Filtering** - Multi-criteria search by location, type, capacity, and specifications
- **Data Validation** - Comprehensive input validation and error handling
- **Favorites System** - User-specific bookmarking for frequently accessed transformers

### Inspection Management
- **Inspection Lifecycle** - Complete inspection management from creation to completion
- **Status Tracking** - Track inspection status: In Progress, Completed, Missing, Cancelled
- **Date Management** - Schedule inspection and maintenance dates with datetime precision
- **Inspector Assignment** - Assign inspections to specific personnel with tracking
- **Branch Organization** - Organize inspections by branch or department
- **Search & Filter** - Search inspections by number, branch, inspector, or status

### Image Management
- **Multi-Entity Support** - Upload images for both transformers and inspections
- **Secure Upload** - Support for multiple image formats (JPG, PNG, GIF)
- **Image Gallery** - Thumbnail generation and gallery view with preview capabilities
- **Organized Storage** - Automated file organization with proper naming conventions
- **Size Controls** - Configurable file size restrictions and validation

### User Interface
- **Modern Design** - Clean, professional interface using Bootstrap components
- **Responsive Layout** - Optimized for desktop, tablet, and mobile devices
- **Intuitive Navigation** - Easy-to-use routing with React Router
- **Real-time Updates** - Dynamic content updates without page refresh
- **Empty State Handling** - User-friendly messages when no data is available

## Technology Stack

### Frontend Architecture
| Technology | Version | Purpose |
|------------|---------|---------|
| **React.js** | 19.1.1 | Core UI framework with hooks and modern patterns |
| **React Router** | 7.8.2 | Client-side routing and navigation |
| **React Bootstrap** | 2.10.10 | Professional UI components and responsive design |
| **Bootstrap** | 5.3.7 | CSS framework and utility classes |

### Backend Architecture
| Technology | Version | Purpose |
|------------|---------|---------|
| **Spring Boot** | 3.5.4 | Enterprise Java application framework |
| **Java** | 17+ | Programming language (LTS version) |
| **Spring Data JPA** | Latest | Object-relational mapping and data access |
| **Hibernate** | Latest | ORM implementation and database abstraction |
| **MySQL** | 8.0+ | Primary relational database |
| **Maven** | 3.6+ | Build automation and dependency management |
| **ModelMapper** | Latest | Object-to-object mapping |

### Development Tools
- **Git** - Version control system
- **Node.js** (18+) - JavaScript runtime for frontend development
- **npm** - Package manager for frontend dependencies

## Prerequisites

### System Requirements

#### Required Software
| Software | Minimum Version | Recommended | Download Link |
|----------|----------------|-------------|---------------|
| **Java JDK** | 17 | 21 (LTS) | [Eclipse Temurin](https://adoptium.net/) |
| **Node.js** | 18.0 | 20.x (LTS) | [Node.js Official](https://nodejs.org/) |
| **Python** | 3.10 | 3.11+ | [Python.org](https://www.python.org/downloads/) |
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

## Installation & Setup

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

-- Create a dedicated user for the application (recommended)
CREATE USER 'transformer_user'@'localhost' IDENTIFIED BY 'secure_password_123';
GRANT ALL PRIVILEGES ON transformer_db.* TO 'transformer_user'@'localhost';
FLUSH PRIVILEGES;

-- Verify database creation
SHOW DATABASES;

-- Exit MySQL
EXIT;
```

### 3. Backend Configuration

Navigate to the backend directory and configure environment variables:

```powershell
# Navigate to backend directory
cd Back-end\software-design-project-final

# Create or edit .env file
# Configure the following variables:
```

Create a `.env` file in `Back-end/software-design-project-final/` with:

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
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif
```

### 4. Frontend Configuration

Navigate to the frontend directory and configure environment variables:

```powershell
# Navigate to frontend directory
cd Front-end

# Create or edit .env file
echo "REACT_APP_API_BASE_URL=http://localhost:8080/api" > .env
```

Create a `.env` file in `Front-end/` with:

```properties
# Frontend Environment Configuration
REACT_APP_API_BASE_URL=http://localhost:8080/api
REACT_APP_ENVIRONMENT=development
```

## Running the Application

### Quick Start (Development)

1. **Start the backend**
   ```powershell
   cd Back-end\software-design-project-final
   .\mvnw.cmd spring-boot:run
   ```
   Backend API available at http://localhost:8080

2. **Start the frontend** *(new terminal)*
   ```powershell
   cd Front-end
   npm install
   npm start
   ```
   Web app served at http://localhost:3000

3. **Start the AI FastAPI service** *(new terminal)*
  ```powershell
  cd tf_model
  python -m venv .venv        # first time only
  .\.venv\Scripts\activate   # first time + whenever you open a new shell
  pip install -r requirements.txt
  python fastapi_server.py
  ```
  Detection API available at http://localhost:8001/docs

### Production Build Snapshot

- **Frontend**
  ```powershell
  cd Front-end
  npm run build
  ```
- **Backend**
  ```powershell
  cd Back-end\software-design-project-final
  .\mvnw.cmd clean package
  ```

### Available Commands

#### Backend Commands
| Command | Description |
|---------|-------------|
| `.\mvnw.cmd clean compile` | Compile the project |
| `.\mvnw.cmd clean package` | Create JAR file |
| `.\mvnw.cmd spring-boot:run` | Run the application in development mode |
| `.\mvnw.cmd test` | Run unit tests |

#### Frontend Commands
| Command | Description |
|---------|-------------|
| `npm start` | Start development server on http://localhost:3000 |
| `npm run build` | Create optimized production build |
| `npm test` | Run the test suite |
| `npm run eject` | Eject from create-react-app (irreversible) |

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend Application** | http://localhost:3000 | Main user interface |
| **Backend API** | http://localhost:8080/api | RESTful API endpoints |
| **AI Detection Service** | http://localhost:8001/docs | FastAPI documentation & anomaly detection |
| **Health Check** | http://localhost:8080/actuator/health | Application health status |

## API Documentation

### Transformer Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transformers` | Retrieve all transformers |
| `GET` | `/api/transformers/{id}` | Get transformer by ID |
| `POST` | `/api/transformers` | Create new transformer |
| `PUT` | `/api/transformers/{id}` | Update existing transformer |
| `DELETE` | `/api/transformers/{id}` | Delete transformer |
| `GET` | `/api/transformers/search` | Search transformers with filters |

### Inspection Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/inspections` | Retrieve all inspections |
| `GET` | `/api/inspections/{id}` | Get inspection by ID |
| `POST` | `/api/inspections` | Create new inspection |
| `PUT` | `/api/inspections/{id}` | Update existing inspection |
| `DELETE` | `/api/inspections/{id}` | Delete inspection |
| `GET` | `/api/inspections/transformer/{id}` | Get inspections for specific transformer |
| `GET` | `/api/inspections/status/{status}` | Filter inspections by status |
| `GET` | `/api/inspections/search` | Search inspections by query |
| `GET` | `/api/inspections/statuses` | Get available inspection statuses |

### Image Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/images/upload` | Upload image for transformer/inspection |
| `GET` | `/api/images` | Get all images |
| `GET` | `/api/images/transformer/{id}` | Get images for transformer |
| `GET` | `/api/images/inspection/{id}` | Get images for inspection |
| `DELETE` | `/api/images/{id}` | Delete image |

### Sample API Requests

#### Create a New Transformer
```javascript
fetch('http://localhost:8080/api/transformers', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    transformerNo: 'TR-001',
    type: 'Distribution',
    location: 'Main Substation',
    capacity: '500kVA',
    voltage: '11kV/400V',
    manufacturer: 'ABB'
  })
})
```

#### Create a New Inspection
```javascript
fetch('http://localhost:8080/api/inspections', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    inspectionNo: 'INS-001',
    transformerId: 1,
    branch: 'Maintenance',
    inspectedDate: '2024-08-28T10:00:00',
    status: 'IN_PROGRESS',
    inspectedBy: 'John Doe',
    notes: 'Routine inspection'
  })
})
```

### API Testing
- **Health Check**: http://localhost:8080/actuator/health
- **Swagger UI**: http://localhost:8080/swagger-ui.html (if enabled)

## Project Structure

```
software-design-competetion/
├── Back-end/                         # Spring Boot Application
│   └── software-design-project-final/
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/
│       │   │   │   └── com/example/software_design_project_final/
│       │   │   │       ├── controller/      # REST Controllers
│       │   │   │       │   ├── TransformerController.java
│       │   │   │       │   ├── InspectionController.java
│       │   │   │       │   └── ImageController.java
│       │   │   │       ├── service/         # Business Logic Layer
│       │   │   │       │   ├── TransformerService.java
│       │   │   │       │   ├── InspectionService.java
│       │   │   │       │   └── ImageService.java
│       │   │   │       ├── repository/      # Data Access Layer
│       │   │   │       │   ├── TransformerRepository.java
│       │   │   │       │   ├── InspectionRepository.java
│       │   │   │       │   └── ImageRepository.java
│       │   │   │       ├── dao/             # Entity Classes
│       │   │   │       │   ├── Transformer.java
│       │   │   │       │   ├── Inspection.java
│       │   │   │       │   └── Image.java
│       │   │   │       ├── dto/             # Data Transfer Objects
│       │   │   │       │   ├── TransformerRequest.java
│       │   │   │       │   ├── TransformerResponse.java
│       │   │   │       │   ├── InspectionRequest.java
│       │   │   │       │   ├── InspectionResponse.java
│       │   │   │       │   └── ImageResponse.java
│       │   │   │       └── exception/       # Custom Exceptions
│       │   │   └── resources/
│       │   │       ├── application.properties
│       │   │       └── db/migration/        # Database Migrations
│       │   └── test/                        # Unit Tests
│       ├── pom.xml                          # Maven Configuration
│       └── .env                             # Backend Environment Variables
│
├── Front-end/                        # React.js Application
│   ├── public/                       # Static Assets
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/               # Reusable UI Components
│   │   │   ├── TransformerTable.jsx
│   │   │   ├── InspectionTable.jsx
│   │   │   ├── AddInspectionModal.jsx
│   │   │   ├── EditInspectionModal.jsx
│   │   │   ├── InspectionHeader.jsx
│   │   │   ├── Toolbar.jsx
│   │   │   ├── CardTop.jsx
│   │   │   └── Pager.jsx
│   │   ├── pages/                    # Page Components
│   │   │   ├── TransformersPage.jsx
│   │   │   ├── InspectionsPage.jsx
│   │   │   └── UploadPage.jsx
│   │   ├── layouts/                  # Layout Components
│   │   ├── utils/                    # Utility Functions
│   │   │   └── config.js
│   │   ├── App.js                    # Main App Component
│   │   └── index.js                  # Application Entry Point
│   ├── package.json                  # Frontend Dependencies
│   └── .env                          # Frontend Environment Variables
│
├── uploads/                          # File Upload Directory
│   └── images/
├── .gitignore                        # Git Ignore Rules
├── README.md                         # Project Documentation
├── ENV_SETUP.md                      # Environment Setup Guide
├── ENVIRONMENT_VARIABLES.md          # Environment Variables Reference
└── SIMPLE_DEPLOYMENT.md              # Deployment Instructions
```

## Database Schema

The application uses MySQL with the following main tables:

### Core Tables
- **transformers** - Main transformer asset data
  - `id`, `transformer_no`, `type`, `location`, `capacity`, `voltage`, `manufacturer`
  - `created_at`, `updated_at`

- **inspections** - Transformer inspection records
  - `id`, `inspection_no`, `transformer_id` (FK), `branch`, `inspected_date`
  - `maintenance_date`, `status`, `inspected_by`, `notes`
  - `created_at`, `updated_at`

- **images** - Image metadata and references
  - `id`, `filename`, `original_name`, `file_path`, `file_size`
  - `transformer_id` (FK), `inspection_id` (FK), `env_condition`, `image_type`
  - `created_at`, `updated_at`

### Relationships
- One-to-Many: Transformer → Inspections
- One-to-Many: Transformer → Images
- One-to-Many: Inspection → Images
## Troubleshooting

### Common Issues and Solutions

#### Frontend Issues

**Issue: npm install fails with dependency conflicts**
```powershell
# Clear npm cache and reinstall dependencies
npm cache clean --force
rmdir /s node_modules
del package-lock.json
npm install
```

**Issue: React app doesn't start on port 3000**
```powershell
# Start on a different port
set PORT=3001 && npm start
```

**Issue: API calls fail with CORS errors**
- Verify the backend server is running on http://localhost:8080
- Check that REACT_APP_API_BASE_URL is correctly set in `.env`
- Ensure the backend CrossOrigin annotation includes your frontend URL

#### Backend Issues

**Issue: Java compilation fails**
```powershell
# Clean and rebuild Maven project
.\mvnw.cmd clean compile

# Check Java version
java --version
```

**Issue: Application fails to start**
- Verify Java 17+ is installed
- Check that MySQL server is running
- Validate database credentials in `.env` file
- Ensure database `transformer_db` exists

**Issue: Database connection errors**
```powershell
# Test MySQL connection
mysql -u transformer_user -p -h localhost transformer_db
```

#### Database Issues

**Issue: Tables not created automatically**
- Verify JPA/Hibernate configuration in `application.properties`
- Check if Flyway migrations are properly configured
- Ensure database user has proper privileges

**Issue: Foreign key constraint errors**
- Verify entity relationships in Java classes
- Check that referenced entities exist before creating dependent records

#### File Upload Issues

**Issue: Image upload fails**
- Check file upload directory permissions
- Verify `FILE_UPLOAD_PATH` in backend `.env`
- Ensure file size doesn't exceed `MAX_FILE_SIZE`
- Confirm file type is in `ALLOWED_FILE_TYPES`

### Log Files and Debugging

- **Backend logs**: Check console output for Spring Boot application
- **Frontend logs**: Open browser developer tools console
- **Database logs**: Check MySQL error logs for connection issues
- **Network issues**: Use browser Network tab to inspect API requests

### Performance Issues

**Issue: Slow API responses**
- Check database query performance
- Verify proper indexing on frequently searched columns
- Monitor memory usage of Spring Boot application

**Issue: Frontend rendering slowdowns**
- Use React Developer Tools to identify performance bottlenecks
- Check if large lists need pagination
- Verify proper use of React.memo and useCallback

### Getting Help

- **Documentation**: Check `ENV_SETUP.md` and `ENVIRONMENT_VARIABLES.md`
- **API Reference**: Use Swagger UI at http://localhost:8080/swagger-ui.html
- **Database Schema**: Refer to entity classes in `src/main/java/.../dao/`

---

## Additional Resources

- **[Environment Setup Guide](ENV_SETUP.md)** - Detailed environment configuration
- **[Environment Variables Reference](ENVIRONMENT_VARIABLES.md)** - Complete variable documentation  
- **[Simple Deployment Guide](SIMPLE_DEPLOYMENT.md)** - Docker deployment instructions


