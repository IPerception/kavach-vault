@echo off
setlocal

set JAR=kavach.jar
set PORT_FILE=kavach.port
set FALLBACK_URL=http://127.0.0.1:8080

:: --- If the app is already running, just open the browser ---
if exist "%PORT_FILE%" (
    set /p LIVE_PORT=<"%PORT_FILE%"
    echo Kavach is already running on port %LIVE_PORT%.
    start "" "http://127.0.0.1:%LIVE_PORT%"
    exit /b 0
)

:: --- Back up the database (keep last 5 copies) ---
if exist kavach.db (
    set TODAY=%DATE:~10,4%-%DATE:~4,2%-%DATE:~7,2%
    copy /y kavach.db "kavach.db.backup-%TODAY%" >nul
    call :prune_backups
)

:: --- Start the application in a new window ---
echo Starting Kavach...
start "Kavach" java -jar "%JAR%"

:: --- Wait for the port file to appear (up to 30 seconds) ---
set /a WAIT=0
:wait_loop
if exist "%PORT_FILE%" goto open_browser
if %WAIT% GEQ 30 (
    echo Kavach did not start in time. Opening default URL.
    start "" "%FALLBACK_URL%"
    exit /b 1
)
timeout /t 1 /nobreak >nul
set /a WAIT+=1
goto wait_loop

:open_browser
set /p PORT=<"%PORT_FILE%"
echo Kavach is ready on port %PORT%.
start "" "http://127.0.0.1:%PORT%"
exit /b 0

:prune_backups
:: Delete all but the 5 most recent backups
set /a COUNT=0
for /f "delims=" %%F in ('dir /b /o-d kavach.db.backup-* 2^>nul') do (
    set /a COUNT+=1
    if !COUNT! GTR 5 del "%%F"
)
exit /b 0
