@echo off
setlocal
pushd "%~dp0"

echo Blockchain Land Registry - Local Demo Launcher
echo ----------------------------------------------

if not exist "node_modules\hardhat\package.json" (
  echo Installing contract dependencies...
  call npm install
  if errorlevel 1 goto failed
)

if not exist "frontend\node_modules\vite\package.json" (
  echo Installing frontend dependencies...
  call npm --prefix frontend install
  if errorlevel 1 goto failed
)

set "HARDHAT_DISABLE_TELEMETRY_PROMPT=true"
powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\wait-for-chain.ps1"
if errorlevel 1 (
  echo Starting the local Hardhat blockchain in a separate window...
  start "Hardhat Local Node" cmd /k "cd /d ""%CD%"" ^&^& set HARDHAT_DISABLE_TELEMETRY_PROMPT=true ^&^& npm run chain"
  powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\wait-for-chain.ps1"
  if errorlevel 1 goto failed
)

echo Compiling and deploying to the local chain...
call npm run compile
if errorlevel 1 goto failed
call npm run deploy:local
if errorlevel 1 goto failed
call npm run seed:local
if errorlevel 1 goto failed

echo Starting the frontend...
start "Land Registry Frontend" cmd /k "cd /d ""%CD%"" ^&^& npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"
echo.
echo Demo is opening at http://localhost:5173
echo Keep the Hardhat Local Node and frontend windows open while using the app.
popd
exit /b 0

:failed
echo.
echo Startup failed. Check the message above and the Hardhat Local Node window.
popd
pause
exit /b 1
