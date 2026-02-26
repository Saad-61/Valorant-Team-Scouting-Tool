"""
Vercel Serverless Function Entry Point
"""
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set DATABASE_URL to use PostgreSQL
# (Will be set in Vercel environment variables)

# Import the FastAPI app from backend
from backend.main import app

# Vercel expects 'app' to be the FastAPI instance
