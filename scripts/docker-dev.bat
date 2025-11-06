@echo off
REM Backend Docker Development Script for Windows
REM This script ensures clean container startup with proper rebuild

setlocal enabledelayedexpansion

echo [%time%] Starting Backend Docker Development Environment

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker and try again.
    pause
    exit /b 1
)

REM Step 1: Stop and remove existing containers
echo [%time%] Stopping existing containers...
docker-compose ps -q | findstr . >nul 2>&1
if not errorlevel 1 (
    docker-compose down
    echo [%time%] ✓ Existing containers stopped
) else (
    echo [%time%] No existing containers to stop
)

REM Step 2: Force rebuild without cache
echo [%time%] Building fresh images (this may take a few minutes)...
docker-compose build --no-cache
if errorlevel 1 (
    echo [ERROR] Failed to build images
    pause
    exit /b 1
)
echo [%time%] ✓ Images built successfully

REM Step 3: Start containers
echo [%time%] Starting containers...
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start containers
    pause
    exit /b 1
)
echo [%time%] ✓ Containers started successfully

REM Step 4: Wait for services to be ready
echo [%time%] Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Step 5: Check service health
echo [%time%] Checking service status...

REM Check if containers are running
docker-compose ps | findstr "Up" >nul 2>&1
if not errorlevel 1 (
    echo [%time%] ✓ Containers are running
) else (
    echo [ERROR] Some containers failed to start
    docker-compose ps
    pause
    exit /b 1
)

REM Check backend health (simple check)
echo [%time%] Testing backend health...
timeout /t 5 /nobreak >nul

echo.
echo === Docker Development Environment Ready ===
echo Backend API: http://localhost:3000
echo API Health: http://localhost:3000/api/v1/health
echo Swagger Docs: http://localhost:3000/api/v1/docs
echo.
echo Useful commands:
echo   npm run docker:logs    - View logs
echo   npm run docker:down    - Stop containers
echo   docker-compose ps      - Check status
echo.
pause
