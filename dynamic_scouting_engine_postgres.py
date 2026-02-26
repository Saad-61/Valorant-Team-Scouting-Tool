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

#### 4. player_round_stats - Per-player stats (NO team_name column!)
- id (TEXT, PK)
- game_id, series_id (TEXT/BIGINT)
- round_number (INTEGER)
- player_id, player_name (TEXT)
- team_id (TEXT) - JOIN with game_compositions to filter by team_name!
- agent, agent_role (TEXT)
- kills, deaths, assists, headshots (INTEGER)
- alive_at_end (BOOLEAN)

#### 5. weapon_kills - Kill events
- id (SERIAL, PK)
- round_id, game_id (BIGINT)
- killer_id, killer_name, victim_id, victim_name (TEXT)
- weapon, damage_type (TEXT)

#### 6. game_compositions - Team compositions (USE THIS to get team_name from team_id)
- id (SERIAL, PK)
- game_id (BIGINT)
- team_id, team_name (TEXT)
- player_id, player_name (TEXT)
- agent, role (TEXT)

### Key Views (USE CORRECT COLUMN NAMES!):

#### v_team_map_stats - Team win rates per map
- team_id, team_name (TEXT)
- map_name (TEXT) -- NOT "map"!
- games_played (INTEGER) -- NOT "games"!
- wins, losses (INTEGER)
- win_rate (FLOAT)
- round_diff_ratio (FLOAT)

#### v_team_agent_picks - Agent pick rates by team
- team_id, team_name (TEXT)
- map_name (TEXT)
- agent, agent_role (TEXT)
- times_picked, unique_players (INTEGER)

#### v_player_agent_pool - Player agent pools with KD
- player_id, player_name (TEXT)
- agent, agent_role (TEXT)
- games_played, total_kills, total_deaths (INTEGER)
- kd_ratio (FLOAT)

#### v_pistol_performance - Pistol round stats (NO team_name!)
- team_id (TEXT)
- map_name (TEXT)
- side (TEXT) -- 'Attack' or 'Defense'
- pistol_wins (INTEGER)

#### v_weapon_usage - Weapon kill stats (NO team_name!)
- team_id, map_name (TEXT)
- weapon_name (TEXT) -- NOT "weapon"!
- total_kills (INTEGER)

#### v_round_win_types - Win condition percentages (NO team_name!)
- team_id, map_name, side, win_type (TEXT)
- count (INTEGER)
- percentage (FLOAT)

### Common Values:
- Agents: jett, raze, reyna (Duelists); omen, brimstone, astra (Controllers); sage, cypher, killjoy (Sentinels); sova, breach, skye (Initiators)
- Maps: ascent, bind, breeze, haven, icebox, lotus, pearl, split, sunset
- Win types: opponentEliminated, bombExploded, bombDefused, timeExpired
- Side values in views: 'Attack', 'Defense'
- Win types: opponentEliminated, bombExploded, bombDefused, timeExpired
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
SYSTEM_CONTEXT = """You are the VCT Analytics AI Assistant, a specialized esports analyst tool for VALORANT Champions Tour data.

ABOUT THIS TOOL:
- This is a scouting dashboard for professional VALORANT esports teams
- It contains match data, player statistics, agent compositions, and team performance metrics
- Built for Cloud9's coaching staff to prepare for competitive matches
- Data includes: series results, map stats, round-by-round data, player performance, agent picks

WHAT YOU CAN HELP WITH:
- Team weaknesses and strengths analysis
- Map pool analysis (win rates, pick rates by team)
- Player statistics (KD, ACS, agent pools)
- Agent composition analysis
- Head-to-head comparisons between teams
- Pistol round performance
- Round win patterns (eliminations, spike plants, defuses)
- Weapon usage statistics

WHAT YOU CANNOT DO:
- Live match analysis (data is historical)
- Predictions or betting advice
- Non-VALORANT esports data
- General web searches
- Personal opinions on teams

AVAILABLE TEAMS IN DATABASE (examples):
LOUD, Sentinels, Cloud9, NRG, 100 Thieves, FUT Esports, Fnatic, Team Liquid, G2 Esports, Paper Rex, DRX, T1, Gen.G, MIBR, Leviatán, KRÜ Esports, FURIA, and more.

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
9. CRITICAL: player_round_stats has NO team_name column! JOIN with game_compositions to filter by team_name

Example queries:
- Team weaknesses: SELECT map_name, win_rate FROM v_team_map_stats WHERE team_name ILIKE '%G2%' AND win_rate < 50
- Top players for team: SELECT prs.player_name, SUM(prs.kills) as kills FROM player_round_stats prs JOIN game_compositions gc ON prs.game_id = gc.game_id AND prs.player_name = gc.player_name WHERE gc.team_name ILIKE '%G2%' GROUP BY prs.player_name ORDER BY kills DESC LIMIT 10
- Agent picks: SELECT agent, times_picked FROM v_team_agent_picks WHERE team_name ILIKE '%LOUD%' ORDER BY times_picked DESC

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

You are analyzing data for a user question. Provide a helpful, conversational response.

USER QUESTION: {question}
TEAM FOCUS: {team_name or 'General'}

DATABASE RESULTS:
{json.dumps(display_results, indent=2, default=str)[:3000]}

RESPONSE GUIDELINES:
1. Start with a direct answer to their question
2. Highlight the most important statistics
3. Explain what the numbers mean tactically
4. Give 1-2 actionable recommendations if relevant
5. Keep response focused and under 400 words
6. Use plain text - no markdown symbols like *, #, or -
7. Write conversationally, as an esports analyst would

If the data seems incomplete or unusual, acknowledge it honestly and suggest how they might refine their query."""

        try:
            global LAST_API_CALL
            elapsed = time.time() - LAST_API_CALL
            if elapsed < MIN_API_INTERVAL:
                time.sleep(MIN_API_INTERVAL - elapsed)
            
            response = self.client.chat.completions.create(
                model=self.MODEL_NAME,
                messages=[
                    {"role": "system", "content": "You are a professional VALORANT esports analyst. Be concise, insightful, and actionable."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=2048,
                temperature=0.4
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
    
    def _interpret_weaknesses(self, data: Dict, team_name: str) -> str:
        """Generate natural language interpretation of team weaknesses."""
        weaknesses = data.get("weaknesses", [])
        
        if not weaknesses:
            return f"Based on the available data, {team_name} doesn't have any significant weaknesses that stand out. They appear to be performing consistently across maps and game phases. Consider analyzing their recent form or specific player matchups for potential opportunities."
        
        response = f"Analysis of {team_name}'s weaknesses:\n\n"
        
        for w in weaknesses:
            response += f"• {w['category']}: {w['finding']}\n"
            response += f"  Details: {w['details']}\n"
            response += f"  Recommendation: {w['recommendation']}\n\n"
        
        return response
    
    def _interpret_map_stats(self, map_stats: List[Dict], team_name: str) -> str:
        """Generate natural language interpretation of map statistics."""
        if not map_stats:
            return f"No map statistics found for {team_name} in the database. They may not have played enough recorded matches."
        
        response = f"Map pool analysis for {team_name}:\n\n"
        
        for m in map_stats:
            map_name = m.get('map') or m.get('map_name', 'Unknown')
            win_rate = m.get('win_rate', 0)
            games = m.get('games') or m.get('games_played', 0)
            
            status = "strong" if win_rate >= 55 else "average" if win_rate >= 45 else "weak"
            response += f"• {map_name}: {win_rate}% win rate over {games} games ({status})\n"
        
        # Add summary
        strong_maps = [m for m in map_stats if m.get('win_rate', 0) >= 55]
        weak_maps = [m for m in map_stats if m.get('win_rate', 0) < 45]
        
        if strong_maps:
            response += f"\nStrong maps to consider banning: {', '.join([m.get('map') or m.get('map_name') for m in strong_maps])}"
        if weak_maps:
            response += f"\nWeak maps to exploit: {', '.join([m.get('map') or m.get('map_name') for m in weak_maps])}"
        
        return response
    
    def _interpret_player_stats(self, players: List[Dict], team_name: str) -> str:
        """Generate natural language interpretation of player statistics."""
        if not players:
            return f"No player statistics found for {team_name} in the database."
        
        response = f"Player roster analysis for {team_name}:\n\n"
        
        for p in players:
            name = p.get('player_name', 'Unknown')
            games = p.get('games', 0)
            kills = p.get('kills', 0)
            deaths = p.get('deaths', 0)
            kd = p.get('kd_ratio', 0)
            
            role_desc = "star player" if kd and kd > 1.2 else "solid performer" if kd and kd > 1.0 else "support player"
            response += f"• {name}: {kills} kills / {deaths} deaths ({kd} K/D) over {games} games - {role_desc}\n"
            
            # Add agent pool if available
            agent_pool = p.get('agent_pool', [])
            if agent_pool:
                agents = [a.get('agent', '') for a in agent_pool[:3]]
                response += f"  Agent pool: {', '.join(agents)}\n"
        
        return response
    
    def _rollback_transaction(self):
        """Rollback any failed transaction to allow subsequent queries."""
        try:
            if self.conn:
                self.conn.rollback()
        except Exception:
            pass
    
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
        
        # Step 2: Check for common query patterns and use built-in methods
        # This is faster and more reliable than AI-generated SQL for common cases
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
            return {
                "question": question,
                "team": team_name,
                "sql": sql_result.get("sql"),
                "error": sql_result["error"],
                "results": None,
                "interpretation": f"I couldn't generate a query for that question. Try being more specific, like 'What are [team name]'s weaknesses?' or 'Show me [team]'s map stats'",
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
        
        # Map stats
        map_query = """
            SELECT map_name as map, games_played as games, wins, win_rate, round_diff_ratio as avg_round_diff
            FROM v_team_map_stats
            WHERE team_name ILIKE %s
            ORDER BY games_played DESC
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
            SELECT map_name as map, win_rate, games_played as games
            FROM v_team_map_stats
            WHERE team_name ILIKE %s AND win_rate < 45 AND games_played >= 2
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
                "details": f"Win rate of {m['win_rate']:.1f}% across {m['games']} games",
                "recommendation": f"Consider banning {m['map']} or prepare specific counter-strategies"
            })
        
        # If no weak maps found, check all maps and report lowest
        if not weaknesses:
            all_maps_query = """
                SELECT map_name as map, win_rate, games_played as games
                FROM v_team_map_stats
                WHERE team_name ILIKE %s AND games_played >= 1
                ORDER BY win_rate ASC
                LIMIT 2
            """
            with self.conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(all_maps_query, (f"%{team_name}%",))
                lowest_maps = [dict(row) for row in cur.fetchall()]
            
            for m in lowest_maps:
                weaknesses.append({
                    "category": "Map Pool",
                    "severity": "LOW" if m['win_rate'] >= 45 else "MEDIUM",
                    "finding": f"Relatively weaker on {m['map']}",
                    "details": f"Win rate of {m['win_rate']:.1f}% across {m['games']} games",
                    "recommendation": f"Target {m['map']} if looking for advantages"
                })
        
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
