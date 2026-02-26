@echo off
title GRUDA Legion - Standalone Launch System
color 0a

echo.
echo  ██████╗ ██████╗ ██╗   ██╗██████╗  █████╗     ██╗     ███████╗ ██████╗ ██╗ ██████╗ ███╗   ██╗
echo ██╔════╝ ██╔══██╗██║   ██║██╔══██╗██╔══██╗    ██║     ██╔════╝██╔════╝ ██║██╔═══██╗████╗  ██║
echo ██║  ███╗██████╔╝██║   ██║██║  ██║███████║    ██║     █████╗  ██║  ███╗██║██║   ██║██╔██╗ ██║
echo ██║   ██║██╔══██╗██║   ██║██║  ██║██╔══██║    ██║     ██╔══╝  ██║   ██║██║██║   ██║██║╚██╗██║
echo ╚██████╔╝██║  ██║╚██████╔╝██████╔╝██║  ██║    ███████╗███████╗╚██████╔╝██║╚██████╔╝██║ ╚████║
echo  ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝    ╚══════╝╚══════╝ ╚═════╝ ╚═╝ ╚═════╝ ╚═╝  ╚═══╝
echo.
echo ===============================================================================
echo                        GRUDA Legion Standalone v3.0
echo                    Free AI • Local Processing • Global Network
echo ===============================================================================
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not detected. Installing portable Node.js...
    call install-node.bat
    if %errorlevel% neq 0 (
        echo [CRITICAL] Failed to install Node.js. Please install manually.
        pause
        exit /b 1
    )
)

:: Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: Start the GRUDA Legion system
echo [INFO] Starting GRUDA Legion system...
echo [INFO] Free AI services initializing...
echo [INFO] Local server starting...
echo.

:: Start backend server
start "GRUDA Legion Server" /min cmd /c "node server.js"

:: Wait for server to start
timeout /t 3 /nobreak >nul

:: Start frontend
start "GRUDA Legion UI" /min cmd /c "node frontend-server.js"

:: Wait for frontend to start
timeout /t 2 /nobreak >nul

:: Open in default browser
echo [SUCCESS] GRUDA Legion is now running!
echo [INFO] Opening in your default browser...
echo.
echo ===============================================================================
echo   Access URLs:
echo   • Main Interface: http://localhost:3000
echo   • Admin Panel:    http://localhost:3001
echo   • API Endpoint:   http://localhost:3000/api
echo   • Health Check:   http://localhost:3000/health
echo ===============================================================================
echo.

start "" "http://localhost:3000"

echo [INFO] GRUDA Legion is now active. Close this window to stop the system.
echo [INFO] Press Ctrl+C to stop all services.
pause

:: Cleanup on exit
taskkill /f /im node.exe >nul 2>&1
echo [INFO] GRUDA Legion services stopped.
pause
