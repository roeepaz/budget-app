@echo off
echo Starting Budget App Credit Card Sync...
cd /d "%~dp0\card-sync"
call npm run build
call npm start
echo.
echo Sync Finished!
pause
