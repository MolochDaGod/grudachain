@echo off
echo Installing Node.js...

:: Check if we're on 64-bit or 32-bit system
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    set ARCH=x64
) else (
    set ARCH=x86
)

:: Download and install Node.js portable
echo Downloading Node.js for %ARCH%...

if not exist "nodejs" mkdir nodejs
cd nodejs

:: Download Node.js (using a simple method)
powershell -Command "(New-Object Net.WebClient).DownloadFile('https://nodejs.org/dist/v18.17.0/node-v18.17.0-win-%ARCH%.zip', 'node.zip')"

if %errorlevel% neq 0 (
    echo Failed to download Node.js
    exit /b 1
)

:: Extract Node.js
powershell -Command "Expand-Archive -Path 'node.zip' -DestinationPath '.' -Force"

:: Move files to current directory
move node-v18.17.0-win-%ARCH%\* .
rmdir /s /q node-v18.17.0-win-%ARCH%
del node.zip

:: Add to PATH for this session
set PATH=%CD%;%PATH%

cd ..

echo Node.js installed successfully!
node --version
npm --version
