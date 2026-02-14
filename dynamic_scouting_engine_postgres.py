"""
Dynamic Scouting Engine - PostgreSQL/Supabase Version
Uses Groq AI to generate SQL queries from natural language
"""

import os
import time
import json
import numpy as np
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

load_dotenv()

# Try to import required packages
try:
    from groq import Groq
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    POSTGRES_AVAILABLE = True
except ImportError:
    POSTGRES_AVAILABLE = False

# Rate limiting
LAST_API_CALL = 0
MIN_API_INTERVAL = 3.0

# Database schema for LLM context
DATABASE_SCHEMA = """
## VALORANT Esports Database Schema (PostgreSQL)

### Tables:

#### 1. series - Match/series between two teams
- series_id (BIGINT, PK)
- tournament_name (TEXT)
- team1_name, team2_name (TEXT)
- team1_id, team2_id (TEXT)
- winner_team_id (TEXT)
- team1_score, team2_score (INTEGER)
- started_at (TIMESTAMP)
- finished (BOOLEAN)
- best_of (INTEGER)

#### 2. games - Individual maps within a series
- game_id (BIGINT, PK)
- series_id (BIGINT, FK)
- map (TEXT)
- game_number (INTEGER)
- team1_score, team2_score (INTEGER)
- winner_team_id (TEXT)

#### 3. rounds - Round outcomes
- round_id (BIGINT, PK)
- game_id (BIGINT, FK)
- round_number (INTEGER)
- winning_team_id (TEXT)
- win_type (TEXT)
- attacking_team_id, defending_team_id (TEXT)
- spike_planted, spike_defused (BOOLEAN)

#### 4. player_round_stats - Per-player stats
- id (SERIAL, PK)
- round_id, game_id (BIGINT)
- player_id, player_name (TEXT)
- team_id, team_name (TEXT)
- agent (TEXT)
- kills, deaths, assists, damage (INTEGER)

#### 5. weapon_kills - Kill events
- id (SERIAL, PK)
- round_id, game_id (BIGINT)
- killer_id, killer_name, victim_id, victim_name (TEXT)
- weapon, damage_type (TEXT)

#### 6. game_compositions - Team compositions
- id (SERIAL, PK)
- game_id (BIGINT)
- team_id, team_name (TEXT)
- player_id, player_name (TEXT)
- agent, role (TEXT)

### Key Views:
- v_team_map_stats: Team win rates per map
- v_team_agent_picks: Agent pick rates by team
- v_player_agent_pool: Player agent pools with KD
- v_pistol_performance: Pistol round stats
- v_weapon_usage: Weapon kill stats
- v_round_win_types: Win condition percentages

### Common Values:
- Agents: jett, raze, reyna (Duelists); omen, brimstone, astra (Controllers); sage, cypher, killjoy (Sentinels); sova, breach, skye (Initiators)
- Maps: ascent, bind, breeze, haven, icebox, lotus, pearl, split, sunset
- Win types: opponentEliminated, bombExploded, bombDefused, timeExpired
"""


class DynamicScoutingEngine:
    """Query engine with AI-powered dynamic SQL generation for PostgreSQL."""
    
    MODEL_NAME = "llama-3.3-70b-versatile"
    
    def __init__(self, api_key: str = None):
        self.conn = None
        
        # Database connection string from environment
        self.database_url = os.getenv("DATABASE_URL")
        
        # Initialize Groq client
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if self.api_key and GROQ_AVAILABLE:
            self.api_key = self.api_key.strip().strip('"').strip("'")
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None
    
    def connect(self):
        """Establish database connection."""
        if not POSTGRES_AVAILABLE:
            raise ImportError("psycopg2 not installed. Run: pip install psycopg2-binary")
        
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        self.conn = psycopg2.connect(self.database_url)
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
    
    def _extract_team_from_question(self, question: str) -> Optional[str]:
        """Extract team name from the question if mentioned."""
        question_lower = question.lower()
        teams = self.get_all_teams()
        
        for team in teams:
            if team.lower() in question_lower:
                return team
        return None
    
    def get_all_teams(self) -> List[str]:
        """Get list of all teams in the database."""
        query = """
            SELECT DISTINCT team_name FROM (
                SELECT DISTINCT team1_name as team_name FROM series
                UNION
                SELECT DISTINCT team2_name as team_name FROM series
            ) t ORDER BY team_name
        """
        with self.conn.cursor() as cur:
            cur.execute(query)
            return [row[0] for row in cur.fetchall()]
    
    def execute_query(self, sql: str) -> List[Dict]:
        """Execute SQL and return results as list of dicts."""
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            return [dict(row) for row in cur.fetchall()]
    
    def generate_sql_from_question(self, question: str, team_name: str = None) -> Dict[str, Any]:
        """Use Groq to generate SQL from natural language question."""
        
        if not self.client:
            return {
                "success": False,
                "error": "AI not configured. Please set GROQ_API_KEY.",
                "sql": None
            }
        
        # Extract team from question if not provided
        if not team_name:
            team_name = self._extract_team_from_question(question)
        
        team_context = f"\nFocus on team: {team_name}" if team_name else ""
        
        prompt = f"""You are a VALORANT esports SQL expert. Generate a PostgreSQL query for this question.

{DATABASE_SCHEMA}

Question: {question}{team_context}

IMPORTANT RULES:
1. Return ONLY the SQL query, no explanation
2. Use PostgreSQL syntax (not DuckDB)
3. Use ILIKE for case-insensitive text matching
4. Always limit results to 50 rows max
5. For team-specific queries, filter by team_name ILIKE '%teamname%'
6. Use proper table/column names from schema
7. For percentages, use ROUND(100.0 * ... , 1)
8. Handle NULLs with COALESCE or NULLIF

Example queries:
- Team weaknesses: SELECT map, win_rate FROM v_team_map_stats WHERE team_name ILIKE '%G2%' AND win_rate < 50
- Top players: SELECT player_name, SUM(kills) as kills, SUM(deaths) as deaths FROM player_round_stats GROUP BY player_name ORDER BY kills DESC LIMIT 10
- Agent picks: SELECT agent, pick_rate FROM v_team_agent_picks WHERE team_name ILIKE '%LOUD%' ORDER BY pick_rate DESC

SQL Query:"""

        try:
            global LAST_API_CALL
            elapsed = time.time() - LAST_API_CALL
            if elapsed < MIN_API_INTERVAL:
                time.sleep(MIN_API_INTERVAL - elapsed)
            
            response = self.client.chat.completions.create(
                model=self.MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024,
                temperature=0.1
            )
            
            LAST_API_CALL = time.time()
            
            sql = response.choices[0].message.content.strip()
            sql = sql.replace("```sql", "").replace("```", "").strip()
            
            # Validate basic SQL structure
            sql_upper = sql.upper()
            if not sql_upper.startswith("SELECT"):
                return {"success": False, "error": "Generated query is not a SELECT statement", "sql": sql}
            
            # Safety: prevent dangerous operations
            dangerous = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE"]
            for d in dangerous:
                if d in sql_upper:
                    return {"success": False, "error": f"Query contains forbidden keyword: {d}", "sql": sql}
            
            return {"success": True, "sql": sql, "team_detected": team_name}
            
        except Exception as e:
            return {"success": False, "error": str(e), "sql": None}
    
    def _interpret_results(self, question: str, results: List[Dict], team_name: str = None) -> str:
        """Use AI to interpret query results in natural language."""
        
        if not self.client:
            return self._format_results_basic(results)
        
        if not results:
            return f"No data found for your query about {team_name or 'this topic'}."
        
        # Limit results for API
        display_results = results[:20]
        
        prompt = f"""Analyze this VALORANT esports data and provide tactical insights.

Question: {question}
Team Focus: {team_name or 'General'}

Data:
{json.dumps(display_results, indent=2, default=str)[:3000]}

Provide a comprehensive analysis (400-600 words):
1. Direct answer to the question
2. Key statistics and what they mean
3. Tactical implications
4. Actionable recommendations

Use plain text only. No markdown, no bullet points with *, no headers with #.
Write in complete paragraphs with clear explanations."""

        try:
            global LAST_API_CALL
            elapsed = time.time() - LAST_API_CALL
            if elapsed < MIN_API_INTERVAL:
                time.sleep(MIN_API_INTERVAL - elapsed)
            
            response = self.client.chat.completions.create(
                model=self.MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=4096,
                temperature=0.3
            )
            
            LAST_API_CALL = time.time()
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            return f"Analysis error: {str(e)}\n\n{self._format_results_basic(results)}"
    
    def _format_results_basic(self, results: List[Dict]) -> str:
        """Format results as basic text table."""
        if not results:
            return "No results found."
        
        output = []
        keys = list(results[0].keys())
        output.append(" | ".join(keys))
        output.append("-" * len(output[0]))
        
        for row in results[:20]:
            values = [str(row.get(k, ""))[:20] for k in keys]
            output.append(" | ".join(values))
        
        return "\n".join(output)
    
    def ask(self, question: str, team_name: str = None) -> Dict[str, Any]:
        """Main entry point: ask a question, get AI-interpreted answer."""
        
        # Generate SQL
        sql_result = self.generate_sql_from_question(question, team_name)
        
        if not sql_result["success"]:
            return {
                "question": question,
                "team": team_name,
                "sql": sql_result.get("sql"),
                "error": sql_result["error"],
                "results": None,
                "interpretation": f"I couldn't generate a query: {sql_result['error']}"
            }
        
        sql = sql_result["sql"]
        detected_team = sql_result.get("team_detected")
        
        # Execute query
        try:
            results = self.execute_query(sql)
        except Exception as e:
            return {
                "question": question,
                "team": detected_team,
                "sql": sql,
                "error": str(e),
                "results": None,
                "interpretation": f"Query execution failed: {str(e)}"
            }
        
        # Interpret results
        interpretation = self._interpret_results(question, results, detected_team)
        
        return {
            "question": question,
            "team": detected_team,
            "sql": sql,
            "error": None,
            "results": {"data": results, "count": len(results)},
            "interpretation": interpretation
        }
    
    # ==================== SCOUTING DATA METHODS ====================
    
    def get_team_overview(self, team_name: str) -> Dict[str, Any]:
        """Get comprehensive team overview."""
        
        # Win rate
        win_query = """
            SELECT 
                COUNT(*) as total_series,
                SUM(CASE WHEN winner_team_id IN (
                    SELECT team1_id FROM series WHERE team1_name ILIKE %s
                    UNION SELECT team2_id FROM series WHERE team2_name ILIKE %s
                ) THEN 1 ELSE 0 END) as wins
            FROM series
            WHERE team1_name ILIKE %s OR team2_name ILIKE %s
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            team_pattern = f"%{team_name}%"
            cur.execute(win_query, (team_pattern, team_pattern, team_pattern, team_pattern))
            win_data = cur.fetchone()
        
        total = win_data['total_series'] or 1
        wins = win_data['wins'] or 0
        win_rate = round(100.0 * wins / total, 1)
        
        # Map stats
        map_query = """
            SELECT map, games, wins, win_rate, avg_round_diff
            FROM v_team_map_stats
            WHERE team_name ILIKE %s
            ORDER BY games DESC
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(map_query, (f"%{team_name}%",))
            map_stats = [dict(row) for row in cur.fetchall()]
        
        # Recent series
        recent_query = """
            SELECT 
                CASE WHEN team1_name ILIKE %s THEN team2_name ELSE team1_name END as opponent,
                CASE WHEN winner_team_id IN (
                    SELECT team1_id FROM series WHERE team1_name ILIKE %s
                ) OR winner_team_id IN (
                    SELECT team2_id FROM series WHERE team2_name ILIKE %s
                ) THEN 'W' ELSE 'L' END as result,
                team1_score || '-' || team2_score as score
            FROM series
            WHERE team1_name ILIKE %s OR team2_name ILIKE %s
            ORDER BY started_at DESC
            LIMIT 5
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(recent_query, (f"%{team_name}%", f"%{team_name}%", f"%{team_name}%", f"%{team_name}%", f"%{team_name}%"))
            recent_series = [dict(row) for row in cur.fetchall()]
        
        return {
            "win_rate": win_rate,
            "series_record": f"{wins}-{total - wins}",
            "map_stats": map_stats,
            "recent_series": recent_series
        }
    
    def get_team_compositions(self, team_name: str) -> Dict[str, Any]:
        """Get team agent compositions."""
        
        agent_query = """
            SELECT agent, role, games, pick_rate
            FROM v_team_agent_picks
            WHERE team_name ILIKE %s
            ORDER BY pick_rate DESC
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(agent_query, (f"%{team_name}%",))
            agent_picks = [dict(row) for row in cur.fetchall()]
        
        # Calculate role distribution
        role_dist = {}
        for agent in agent_picks:
            role = agent.get('role', 'Unknown')
            role_dist[role] = role_dist.get(role, 0) + float(agent.get('pick_rate', 0))
        
        return {
            "agent_picks": agent_picks,
            "role_distribution": role_dist
        }
    
    def get_team_players(self, team_name: str) -> Dict[str, Any]:
        """Get player stats for a team."""
        
        player_query = """
            SELECT 
                player_name,
                COUNT(DISTINCT game_id) as games,
                SUM(kills) as kills,
                SUM(deaths) as deaths,
                SUM(assists) as assists,
                ROUND(1.0 * SUM(kills) / NULLIF(SUM(deaths), 0), 2) as kd_ratio
            FROM player_round_stats
            WHERE team_name ILIKE %s
            GROUP BY player_name
            ORDER BY kills DESC
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(player_query, (f"%{team_name}%",))
            players = [dict(row) for row in cur.fetchall()]
        
        # Get agent pools for each player
        for player in players:
            pool_query = """
                SELECT agent, games, kd_ratio
                FROM v_player_agent_pool
                WHERE player_name = %s AND team_name ILIKE %s
                ORDER BY games DESC
                LIMIT 5
            """
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(pool_query, (player['player_name'], f"%{team_name}%"))
                player['agent_pool'] = [dict(row) for row in cur.fetchall()]
        
        return {"players": players}
    
    def get_team_weaknesses(self, team_name: str) -> Dict[str, Any]:
        """Identify team weaknesses."""
        
        weaknesses = []
        
        # Check map weaknesses
        map_query = """
            SELECT map, win_rate, games
            FROM v_team_map_stats
            WHERE team_name ILIKE %s AND win_rate < 45 AND games >= 3
            ORDER BY win_rate ASC
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(map_query, (f"%{team_name}%",))
            weak_maps = [dict(row) for row in cur.fetchall()]
        
        for m in weak_maps:
            weaknesses.append({
                "category": "Map Pool",
                "severity": "HIGH" if m['win_rate'] < 35 else "MEDIUM",
                "finding": f"Poor performance on {m['map']}",
                "details": f"Win rate of {m['win_rate']}% across {m['games']} games",
                "recommendation": f"Consider banning {m['map']} or prepare specific counter-strategies"
            })
        
        # Check pistol rounds
        pistol_query = """
            SELECT is_attack, win_rate
            FROM v_pistol_performance
            WHERE team_name ILIKE %s
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(pistol_query, (f"%{team_name}%",))
            pistol_stats = [dict(row) for row in cur.fetchall()]
        
        for p in pistol_stats:
            if p['win_rate'] < 40:
                side = "attack" if p['is_attack'] else "defense"
                weaknesses.append({
                    "category": "Pistol Rounds",
                    "severity": "MEDIUM",
                    "finding": f"Weak {side} pistol rounds",
                    "details": f"Win rate of {p['win_rate']}%",
                    "recommendation": f"Exploit their {side} side pistol with aggressive plays"
                })
        
        return {"weaknesses": weaknesses}
    
    def get_team_pistol_stats(self, team_name: str) -> Dict[str, Any]:
        """Get pistol round performance."""
        
        query = """
            SELECT is_attack, rounds, wins, win_rate
            FROM v_pistol_performance
            WHERE team_name ILIKE %s
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (f"%{team_name}%",))
            stats = [dict(row) for row in cur.fetchall()]
        
        result = {
            "attack_pistol": {"win_rate": 50.0},
            "defense_pistol": {"win_rate": 50.0},
            "overall_pistol_win_rate": 50.0
        }
        
        total_rounds = 0
        total_wins = 0
        
        for s in stats:
            if s['is_attack']:
                result['attack_pistol'] = {"win_rate": float(s['win_rate'] or 50)}
            else:
                result['defense_pistol'] = {"win_rate": float(s['win_rate'] or 50)}
            total_rounds += int(s['rounds'] or 0)
            total_wins += int(s['wins'] or 0)
        
        if total_rounds > 0:
            result['overall_pistol_win_rate'] = round(100.0 * total_wins / total_rounds, 1)
        
        return result
    
    def get_team_round_patterns(self, team_name: str) -> Dict[str, Any]:
        """Get round win patterns."""
        
        query = """
            SELECT win_type, on_attack, count, percentage
            FROM v_round_win_types
            WHERE team_name ILIKE %s
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (f"%{team_name}%",))
            patterns = [dict(row) for row in cur.fetchall()]
        
        attack_conditions = []
        defense_conditions = []
        
        for p in patterns:
            condition = {
                "condition": p['win_type'],
                "percentage": float(p['percentage'] or 0)
            }
            if p['on_attack']:
                attack_conditions.append(condition)
            else:
                defense_conditions.append(condition)
        
        return {
            "win_conditions": {
                "attack": attack_conditions,
                "defense": defense_conditions
            }
        }
    
    def get_team_weapon_economy(self, team_name: str) -> Dict[str, Any]:
        """Get weapon usage stats."""
        
        query = """
            SELECT weapon, SUM(kills) as kills
            FROM v_weapon_usage wu
            JOIN game_compositions gc ON wu.game_id = gc.game_id AND wu.team_id = gc.team_id
            WHERE gc.team_name ILIKE %s
            GROUP BY weapon
            ORDER BY kills DESC
            LIMIT 10
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (f"%{team_name}%",))
            weapons = [dict(row) for row in cur.fetchall()]
        
        return {"weapon_usage": weapons}
    
    def get_full_scouting_data(self, team_name: str) -> Dict[str, Any]:
        """Get all scouting data for a team."""
        
        return {
            "overview": self.get_team_overview(team_name),
            "compositions": self.get_team_compositions(team_name),
            "players": self.get_team_players(team_name),
            "weaknesses": self.get_team_weaknesses(team_name),
            "pistol_rounds": self.get_team_pistol_stats(team_name),
            "round_patterns": self.get_team_round_patterns(team_name),
            "weapon_economy": self.get_team_weapon_economy(team_name)
        }
