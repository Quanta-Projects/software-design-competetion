# Transformer Management System

A full-stack web application for managing electrical transformers and inspection operations with AI-powered thermal anomaly detection.

[![Java](https://img.shields.io/badge/Java-17+-ED8B00?style=flat&logo=java&logoColor=white)](https://adoptopenjdk.net/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.4-6DB33F?style=flat&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.1.1-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)

## Overview

Transformer management system with CRUD operations, inspection tracking, image management, and AI-powered thermal defect detection using YOLO11.

**Stack:** React frontend • Spring Boot backend • FastAPI AI service • MySQL database

## Prerequisites

| Software | Minimum Version | Download |
|----------|----------------|----------|
| **Java JDK** | 17+ | [Eclipse Temurin](https://adoptium.net/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Python** | 3.10+ | [python.org](https://www.python.org/downloads/) |
| **MySQL** | 8.0+ | [MySQL](https://dev.mysql.com/downloads/mysql/) |
| **Git** | 2.30+ | [git-scm.com](https://git-scm.com/) |

**Verify installation:**
```powershell
java --version
node --version
python --version
mysql --version
git --version
```

---

## Setup

### 1. Clone Repository
```powershell
git clone https://github.com/Quanta-Projects/software-design-competetion.git
cd software-design-competetion
```

### 2. Database Setup
```sql
mysql -u root -p

CREATE DATABASE transformer_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'transformer_user'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON transformer_db.* TO 'transformer_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Backend Configuration
Create `Back-end/software-design-project-final/.env`:
```properties
DB_URL=jdbc:mysql://localhost:3306/transformer_db
DB_USERNAME=transformer_user
DB_PASSWORD=your_password
APP_PORT=8080
FILE_UPLOAD_PATH=./uploads/images/
```

### 4. Frontend Configuration
Create `Front-end/.env`:
```properties
REACT_APP_API_BASE_URL=http://localhost:8080/api
REACT_APP_FASTAPI_URL=http://localhost:8001
```

---

## Running the Application

## Running the Application

### Start All Services

**1. Backend** *(terminal 1)*
```powershell
cd Back-end\software-design-project-final
.\mvnw.cmd spring-boot:run
```
→ API: http://localhost:8080/api

**2. Frontend** *(terminal 2)*
```powershell
cd Front-end
npm install
npm start
```
→ Web app: http://localhost:3000

**3. AI Service** *(terminal 3)*
```powershell
cd tf_model
python -m venv .venv              # first time only
.\.venv\Scripts\activate          # activate environment
pip install -r requirements.txt   # first time only
python fastapi_server.py
```
→ Detection API: http://localhost:8001/docs

---

## Additional Resources

- **[Environment Setup Guide](ENV_SETUP.md)** – Detailed configuration steps
- **[Environment Variables Reference](ENVIRONMENT_VARIABLES.md)** – All config options
- **[Deployment Guide](SIMPLE_DEPLOYMENT.md)** – Production deployment

---

## Troubleshooting

**Backend won't start:**
- Verify MySQL is running: `mysql -u root -p`
- Check database exists: `SHOW DATABASES;`
- Confirm Java 17+: `java --version`

**Frontend errors:**
- Clear cache: `npm cache clean --force`
- Reinstall: `rm -rf node_modules package-lock.json; npm install`

**AI service fails:**
- Activate venv: `.\.venv\Scripts\activate`
- Check Python 3.10+: `python --version`
- Reinstall deps: `pip install -r requirements.txt`

**Port conflicts:**
- Backend: Edit `APP_PORT` in `.env`
- Frontend: `set PORT=3001 && npm start`
- AI: Edit `port=` in `fastapi_server.py`

---

## Project Structure

```
software-design-competetion-forked/
├── Back-end/
│   └── software-design-project-final/
│       ├── src/
│       │   ├── main/
│       │   │   ├── java/com/example/software_design_project_final/
│       │   │   │   ├── config/                    # Configuration classes
│       │   │   │   ├── controller/                # REST API endpoints
│       │   │   │   │   ├── ImageController.java
│       │   │   │   │   ├── InspectionController.java
│       │   │   │   │   └── TransformerController.java
│       │   │   │   ├── dao/                       # Entity models
│       │   │   │   │   ├── Image.java
│       │   │   │   │   ├── Inspection.java
│       │   │   │   │   └── Transformer.java
│       │   │   │   ├── dto/                       # Data transfer objects
│       │   │   │   ├── exception/                 # Custom exceptions
│       │   │   │   ├── repository/                # JPA repositories
│       │   │   │   │   ├── ImageRepository.java
│       │   │   │   │   ├── InspectionRepository.java
│       │   │   │   │   └── TransformerRepository.java
│       │   │   │   ├── service/                   # Business logic
│       │   │   │   │   ├── ImageService.java
│       │   │   │   │   ├── InspectionService.java
│       │   │   │   │   └── TransformerService.java
│       │   │   │   └── SoftwareDesignProjectFinalApplication.java
│       │   │   └── resources/
│       │   │       ├── application.properties
│       │   │       └── applicatiion.yml
│       │   └── test/                              # Unit tests
│       ├── uploads/                               # File upload storage
│       ├── .env                                   # Environment config
│       ├── Dockerfile
│       ├── pom.xml                                # Maven dependencies
│       └── mvnw.cmd                               # Maven wrapper
│
├── Front-end/
│   ├── public/                                    # Static assets
│   │   ├── index.html
│   │   ├── data/
│   │   └── img/
│   ├── src/
│   │   ├── components/                            # Reusable UI components
│   │   │   ├── AddInspectionModal.jsx
│   │   │   ├── AddTransformerModal.jsx
│   │   │   ├── AnnotationEditor.jsx
│   │   │   ├── AnnotationList.jsx
│   │   │   ├── cardTop.jsx
│   │   │   ├── EditInspectionModal.jsx
│   │   │   ├── InspectionHeader.jsx
│   │   │   ├── InspectionTable.jsx
│   │   │   ├── pager.jsx
│   │   │   ├── sidebar.jsx
│   │   │   ├── thermalImageUploader.jsx
│   │   │   ├── toolbar.jsx
│   │   │   └── transformerTable.jsx
│   │   ├── pages/                                 # Page components
│   │   │   ├── ImageViewer.jsx
│   │   │   ├── InspectionsPage.jsx
│   │   │   ├── previewPage.jsx
│   │   │   ├── settingsPage.jsx
│   │   │   ├── TransformersPage.jsx
│   │   │   └── uploadPage.jsx
│   │   ├── layouts/
│   │   │   └── AppLayout.jsx
│   │   ├── styles/                                # Stylesheets
│   │   │   ├── annotations.css
│   │   │   ├── previewPage.css
│   │   │   └── uiTokens.css                       # Shared design tokens
│   │   ├── utils/                                 # Utility functions
│   │   │   ├── config.js
│   │   │   └── uiOptions.js                       # Shared UI constants
│   │   ├── App.js                                 # Main app component
│   │   ├── App.css
│   │   └── index.js                               # Entry point
│   ├── .env                                       # Frontend config
│   ├── package.json                               # NPM dependencies
│   └── README.md
│
├── tf_model/                                      # AI anomaly detection service
│   ├── weights/                                   # YOLO11 model weights
│   ├── Transformer Defects/                       # Training dataset
│   ├── detection_results/                         # Detection output
│   ├── runs/                                      # Training runs
│   ├── defect_detection_gui.py                    # GUI interface
│   ├── fastapi_server.py                          # FastAPI service
│   ├── train_transformer_defects.py               # Model training
│   ├── two_stage_defect_detection.py              # Detection pipeline
│   ├── requirements.txt                           # Python dependencies
│   └── README.md
│
├── .gitignore
├── ENV_SETUP.md                                   # Setup instructions
├── ENVIRONMENT_VARIABLES.md                       # Config reference
├── SIMPLE_DEPLOYMENT.md                           # Deployment guide
└── README.md                                      # This file
```


