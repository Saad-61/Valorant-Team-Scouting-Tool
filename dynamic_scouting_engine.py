"""
Dynamic Scouting Engine - Uses Gemini to generate SQL queries from natural language
Extracts tactical insights from DuckDB using AI-powered query generation
"""

import duckdb
from pathlib import Path
from typing import Dict, List, Any, Optional
import json
import os
import time
from dotenv import load_dotenv

load_dotenv()

# Try to import Gemini
try:
    from google import genai
    from google.genai import types
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False

DB_PATH = Path(__file__).parent / "valorant_esports.duckdb"

# Rate limiting
LAST_API_CALL = 0
MIN_API_INTERVAL = 3.0  # Minimum seconds between API calls (free tier: 5 requests/min)

# Database schema for LLM context
DATABASE_SCHEMA = """
## VALORANT Esports Database Schema

### Tables:

#### 1. series - Match/series between two teams
- series_id (BIGINT, PK): Unique series ID
- tournament_name (TEXT): Tournament name (e.g., "VCT Americas Stage 1")
- team1_name (TEXT): First team name
- team2_name (TEXT): Second team name
- team1_id (TEXT): First team ID
- team2_id (TEXT): Second team ID
- winner_team_id (TEXT): Winning team ID
- team1_score (INTEGER): Maps won by team1
- team2_score (INTEGER): Maps won by team2
- started_at (TIMESTAMP): Match start time
- finished (BOOLEAN): Whether series is complete
- best_of (INTEGER): Series format (1, 3, or 5)

#### 2. games - Individual map matches within a series
- game_id (TEXT, PK): Unique game ID
- series_id (BIGINT, FK): Reference to series
- map_name (TEXT): Map played (ascent, bind, haven, split, etc.)
- team1_id, team1_name, team2_id, team2_name (TEXT): Teams
- team1_score (INTEGER): Rounds won by team1
- team2_score (INTEGER): Rounds won by team2
- winner_team_id (TEXT): Winning team ID
- team1_start_side (TEXT): 'attacker' or 'defender'
- total_rounds (INTEGER): Total rounds played

#### 3. rounds - Round-by-round outcomes
- round_id (TEXT, PK): Unique round ID
- game_id (TEXT, FK): Reference to game
- series_id (BIGINT, FK): Reference to series
- round_number (INTEGER): Round number (1-based)
- attacker_team_id (TEXT): Attacking team
- defender_team_id (TEXT): Defending team
- winner_team_id (TEXT): Round winner
- winner_side (TEXT): 'attacker' or 'defender'
- win_type (TEXT): 'opponentEliminated', 'bombExploded', 'bombDefused', 'timeExpired'
- bomb_planted (BOOLEAN): Whether spike was planted
- bomb_defused (BOOLEAN): Whether spike was defused
- is_pistol_round (BOOLEAN): True for rounds 1, 13, or OT pistols
- half (TEXT): 'first', 'second', or 'overtime'

#### 4. player_round_stats - Per-player stats for each round
- id (TEXT, PK): Unique ID
- game_id (TEXT, FK): Reference to game
- round_number (INTEGER): Round number
- player_id (TEXT): Player identifier
- player_name (TEXT): Player display name
- team_id (TEXT): Team ID
- agent (TEXT): Agent played (jett, omen, sage, etc.)
- agent_role (TEXT): 'Duelist', 'Controller', 'Sentinel', 'Initiator'
- side (TEXT): 'attacker' or 'defender'
- kills (INTEGER): Kills in round
- deaths (INTEGER): Deaths in round (0 or 1)
- assists (INTEGER): Assists in round
- headshots (INTEGER): Headshot kills
- alive_at_end (BOOLEAN): Survived the round

#### 5. weapon_kills - Weapon usage per round
- id (TEXT, PK): Unique ID
- game_id (TEXT, FK): Reference to game
- round_number (INTEGER): Round number
- team_id (TEXT): Team ID
- weapon_name (TEXT): Weapon used (phantom, vandal, operator, sheriff, etc.)
- kill_count (INTEGER): Kills with this weapon in round

#### 6. game_compositions - Team agent compositions per game
- id (TEXT, PK): Unique ID
- game_id (TEXT, FK): Reference to game
- map_name (TEXT): Map played
- team_id (TEXT): Team ID
- team_name (TEXT): Team name
- agent (TEXT): Agent picked
- agent_role (TEXT): Agent role
- player_id (TEXT): Player ID
- player_name (TEXT): Player name

#### 7. player_economy - End-of-game player stats
- id (TEXT, PK): Unique ID
- game_id (TEXT, FK): Reference to game
- player_name (TEXT): Player name
- team_id (TEXT): Team ID
- agent (TEXT): Agent played
- total_kills (INTEGER): Total kills in game
- total_deaths (INTEGER): Total deaths in game
- total_assists (INTEGER): Total assists in game
- total_headshots (INTEGER): Headshots in game

### Key Relationships:
- series -> games (one-to-many)
- games -> rounds (one-to-many)
- games -> player_round_stats (one-to-many)
- games -> game_compositions (one-to-many)

### Common Values:
- Agents: jett, raze, reyna, phoenix, neon, iso, yoru (Duelists); omen, brimstone, astra, viper, harbor, clove (Controllers); sage, cypher, killjoy, chamber, deadlock, vyse (Sentinels); sova, breach, skye, fade, gekko, kayo (Initiators)
- Maps: ascent, bind, breeze, fracture, haven, icebox, lotus, pearl, split, sunset, abyss
- Win types: opponentEliminated, bombExploded, bombDefused, timeExpired
"""


class DynamicScoutingEngine:
    """Query engine with AI-powered dynamic SQL generation."""
    
    MODEL_NAME = "gemini-2.5-flash"
    
    def __init__(self, db_path: str = None, api_key: str = None):
        self.db_path = db_path or str(DB_PATH)
        self.conn = None
        
        # Initialize Gemini client
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if self.api_key and GEMINI_AVAILABLE:
            self.api_key = self.api_key.strip().strip('"').strip("'")
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
    
    def connect(self):
        """Establish database connection."""
        self.conn = duckdb.connect(self.db_path, read_only=True)
        return self
    
    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
    
    def __enter__(self):
        return self.connect()
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
    
    def is_ai_enabled(self) -> bool:
        """Check if AI query generation is available."""
        return self.client is not None
    
    def get_all_teams(self) -> List[str]:
        """Get list of all teams in the database."""
        query = """
            SELECT DISTINCT team_name FROM (
                SELECT DISTINCT team1_name as team_name FROM series
                UNION
                SELECT DISTINCT team2_name as team_name FROM series
            ) ORDER BY team_name
        """
        result = self.conn.execute(query).fetchall()
        return [row[0] for row in result]
    
    def generate_sql_from_question(self, question: str, team_name: str = None) -> Dict[str, Any]:
        """Use Gemini to generate SQL from a natural language question."""
        
        if not self.client:
            return {
                "error": "Gemini AI not configured. Add GEMINI_API_KEY to .env file.",
                "sql": None
            }
        
        team_context = f"\nIMPORTANT: The user is asking about the team '{team_name}'. Filter queries to include this team." if team_name else ""
        
        prompt = f"""You are a SQL expert. Generate a simple, working DuckDB SQL query.

DATABASE TABLES:
- series: series_id, tournament_name, team1_name, team2_name, team1_id, team2_id, winner_team_id, team1_score, team2_score, started_at, finished
- games: game_id, series_id, map_name, team1_id, team1_name, team2_id, team2_name, team1_score, team2_score, winner_team_id
- rounds: round_id, game_id, series_id, round_number, attacker_team_id, defender_team_id, winner_team_id, win_type, bomb_planted, is_pistol_round
- game_compositions: game_id, map_name, team_id, team_name, agent, agent_role, player_name
- player_economy: game_id, player_name, team_id, agent, total_kills, total_deaths, total_assists
- player_round_stats: game_id, round_number, player_name, team_id, agent, kills, deaths, assists

IMPORTANT NOTES:
- winner_team_id is an ID, not a name. To check if a team won, compare winner_team_id to team1_id or team2_id
- For win rate: SUM(CASE WHEN winner_team_id = team1_id AND team1_name = 'TeamName' THEN 1 WHEN winner_team_id = team2_id AND team2_name = 'TeamName' THEN 1 ELSE 0 END)
- Use game_compositions to get team_id from team_name: JOIN game_compositions gc ON ... WHERE gc.team_name = 'TeamName'
{team_context}

RULES:
- Return ONLY the SQL, nothing else
- Keep queries simple and direct
- Use proper JOINs to connect tables
- LIMIT 25 rows

QUESTION: {question}

SQL:"""

        try:
            # Rate limiting
            global LAST_API_CALL
            elapsed = time.time() - LAST_API_CALL
            if elapsed < MIN_API_INTERVAL:
                time.sleep(MIN_API_INTERVAL - elapsed)
            
            response = self.client.models.generate_content(
                model=self.MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,  # Low temperature for consistent SQL
                    max_output_tokens=2048
                )
            )
            
            LAST_API_CALL = time.time()
            
            sql = response.text.strip()
            # Clean up the SQL (remove markdown code blocks if present)
            sql = sql.replace("```sql", "").replace("```", "").strip()
            
            return {
                "sql": sql,
                "error": None
            }
            
        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "RESOURCE_EXHAUSTED" in error_msg:
                # Rate limited - wait and retry
                time.sleep(5)
                try:
                    response = self.client.models.generate_content(
                        model=self.MODEL_NAME,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.1,
                            max_output_tokens=2048
                        )
                    )
                    LAST_API_CALL = time.time()
                    sql = response.text.strip().replace("```sql", "").replace("```", "").strip()
                    return {"sql": sql, "error": None}
                except Exception as retry_e:
                    return {"sql": None, "error": f"Rate limited: {str(retry_e)}"}
            return {
                "sql": None,
                "error": f"Failed to generate SQL: {error_msg}"
            }
    
    def execute_sql(self, sql: str) -> Dict[str, Any]:
        """Execute a SQL query and return results."""
        try:
            result = self.conn.execute(sql).fetchdf()
            
            # Convert to list of dicts for JSON serialization
            records = result.to_dict('records')
            columns = list(result.columns)
            
            return {
                "success": True,
                "data": records,
                "columns": columns,
                "row_count": len(records),
                "error": None
            }
        except Exception as e:
            return {
                "success": False,
                "data": [],
                "columns": [],
                "row_count": 0,
                "error": str(e)
            }
    
    def ask(self, question: str, team_name: str = None) -> Dict[str, Any]:
        """
        Main method: Ask a natural language question and get results.
        
        Args:
            question: Natural language question about VALORANT esports
            team_name: Optional team to focus the query on
            
        Returns:
            Dict with query, results, and optional AI interpretation
        """
        
        # Step 1: Generate SQL from question
        sql_result = self.generate_sql_from_question(question, team_name)
        
        if sql_result["error"]:
            return {
                "question": question,
                "team": team_name,
                "sql": None,
                "results": None,
                "interpretation": None,
                "error": sql_result["error"]
            }
        
        sql = sql_result["sql"]
        
        # Step 2: Execute the SQL
        exec_result = self.execute_sql(sql)
        
        if not exec_result["success"]:
            # Try to fix the SQL if it failed
            fixed_result = self._try_fix_sql(sql, exec_result["error"], question, team_name)
            if fixed_result["success"]:
                sql = fixed_result["fixed_sql"]
                exec_result = fixed_result["result"]
            else:
                return {
                    "question": question,
                    "team": team_name,
                    "sql": sql,
                    "results": None,
                    "interpretation": None,
                    "error": f"SQL execution failed: {exec_result['error']}"
                }
        
        # Step 3: Interpret results with AI
        interpretation = self._interpret_results(question, exec_result["data"], team_name)
        
        return {
            "question": question,
            "team": team_name,
            "sql": sql,
            "results": {
                "data": exec_result["data"],
                "columns": exec_result["columns"],
                "row_count": exec_result["row_count"]
            },
            "interpretation": interpretation,
            "error": None
        }
    
    def _try_fix_sql(self, original_sql: str, error: str, question: str, team_name: str = None) -> Dict[str, Any]:
        """Attempt to fix a failed SQL query."""
        
        if not self.client:
            return {"success": False}
        
        team_context = f"\nContext: Query is about team '{team_name}'" if team_name else ""
        
        prompt = f"""The following SQL query failed with an error. Fix it.

### Database Schema:
{DATABASE_SCHEMA}

### Original Question:
{question}
{team_context}

### Failed SQL:
{original_sql}

### Error Message:
{error}

### Fixed SQL (return ONLY the corrected SQL query, no explanations):"""

        try:
            response = self.client.models.generate_content(
                model=self.MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.1,
                    max_output_tokens=1024
                )
            )
            
            fixed_sql = response.text.strip().replace("```sql", "").replace("```", "").strip()
            exec_result = self.execute_sql(fixed_sql)
            
            return {
                "success": exec_result["success"],
                "fixed_sql": fixed_sql,
                "result": exec_result
            }
        except:
            return {"success": False}
    
    def _interpret_results(self, question: str, data: List[Dict], team_name: str = None) -> str:
        """Use AI to interpret the query results in natural language."""
        
        if not self.client or not data:
            return None
        
        # Limit data for interpretation to avoid token limits
        data_sample = data[:20] if len(data) > 20 else data
        
        team_context = f" about {team_name}" if team_name else ""
        
        prompt = f"""You are a VALORANT esports analyst. Based on the data below, provide a concise, insightful answer to the question.

### Question:
{question}{team_context}

### Data:
{json.dumps(data_sample, indent=2, default=str)}

### Instructions:
1. Answer the question directly and concisely
2. Highlight key statistics and insights
3. Use bullet points for multiple findings
4. Include specific numbers/percentages from the data
5. If relevant, mention tactical implications
6. Keep response under 200 words

### Analysis:"""

        try:
            response = self.client.models.generate_content(
                model=self.MODEL_NAME,
                contents=prompt,
                config=types.GenerateContentConfig(
                    temperature=0.7,
                    max_output_tokens=500
                )
            )
            return response.text.strip()
        except:
            return None
    
    def get_schema_info(self) -> str:
        """Return the database schema for reference."""
        return DATABASE_SCHEMA
    
    def suggest_questions(self, team_name: str = None) -> List[str]:
        """Suggest example questions the user can ask."""
        
        team = team_name or "[team name]"
        
        return [
            f"What is {team}'s win rate on each map?",
            f"Who is the best performing player on {team} by KD ratio?",
            f"What agents does {team} play most often?",
            f"How does {team} perform in pistol rounds?",
            f"What is {team}'s post-plant conversion rate?",
            f"Show me {team}'s recent match results",
            f"Which maps should we ban against {team}?",
            f"What compositions does {team} run on Ascent?",
            f"Compare {team}'s attack vs defense win rates",
            f"What weapons does {team} get the most kills with?",
            "Which team has the highest overall win rate?",
            "What are the most picked agents across all teams?",
            "Show head-to-head results between Sentinels and Cloud9",
        ]
    
    # ============== QUICK ACCESS METHODS ==============
    # These bypass AI for common queries (faster, no API calls)
    
    def quick_team_overview(self, team_name: str) -> Dict[str, Any]:
        """Quick stats without AI - team overview."""
        sql = f"""
            SELECT 
                COUNT(*) as total_series,
                SUM(CASE WHEN winner_team_id = COALESCE(
                    (SELECT team1_id FROM series WHERE team1_name = '{team_name}' LIMIT 1),
                    (SELECT team2_id FROM series WHERE team2_name = '{team_name}' LIMIT 1)
                ) THEN 1 ELSE 0 END) as wins,
                ROUND(SUM(CASE WHEN winner_team_id = COALESCE(
                    (SELECT team1_id FROM series WHERE team1_name = '{team_name}' LIMIT 1),
                    (SELECT team2_id FROM series WHERE team2_name = '{team_name}' LIMIT 1)
                ) THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_rate
            FROM series
            WHERE (team1_name = '{team_name}' OR team2_name = '{team_name}')
              AND finished = true
        """
        return self.execute_sql(sql)
    
    def quick_map_stats(self, team_name: str) -> Dict[str, Any]:
        """Quick stats without AI - map performance."""
        sql = f"""
            SELECT 
                g.map_name,
                COUNT(*) as games,
                SUM(CASE WHEN g.winner_team_id = gc.team_id THEN 1 ELSE 0 END) as wins,
                ROUND(SUM(CASE WHEN g.winner_team_id = gc.team_id THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as win_rate
            FROM games g
            JOIN game_compositions gc ON g.game_id = gc.game_id
            WHERE gc.team_name = '{team_name}'
            GROUP BY g.map_name
            HAVING COUNT(*) >= 2
            ORDER BY win_rate DESC
        """
        return self.execute_sql(sql)
    
    def quick_player_stats(self, team_name: str) -> Dict[str, Any]:
        """Quick stats without AI - player performance."""
        sql = f"""
            SELECT 
                pe.player_name,
                COUNT(DISTINCT pe.game_id) as games,
                SUM(pe.total_kills) as kills,
                SUM(pe.total_deaths) as deaths,
                ROUND(SUM(pe.total_kills) * 1.0 / NULLIF(SUM(pe.total_deaths), 0), 2) as kd_ratio
            FROM player_economy pe
            WHERE pe.team_id IN (SELECT DISTINCT team_id FROM game_compositions WHERE team_name = '{team_name}')
            GROUP BY pe.player_name
            ORDER BY kd_ratio DESC
        """
        return self.execute_sql(sql)

    # ============== COMPREHENSIVE STATIC METHODS ==============
    # These methods provide detailed, structured data without AI
    
    def get_team_overview(self, team_name: str, last_n_matches: int = 10) -> Dict[str, Any]:
        """Get overall team statistics and recent form."""
        
        # Get recent series results
        series_query = """
            SELECT 
                series_id,
                tournament_name,
                CASE WHEN team1_name = ? THEN team2_name ELSE team1_name END as opponent,
                CASE WHEN winner_team_id = (CASE WHEN team1_name = ? THEN team1_id ELSE team2_id END) THEN 'WIN' ELSE 'LOSS' END as result,
                CASE WHEN team1_name = ? THEN team1_score ELSE team2_score END as team_score,
                CASE WHEN team1_name = ? THEN team2_score ELSE team1_score END as opponent_score,
                started_at
            FROM series
            WHERE (team1_name = ? OR team2_name = ?) AND finished = true
            ORDER BY started_at DESC
            LIMIT ?
        """
        recent_series = self.conn.execute(series_query, [team_name]*6 + [last_n_matches]).fetchall()
        
        # Calculate win rate
        wins = sum(1 for s in recent_series if s[3] == 'WIN')
        total = len(recent_series)
        
        # Get map-level stats
        map_query = """
            SELECT 
                g.map_name,
                COUNT(*) as games_played,
                SUM(CASE WHEN g.winner_team_id = gc.team_id THEN 1 ELSE 0 END) as wins,
                ROUND(AVG(CASE WHEN gc.team_id = g.team1_id THEN g.team1_score ELSE g.team2_score END), 1) as avg_rounds_won,
                ROUND(AVG(CASE WHEN gc.team_id = g.team1_id THEN g.team2_score ELSE g.team1_score END), 1) as avg_rounds_lost
            FROM games g
            JOIN game_compositions gc ON g.game_id = gc.game_id
            WHERE gc.team_name = ?
            GROUP BY g.map_name
            HAVING COUNT(*) >= 2
            ORDER BY games_played DESC
        """
        map_stats = self.conn.execute(map_query, [team_name]).fetchall()
        
        return {
            "team_name": team_name,
            "recent_matches": last_n_matches,
            "series_record": f"{wins}-{total-wins}",
            "win_rate": round(wins/total * 100, 1) if total > 0 else 0,
            "recent_series": [
                {
                    "opponent": s[2],
                    "result": s[3],
                    "score": f"{s[4]}-{s[5]}",
                    "tournament": s[1]
                } for s in recent_series[:5]
            ],
            "map_stats": [
                {
                    "map": m[0],
                    "games": m[1],
                    "wins": m[2],
                    "win_rate": round(m[2]/m[1] * 100, 1) if m[1] > 0 else 0,
                    "avg_round_diff": round(m[3] - m[4], 1)
                } for m in map_stats
            ]
        }
    
    def get_team_compositions(self, team_name: str, last_n_matches: int = 10) -> Dict[str, Any]:
        """Get team's agent compositions and pick rates."""
        
        comp_query = """
            WITH team_games AS (
                SELECT DISTINCT g.game_id, g.map_name, g.series_id
                FROM games g
                JOIN game_compositions gc ON g.game_id = gc.game_id
                WHERE gc.team_name = ?
                ORDER BY g.series_id DESC
                LIMIT ?
            ),
            game_comps AS (
                SELECT 
                    tg.game_id,
                    tg.map_name,
                    STRING_AGG(gc.agent, ', ' ORDER BY gc.agent) as composition
                FROM team_games tg
                JOIN game_compositions gc ON tg.game_id = gc.game_id
                WHERE gc.team_name = ?
                GROUP BY tg.game_id, tg.map_name
            )
            SELECT 
                map_name,
                composition,
                COUNT(*) as times_played,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY map_name), 1) as pick_rate
            FROM game_comps
            GROUP BY map_name, composition
            ORDER BY map_name, times_played DESC
        """
        compositions = self.conn.execute(comp_query, [team_name, last_n_matches * 3, team_name]).fetchall()
        
        agent_query = """
            WITH recent_games AS (
                SELECT DISTINCT g.game_id
                FROM games g
                JOIN series s ON g.series_id = s.series_id
                JOIN game_compositions gc ON g.game_id = gc.game_id
                WHERE gc.team_name = ?
                ORDER BY s.started_at DESC
                LIMIT ?
            )
            SELECT 
                gc.agent,
                gc.agent_role,
                COUNT(*) as picks,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM recent_games), 1) as pick_rate
            FROM game_compositions gc
            JOIN recent_games rg ON gc.game_id = rg.game_id
            WHERE gc.team_name = ?
            GROUP BY gc.agent, gc.agent_role
            ORDER BY picks DESC
        """
        agent_picks = self.conn.execute(agent_query, [team_name, last_n_matches * 3, team_name]).fetchall()
        
        comp_by_map = {}
        for c in compositions:
            map_name = c[0]
            if map_name not in comp_by_map:
                comp_by_map[map_name] = []
            comp_by_map[map_name].append({
                "agents": c[1],
                "times_played": c[2],
                "pick_rate": c[3]
            })
        
        return {
            "team_name": team_name,
            "compositions_by_map": comp_by_map,
            "agent_picks": [
                {"agent": a[0], "role": a[1], "picks": a[2], "pick_rate": a[3]} for a in agent_picks
            ],
            "role_distribution": self._calculate_role_distribution(agent_picks)
        }
    
    def _calculate_role_distribution(self, agent_picks) -> Dict[str, float]:
        """Calculate role distribution from agent picks."""
        role_counts = {}
        total = sum(a[2] for a in agent_picks)
        for a in agent_picks:
            role = a[1] or "Unknown"
            role_counts[role] = role_counts.get(role, 0) + a[2]
        return {role: round(count/total * 100, 1) for role, count in role_counts.items()} if total > 0 else {}
    
    def get_pistol_tendencies(self, team_name: str, last_n_matches: int = 10) -> Dict[str, Any]:
        """Get team's pistol round performance and tendencies."""
        
        pistol_query = """
            WITH team_info AS (
                SELECT DISTINCT gc.team_id, gc.team_name
                FROM game_compositions gc
                WHERE gc.team_name = ?
                LIMIT 1
            ),
            recent_pistols AS (
                SELECT 
                    r.game_id, r.round_number, g.map_name,
                    CASE WHEN r.attacker_team_id = ti.team_id THEN 'attack' ELSE 'defense' END as side,
                    CASE WHEN r.winner_team_id = ti.team_id THEN 1 ELSE 0 END as won,
                    r.win_type
                FROM rounds r
                JOIN games g ON r.game_id = g.game_id
                JOIN series s ON r.series_id = s.series_id
                CROSS JOIN team_info ti
                WHERE r.is_pistol_round = true
                  AND (r.attacker_team_id = ti.team_id OR r.defender_team_id = ti.team_id)
                ORDER BY s.started_at DESC
                LIMIT ?
            )
            SELECT side, map_name, COUNT(*) as rounds, SUM(won) as wins,
                   ROUND(SUM(won) * 100.0 / COUNT(*), 1) as win_rate
            FROM recent_pistols
            GROUP BY side, map_name
            ORDER BY side, rounds DESC
        """
        pistol_stats = self.conn.execute(pistol_query, [team_name, last_n_matches * 6]).fetchall()
        
        attack_stats = [p for p in pistol_stats if p[0] == 'attack']
        defense_stats = [p for p in pistol_stats if p[0] == 'defense']
        
        attack_total = sum(p[2] for p in attack_stats)
        attack_wins = sum(p[3] for p in attack_stats)
        defense_total = sum(p[2] for p in defense_stats)
        defense_wins = sum(p[3] for p in defense_stats)
        
        return {
            "team_name": team_name,
            "attack_pistol": {
                "total": attack_total, "wins": attack_wins,
                "win_rate": round(attack_wins/attack_total * 100, 1) if attack_total > 0 else 0,
                "by_map": [{"map": p[1], "rounds": p[2], "wins": p[3], "win_rate": p[4]} for p in attack_stats]
            },
            "defense_pistol": {
                "total": defense_total, "wins": defense_wins,
                "win_rate": round(defense_wins/defense_total * 100, 1) if defense_total > 0 else 0,
                "by_map": [{"map": p[1], "rounds": p[2], "wins": p[3], "win_rate": p[4]} for p in defense_stats]
            },
            "overall_pistol_win_rate": round((attack_wins + defense_wins) / (attack_total + defense_total) * 100, 1) if (attack_total + defense_total) > 0 else 0
        }
    
    def get_player_stats(self, team_name: str, last_n_matches: int = 10) -> Dict[str, Any]:
        """Get individual player statistics and agent pools."""
        
        player_query = """
            WITH recent_games AS (
                SELECT DISTINCT g.game_id, g.series_id
                FROM games g
                JOIN series s ON g.series_id = s.series_id
                JOIN game_compositions gc ON g.game_id = gc.game_id
                WHERE gc.team_name = ?
                ORDER BY s.started_at DESC
                LIMIT ?
            )
            SELECT 
                pe.player_name,
                COUNT(DISTINCT pe.game_id) as games,
                SUM(pe.total_kills) as kills,
                SUM(pe.total_deaths) as deaths,
                SUM(pe.total_assists) as assists,
                ROUND(SUM(pe.total_kills) * 1.0 / NULLIF(SUM(pe.total_deaths), 0), 2) as kd_ratio,
                ROUND((SUM(pe.total_kills) + SUM(pe.total_assists) * 0.5) / NULLIF(SUM(pe.total_deaths), 0), 2) as kda
            FROM player_economy pe
            JOIN recent_games rg ON pe.game_id = rg.game_id
            WHERE pe.team_id IN (SELECT DISTINCT team_id FROM game_compositions WHERE team_name = ?)
            GROUP BY pe.player_name
            ORDER BY kd_ratio DESC
        """
        player_stats = self.conn.execute(player_query, [team_name, last_n_matches * 3, team_name]).fetchall()
        
        agent_pool_query = """
            WITH recent_games AS (
                SELECT DISTINCT g.game_id
                FROM games g
                JOIN series s ON g.series_id = s.series_id
                JOIN game_compositions gc ON g.game_id = gc.game_id
                WHERE gc.team_name = ?
                ORDER BY s.started_at DESC
                LIMIT ?
            )
            SELECT gc.player_name, gc.agent, gc.agent_role, COUNT(*) as times_played
            FROM game_compositions gc
            JOIN recent_games rg ON gc.game_id = rg.game_id
            WHERE gc.team_name = ?
            GROUP BY gc.player_name, gc.agent, gc.agent_role
            ORDER BY gc.player_name, times_played DESC
        """
        agent_pools = self.conn.execute(agent_pool_query, [team_name, last_n_matches * 3, team_name]).fetchall()
        
        pools_by_player = {}
        for ap in agent_pools:
            player = ap[0]
            if player not in pools_by_player:
                pools_by_player[player] = []
            pools_by_player[player].append({"agent": ap[1], "role": ap[2], "games": ap[3]})
        
        return {
            "team_name": team_name,
            "players": [
                {
                    "name": p[0], "games": p[1], "kills": p[2], "deaths": p[3],
                    "assists": p[4], "kd_ratio": p[5], "kda": p[6],
                    "agent_pool": pools_by_player.get(p[0], [])
                } for p in player_stats
            ]
        }
    
    def get_round_patterns(self, team_name: str, last_n_matches: int = 10) -> Dict[str, Any]:
        """Get team's round outcome patterns."""
        
        round_query = """
            WITH team_info AS (
                SELECT DISTINCT team_id FROM game_compositions WHERE team_name = ? LIMIT 1
            ),
            recent_rounds AS (
                SELECT r.*, g.map_name,
                    CASE WHEN r.winner_team_id = ti.team_id THEN 1 ELSE 0 END as won,
                    CASE WHEN r.attacker_team_id = ti.team_id THEN 'attack' ELSE 'defense' END as team_side
                FROM rounds r
                JOIN games g ON r.game_id = g.game_id
                JOIN series s ON r.series_id = s.series_id
                CROSS JOIN team_info ti
                WHERE r.attacker_team_id = ti.team_id OR r.defender_team_id = ti.team_id
                ORDER BY s.started_at DESC
                LIMIT ?
            )
            SELECT team_side, win_type, COUNT(*) as occurrences, SUM(won) as team_wins
            FROM recent_rounds WHERE won = 1
            GROUP BY team_side, win_type
            ORDER BY team_side, occurrences DESC
        """
        round_patterns = self.conn.execute(round_query, [team_name, last_n_matches * 30]).fetchall()
        
        post_plant_query = """
            WITH team_info AS (
                SELECT DISTINCT team_id FROM game_compositions WHERE team_name = ? LIMIT 1
            ),
            recent_plants AS (
                SELECT r.*,
                    CASE WHEN r.attacker_team_id = ti.team_id THEN 'attack' ELSE 'defense' END as team_side,
                    CASE WHEN r.winner_team_id = ti.team_id THEN 1 ELSE 0 END as won
                FROM rounds r
                JOIN series s ON r.series_id = s.series_id
                CROSS JOIN team_info ti
                WHERE r.bomb_planted = true
                  AND (r.attacker_team_id = ti.team_id OR r.defender_team_id = ti.team_id)
                ORDER BY s.started_at DESC
                LIMIT ?
            )
            SELECT team_side, COUNT(*) as post_plant_situations, SUM(won) as wins,
                   ROUND(SUM(won) * 100.0 / COUNT(*), 1) as conversion_rate
            FROM recent_plants
            GROUP BY team_side
        """
        post_plant = self.conn.execute(post_plant_query, [team_name, last_n_matches * 20]).fetchall()
        
        return {
            "team_name": team_name,
            "win_conditions": {
                "attack": [{"type": p[1], "count": p[3]} for p in round_patterns if p[0] == 'attack'],
                "defense": [{"type": p[1], "count": p[3]} for p in round_patterns if p[0] == 'defense']
            },
            "post_plant": [{"side": p[0], "situations": p[1], "wins": p[2], "conversion_rate": p[3]} for p in post_plant]
        }
    
    def get_weapon_economy(self, team_name: str, last_n_matches: int = 10) -> Dict[str, Any]:
        """Get team's weapon usage and economy patterns."""
        
        weapon_query = """
            WITH team_info AS (
                SELECT DISTINCT team_id FROM game_compositions WHERE team_name = ? LIMIT 1
            )
            SELECT wk.weapon_name, SUM(wk.kill_count) as total_kills, COUNT(DISTINCT wk.game_id) as games_used
            FROM weapon_kills wk
            JOIN series s ON wk.series_id = s.series_id
            CROSS JOIN team_info ti
            WHERE wk.team_id = ti.team_id
            GROUP BY wk.weapon_name
            ORDER BY total_kills DESC
            LIMIT 15
        """
        weapon_stats = self.conn.execute(weapon_query, [team_name]).fetchall()
        
        return {
            "team_name": team_name,
            "weapon_usage": [{"weapon": w[0], "kills": w[1], "games": w[2]} for w in weapon_stats]
        }
    
    def get_head_to_head(self, team1: str, team2: str) -> Dict[str, Any]:
        """Get head-to-head record between two teams."""
        
        h2h_query = """
            SELECT series_id, tournament_name, team1_name, team2_name, team1_score, team2_score,
                CASE 
                    WHEN team1_name = ? AND winner_team_id = team1_id THEN ?
                    WHEN team2_name = ? AND winner_team_id = team2_id THEN ?
                    ELSE ?
                END as winner, started_at
            FROM series
            WHERE (team1_name = ? AND team2_name = ?) OR (team1_name = ? AND team2_name = ?)
            ORDER BY started_at DESC
        """
        matches = self.conn.execute(h2h_query, [team1, team1, team1, team1, team2, team1, team2, team2, team1]).fetchall()
        
        team1_wins = sum(1 for m in matches if m[6] == team1)
        team2_wins = len(matches) - team1_wins
        
        return {
            "team1": team1, "team2": team2, "total_matches": len(matches),
            "team1_wins": team1_wins, "team2_wins": team2_wins,
            "matches": [{"tournament": m[1], "score": f"{m[4]}-{m[5]}" if m[2] == team1 else f"{m[5]}-{m[4]}", "winner": m[6]} for m in matches]
        }
    
    def get_team_weaknesses(self, team_name: str, last_n_matches: int = 10) -> Dict[str, Any]:
        """Analyze and identify team weaknesses."""
        
        overview = self.get_team_overview(team_name, last_n_matches)
        pistol = self.get_pistol_tendencies(team_name, last_n_matches)
        players = self.get_player_stats(team_name, last_n_matches)
        patterns = self.get_round_patterns(team_name, last_n_matches)
        
        weaknesses = []
        
        # 1. Weak maps
        weak_maps = [m for m in overview.get('map_stats', []) if m['win_rate'] < 45 and m['games'] >= 3]
        if weak_maps:
            weaknesses.append({
                "category": "Map Pool",
                "severity": "HIGH" if any(m['win_rate'] < 35 for m in weak_maps) else "MEDIUM",
                "finding": f"Struggles on {len(weak_maps)} map(s)",
                "details": [f"{m['map'].title()}: {m['win_rate']}% WR ({m['wins']}/{m['games']} games)" for m in weak_maps],
                "recommendation": f"Force {weak_maps[0]['map'].title()} in map veto"
            })
        
        # 2. Pistol weaknesses
        attack_pistol = pistol.get('attack_pistol', {}).get('win_rate', 50)
        defense_pistol = pistol.get('defense_pistol', {}).get('win_rate', 50)
        
        if attack_pistol < 40:
            weaknesses.append({
                "category": "Pistol Rounds", "severity": "HIGH" if attack_pistol < 30 else "MEDIUM",
                "finding": f"Weak attack pistol rounds ({attack_pistol}%)",
                "details": [f"Attack: {attack_pistol}% vs Defense: {defense_pistol}%"],
                "recommendation": "Expect defensive pistol wins, prepare for anti-eco"
            })
        
        if defense_pistol < 40:
            weaknesses.append({
                "category": "Pistol Rounds", "severity": "HIGH" if defense_pistol < 30 else "MEDIUM",
                "finding": f"Weak defense pistol rounds ({defense_pistol}%)",
                "details": [f"Defense: {defense_pistol}% vs Attack: {attack_pistol}%"],
                "recommendation": "Aggressive attack pistol executes will succeed"
            })
        
        # 3. Player weaknesses
        weak_players = [p for p in players.get('players', []) if p.get('kd_ratio', 1.0) < 0.9 and p.get('games', 0) >= 3]
        if weak_players:
            weaknesses.append({
                "category": "Player Performance", "severity": "MEDIUM",
                "finding": f"{len(weak_players)} player(s) underperforming (KD < 0.9)",
                "details": [f"{p['name']}: {p['kd_ratio']} KD" for p in weak_players],
                "recommendation": f"Target {weak_players[0]['name']} in duels"
            })
        
        # 4. Post-plant weakness
        post_plant = patterns.get('post_plant', [])
        defense_pp = next((p for p in post_plant if p['side'] == 'defense'), None)
        if defense_pp and defense_pp['conversion_rate'] < 35:
            weaknesses.append({
                "category": "Post-Plant", "severity": "MEDIUM",
                "finding": f"Poor retake ability ({defense_pp['conversion_rate']}%)",
                "details": [f"Retake: {defense_pp['wins']}/{defense_pp['situations']}"],
                "recommendation": "Prioritize spike plants - they struggle to retake"
            })
        
        return {
            "team_name": team_name, "total_weaknesses": len(weaknesses),
            "weaknesses": weaknesses, "summary": self._summarize_weaknesses(weaknesses)
        }
    
    def _summarize_weaknesses(self, weaknesses: List[Dict]) -> str:
        """Generate a summary of key weaknesses."""
        if not weaknesses:
            return "No significant weaknesses identified - well-rounded team."
        high_severity = [w for w in weaknesses if w['severity'] == 'HIGH']
        if high_severity:
            return f"CRITICAL: {len(high_severity)} major weakness(es) - {', '.join(w['category'] for w in high_severity)}"
        return f"Found {len(weaknesses)} exploitable weakness(es)"
    
    def generate_full_scouting_data(self, team_name: str, last_n_matches: int = 10) -> Dict[str, Any]:
        """Generate complete scouting data for a team."""
        return {
            "overview": self.get_team_overview(team_name, last_n_matches),
            "compositions": self.get_team_compositions(team_name, last_n_matches),
            "pistol_rounds": self.get_pistol_tendencies(team_name, last_n_matches),
            "players": self.get_player_stats(team_name, last_n_matches),
            "round_patterns": self.get_round_patterns(team_name, last_n_matches),
            "weapon_economy": self.get_weapon_economy(team_name, last_n_matches),
            "weaknesses": self.get_team_weaknesses(team_name, last_n_matches)
        }


# Alias for backward compatibility
ScoutingEngine = DynamicScoutingEngine


# Test
if __name__ == "__main__":
    print("Testing Dynamic Scouting Engine...")
    
    with DynamicScoutingEngine() as engine:
        print(f"AI Enabled: {engine.is_ai_enabled()}")
        
        teams = engine.get_all_teams()
        print(f"\nAvailable teams ({len(teams)}): {teams[:5]}...")
        
        if engine.is_ai_enabled():
            # Test dynamic query
            print("\n--- Testing Dynamic Query ---")
            result = engine.ask("What is Sentinels' win rate on each map?", "Sentinels")
            
            print(f"Question: {result['question']}")
            print(f"Generated SQL:\n{result['sql']}")
            
            if result['results']:
                print(f"\nResults ({result['results']['row_count']} rows):")
                for row in result['results']['data'][:5]:
                    print(f"  {row}")
            
            if result['interpretation']:
                print(f"\nAI Interpretation:\n{result['interpretation']}")
            
            if result['error']:
                print(f"\nError: {result['error']}")
        else:
            print("\n⚠️ AI not configured - using quick methods only")
            
            # Test quick methods
            print("\n--- Quick Team Overview (Sentinels) ---")
            overview = engine.quick_team_overview("Sentinels")
            print(json.dumps(overview, indent=2, default=str))
