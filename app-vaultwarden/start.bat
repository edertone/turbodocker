:: launch docker if not active
@echo off
echo Checking if Docker is already running...

docker info >nul 2>&1
if %errorlevel%==0 (
    echo Docker is already running.
) else (
    echo Docker is not running. Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    echo Waiting for Docker to start...
    :wait_loop
    docker info >nul 2>&1
    if errorlevel 1 (
        timeout /t 5 >nul
        goto wait_loop
    )
    echo Docker is now running.
)

:: Start the containers
docker compose up -d

:: Wait for the web service to be ready
echo Waiting for site to be ready...
:wait_web
curl -s -f -o nul http://localhost:8083
if %errorlevel% neq 0 (
    timeout /t 2 >nul
    goto wait_web
)

:: Launch browser
start "" chrome.exe --app=http://localhost:8083 --window-size=1024,768
