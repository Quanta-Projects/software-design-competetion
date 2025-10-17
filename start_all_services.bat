@echo off
REM ============================================================================
REM Full Stack Transformer Detection System Launcher
REM ============================================================================
REM This script starts all three components:
REM 1. Maven Backend (Spring Boot) - Port 8080
REM 2. React Frontend - Port 3000
REM 3. FastAPI AI Service (tf_model) - Port 8000
REM ============================================================================

color 0A
title Full Stack System Launcher

echo.
echo ============================================================================
echo   TRANSFORMER DEFECT DETECTION - FULL STACK LAUNCHER
echo ============================================================================
echo.
echo Starting all services:
echo   [1] Maven Backend (Spring Boot)    - http://localhost:8080
echo   [2] React Frontend (React App)     - http://localhost:3000
echo   [3] FastAPI AI Service (tf_model)  - http://localhost:8000
echo.
echo ============================================================================
echo.

REM ============================================================================
REM SECTION 1: Check Prerequisites
REM ============================================================================

echo [STEP 1/7] Checking Prerequisites...
echo.

REM Check Java
echo Checking Java installation...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Java is NOT installed or not in PATH
    echo Please install Java 17 or higher from: https://adoptium.net/
    pause
    exit /b 1
) else (
    echo [OK] Java is installed
    java -version 2>&1 | findstr /i "version"
)
echo.

REM Check Node.js
echo Checking Node.js installation...
call node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed or not in PATH
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo [OK] Node.js is installed
    call node -v 2>&1
)
echo.

REM Check npm
echo Checking npm installation...
call npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is NOT installed or not in PATH
    pause
    exit /b 1
) else (
    echo [OK] npm is installed
    call npm -v 2>&1
)
echo.

REM Check Python
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is NOT installed or not in PATH
    echo Please install Python 3.9 or 3.10 from: https://www.python.org/
    pause
    exit /b 1
) else (
    echo [OK] Python is installed
    python --version
)
echo.

echo [SUCCESS] All prerequisites are installed!
echo.
timeout /t 2 /nobreak >nul

REM ============================================================================
REM SECTION 2: Setup Backend Dependencies
REM ============================================================================

echo ============================================================================
echo [STEP 2/7] Setting up Maven Backend...
echo ============================================================================
echo.

cd /d "%~dp0Back-end\software-design-project-final"

echo Current directory: %CD%
echo Checking Maven project...

if not exist "pom.xml" (
    echo [ERROR] pom.xml not found in Back-end directory
    echo Expected location: %CD%\pom.xml
    pause
    exit /b 1
)

echo [OK] Maven project found
echo.

REM Check if Maven wrapper exists
if exist "mvnw.cmd" (
    echo [INFO] Using Maven wrapper
    set MAVEN_CMD=mvnw.cmd
) else (
    echo [INFO] Using system Maven
    set MAVEN_CMD=mvn
)

echo.
timeout /t 2 /nobreak >nul

REM ============================================================================
REM SECTION 3: Setup Frontend Dependencies
REM ============================================================================

echo ============================================================================
echo [STEP 3/7] Setting up React Frontend...
echo ============================================================================
echo.

cd /d "%~dp0Front-end"

echo Current directory: %CD%
echo.

if not exist "package.json" (
    echo [ERROR] package.json not found in Front-end directory
    pause
    exit /b 1
)

echo [OK] React project found
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing npm dependencies - first time setup
    echo This may take a few minutes...
    call npm install
    if errorlevel 1 (
        echo [ERROR] Failed to install npm dependencies
        pause
        exit /b 1
    )
    echo [OK] npm dependencies installed successfully
) else (
    echo [OK] node_modules already exists, skipping npm install
    echo [TIP] Run npm install manually if you want to update dependencies
)

echo.
timeout /t 2 /nobreak >nul

REM ============================================================================
REM SECTION 4: Setup FastAPI AI Service (tf_model)
REM ============================================================================

echo ============================================================================
echo [STEP 4/7] Setting up FastAPI AI Service (tf_model)...
echo ============================================================================
echo.

cd /d "%~dp0tf_model"

echo Current directory: %CD%
echo.

if not exist "requirements.txt" (
    echo [ERROR] requirements.txt not found in tf_model directory
    pause
    exit /b 1
)

echo [OK] FastAPI project found
echo.

REM Check for virtual environment
if exist "transformer_defect_env\Scripts\activate.bat" (
    echo [OK] Virtual environment found
    echo [INFO] Activating Python virtual environment...
    call transformer_defect_env\Scripts\activate.bat
    
    echo [INFO] Checking/Installing Python dependencies...
    pip install -r requirements.txt --quiet
    if %errorlevel% neq 0 (
        echo [WARNING] Some pip packages may have failed to install
        echo [INFO] Continuing anyway...
    ) else (
        echo [OK] Python dependencies are up to date
    )
) else (
    echo [WARNING] Virtual environment not found at: transformer_defect_env
    echo [INFO] Installing dependencies in global Python environment...
    pip install -r requirements.txt --quiet
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Python dependencies
        echo [TIP] Consider creating a virtual environment first
        pause
        exit /b 1
    )
)

echo.

REM Check for required models
echo Checking for trained models...
if exist "runs\detect\transformer_defects_v1\weights\best.pt" (
    echo [OK] Defect detection model found
) else (
    echo [WARNING] Defect detection model NOT found
    echo Expected: runs\detect\transformer_defects_v1\weights\best.pt
    echo [INFO] You may need to train the model first
)

if exist "runs\seg_y11n_tx3\weights\best.pt" (
    echo [OK] Transformer segmentation model found
) else (
    echo [WARNING] Transformer segmentation model NOT found
    echo Expected: runs\seg_y11n_tx3\weights\best.pt
    echo [INFO] You may need to train the model first
)

echo.
timeout /t 2 /nobreak >nul

REM ============================================================================
REM SECTION 5: Start All Services
REM ============================================================================

echo ============================================================================
echo [STEP 5/7] Starting All Services...
echo ============================================================================
echo.

echo [INFO] Services will start in separate windows
echo [INFO] Do NOT close this main window or the service windows
echo.
timeout /t 3 /nobreak >nul

REM Start Maven Backend
echo [1/3] Starting Maven Backend (Spring Boot)...
cd /d "%~dp0Back-end\software-design-project-final"
start "Maven Backend - Port 8080" cmd /k "echo Starting Maven Backend... & echo. & %MAVEN_CMD% spring-boot:run"
echo [OK] Maven Backend starting in new window...
echo.
timeout /t 2 /nobreak >nul

REM Start React Frontend
echo [2/3] Starting React Frontend...
cd /d "%~dp0Front-end"
start "React Frontend - Port 3000" cmd /k "echo Starting React Frontend... & echo. & call npm start"
echo [OK] React Frontend starting in new window...
echo.
timeout /t 2 /nobreak >nul

REM Start FastAPI AI Service
echo [3/3] Starting FastAPI AI Service (tf_model)...
cd /d "%~dp0tf_model"

REM Check which fastapi_server to use
if exist "fastapi_server.py" (
    if exist "transformer_defect_env\Scripts\activate.bat" (
        start "FastAPI AI Service - Port 8000" cmd /k "echo Starting FastAPI AI Service... & echo. & call transformer_defect_env\Scripts\activate.bat & python fastapi_server.py"
    ) else (
        start "FastAPI AI Service - Port 8000" cmd /k "echo Starting FastAPI AI Service... & echo. & python fastapi_server.py"
    )
    echo [OK] FastAPI AI Service starting in new window...
) else (
    cd /d "%~dp0ai-anomaly-service"
    if exist "fastapi_server.py" (
        start "FastAPI AI Service - Port 8000" cmd /k "echo Starting FastAPI AI Service... & echo. & python fastapi_server.py"
        echo [OK] FastAPI AI Service starting in new window...
    ) else (
        echo [ERROR] fastapi_server.py not found in tf_model or ai-anomaly-service
        echo Please check the file location
    )
)

echo.
timeout /t 3 /nobreak >nul

REM ============================================================================
REM SECTION 6: Wait for Services to Start
REM ============================================================================

echo ============================================================================
echo [STEP 6/7] Waiting for services to initialize...
echo ============================================================================
echo.

echo Please wait while all services start up...
echo This may take 30-60 seconds...
echo.

echo [INFO] Maven Backend typically takes 20-40 seconds to start
echo [INFO] React Frontend typically takes 10-20 seconds to start
echo [INFO] FastAPI Service typically takes 5-10 seconds to start
echo.

timeout /t 15 /nobreak >nul

REM ============================================================================
REM SECTION 7: Display Service Status
REM ============================================================================

echo ============================================================================
echo [STEP 7/7] Service Status
echo ============================================================================
echo.

echo All services have been launched!
echo.
echo Service URLs:
echo   [BACKEND]  Maven Spring Boot : http://localhost:8080
echo   [FRONTEND] React Application  : http://localhost:3000
echo   [AI API]   FastAPI Service    : http://localhost:8000
echo   [AI DOCS]  FastAPI Swagger UI : http://localhost:8000/docs
echo.
echo ============================================================================
echo.

echo [IMPORTANT] Service Windows:
echo   - Do NOT close the separate command windows
echo   - Each window shows logs for its respective service
echo   - To stop a service, close its window or press Ctrl+C in that window
echo.

echo [TIPS]
echo   - Frontend will auto-open in browser (http://localhost:3000)
echo   - Backend API: http://localhost:8080
echo   - AI Service API Docs: http://localhost:8000/docs
echo   - Check individual windows for errors or logs
echo.

echo ============================================================================
echo   SYSTEM READY - All services are starting up!
echo ============================================================================
echo.

echo To stop ALL services:
echo   1. Close this window, OR
echo   2. Press Ctrl+C here, OR
echo   3. Close each service window individually
echo.

REM Keep this window open
echo This window will remain open to monitor the system...
echo.
pause

REM If user presses a key, ask if they want to stop all services
echo.
echo Do you want to stop all services? (Y/N)
choice /c YN /n /m "Press Y to stop all services, N to keep running: "

if %errorlevel%==1 (
    echo.
    echo Stopping all services...
    taskkill /FI "WindowTitle eq Maven Backend - Port 8080*" /T /F >nul 2>&1
    taskkill /FI "WindowTitle eq React Frontend - Port 3000*" /T /F >nul 2>&1
    taskkill /FI "WindowTitle eq FastAPI AI Service - Port 8000*" /T /F >nul 2>&1
    echo [OK] All services stopped
    timeout /t 2 /nobreak >nul
) else (
    echo.
    echo Services will continue running...
    echo Close individual windows to stop specific services
    timeout /t 2 /nobreak >nul
)

exit /b 0
@echo off
REM ============================================================================
REM Full Stack Transformer Detection System Launcher
REM ============================================================================
REM This script starts all three components:
REM 1. Maven Backend (Spring Boot) - Port 8080
REM 2. React Frontend - Port 3000
REM 3. FastAPI AI Service (tf_model) - Port 8000
REM ============================================================================

color 0A
title Full Stack System Launcher

echo.
echo ============================================================================
echo   TRANSFORMER DEFECT DETECTION - FULL STACK LAUNCHER
echo ============================================================================
echo.
echo Starting all services:
echo   [1] Maven Backend (Spring Boot)    - http://localhost:8080
echo   [2] React Frontend (React App)     - http://localhost:3000
echo   [3] FastAPI AI Service (tf_model)  - http://localhost:8000
echo.
echo ============================================================================
echo.

REM ============================================================================
REM SECTION 1: Check Prerequisites
REM ============================================================================

echo [STEP 1/7] Checking Prerequisites...
echo.

REM Check Java
echo Checking Java installation...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Java is NOT installed or not in PATH
    echo Please install Java 17 or higher from: https://adoptium.net/
    pause
    exit /b 1
) else (
    echo [OK] Java is installed
    java -version 2>&1 | findstr /i "version"
)
echo.

REM Check Node.js
echo Checking Node.js installation...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is NOT installed or not in PATH
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo [OK] Node.js is installed
    node -v
)
echo.

REM Check npm
echo Checking npm installation...
npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is NOT installed or not in PATH
    pause
    exit /b 1
) else (
    echo [OK] npm is installed
    npm -v
)
echo.

REM Check Python
echo Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is NOT installed or not in PATH
    echo Please install Python 3.9 or 3.10 from: https://www.python.org/
    pause
    exit /b 1
) else (
    echo [OK] Python is installed
    python --version
)
echo.

echo [SUCCESS] All prerequisites are installed!
echo.
timeout /t 2 /nobreak >nul

REM ============================================================================
REM SECTION 2: Setup Backend Dependencies
REM ============================================================================

echo ============================================================================
echo [STEP 2/7] Setting up Maven Backend...
echo ============================================================================
echo.

cd /d "%~dp0Back-end\software-design-project-final"

echo Current directory: %CD%
echo Checking Maven project...

if not exist "pom.xml" (
    echo [ERROR] pom.xml not found in Back-end directory
    echo Expected location: %CD%\pom.xml
    pause
    exit /b 1
)

echo [OK] Maven project found
echo.

REM Check if Maven wrapper exists
if exist "mvnw.cmd" (
    echo [INFO] Using Maven wrapper (mvnw.cmd)
    set MAVEN_CMD=mvnw.cmd
) else (
    echo [INFO] Using system Maven
    set MAVEN_CMD=mvn
)

echo.
timeout /t 2 /nobreak >nul

REM ============================================================================
REM SECTION 3: Setup Frontend Dependencies
REM ============================================================================

echo ============================================================================
echo [STEP 3/7] Setting up React Frontend...
echo ============================================================================
echo.

cd /d "%~dp0Front-end"

echo Current directory: %CD%
echo.

if not exist "package.json" (
    echo [ERROR] package.json not found in Front-end directory
    pause
    exit /b 1
)

echo [OK] React project found
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing npm dependencies (first time setup)...
    echo This may take a few minutes...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install npm dependencies
        pause
        exit /b 1
    )
    echo [OK] npm dependencies installed successfully
) else (
    echo [OK] node_modules already exists, skipping npm install
    echo [TIP] Run 'npm install' manually if you want to update dependencies
)

echo.
timeout /t 2 /nobreak >nul

REM ============================================================================
REM SECTION 4: Setup FastAPI AI Service (tf_model)
REM ============================================================================

echo ============================================================================
echo [STEP 4/7] Setting up FastAPI AI Service (tf_model)...
echo ============================================================================
echo.

cd /d "%~dp0tf_model"

echo Current directory: %CD%
echo.

if not exist "requirements.txt" (
    echo [ERROR] requirements.txt not found in tf_model directory
    pause
    exit /b 1
)

echo [OK] FastAPI project found
echo.

REM Check for virtual environment
if exist "transformer_defect_env\Scripts\activate.bat" (
    echo [OK] Virtual environment found
    echo [INFO] Activating Python virtual environment...
    call transformer_defect_env\Scripts\activate.bat
    
    echo [INFO] Checking/Installing Python dependencies...
    pip install -r requirements.txt --quiet
    if %errorlevel% neq 0 (
        echo [WARNING] Some pip packages may have failed to install
        echo [INFO] Continuing anyway...
    ) else (
        echo [OK] Python dependencies are up to date
    )
) else (
    echo [WARNING] Virtual environment not found at: transformer_defect_env
    echo [INFO] Installing dependencies in global Python environment...
    pip install -r requirements.txt --quiet
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install Python dependencies
        echo [TIP] Consider creating a virtual environment first
        pause
        exit /b 1
    )
)

echo.

REM Check for required models
echo Checking for trained models...
if exist "runs\detect\transformer_defects_v1\weights\best.pt" (
    echo [OK] Defect detection model found
) else (
    echo [WARNING] Defect detection model NOT found
    echo Expected: runs\detect\transformer_defects_v1\weights\best.pt
    echo [INFO] You may need to train the model first
)

if exist "runs\seg_y11n_tx3\weights\best.pt" (
    echo [OK] Transformer segmentation model found
) else (
    echo [WARNING] Transformer segmentation model NOT found
    echo Expected: runs\seg_y11n_tx3\weights\best.pt
    echo [INFO] You may need to train the model first
)

echo.
timeout /t 2 /nobreak >nul

REM ============================================================================
REM SECTION 5: Start All Services
REM ============================================================================

echo ============================================================================
echo [STEP 5/7] Starting All Services...
echo ============================================================================
echo.

echo [INFO] Services will start in separate windows
echo [INFO] Do NOT close this main window or the service windows
echo.
timeout /t 3 /nobreak >nul

REM Start Maven Backend
echo [1/3] Starting Maven Backend (Spring Boot)...
cd /d "%~dp0Back-end\software-design-project-final"
start "Maven Backend - Port 8080" cmd /k "echo Starting Maven Backend... & echo. & %MAVEN_CMD% spring-boot:run"
echo [OK] Maven Backend starting in new window...
echo.
timeout /t 2 /nobreak >nul

REM Start React Frontend
echo [2/3] Starting React Frontend...
cd /d "%~dp0Front-end"
start "React Frontend - Port 3000" cmd /k "echo Starting React Frontend... & echo. & npm start"
echo [OK] React Frontend starting in new window...
echo.
timeout /t 2 /nobreak >nul

REM Start FastAPI AI Service
echo [3/3] Starting FastAPI AI Service (tf_model)...
cd /d "%~dp0tf_model"

REM Check which fastapi_server to use
if exist "fastapi_server.py" (
    if exist "transformer_defect_env\Scripts\activate.bat" (
        start "FastAPI AI Service - Port 8000" cmd /k "echo Starting FastAPI AI Service... & echo. & call transformer_defect_env\Scripts\activate.bat & python fastapi_server.py"
    ) else (
        start "FastAPI AI Service - Port 8000" cmd /k "echo Starting FastAPI AI Service... & echo. & python fastapi_server.py"
    )
    echo [OK] FastAPI AI Service starting in new window...
) else (
    cd /d "%~dp0ai-anomaly-service"
    if exist "fastapi_server.py" (
        start "FastAPI AI Service - Port 8000" cmd /k "echo Starting FastAPI AI Service... & echo. & python fastapi_server.py"
        echo [OK] FastAPI AI Service starting in new window...
    ) else (
        echo [ERROR] fastapi_server.py not found in tf_model or ai-anomaly-service
        echo Please check the file location
    )
)

echo.
timeout /t 3 /nobreak >nul

REM ============================================================================
REM SECTION 6: Wait for Services to Start
REM ============================================================================

echo ============================================================================
echo [STEP 6/7] Waiting for services to initialize...
echo ============================================================================
echo.

echo Please wait while all services start up...
echo This may take 30-60 seconds...
echo.

echo [INFO] Maven Backend typically takes 20-40 seconds to start
echo [INFO] React Frontend typically takes 10-20 seconds to start
echo [INFO] FastAPI Service typically takes 5-10 seconds to start
echo.

timeout /t 15 /nobreak >nul

REM ============================================================================
REM SECTION 7: Display Service Status
REM ============================================================================

echo ============================================================================
echo [STEP 7/7] Service Status
echo ============================================================================
echo.

echo All services have been launched!
echo.
echo Service URLs:
echo   [BACKEND]  Maven Spring Boot : http://localhost:8080
echo   [FRONTEND] React Application  : http://localhost:3000
echo   [AI API]   FastAPI Service    : http://localhost:8000
echo   [AI DOCS]  FastAPI Swagger UI : http://localhost:8000/docs
echo.
echo ============================================================================
echo.

echo [IMPORTANT] Service Windows:
echo   - Do NOT close the separate command windows
echo   - Each window shows logs for its respective service
echo   - To stop a service, close its window or press Ctrl+C in that window
echo.

echo [TIPS]
echo   - Frontend will auto-open in browser (http://localhost:3000)
echo   - Backend API: http://localhost:8080
echo   - AI Service API Docs: http://localhost:8000/docs
echo   - Check individual windows for errors or logs
echo.

echo ============================================================================
echo   SYSTEM READY - All services are starting up!
echo ============================================================================
echo.

echo To stop ALL services:
echo   1. Close this window, OR
echo   2. Press Ctrl+C here, OR
echo   3. Close each service window individually
echo.

REM Keep this window open
echo This window will remain open to monitor the system...
echo.
pause

REM If user presses a key, ask if they want to stop all services
echo.
echo Do you want to stop all services? (Y/N)
choice /c YN /n /m "Press Y to stop all services, N to keep running: "

if %errorlevel%==1 (
    echo.
    echo Stopping all services...
    taskkill /FI "WindowTitle eq Maven Backend - Port 8080*" /T /F >nul 2>&1
    taskkill /FI "WindowTitle eq React Frontend - Port 3000*" /T /F >nul 2>&1
    taskkill /FI "WindowTitle eq FastAPI AI Service - Port 8000*" /T /F >nul 2>&1
    echo [OK] All services stopped
    timeout /t 2 /nobreak >nul
) else (
    echo.
    echo Services will continue running...
    echo Close individual windows to stop specific services
    timeout /t 2 /nobreak >nul
)

exit /b 0
