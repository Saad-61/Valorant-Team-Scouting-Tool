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
## VALORANT Esports Database Schema (PostgreSQL/Supabase)

### Core Tables:

#### 1. series - Match/series between two teams
- series_id (BIGINT, PK)
- tournament_name (TEXT)
- team1_name, team2_name (TEXT)
- team1_id, team2_id (TEXT)
- winner_team_id (TEXT)
- team1_score, team2_score (INTEGER)

#### 2. games - Individual maps within a series (HAS map_name, NOT "map")
- game_id (TEXT, PK)
- series_id (BIGINT)
- map_name (TEXT) -- CRITICAL: Use map_name, not "map"
- team1_name, team2_name (TEXT)
- team1_score, team2_score (INTEGER)
- winner_team_id (TEXT)
- total_rounds (INTEGER)

#### 3. rounds - Individual round outcomes (DOES NOT have map_name! JOIN with games)
- round_id (TEXT, PK)
- game_id (TEXT) -- JOIN with games table to get map_name
- series_id (BIGINT)
- round_number (INTEGER)
- attacker_team_id, defender_team_id (TEXT)
- winner_team_id (TEXT) -- The team that won this round
- winner_side (TEXT)
- win_type (TEXT)
- is_pistol_round (BOOLEAN)

#### 4. game_compositions - Team compositions per game (USE THIS to join team_id with team_name)
- game_id (TEXT)
- team_id (TEXT)
- team_name (TEXT)
- player_name (TEXT)
- agent (TEXT)
- agent_role (TEXT)

#### 5. player_round_stats - Per-player stats (HAS team_id but NO team_name! Need game_compositions)
- game_id (TEXT)
- series_id (BIGINT)
- round_number (INTEGER)
- player_name (TEXT)
- team_id (TEXT)  -- NO team_name here! JOIN with game_compositions
- agent (TEXT)
- side (TEXT)
- kills, deaths, assists, headshots (INTEGER)

#### 6. weapon_kills - Weapon kill statistics
- game_id (TEXT)
- series_id (BIGINT)
- round_number (INTEGER)
- team_id (TEXT)
- weapon_name (TEXT)
- kill_count (INTEGER)

### Analytical Views (CRITICAL COLUMN NAMES):

#### v_team_map_stats (USE: map_name NOT "map", games_played NOT "games")
- team_name (TEXT)
- map_name (TEXT) -- NOT "map"
- games_played (INTEGER) -- NOT "games"
- wins, losses (INTEGER)
- win_rate (FLOAT)

#### v_round_win_types (HAS team_id but NO team_name! Needs JOIN)
- team_id (TEXT)
- map_name (TEXT)
- side (TEXT) -- 'attacker' or 'defender'
- win_type (TEXT)
- count (INTEGER)
- percentage (FLOAT)

#### v_pistol_performance (HAS team_id, map_name, NO team_name, NO win_rate)
- team_id (TEXT) -- NO team_name! JOIN with game_compositions if needed
- map_name (TEXT)
- side (TEXT)
- pistol_wins (INTEGER)

#### v_team_agent_picks (HAS team_name, map_name)
- team_name (TEXT)
- map_name (TEXT)
- agent (TEXT)
- times_picked (INTEGER) -- NOT "pick_rate"

#### v_weapon_usage (HAS team_id, map_name but NO team_name)
- team_id (TEXT)
- map_name (TEXT)
- weapon_name (TEXT) -- NOT "weapon"
- total_kills (INTEGER)

### JOIN PATTERNS:

To get rounds WITH map names:
  SELECT r.* FROM rounds r
  JOIN games g ON r.game_id = g.game_id
  WHERE g.map_name ILIKE '%ascent%'

To get team_name for player stats:
  SELECT prs.* FROM player_round_stats prs
  JOIN game_compositions gc ON prs.game_id = gc.game_id AND prs.player_name = gc.player_name
  WHERE gc.team_name ILIKE '%100%'

To count 100 Thieves rounds won on Ascent:
  SELECT COUNT(*) FROM rounds r
  JOIN games g ON r.game_id = g.game_id
  WHERE g.map_name ILIKE '%ascent%'
  AND r.winner_team_id IN (SELECT DISTINCT team_id FROM game_compositions WHERE team_name ILIKE '%100%')

### Map Names: ascent, bind, breeze, haven, icebox, lotus, pearl, split
### Agent Roles: Duelist (jett, raze), Controller (omen, brimstone), Sentinel (sage, cypher), Initiator (sova, breach)
### Win Types: opponentEliminated, bombExploded, bombDefused, timeExpired
### Side Values: 'attacker', 'defender'
"""

# Query classification categories
QUERY_TYPES = {
    "DB_QUERY": "Requires database access",
    "GENERAL_INFO": "General info about the tool or VALORANT",
    "GREETING": "Greeting or thanks",
    "CLARIFICATION": "Ambiguous, needs more info",
    "OFF_TOPIC": "Unrelated to VALORANT analytics",
    "INVALID": "Spam or gibberish"
}

# System context for the AI
SYSTEM_CONTEXT = """You are a VCT Scouting Analyst embedded in a professional VALORANT coaching tool. You work FOR the coaching staff who are preparing to play AGAINST the teams they ask about.

YOUR ROLE:
- You scout OPPONENTS to find exploitable weaknesses
- Every answer should help the coach build a game plan AGAINST the queried team
- Be direct, concise, and actionable — coaches are busy
- Frame everything as "how to beat them" not "how good they are"

RESPONSE RULES:
- Use **bold** for key numbers and important findings
- Keep responses under 150 words
- Structure with bullet points, not paragraphs
- Always end with 1-2 tactical takeaways
- Never ramble or repeat information
- Use markdown formatting (bold, bullets)

AVAILABLE DATA: VCT Americas match history, map stats, player performance, agent compositions, round-by-round data, weapon usage, pistol performance.

COMMON QUERIES USERS ASK:
- "What are [Team]'s weaknesses?"
- "Show me [Team]'s map stats"
- "Who are the best players on [Team]?"
- "Compare [Team A] vs [Team B]"
- "What agents does [Team] play?"
- "How does [Team] perform in pistol rounds?"
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
    
    def _extract_player_from_question(self, question: str) -> Optional[str]:
        """Extract player name from the question for player lookup queries."""
        import re
        question_lower = question.lower()
        
        # Common patterns for player lookup
        patterns = [
            r'what team (?:is|does) (\w+)',
            r'which team (?:is|does) (\w+)',
            r'where does (\w+) play',
            r'who is (\w+)',
            r'find player (\w+)',
            r"(\w+)'s team",
        ]
        
        for pattern in patterns:
            match = re.search(pattern, question_lower)
            if match:
                return match.group(1)
        
        # Fallback: look for capitalized words that might be player names
        words = question.split()
        for word in words:
            # Skip common words
            if word.lower() in ['what', 'which', 'who', 'where', 'team', 'is', 'does', 'play', 'on', 'the', 'find', 'player', 'show', 'me']:
                continue
            # If it looks like a name (capitalized), it might be a player
            if word[0].isupper() and len(word) >= 2:
                return word
        
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
    
    def validate_sql(self, sql: str) -> tuple[bool, str]:
        """Validate SQL for common errors before execution.
        
        Returns: (is_valid, error_message)
        """
        import re
        sql_lower = sql.lower()
        
        # Check for non-existent columns - simple string patterns
        banned_patterns = [
            # Pistol performance
            ('pistol_loss', "v_pistol_performance does not have 'pistol_losses' column. Use: 'pistol_wins'"),
            ('vpw.win_rate', "v_pistol_performance does not have 'win_rate' column. Calculate as: pistol_wins / total rounds"),
            ('vpp.win_rate', "v_pistol_performance does not have 'win_rate' column"),
            ('pistol_performance.win_rate', "v_pistol_performance does not have 'win_rate' column"),
            
            # Side/attack terminology
            ('is_attack', "Use 'side' column (values: 'attacker', 'defender'), not 'is_attack'"),
            ('on_attack', "Use 'side' column, not 'on_attack'"),
            
            # Weapons
            (' weapon ', "Use 'weapon_name', not 'weapon'"),
            ('select games,', "Use 'games_played', not 'games' in v_team_map_stats (in SELECT clause)"),
            
            # Agent picks
            ('pick_rate', "Use 'times_picked', not 'pick_rate' in v_team_agent_picks"),
            
            # Common mistake: using map_name from rounds table directly
            ('r.map_name', "rounds table does NOT have map_name! JOIN with games: JOIN games g ON r.game_id = g.game_id, then use g.map_name"),
            ('rounds.map_name', "rounds table does NOT have map_name! JOIN with games table to get map_name"),
            ('winning_team_id', "Use 'winner_team_id' (not winning_team_id) in rounds table"),
        ]
        
        for pattern, error in banned_patterns:
            if pattern in sql_lower:
                return False, error
        
        # Regex patterns for more complex cases (catches g.map, t.map, etc. but NOT g.map_name)
        regex_patterns = [
            (r'\w+\.map\b(?!_)', "Column reference to 'map' found. Use 'map_name' instead. Example: g.map_name"),
            (r'\w+\.games\b(?!_)', "Column reference to 'games' found. Use 'games_played' instead"),
        ]
        
        for regex, error in regex_patterns:
            if re.search(regex, sql_lower):
                return False, error
        
        return True, ""
    
    def execute_query(self, sql: str) -> List[Dict]:
        """Execute SQL and return results as list of dicts."""
        # Validate first
        is_valid, error = self.validate_sql(sql)
        if not is_valid:
            raise ValueError(f"Invalid SQL: {error}")
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql)
            return [dict(row) for row in cur.fetchall()]
    
    def generate_sql_from_question(self, question: str, team_name: str = None) -> Dict[str, Any]:
        """Use Groq to generate SQL from natural language question."""
        
        if not self.client:
            # Provide helpful suggestions when AI isn't available
            suggestions = self._suggest_alternative_queries(question, team_name)
            return {
                "success": False,
                "error": f"AI query generation not available. {suggestions}",
                "sql": None
            }
        
        # Extract team from question if not provided
        if not team_name:
            team_name = self._extract_team_from_question(question)
        
        team_context = f"\nFocus on team: {team_name}" if team_name else ""
        
        prompt = f"""You are a VALORANT esports SQL expert. Generate a PostgreSQL query for this question.

{DATABASE_SCHEMA}

Question: {question}{team_context}

⚠️ CRITICAL COLUMN NAME REMINDERS (MISTAKES WILL CAUSE ERRORS):
- NEVER use 'map' - ALWAYS use 'map_name' (in ALL tables: games, rounds, v_team_map_stats, v_pistol_performance, v_round_win_types)
- NEVER use 'games' - ALWAYS use 'games_played' (in v_team_map_stats)
- NEVER use 'team_name' in v_pistol_performance or v_round_win_types - use team_id and JOIN with game_compositions
- NEVER use 'pick_rate' - ALWAYS use 'times_picked' (in v_team_agent_picks)

IMPORTANT RULES:
1. Return ONLY the SQL query, no explanation
2. Use PostgreSQL syntax (not DuckDB)
3. Use ILIKE for case-insensitive text matching
4. Always limit results to 50 rows max
5. For team-specific queries, filter by team_name ILIKE '%teamname%'
6. Use proper table/column names from schema
7. For percentages, use ROUND(100.0 * ... , 1)
8. Handle NULLs with COALESCE or NULLIF
9. CRITICAL: player_round_stats has NO team_name column! JOIN with game_compositions to filter by team_name

TABLE COLUMN REFERENCES (with correct names):
- games table: game_id, series_id, map_name (NOT map), team1_name, team2_name, team1_score, team2_score, total_rounds
- rounds table: round_id, game_id, map_name (NOT map), attacker_team_id, defender_team_id, win_type
- v_team_map_stats: team_name, map_name (NOT map), games_played (NOT games), wins, losses, win_rate
- v_pistol_performance: team_id, map_name (NOT map), side, pistol_wins
- v_round_win_types: team_id, map_name (NOT map), side, win_type, count

CORRECT EXAMPLE QUERIES:
- Rounds on Ascent: SELECT * FROM rounds WHERE map_name ILIKE '%ascent%' LIMIT 10
- Team on Ascent: SELECT map_name, games_played, wins FROM v_team_map_stats WHERE team_name ILIKE '%100%' AND map_name ILIKE '%ascent%'
- Pistol stats per map: SELECT map_name, side, pistol_wins FROM v_pistol_performance WHERE map_name ILIKE '%bind%' LIMIT 10

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
            return f"I found no data matching your query about {team_name or 'this topic'}. This could mean the team hasn't played enough matches in our database, or try rephrasing your question."
        
        # Limit results for API
        display_results = results[:20]
        
        prompt = f"""{SYSTEM_CONTEXT}

Analyze this data from a SCOUTING perspective. The coach wants to know how to EXPLOIT this.

QUESTION: {question}
TEAM BEING SCOUTED: {team_name or 'General'}

DATA:
{json.dumps(display_results, indent=2, default=str)[:3000]}

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
- Start with a **one-line summary** answering the question directly
- Use **bold** for all key numbers (win rates, K/D, round counts)
- Use bullet points (•) for each finding
- End with **Tactical Takeaway:** section (1-2 sentences max)
- TOTAL response must be under 150 words
- Frame findings as opponent vulnerabilities to exploit
- If data is about multiple teams, rank them clearly

DO NOT:
- Write long paragraphs
- Repeat data that's already shown in the table
- Use generic filler phrases
- Exceed 150 words"""

        try:
            global LAST_API_CALL
            elapsed = time.time() - LAST_API_CALL
            if elapsed < MIN_API_INTERVAL:
                time.sleep(MIN_API_INTERVAL - elapsed)
            
            response = self.client.chat.completions.create(
                model=self.MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a sharp VALORANT scouting analyst. Be concise, use bold markdown for key stats, and frame everything as opponent vulnerabilities. Under 150 words."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=512,
                temperature=0.3
            )
            
            LAST_API_CALL = time.time()
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            return f"Analysis error: {str(e)}\n\n{self._format_results_basic(results)}"
    
    def _validate_results_sanity(self, results: List[Dict], query_type: str = None) -> Dict[str, Any]:
        """
        Check results for suspicious/unusual patterns and add warnings.
        Returns: {"warnings": [...], "is_suspicious": bool}
        """
        warnings = []
        
        if not results:
            return {"warnings": [], "is_suspicious": False}
        
        # Check for extreme percentages (100% or 0%)
        for row in results:
            for key, value in row.items():
                if isinstance(value, (int, float)):
                    # Win rate extremes with low sample
                    if 'rate' in key.lower() or 'percentage' in key.lower():
                        if value == 100 or value == 0:
                            games = row.get('games', row.get('games_played', row.get('count', 0)))
                            if isinstance(games, (int, float)) and games < 5:
                                warnings.append(f"Note: {value}% rate based on only {games} games - low sample size")
        
        # Check for very small sample sizes
        total_count = 0
        for row in results:
            count = row.get('games', row.get('games_played', row.get('count', row.get('total_games', 0))))
            if isinstance(count, (int, float)):
                total_count += count
        
        if total_count > 0 and total_count < 3:
            warnings.append(f"Warning: Results based on very small sample ({total_count} total)")
        
        # Check for duplicate team names (like LOUD vs LOUD (1))
        team_names = set()
        for row in results:
            if 'team_name' in row:
                team_names.add(row['team_name'])
        
        # Look for teams with parenthetical suffixes
        base_teams = {}
        for name in team_names:
            import re
            match = re.match(r'^(.+?)\s*\(\d+\)$', name)
            if match:
                base = match.group(1)
                if base not in base_teams:
                    base_teams[base] = []
                base_teams[base].append(name)
        
        for base, variants in base_teams.items():
            if len(variants) > 1:
                warnings.append(f"Note: Multiple entries exist for '{base}': {', '.join(variants)} - these may be different tournament appearances")
        
        return {
            "warnings": warnings,
            "is_suspicious": len(warnings) > 0
        }
    
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
    
    def _interpret_weaknesses(self, data: Dict, team_name: str) -> str:
        """Generate natural language interpretation of team weaknesses."""
        weaknesses = data.get("weaknesses", [])
        
        if not weaknesses:
            return f"No major vulnerabilities found for **{team_name}** in our data. They perform consistently across maps and phases. Try asking about specific maps or player matchups to find edges."
        
        response = f"**Scouting Report: {team_name} Vulnerabilities**\n\n"
        
        for w in weaknesses:
            response += f"• **{w['category']}** — {w['finding']}\n"
            response += f"  → *{w['recommendation']}*\n\n"
        
        response += f"**Tactical Takeaway:** Target their weak maps in the veto and exploit the gaps identified above."
        return response
    
    def _interpret_map_stats(self, map_stats: List[Dict], team_name: str) -> str:
        """Generate natural language interpretation of map statistics."""
        if not map_stats:
            return f"No map data found for **{team_name}**. They may not have enough recorded matches."
        
        response = f"**{team_name} — Map Pool Scouting**\n\n"
        
        # Filter out invalid map names
        valid_maps = []
        for m in map_stats:
            map_name = m.get('map') or m.get('map_name')
            if not map_name or map_name.lower() in ['none', 'unknown', 'null']:
                continue
            valid_maps.append({'map_name': map_name, 'win_rate': m.get('win_rate', 0) or 0, 'games': m.get('games') or m.get('games_played', 0) or 0})
        
        if not valid_maps:
            return f"No valid map data found for **{team_name}**."
        
        for m in valid_maps:
            map_name = m['map_name']
            win_rate = m['win_rate']
            games = m['games']
            
            if win_rate >= 55:
                icon = "🟢"
            elif win_rate >= 45:
                icon = "🟡"
            else:
                icon = "🔴"
            response += f"{icon} **{map_name}**: **{win_rate}%** WR ({games} games)\n"
        
        # Veto recommendations
        strong_maps = [m['map_name'] for m in valid_maps if m['win_rate'] >= 55]
        weak_maps = [m['map_name'] for m in valid_maps if m['win_rate'] < 45]
        
        response += "\n"
        if strong_maps:
            response += f"**Ban consideration:** {', '.join(strong_maps)}\n"
        if weak_maps:
            response += f"**Force in veto:** {', '.join(weak_maps)}\n"
        
        return response
    
    def _interpret_player_stats(self, players: List[Dict], team_name: str) -> str:
        """Generate natural language interpretation of player statistics."""
        if not players:
            return f"No player data found for **{team_name}**."
        
        # Filter out invalid player names
        valid_players = [p for p in players if p.get('player_name') and p.get('player_name').lower() not in ['none', 'unknown', 'null']]
        
        if not valid_players:
            return f"No valid player data found for **{team_name}**."
        
        response = f"**{team_name} — Player Threat Assessment**\n\n"
        
        for p in valid_players:
            name = p.get('player_name', 'Unknown')
            games = p.get('games', 0)
            kills = p.get('kills', 0)
            deaths = p.get('deaths', 0)
            kd = p.get('kd_ratio', 0)
            
            if kd and kd > 1.2:
                threat = "🚨 **KEY THREAT**"
            elif kd and kd > 1.0:
                threat = "Solid"
            else:
                threat = "Supportive"
            response += f"• **{name}** — **{kd} K/D** ({kills}K/{deaths}D, {games} games) — {threat}\n"
            
            agent_pool = p.get('agent_pool', [])
            if agent_pool:
                agents = [a.get('agent', '') for a in agent_pool[:3] if a.get('agent')]
                if agents:
                    response += f"  Agents: {', '.join(agents)}\n"
        
        # Find the star player
        star = max(valid_players, key=lambda p: p.get('kd_ratio', 0) or 0)
        response += f"\n**Tactical Takeaway:** Focus utility and pressure on **{star.get('player_name', 'Unknown')}** — their top fragger."
        return response
    
    def _rollback_transaction(self):
        """Rollback any failed transaction to allow subsequent queries."""
        try:
            if self.conn:
                self.conn.rollback()
        except Exception:
            pass
    
    # ==================== GENERAL QUERY HANDLERS (Non-team-specific) ====================
    
    def get_teams_defense_stats(self, limit: int = 10) -> Dict[str, Any]:
        """Get defense performance for all teams - for 'which teams struggle on defense' queries."""
        query = """
            SELECT 
                gc.team_name,
                COUNT(DISTINCT r.game_id) as games,
                SUM(CASE WHEN r.defender_team_id = gc.team_id AND r.winner_team_id = gc.team_id THEN 1 ELSE 0 END) as defense_wins,
                SUM(CASE WHEN r.defender_team_id = gc.team_id THEN 1 ELSE 0 END) as defense_rounds,
                ROUND(100.0 * SUM(CASE WHEN r.defender_team_id = gc.team_id AND r.winner_team_id = gc.team_id THEN 1 ELSE 0 END) / 
                    NULLIF(SUM(CASE WHEN r.defender_team_id = gc.team_id THEN 1 ELSE 0 END), 0), 1) as defense_win_rate
            FROM rounds r
            JOIN game_compositions gc ON r.game_id = gc.game_id
            WHERE gc.team_name IS NOT NULL
            GROUP BY gc.team_name
            HAVING SUM(CASE WHEN r.defender_team_id = gc.team_id THEN 1 ELSE 0 END) >= 50
            ORDER BY defense_win_rate ASC
            LIMIT %s
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (limit,))
            results = [dict(row) for row in cur.fetchall()]
        return {"teams": results, "metric": "defense_win_rate", "order": "worst_first"}
    
    def get_teams_attack_stats(self, limit: int = 10) -> Dict[str, Any]:
        """Get attack performance for all teams."""
        query = """
            SELECT 
                gc.team_name,
                COUNT(DISTINCT r.game_id) as games,
                SUM(CASE WHEN r.attacker_team_id = gc.team_id AND r.winner_team_id = gc.team_id THEN 1 ELSE 0 END) as attack_wins,
                SUM(CASE WHEN r.attacker_team_id = gc.team_id THEN 1 ELSE 0 END) as attack_rounds,
                ROUND(100.0 * SUM(CASE WHEN r.attacker_team_id = gc.team_id AND r.winner_team_id = gc.team_id THEN 1 ELSE 0 END) / 
                    NULLIF(SUM(CASE WHEN r.attacker_team_id = gc.team_id THEN 1 ELSE 0 END), 0), 1) as attack_win_rate
            FROM rounds r
            JOIN game_compositions gc ON r.game_id = gc.game_id
            WHERE gc.team_name IS NOT NULL
            GROUP BY gc.team_name
            HAVING SUM(CASE WHEN r.attacker_team_id = gc.team_id THEN 1 ELSE 0 END) >= 50
            ORDER BY attack_win_rate ASC
            LIMIT %s
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (limit,))
            results = [dict(row) for row in cur.fetchall()]
        return {"teams": results, "metric": "attack_win_rate", "order": "worst_first"}
    
    def get_player_team(self, player_name: str) -> Dict[str, Any]:
        """Find which team a player is on and their stats."""
        query = """
            SELECT DISTINCT 
                gc.player_name,
                gc.team_name,
                gc.agent,
                gc.agent_role,
                COUNT(DISTINCT gc.game_id) as games_played
            FROM game_compositions gc
            WHERE gc.player_name ILIKE %s
            GROUP BY gc.player_name, gc.team_name, gc.agent, gc.agent_role
            ORDER BY games_played DESC
            LIMIT 10
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (f"%{player_name}%",))
            results = [dict(row) for row in cur.fetchall()]
        
        if not results:
            return {"found": False, "player": player_name, "matches": []}
        
        return {"found": True, "player": results[0]['player_name'], "matches": results}
    
    def get_top_fraggers(self, limit: int = 10) -> Dict[str, Any]:
        """Get top fragging players across all teams."""
        query = """
            SELECT 
                prs.player_name,
                gc.team_name,
                COUNT(DISTINCT prs.game_id) as games,
                SUM(prs.kills) as total_kills,
                SUM(prs.deaths) as total_deaths,
                ROUND(1.0 * SUM(prs.kills) / NULLIF(SUM(prs.deaths), 0), 2) as kd_ratio,
                ROUND(1.0 * SUM(prs.kills) / COUNT(DISTINCT prs.game_id), 1) as avg_kills_per_game
            FROM player_round_stats prs
            JOIN game_compositions gc ON prs.game_id = gc.game_id AND prs.player_name = gc.player_name
            WHERE prs.player_name IS NOT NULL AND gc.team_name IS NOT NULL
            GROUP BY prs.player_name, gc.team_name
            HAVING COUNT(DISTINCT prs.game_id) >= 5
            ORDER BY kd_ratio DESC
            LIMIT %s
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (limit,))
            results = [dict(row) for row in cur.fetchall()]
        return {"players": results, "metric": "kd_ratio"}
    
    def get_best_teams_overall(self, limit: int = 10) -> Dict[str, Any]:
        """Get best performing teams overall."""
        query = """
            SELECT 
                team_name,
                SUM(games_played) as total_games,
                SUM(wins) as total_wins,
                SUM(losses) as total_losses,
                ROUND(100.0 * SUM(wins) / NULLIF(SUM(games_played), 0), 1) as win_rate
            FROM v_team_map_stats
            WHERE team_name IS NOT NULL
            GROUP BY team_name
            HAVING SUM(games_played) >= 10
            ORDER BY win_rate DESC
            LIMIT %s
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (limit,))
            results = [dict(row) for row in cur.fetchall()]
        return {"teams": results, "metric": "win_rate"}
    
    def get_worst_teams_overall(self, limit: int = 10) -> Dict[str, Any]:
        """Get worst performing teams overall."""
        query = """
            SELECT 
                team_name,
                SUM(games_played) as total_games,
                SUM(wins) as total_wins,
                SUM(losses) as total_losses,
                ROUND(100.0 * SUM(wins) / NULLIF(SUM(games_played), 0), 1) as win_rate
            FROM v_team_map_stats
            WHERE team_name IS NOT NULL
            GROUP BY team_name
            HAVING SUM(games_played) >= 10
            ORDER BY win_rate ASC
            LIMIT %s
        """
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (limit,))
            results = [dict(row) for row in cur.fetchall()]
        return {"teams": results, "metric": "win_rate", "order": "worst_first"}
    
    def _interpret_teams_defense(self, data: Dict) -> str:
        """Interpret defense stats for multiple teams."""
        teams = data.get("teams", [])
        if not teams:
            return "No team defense data found with sufficient matches."
        
        response = "**Defense Vulnerabilities — League Overview**\n\n"
        for i, t in enumerate(teams, 1):
            wr = t.get('defense_win_rate', 0) or 0
            icon = "🔴" if wr < 45 else "🟡" if wr < 50 else "🟢"
            response += f"{i}. {icon} **{t['team_name']}**: **{wr:.1f}%** def WR ({t.get('defense_wins', 0)}/{t.get('defense_rounds', 0)} rounds)\n"
        
        response += "\n**Tactical Takeaway:** Against these teams, run aggressive executes and overwhelm their site holds."
        return response
    
    def _interpret_teams_attack(self, data: Dict) -> str:
        """Interpret attack stats for multiple teams."""
        teams = data.get("teams", [])
        if not teams:
            return "No team attack data found with sufficient matches."
        
        response = "**Attack Vulnerabilities — League Overview**\n\n"
        for i, t in enumerate(teams, 1):
            wr = t.get('attack_win_rate', 0) or 0
            icon = "🔴" if wr < 45 else "🟡" if wr < 50 else "🟢"
            response += f"{i}. {icon} **{t['team_name']}**: **{wr:.1f}%** atk WR ({t.get('attack_wins', 0)}/{t.get('attack_rounds', 0)} rounds)\n"
        
        response += "\n**Tactical Takeaway:** These teams struggle with site takes. Play patient defense and deny early map control."
        return response
    
    def _interpret_player_lookup(self, data: Dict) -> str:
        """Interpret player team lookup."""
        if not data.get("found"):
            return f"Couldn't find **{data.get('player', 'unknown')}** in the database. Check spelling or try their in-game name."
        
        matches = data.get("matches", [])
        player = data.get("player", "")
        
        if len(matches) == 1:
            m = matches[0]
            return f"**{m['player_name']}** plays for **{m['team_name']}**\n• Role: **{m['agent']}** ({m['agent_role']})\n• Games on record: **{m['games_played']}**"
        
        # Multiple matches (different teams or agents)
        response = f"**{player} — Player Intel**\n\n"
        for m in matches[:5]:
            response += f"• **{m['team_name']}** — {m['agent']} ({m['games_played']} games)\n"
        
        teams = list(set(m['team_name'] for m in matches))
        if len(teams) > 1:
            response += f"\n*Note: Multiple team appearances — possible roster changes.*"
        
        return response
    
    def _interpret_top_players(self, data: Dict) -> str:
        """Interpret top player stats."""
        players = data.get("players", [])
        if not players:
            return "No player data found with sufficient matches."
        
        response = "**Top Fraggers — Threat Watch List**\n\n"
        for i, p in enumerate(players, 1):
            kd = p.get('kd_ratio', 0) or 0
            avg_kills = p.get('avg_kills_per_game', 0) or 0
            icon = "🚨" if kd >= 1.3 else "⚠️" if kd >= 1.1 else ""
            response += f"{i}. {icon} **{p['player_name']}** ({p['team_name']}) — **{kd:.2f} K/D**, {avg_kills:.1f} kills/game ({p['games']} games)\n"
        
        response += f"\n**Tactical Takeaway:** Prioritize shutting down **{players[0]['player_name']}** — league's most dangerous fragger."
        return response
    
    def _interpret_best_teams(self, data: Dict) -> str:
        """Interpret best teams rankings."""
        teams = data.get("teams", [])
        if not teams:
            return "No team data found with sufficient matches."
        
        response = "**Strongest Opponents — Power Rankings**\n\n"
        for i, t in enumerate(teams, 1):
            wr = t.get('win_rate', 0) or 0
            response += f"{i}. **{t['team_name']}**: **{wr:.1f}%** WR ({t.get('total_wins', 0)}W-{t.get('total_losses', 0)}L, {t.get('total_games', 0)} maps)\n"
        
        response += f"\n**Tactical Takeaway:** Prepare extra veto strategies and anti-strats when facing these top-tier opponents."
        return response
    
    def _interpret_worst_teams(self, data: Dict) -> str:
        """Interpret worst teams rankings."""
        teams = data.get("teams", [])
        if not teams:
            return "No team data found with sufficient matches."
        
        response = "**Weakest Opponents — Exploitable Teams**\n\n"
        for i, t in enumerate(teams, 1):
            wr = t.get('win_rate', 0) or 0
            response += f"{i}. **{t['team_name']}**: **{wr:.1f}%** WR ({t.get('total_wins', 0)}W-{t.get('total_losses', 0)}L, {t.get('total_games', 0)} maps)\n"
        
        response += "\n**Tactical Takeaway:** These teams have clear gaps — study their tendencies for easy prep wins."
        return response

    def _suggest_alternative_queries(self, question: str, team_name: str = None) -> str:
        """Suggest alternative queries or query patterns when AI isn't available."""
        question_lower = question.lower()
        
        # Analyze what the user is asking about
        is_team_question = team_name is not None
        keywords = []
        
        if any(w in question_lower for w in ['defense', 'defend', 'retake']):
            keywords.append("'Which teams struggle on defense?'")
        if any(w in question_lower for w in ['attack', 'plant', 'enter site']):
            keywords.append("'What teams are weak on attack?'")
        if any(w in question_lower for w in ['player', 'frag', 'kill']):
            keywords.append("'Who are the top fraggers?'")
        if any(w in question_lower for w in ['best', 'strong', 'win rate']):
            keywords.append("'What are the best teams?'")
        if any(w in question_lower for w in ['weak', 'worst', 'bad']):
            keywords.append("'What are the worst teams?'")
        if any(w in question_lower for w in ['map', 'split', 'bind', 'haven']):
            if is_team_question:
                keywords.append(f"'Show me {team_name} map stats'")
        if any(w in question_lower for w in ['on', 'play', 'team']):
            keywords.append("'What team is [player] on?'")
        
        if keywords:
            suggestions = " Try asking: " + " or ".join(keywords[:2]) + "."
        else:
            suggestions = " Try asking about teams, players, or maps instead. Example: 'Which teams struggle on defense?'"
        
        return suggestions

    def classify_query(self, question: str) -> Dict[str, Any]:
        """
        Classify the user's query to determine if DB access is needed.
        Returns: {"type": str, "should_query_db": bool, "direct_response": str or None}
        """
        if not self.client:
            # If no AI, assume it's a DB query (will fail gracefully later)
            return {"type": "DB_QUERY", "should_query_db": True, "direct_response": None}
        
        # Quick checks for obvious cases (no API call needed)
        question_lower = question.lower().strip()
        question_clean = question_lower.rstrip('!?.,')
        
        # Check for very short or gibberish input
        if len(question_lower) < 3:
            return {
                "type": "INVALID",
                "should_query_db": False,
                "direct_response": "Please ask a complete question about VALORANT team statistics or performance."
            }
        
        # Check for greetings (more flexible matching)
        greetings = ['hi', 'hii', 'hiii', 'hello', 'hey', 'heyy', 'thanks', 'thank you', 'thx', 'ty', 
                     'bye', 'goodbye', 'ok', 'okay', 'yes', 'no', 'sure', 'sup', 'yo', 'wassup', 'whatsup']
        if question_clean in greetings or len(question_clean) <= 4 and question_clean.replace('i', '').replace('y', '') in ['h', 'he', 'hel', 'hell', 'hello']:
            return {
                "type": "GREETING",
                "should_query_db": False,
                "direct_response": "Hello! I'm your VCT Analytics AI. Ask me about team performance, player stats, map strategies, or opponent weaknesses. For example: 'What are LOUD's weaknesses?' or 'Show me Cloud9's map stats'"
            }
        
        # Check for "what is this" / "help" type questions
        help_keywords = ['what is this', 'what can you do', 'help', 'how do i use', 'what are you', 'who are you', 'what is valorant scouter', 'what is this tool']
        if any(kw in question_lower for kw in help_keywords):
            return {
                "type": "GENERAL_INFO",
                "should_query_db": False,
                "direct_response": """I'm the VCT Analytics AI, a specialized assistant for VALORANT Champions Tour esports data.

I can help you with:
• Team weaknesses and strengths analysis
• Map pool statistics (win rates, pick rates)
• Player performance metrics (KD, ACS, agent pools)
• Agent composition analysis
• Head-to-head team comparisons
• Pistol round and economy analysis

Try asking things like:
- "What are LOUD's biggest weaknesses?"
- "Show me Sentinels' map statistics"
- "Who are the top players on Cloud9?"
- "Compare G2 vs Fnatic"

Just mention a team name and what you want to know!"""
            }
        
        # Check for obvious off-topic (weather, general knowledge unrelated to gaming)
        off_topic_keywords = ['weather', 'recipe', 'cook', 'movie', 'music', 'song', 'joke', 'story', 'poem', 'politics', 'news']
        if any(kw in question_lower for kw in off_topic_keywords):
            return {
                "type": "OFF_TOPIC",
                "should_query_db": False,
                "direct_response": "I specialize in VALORANT esports analytics. I can help you analyze team performance, player stats, map strategies, and opponent weaknesses. What team would you like me to analyze?"
            }
        
        # Check for gibberish (no vowels, random characters)
        vowels = set('aeiouAEIOU')
        words = question.split()
        has_valid_word = any(
            len(w) >= 2 and any(c in vowels for c in w) 
            for w in words if w.isalpha()
        )
        if not has_valid_word and len(question) > 5:
            return {
                "type": "INVALID",
                "should_query_db": False,
                "direct_response": "I couldn't understand that. Please ask a question about VALORANT team statistics. For example: 'What are LOUD's weaknesses?' or 'Show me Cloud9's win rate'"
            }
        
        # For anything else that looks like a real question, check with AI if ambiguous
        # But most VALORANT-related questions should go to DB
        valorant_keywords = [
            'team', 'player', 'agent', 'map', 'win', 'loss', 'rate', 'stats', 'performance',
            'weakness', 'strength', 'pick', 'ban', 'kill', 'death', 'assist', 'acs', 'round',
            'pistol', 'eco', 'economy', 'attack', 'defense', 'site', 'spike', 'clutch',
            'duelist', 'controller', 'sentinel', 'initiator', 'composition', 'comp',
            'jett', 'raze', 'omen', 'sage', 'cypher', 'sova', 'phoenix', 'reyna', 'killjoy',
            'viper', 'breach', 'skye', 'yoru', 'astra', 'kayo', 'chamber', 'fade', 'harbor',
            'gekko', 'deadlock', 'iso', 'clove', 'vyse', 'neon',
            'ascent', 'bind', 'haven', 'split', 'icebox', 'breeze', 'fracture', 'pearl', 
            'lotus', 'sunset', 'abyss',
            'loud', 'sentinels', 'cloud9', 'c9', 'nrg', '100t', '100 thieves', 'fnatic', 
            'g2', 'liquid', 'paper rex', 'prx', 'drx', 't1', 'geng', 'gen.g', 'mibr',
            'leviatan', 'kru', 'furia', 'fut', 'heretics', 'giants', 'karmine', 'vitality'
        ]
        
        if any(kw in question_lower for kw in valorant_keywords):
            return {"type": "DB_QUERY", "should_query_db": True, "direct_response": None}
        
        # Default: try to query if it's a question mark or seems interrogative
        if '?' in question or any(question_lower.startswith(w) for w in ['what', 'who', 'how', 'show', 'tell', 'which', 'compare', 'analyze']):
            return {"type": "DB_QUERY", "should_query_db": True, "direct_response": None}
        
        # Fallback for ambiguous input
        return {
            "type": "CLARIFICATION",
            "should_query_db": False,
            "direct_response": "I'm not sure what you're looking for. I can analyze VALORANT team data - try asking about a specific team like 'What are LOUD's map statistics?' or 'Show me Sentinels player stats'"
        }
    
    def ask(self, question: str, team_name: str = None) -> Dict[str, Any]:
        """Main entry point: ask a question, get AI-interpreted answer."""
        
        # Step 1: Classify the query
        classification = self.classify_query(question)
        
        # If it doesn't need DB, return direct response
        if not classification["should_query_db"]:
            return {
                "question": question,
                "team": team_name,
                "sql": None,
                "error": None,
                "results": None,
                "interpretation": classification["direct_response"],
                "query_type": classification["type"]
            }
        
        # Extract team if not provided
        question_lower = question.lower()
        if not team_name:
            team_name = self._extract_team_from_question(question)
        
        print(f"[ASK DEBUG] Question: {question}, Extracted team: {team_name}")  # Debug logging
        
        # ===== STEP 2A: GENERAL QUERIES (no team required) =====
        # These handle queries like "which teams struggle on defense?"
        
        # Player lookup: "what team is TenZ on", "where does aspas play"
        player_lookup_patterns = ['what team is', 'which team is', 'where does', 'who is', 'what team does', 'find player']
        if any(p in question_lower for p in player_lookup_patterns):
            # Extract player name from question
            player_match = self._extract_player_from_question(question)
            if player_match:
                try:
                    self._rollback_transaction()
                    data = self.get_player_team(player_match)
                    self.conn.commit()
                    interpretation = self._interpret_player_lookup(data)
                    return {
                        "question": question,
                        "team": None,
                        "sql": "(Used optimized player lookup)",
                        "error": None,
                        "results": {"data": data.get("matches", []), "count": len(data.get("matches", []))},
                        "interpretation": interpretation,
                        "query_type": "DB_QUERY"
                    }
                except Exception as e:
                    print(f"[Player lookup error] {e}")
                    self._rollback_transaction()
        
        # Defense struggles: "which teams struggle on defense"
        if 'defense' in question_lower and any(w in question_lower for w in ['struggle', 'weak', 'worst', 'bad', 'which team']):
            try:
                self._rollback_transaction()
                data = self.get_teams_defense_stats(10)
                self.conn.commit()
                interpretation = self._interpret_teams_defense(data)
                return {
                    "question": question,
                    "team": None,
                    "sql": "(Used optimized defense analysis)",
                    "error": None,
                    "results": {"data": data.get("teams", []), "count": len(data.get("teams", []))},
                    "interpretation": interpretation,
                    "query_type": "DB_QUERY"
                }
            except Exception as e:
                print(f"[Defense handler error] {e}")
                self._rollback_transaction()
        
        # Attack struggles: "which teams struggle on attack"
        if 'attack' in question_lower and any(w in question_lower for w in ['struggle', 'weak', 'worst', 'bad', 'which team']):
            try:
                self._rollback_transaction()
                data = self.get_teams_attack_stats(10)
                self.conn.commit()
                interpretation = self._interpret_teams_attack(data)
                return {
                    "question": question,
                    "team": None,
                    "sql": "(Used optimized attack analysis)",
                    "error": None,
                    "results": {"data": data.get("teams", []), "count": len(data.get("teams", []))},
                    "interpretation": interpretation,
                    "query_type": "DB_QUERY"
                }
            except Exception as e:
                print(f"[Attack handler error] {e}")
                self._rollback_transaction()
        
        # Top fraggers: "who are the best players", "top fraggers"
        if any(p in question_lower for p in ['top frag', 'best player', 'highest kd', 'top player', 'best kd']):
            if not team_name:  # Only if no team specified
                try:
                    self._rollback_transaction()
                    data = self.get_top_fraggers(10)
                    self.conn.commit()
                    interpretation = self._interpret_top_players(data)
                    return {
                        "question": question,
                        "team": None,
                        "sql": "(Used optimized player rankings)",
                        "error": None,
                        "results": {"data": data.get("players", []), "count": len(data.get("players", []))},
                        "interpretation": interpretation,
                        "query_type": "DB_QUERY"
                    }
                except Exception as e:
                    print(f"[Top fraggers error] {e}")
                    self._rollback_transaction()
        
        # Best/worst teams overall
        if any(p in question_lower for p in ['best team', 'top team', 'strongest team']):
            try:
                self._rollback_transaction()
                data = self.get_best_teams_overall(10)
                self.conn.commit()
                interpretation = self._interpret_best_teams(data)
                return {
                    "question": question,
                    "team": None,
                    "sql": "(Used optimized team rankings)",
                    "error": None,
                    "results": {"data": data.get("teams", []), "count": len(data.get("teams", []))},
                    "interpretation": interpretation,
                    "query_type": "DB_QUERY"
                }
            except Exception as e:
                print(f"[Best teams error] {e}")
                self._rollback_transaction()
        
        if any(p in question_lower for p in ['worst team', 'weakest team', 'struggling team']):
            try:
                self._rollback_transaction()
                data = self.get_worst_teams_overall(10)
                self.conn.commit()
                interpretation = self._interpret_worst_teams(data)
                return {
                    "question": question,
                    "team": None,
                    "sql": "(Used optimized team rankings)",
                    "error": None,
                    "results": {"data": data.get("teams", []), "count": len(data.get("teams", []))},
                    "interpretation": interpretation,
                    "query_type": "DB_QUERY"
                }
            except Exception as e:
                print(f"[Worst teams error] {e}")
                self._rollback_transaction()
        
        # ===== STEP 2B: TEAM-SPECIFIC QUERIES =====
        # These require a team name to be detected
        if team_name:
            if any(kw in question_lower for kw in ['weakness', 'weak', 'struggle', 'bad at', 'poor', 'exploit']):
                try:
                    self._rollback_transaction()  # Ensure clean transaction state
                    data = self.get_team_weaknesses(team_name)
                    self.conn.commit()
                    interpretation = self._interpret_weaknesses(data, team_name)
                    return {
                        "question": question,
                        "team": team_name,
                        "sql": "(Used optimized weakness analysis)",
                        "error": None,
                        "results": {"data": data.get("weaknesses", []), "count": len(data.get("weaknesses", []))},
                        "interpretation": interpretation,
                        "query_type": "DB_QUERY"
                    }
                except Exception as e:
                    print(f"[Weakness handler error] {e}")  # Log for debugging
                    self._rollback_transaction()
                    # Fall through to AI-generated SQL
            
            if any(kw in question_lower for kw in ['map stat', 'map pool', 'which map', 'best map', 'worst map']):
                try:
                    self._rollback_transaction()  # Ensure clean transaction state
                    data = self.get_team_overview(team_name)
                    self.conn.commit()
                    interpretation = self._interpret_map_stats(data.get("map_stats", []), team_name)
                    return {
                        "question": question,
                        "team": team_name,
                        "sql": "(Used optimized map analysis)",
                        "error": None,
                        "results": {"data": data.get("map_stats", []), "count": len(data.get("map_stats", []))},
                        "interpretation": interpretation,
                        "query_type": "DB_QUERY"
                    }
                except Exception as e:
                    print(f"[Map handler error] {e}")  # Log for debugging
                    self._rollback_transaction()
                    # Fall through to AI-generated SQL
            
            if any(kw in question_lower for kw in ['player', 'roster', 'who plays', 'top frag', 'star player']):
                try:
                    self._rollback_transaction()  # Ensure clean transaction state
                    data = self.get_team_players(team_name)
                    self.conn.commit()
                    interpretation = self._interpret_player_stats(data.get("players", []), team_name)
                    return {
                        "question": question,
                        "team": team_name,
                        "sql": "(Used optimized player analysis)",
                        "error": None,
                        "results": {"data": data.get("players", []), "count": len(data.get("players", []))},
                        "interpretation": interpretation,
                        "query_type": "DB_QUERY"
                    }
                except Exception as e:
                    print(f"[Player handler error] {e}")  # Log for debugging
                    self._rollback_transaction()
                    # Fall through to AI-generated SQL
        
        # Step 3: Generate SQL for other queries
        sql_result = self.generate_sql_from_question(question, team_name)
        
        if not sql_result["success"]:
            self._rollback_transaction()  # Reset transaction state
            # Use the error message which contains helpful suggestions
            error_msg = sql_result["error"]
            return {
                "question": question,
                "team": team_name,
                "sql": sql_result.get("sql"),
                "error": error_msg,
                "results": None,
                "interpretation": error_msg,
                "query_type": "DB_QUERY"
            }
        
        sql = sql_result["sql"]
        detected_team = sql_result.get("team_detected") or team_name
        
        # Step 4: Execute query with transaction recovery
        try:
            results = self.execute_query(sql)
            self.conn.commit()  # Commit successful query
        except Exception as e:
            self._rollback_transaction()  # Reset transaction state for future queries
            error_msg = str(e)
            
            # Provide helpful error messages
            if "does not exist" in error_msg:
                interpretation = "The generated query referenced a column or table that doesn't exist. This might be a data limitation. Try a different question or specify a team name."
            elif "syntax error" in error_msg:
                interpretation = "There was an issue generating the SQL query. Try rephrasing your question."
            else:
                interpretation = f"Query couldn't be executed. Try a simpler question or specify a team name. Error: {error_msg[:100]}"
            
            return {
                "question": question,
                "team": detected_team,
                "sql": sql,
                "error": error_msg,
                "results": None,
                "interpretation": interpretation,
                "query_type": "DB_QUERY"
            }
        
        # Step 4: Interpret results
        interpretation = self._interpret_results(question, results, detected_team)
        
        # Step 5: Add sanity validation warnings
        sanity_check = self._validate_results_sanity(results, "AI_GENERATED")
        if sanity_check["warnings"]:
            interpretation = interpretation + "\n\n---\n" + "\n".join(sanity_check["warnings"])
        
        return {
            "question": question,
            "team": detected_team,
            "sql": sql,
            "error": None,
            "results": {"data": results, "count": len(results)},
            "interpretation": interpretation,
            "query_type": "DB_QUERY"
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
        
        # Map stats (filter nulls and require 2+ games for reliability)
        map_query = """
            SELECT map_name as map, games_played as games, wins, win_rate, round_diff_ratio as avg_round_diff
            FROM v_team_map_stats
            WHERE team_name ILIKE %s AND map_name IS NOT NULL AND games_played >= 2
            ORDER BY games_played DESC, win_rate DESC
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
            SELECT agent, agent_role as role, times_picked as games
            FROM v_team_agent_picks
            WHERE team_name ILIKE %s
            ORDER BY times_picked DESC
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(agent_query, (f"%{team_name}%",))
            agent_picks = [dict(row) for row in cur.fetchall()]
        
        # Calculate total picks for role distribution
        total_picks = sum(a.get('games', 0) for a in agent_picks)
        
        # Calculate role distribution
        role_dist = {}
        for agent in agent_picks:
            role = agent.get('role', 'Unknown')
            picks = int(agent.get('games', 0))
            role_dist[role] = role_dist.get(role, 0) + picks
        
        # Convert to percentages
        if total_picks > 0:
            role_dist = {k: round(100.0 * v / total_picks, 1) for k, v in role_dist.items()}
        
        return {
            "agent_picks": agent_picks,
            "role_distribution": role_dist
        }
    
    def get_team_players(self, team_name: str) -> Dict[str, Any]:
        """Get player stats for a team."""
        
        player_query = """
            SELECT 
                prs.player_name,
                COUNT(DISTINCT prs.game_id) as games,
                SUM(prs.kills) as kills,
                SUM(prs.deaths) as deaths,
                SUM(prs.assists) as assists,
                ROUND(1.0 * SUM(prs.kills) / NULLIF(SUM(prs.deaths), 0), 2) as kd_ratio
            FROM player_round_stats prs
            INNER JOIN game_compositions gc 
                ON prs.game_id = gc.game_id AND prs.player_name = gc.player_name
            WHERE gc.team_name ILIKE %s
            GROUP BY prs.player_name
            ORDER BY kills DESC
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(player_query, (f"%{team_name}%",))
            players = [dict(row) for row in cur.fetchall()]
        
        # Get agent pools for each player
        for player in players:
            pool_query = """
                SELECT agent, games_played, kd_ratio
                FROM v_player_agent_pool
                WHERE player_name = %s
                ORDER BY games_played DESC
                LIMIT 5
            """
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(pool_query, (player['player_name'],))
                player['agent_pool'] = [dict(row) for row in cur.fetchall()]
        
        return {"players": players}
    
    def get_team_weaknesses(self, team_name: str) -> Dict[str, Any]:
        """Identify team weaknesses."""
        
        weaknesses = []
        
        # Check map weaknesses (limit to top 3 worst maps, filter nulls)
        map_query = """
            SELECT map_name as map, win_rate, games_played as games
            FROM v_team_map_stats
            WHERE team_name ILIKE %s AND win_rate < 45 AND games_played >= 2 AND map_name IS NOT NULL
            ORDER BY win_rate ASC
            LIMIT 3
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(map_query, (f"%{team_name}%",))
            weak_maps = [dict(row) for row in cur.fetchall()]
        
        # Filter out null/invalid map names at Python level too
        for m in weak_maps:
            map_name = m.get('map')
            if not map_name or str(map_name).lower() in ['none', 'unknown', 'null']:
                continue
            weaknesses.append({
                "category": "Map Pool",
                "severity": "HIGH" if m['win_rate'] < 35 else "MEDIUM",
                "finding": f"Poor performance on {map_name} ({m['win_rate']:.1f}% WR)",
                "details": f"Win rate of {m['win_rate']:.1f}% across {m['games']} games",
                "recommendation": f"Force {map_name} in veto — exploit this weakness"
            })
        
        # If no weak maps found, check all maps and report lowest
        if not weaknesses:
            all_maps_query = """
                SELECT map_name as map, win_rate, games_played as games
                FROM v_team_map_stats
                WHERE team_name ILIKE %s AND games_played >= 1 AND map_name IS NOT NULL
                ORDER BY win_rate ASC
                LIMIT 2
            """
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(all_maps_query, (f"%{team_name}%",))
                lowest_maps = [dict(row) for row in cur.fetchall()]
            
            # Filter out null/invalid map names
            for m in lowest_maps:
                map_name = m.get('map')
                if not map_name or str(map_name).lower() in ['none', 'unknown', 'null']:
                    continue
                weaknesses.append({
                    "category": "Map Pool",
                    "severity": "LOW" if m['win_rate'] >= 45 else "MEDIUM",
                    "finding": f"Relatively weaker on {map_name} ({m['win_rate']:.1f}% WR)",
                    "details": f"Win rate of {m['win_rate']:.1f}% across {m['games']} games",
                    "recommendation": f"Target {map_name} in veto for potential edge"
                })
        
        # Check defense weakness
        defense_query = """
            SELECT 
                SUM(CASE WHEN r.defender_team_id = gc.team_id AND r.winner_team_id = gc.team_id THEN 1 ELSE 0 END) as defense_wins,
                SUM(CASE WHEN r.defender_team_id = gc.team_id THEN 1 ELSE 0 END) as defense_rounds
            FROM rounds r
            JOIN game_compositions gc ON r.game_id = gc.game_id
            WHERE gc.team_name ILIKE %s
        """
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(defense_query, (f"%{team_name}%",))
                defense_stats = cur.fetchone()
                if defense_stats and defense_stats['defense_rounds'] and defense_stats['defense_rounds'] >= 50:
                    defense_wr = round(100.0 * (defense_stats['defense_wins'] or 0) / defense_stats['defense_rounds'], 1)
                    if defense_wr < 45:
                        weaknesses.append({
                            "category": "Defense",
                            "severity": "HIGH" if defense_wr < 40 else "MEDIUM",
                            "finding": f"Weak on defense ({defense_wr}% WR)",
                            "details": f"{defense_stats['defense_wins']}/{defense_stats['defense_rounds']} defensive rounds won",
                            "recommendation": f"Run aggressive executes — they struggle to hold sites"
                        })
        except Exception:
            pass
        
        # Check attack weakness
        attack_query = """
            SELECT 
                SUM(CASE WHEN r.attacker_team_id = gc.team_id AND r.winner_team_id = gc.team_id THEN 1 ELSE 0 END) as attack_wins,
                SUM(CASE WHEN r.attacker_team_id = gc.team_id THEN 1 ELSE 0 END) as attack_rounds
            FROM rounds r
            JOIN game_compositions gc ON r.game_id = gc.game_id
            WHERE gc.team_name ILIKE %s
        """
        try:
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(attack_query, (f"%{team_name}%",))
                attack_stats = cur.fetchone()
                if attack_stats and attack_stats['attack_rounds'] and attack_stats['attack_rounds'] >= 50:
                    attack_wr = round(100.0 * (attack_stats['attack_wins'] or 0) / attack_stats['attack_rounds'], 1)
                    if attack_wr < 45:
                        weaknesses.append({
                            "category": "Attack",
                            "severity": "HIGH" if attack_wr < 40 else "MEDIUM",
                            "finding": f"Weak on attack ({attack_wr}% WR)",
                            "details": f"{attack_stats['attack_wins']}/{attack_stats['attack_rounds']} attack rounds won",
                            "recommendation": f"Play patient defense — deny them space and punish entries"
                        })
        except Exception:
            pass
        
        # Check pistol round weakness
        try:
            team_id_query = "SELECT DISTINCT team_id FROM game_compositions WHERE team_name ILIKE %s LIMIT 1"
            with self.conn.cursor() as cur:
                cur.execute(team_id_query, (f"%{team_name}%",))
                row = cur.fetchone()
                if row:
                    team_id = row[0]
                    pistol_query = """
                        SELECT SUM(pistol_wins) as wins, COUNT(*) as games
                        FROM v_pistol_performance WHERE team_id = %s
                    """
                    with self.conn.cursor(cursor_factory=RealDictCursor) as cur2:
                        cur2.execute(pistol_query, (team_id,))
                        pistol_stats = cur2.fetchone()
                        if pistol_stats and pistol_stats['games'] and pistol_stats['games'] >= 10:
                            pistol_wr = round(100.0 * (pistol_stats['wins'] or 0) / pistol_stats['games'], 1)
                            if pistol_wr < 40:
                                weaknesses.append({
                                    "category": "Pistol Rounds",
                                    "severity": "MEDIUM",
                                    "finding": f"Poor pistol conversion ({pistol_wr}% WR)",
                                    "details": f"{pistol_stats['wins']}/{pistol_stats['games']} pistol rounds won",
                                    "recommendation": f"Win pistols → build economy lead → snowball rounds"
                                })
        except Exception:
            pass
        
        return {"weaknesses": weaknesses}
    
    def get_team_pistol_stats(self, team_name: str) -> Dict[str, Any]:
        """Get pistol round performance."""
        
        # Get team_id first since v_pistol_performance only has team_id
        team_id_query = """
            SELECT DISTINCT team_id FROM game_compositions WHERE team_name ILIKE %s LIMIT 1
        """
        
        with self.conn.cursor() as cur:
            cur.execute(team_id_query, (f"%{team_name}%",))
            row = cur.fetchone()
            if not row:
                return {
                    "attack_pistol": {"win_rate": 50.0},
                    "defense_pistol": {"win_rate": 50.0},
                    "overall_pistol_win_rate": 50.0
                }
            team_id = row[0]
        
        query = """
            SELECT side, SUM(pistol_wins) as wins, COUNT(*) as games
            FROM v_pistol_performance
            WHERE team_id = %s
            GROUP BY side
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (team_id,))
            stats = [dict(row) for row in cur.fetchall()]
        
        result = {
            "attack_pistol": {"win_rate": 50.0},
            "defense_pistol": {"win_rate": 50.0},
            "overall_pistol_win_rate": 50.0
        }
        
        total_wins = 0
        total_games = 0
        
        for s in stats:
            wins = int(s['wins'] or 0)
            games = int(s['games'] or 1)
            win_rate = round(100.0 * wins / games, 1) if games > 0 else 50.0
            
            if s['side'] and 'attack' in s['side'].lower():
                result['attack_pistol'] = {"win_rate": win_rate}
            else:
                result['defense_pistol'] = {"win_rate": win_rate}
            total_wins += wins
            total_games += games
        
        if total_games > 0:
            result['overall_pistol_win_rate'] = round(100.0 * total_wins / total_games, 1)
        
        return result
    
    def get_team_round_patterns(self, team_name: str) -> Dict[str, Any]:
        """Get round win patterns."""
        
        # Get team_id first since v_round_win_types only has team_id
        team_id_query = """
            SELECT DISTINCT team_id FROM game_compositions WHERE team_name ILIKE %s LIMIT 1
        """
        
        with self.conn.cursor() as cur:
            cur.execute(team_id_query, (f"%{team_name}%",))
            row = cur.fetchone()
            if not row:
                return {"attack_patterns": [], "defense_patterns": []}
            team_id = row[0]
        
        query = """
            SELECT win_type, side, count, percentage
            FROM v_round_win_types
            WHERE team_id = %s
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
            if p.get('side') and 'attack' in p['side'].lower():
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
        
        # Get team_id first
        team_id_query = """
            SELECT DISTINCT team_id FROM game_compositions WHERE team_name ILIKE %s LIMIT 1
        """
        
        with self.conn.cursor() as cur:
            cur.execute(team_id_query, (f"%{team_name}%",))
            row = cur.fetchone()
            if not row:
                return {"weapon_usage": []}
            team_id = row[0]
        
        query = """
            SELECT weapon_name as weapon, SUM(total_kills) as kills
            FROM v_weapon_usage
            WHERE team_id = %s
            GROUP BY weapon_name
            ORDER BY kills DESC
            LIMIT 10
        """
        
        with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, (team_id,))
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
