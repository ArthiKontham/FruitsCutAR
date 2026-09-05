@echo off
cd /d "%~dp0"
title Fruits Cut AR - local server
REM "python3" on Windows is a Microsoft Store stub, not real Python. Use py/python.
where node   >nul 2>&1 && ( node serve.js & goto :end )
where py     >nul 2>&1 && ( py serve.py   & goto :end )
where python >nul 2>&1 && ( python serve.py & goto :end )
echo.
echo   Neither Node.js nor Python was found.
echo   Install Node from https://nodejs.org and run this again.
echo.
pause
:end
