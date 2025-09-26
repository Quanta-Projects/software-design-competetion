@echo off
echo 🔥 Thermal Anomaly Detection Service
echo ===================================
echo.
echo Starting the FastAPI service...
echo.
echo The service will be available at:
echo   http://localhost:8001
echo   http://localhost:8001/docs (API Documentation)
echo.

python fastapi_server.py

pause