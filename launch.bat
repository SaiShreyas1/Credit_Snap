@echo off
setlocal

cd /d "%~dp0"

echo Starting Credit_Snap services...
echo.

start "Credit_Snap Backend" cmd /k "cd /d "%~dp0Backend" & node server.js"
start "Credit_Snap Frontend" cmd /k "cd /d "%~dp0Frontend" & npm run dev"

echo Services are launching in separate terminals.
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo If one service fails, check its terminal window for errors.

endlocal