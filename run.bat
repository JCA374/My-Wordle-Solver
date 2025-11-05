@echo off

REM Wordle Solver - Run Script (Windows)
REM This script starts the Flask web application

echo Starting Wordle Solver...
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -q -r requirements.txt

REM Change to app directory and run
echo.
echo Starting Flask server...
echo Open your browser to: http://localhost:5000
echo.
cd app
python app.py

pause
