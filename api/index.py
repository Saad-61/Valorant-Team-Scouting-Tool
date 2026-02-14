"""
Vercel Serverless Function Entry Point
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the FastAPI app from backend
from backend.main import app

# Vercel expects 'app' to be the FastAPI instance
# Already imported as 'app', no need to rename
