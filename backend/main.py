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

from dotenv import load_dotenv
load_dotenv()

# Use PostgreSQL engine if DATABASE_URL is set, otherwise fall back to DuckDB
database_url = os.getenv("DATABASE_URL")
if database_url:
    print("🗄️  Database: PostgreSQL (Supabase)")
    print(f"📡 Connecting to: {database_url.split('@')[1] if '@' in database_url else 'Supabase'}")
    from dynamic_scouting_engine_postgres import DynamicScoutingEngine
else:
    print("🗄️  Database: DuckDB (Local)")
    print("📁 File: valorant_esports.duckdb")
    from dynamic_scouting_engine import DynamicScoutingEngine

from report_generator import ReportGenerator

# Initialize FastAPI app
app = FastAPI(
    title="VALORANT Scouting API",
    description="AI-powered scouting reports for VALORANT esports teams",
    version="1.0.0"
)

# CORS middleware for React frontend
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://localhost:5175",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

# Add production frontend URL from environment variable
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)
    # Also allow the Vercel preview URLs pattern
    allowed_origins.append("https://*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize scouting engine (persistent connection)
engine = DynamicScoutingEngine()
engine.connect()
print("✅ Database connection established")

# Initialize report generator
report_generator = ReportGenerator()


# ============== PYDANTIC MODELS ==============

class AskRequest(BaseModel):
    question: str
    team_name: Optional[str] = None

class GenerateReportRequest(BaseModel):
    team_name: str
    num_matches: int = 10
    chat_insights: Optional[List[Dict[str, Any]]] = None

class AskResponse(BaseModel):
    question: str
    team: Optional[str]
    sql: Optional[str]
    results: Optional[Dict[str, Any]]
    interpretation: Optional[str]
    error: Optional[str]
    query_type: Optional[str] = None  # DB_QUERY, GENERAL_INFO, GREETING, etc.

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
        
        data = engine.get_full_scouting_data(team_name)
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
    """Ask a natural language question about VALORANT esports data.
    
    The AI will:
    1. Classify the query (DB_QUERY, GENERAL_INFO, GREETING, etc.)
    2. For DB queries: Generate SQL, execute, and interpret results
    3. For general questions: Provide direct helpful responses
    4. Handle errors gracefully without breaking subsequent queries
    """
    try:
        result = engine.ask(request.question, request.team_name)
        return AskResponse(**result)
    except Exception as e:
        # Ensure we don't leave a broken transaction state
        try:
            engine._rollback_transaction()
        except:
            pass
        return AskResponse(
            question=request.question,
            team=request.team_name,
            sql=None,
            results=None,
            interpretation="I encountered an unexpected error. Please try again with a different question.",
            error=str(e),
            query_type="ERROR"
        )


@app.get("/api/overview/{team_name}")
async def get_team_overview(team_name: str, num_matches: int = 10):
    """Get team overview (win rate, recent form, map stats)."""
    try:
        data = engine.get_team_overview(team_name)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/players/{team_name}")
async def get_player_stats(team_name: str, num_matches: int = 10):
    """Get player statistics for a team."""
    try:
        data = engine.get_team_players(team_name)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/compositions/{team_name}")
async def get_compositions(team_name: str, num_matches: int = 10):
    """Get agent compositions and pick rates."""
    try:
        data = engine.get_team_compositions(team_name)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/weaknesses/{team_name}")
async def get_weaknesses(team_name: str, num_matches: int = 10):
    """Get identified weaknesses for a team."""
    try:
        data = engine.get_team_weaknesses(team_name)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pistol/{team_name}")
async def get_pistol_stats(team_name: str, num_matches: int = 10):
    """Get pistol round performance."""
    try:
        data = engine.get_team_pistol_stats(team_name)
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
    base = [
        "What are this team's biggest weaknesses?",
        "Show me their map stats",
        "Who are their star players?",
        "Which maps should I force in veto?",
        "How do they perform on pistol rounds?"
    ]
    if team_name:
        return {"suggestions": [q for q in base]}
    return {"suggestions": base}


@app.post("/api/generate-report")
async def generate_report(request: GenerateReportRequest):
    """Generate a comprehensive scouting report with optional chat insights."""
    try:
        teams = engine.get_all_teams()
        if request.team_name not in teams:
            raise HTTPException(status_code=404, detail=f"Team '{request.team_name}' not found")
        
        # Get scouting data
        data = engine.get_full_scouting_data(request.team_name)
        
        # Generate report with chat insights
        report_text = report_generator.generate_scouting_report(
            scouting_data=data,
            opponent_name=request.team_name,
            chat_insights=request.chat_insights or []
        )
        
        return {
            "team_name": request.team_name,
            "report": report_text,
            "data": data,
            "insights_included": len(request.chat_insights or [])
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Cleanup on shutdown
@app.on_event("shutdown")
async def shutdown_event():
    engine.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
