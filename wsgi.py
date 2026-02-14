# PythonAnywhere WSGI Configuration
import sys
import os
from pathlib import Path

# Add your project directory to the sys.path
project_home = '/home/YOUR_USERNAME/Valorant-Team-Scouting-Tool'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Set up environment variables
os.environ['GROQ_API_KEY'] = 'YOUR_GROQ_API_KEY_HERE'

# Import the FastAPI app
from backend.main import app

# PythonAnywhere expects 'application' variable
application = app
