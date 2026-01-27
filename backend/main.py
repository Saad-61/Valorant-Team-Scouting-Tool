"""
VALORANT Scouting Tool - FastAPI Backend
Cloud9 Hackathon - January 2026
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dynamic_scouting_engine import DynamicScoutingEngine
from dotenv import load_dotenv

load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="VALORANT Scouting API",
    description="AI-powered scouting reports for VALORANT esports teams",
    version="1.0.0"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize scouting engine (persistent connection)
engine = DynamicScoutingEngine()
engine.connect()


# ============== PYDANTIC MODELS ==============

class AskRequest(BaseModel):
    question: str
    team_name: Optional[str] = None

class AskResponse(BaseModel):
    question: str
    team: Optional[str]
    sql: Optional[str]
    results: Optional[Dict[str, Any]]
    interpretation: Optional[str]
    error: Optional[str]

class TeamData(BaseModel):
    team_name: str
    num_matches: int = 10


# ============== API ENDPOINTS ==============

@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "VALORANT Scouting API",
        "ai_enabled": engine.is_ai_enabled()
    }


@app.get("/api/teams", response_model=List[str])
async def get_teams():
    """Get list of all available teams."""
    try:
        teams = engine.get_all_teams()
        return teams
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/scout/{team_name}")
async def get_scouting_data(team_name: str, num_matches: int = 10):
    """Get full scouting data for a team."""
    try:
        teams = engine.get_all_teams()
        if team_name not in teams:
            raise HTTPException(status_code=404, detail=f"Team '{team_name}' not found")
        
        data = engine.generate_full_scouting_data(team_name, num_matches)
        return {
            "team_name": team_name,
            "num_matches": num_matches,
            "data": data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ask", response_model=AskResponse)
async def ask_question(request: AskRequest):
    """Ask a natural language question about a team (uses AI to generate SQL)."""
    try:
        result = engine.ask(request.question, request.team_name)
        return AskResponse(**result)
    except Exception as e:
        return AskResponse(
            question=request.question,
            team=request.team_name,
            sql=None,
            results=None,
            interpretation=None,
            error=str(e)
        )


@app.get("/api/overview/{team_name}")
async def get_team_overview(team_name: str, num_matches: int = 10):
    """Get team overview (win rate, recent form, map stats)."""
    try:
        data = engine.get_team_overview(team_name, num_matches)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/players/{team_name}")
async def get_player_stats(team_name: str, num_matches: int = 10):
    """Get player statistics for a team."""
    try:
        data = engine.get_player_stats(team_name, num_matches)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/compositions/{team_name}")
async def get_compositions(team_name: str, num_matches: int = 10):
    """Get agent compositions and pick rates."""
    try:
        data = engine.get_team_compositions(team_name, num_matches)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/weaknesses/{team_name}")
async def get_weaknesses(team_name: str, num_matches: int = 10):
    """Get identified weaknesses for a team."""
    try:
        data = engine.get_team_weaknesses(team_name, num_matches)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pistol/{team_name}")
async def get_pistol_stats(team_name: str, num_matches: int = 10):
    """Get pistol round performance."""
    try:
        data = engine.get_pistol_tendencies(team_name, num_matches)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/h2h/{team1}/{team2}")
async def get_head_to_head(team1: str, team2: str):
    """Get head-to-head record between two teams."""
    try:
        data = engine.get_head_to_head(team1, team2)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/suggestions")
async def get_question_suggestions(team_name: Optional[str] = None):
    """Get suggested questions to ask."""
    return {
        "suggestions": engine.suggest_questions(team_name)
    }


# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    engine.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
