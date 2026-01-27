"""
Gemini Analyzer - Dynamic LLM-powered analysis for VALORANT scouting
Uses Google GenAI SDK with Gemini 2.5 Flash

HOW IT WORKS:
1. ScoutingEngine extracts raw data from DuckDB (ground truth)
2. Raw data is sent to Gemini in JSON format
3. Gemini analyzes the data and generates insights
4. Every response is grounded in the actual data (prevents hallucinations)

HALLUCINATION PREVENTION:
- LLM only sees real data from the database
- System prompt instructs to ONLY use provided data
- Raw data is always shown alongside AI analysis
- Numbers/stats come directly from queries, not LLM generation
"""

from google import genai
from google.genai import types
import json
import os
from typing import Dict, List, Any
from dataclasses import dataclass
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class GeminiAnalyzer:
    """
    Dynamic LLM analyzer that uses Gemini 2.5 Flash to analyze VALORANT esports data.
    
    Key principle: The LLM never makes up data - it only analyzes and explains
    the real data provided from the database.
    """
    
    # System prompt that grounds the LLM in the data
    SYSTEM_PROMPT = """You are an elite VALORANT esports analyst working for Cloud9's coaching staff. Your job is to analyze opponent teams and provide actionable scouting insights.

CRITICAL RULES (MUST FOLLOW):
1. ONLY use data provided in the JSON - never make up statistics
2. Always cite specific numbers from the data (e.g., "62.5% win rate on Pearl")
3. If data is missing or insufficient, say so - don't guess
4. Be specific and actionable - coaches need to make real decisions
5. Format responses clearly with bullet points and sections

YOUR EXPERTISE:
- Map pool analysis and veto strategies
- Agent composition meta-analysis  
- Player tendencies and targeting
- Pistol round strategies
- Economic patterns and timing
- Weakness identification and exploitation

When analyzing, consider:
- Statistical significance (sample size matters)
- Recent form vs historical performance
- Context of tournaments/opponents
- Actionable recommendations for the coaching staff"""

    MODEL_NAME = "gemini-2.5-flash"

    def __init__(self, api_key: str = None):
        """Initialize with Gemini API key."""
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        # Clean up the API key (remove spaces/quotes if any)
        if self.api_key:
            self.api_key = self.api_key.strip().strip('"').strip("'")
        
        self.client = None
        self.chat = None
        self.current_team_data = None
        self.current_team_name = None
        
        if self.api_key:
            self._configure_gemini()
    
    def _configure_gemini(self):
        """Configure the Gemini client."""
        try:
            self.client = genai.Client(api_key=self.api_key)
            print(f"✅ Gemini client configured with model: {self.MODEL_NAME}")
        except Exception as e:
            print(f"Error configuring Gemini: {e}")
            self.client = None
    
    def is_configured(self) -> bool:
        """Check if Gemini is properly configured."""
        return self.client is not None
    
    def set_team_context(self, team_name: str, scouting_data: Dict[str, Any]):
        """
        Set the current team being analyzed. This data will be used for all queries.
        This is how we prevent hallucinations - the LLM only sees real data.
        """
        self.current_team_name = team_name
        self.current_team_data = scouting_data
        
        if not self.client:
            return "Gemini not configured"
        
        # Create chat with system instruction and initial context
        try:
            # Build initial context message
            context_message = f"""I'm setting up analysis for team: {team_name}

Here is the complete scouting data extracted from our database (this is ground truth - use ONLY this data):

```json
{json.dumps(scouting_data, indent=2, default=str)}
```

Confirm you have received this data and are ready to analyze {team_name}. Briefly summarize what data you have available."""

            # Create a new chat session
            self.chat = self.client.chats.create(
                model=self.MODEL_NAME,
                config=types.GenerateContentConfig(
                    system_instruction=self.SYSTEM_PROMPT,
                    temperature=0.7,
                    max_output_tokens=8192,
                )
            )
            
            # Send initial context
            response = self.chat.send_message(context_message)
            return response.text
            
        except Exception as e:
            return f"Error initializing context: {e}"
    
    def generate_full_report(self) -> str:
        """Generate a comprehensive scouting report using Gemini."""
        
        if not self.is_configured():
            return self._fallback_report()
        
        if not self.current_team_data:
            return "No team data loaded. Please select a team first."
        
        if not self.chat:
            return "Chat session not initialized. Please load team data first."
        
        prompt = f"""Generate a comprehensive scouting report for {self.current_team_name}.

Structure your report with these sections:

## 📊 EXECUTIVE SUMMARY
- 2-3 sentence overview of the team's current state
- Key strength and key weakness

## 🗺️ MAP POOL ANALYSIS
- Analyze their map win rates from the data
- Recommend maps to pick/ban against them
- Note any maps with limited sample size

## 🎮 AGENT COMPOSITIONS
- Most common compositions they run
- Key agents and role distribution
- Flex picks and one-tricks to watch

## 👤 PLAYER BREAKDOWN
- Analyze each player's stats (KD, agent pool)
- Identify the star player(s) to shut down
- Identify weaker players to target

## 🎯 TACTICAL TENDENCIES
- Pistol round performance (attack vs defense)
- How they win rounds (eliminations vs objectives)
- Post-plant patterns

## ⚠️ EXPLOITABLE WEAKNESSES
- List specific, data-backed weaknesses
- Rank by severity (HIGH/MEDIUM/LOW)
- Provide specific counter-strategies

## ⚔️ GAME PLAN RECOMMENDATIONS
- Map veto strategy
- Agent counter-picks
- Key tactical adjustments
- Player matchups to create

Remember: Only use statistics from the data I provided. Cite specific numbers."""

        try:
            response = self.chat.send_message(prompt)
            return response.text
        except Exception as e:
            return f"Error generating report: {e}\n\n{self._fallback_report()}"
    
    def ask_question(self, question: str) -> str:
        """
        Answer a specific question about the team.
        The LLM uses the pre-loaded team data to answer.
        """
        
        if not self.is_configured():
            return self._fallback_answer(question)
        
        if not self.current_team_data:
            return "No team data loaded. Please generate a report first to load team data."
        
        if not self.chat:
            return "Chat session not initialized. Please load team data first."
        
        prompt = f"""Coach's question: {question}

Answer this question using ONLY the scouting data I provided earlier for {self.current_team_name}.
Be specific with numbers and provide actionable advice.
If the data doesn't contain enough information to answer, say so."""

        try:
            response = self.chat.send_message(prompt)
            return response.text
        except Exception as e:
            return f"Error: {e}"
    
    def get_specific_analysis(self, analysis_type: str) -> str:
        """Get a specific type of analysis."""
        
        prompts = {
            "map_veto": f"""Provide a detailed map veto strategy against {self.current_team_name}.

Based on their map statistics:
1. Which map should we DEFINITELY BAN (their best)?
2. Which map should we try to PICK (their worst)?
3. What's our ideal map pool scenario?
4. Backup plans if we can't get our preferred maps?

Use specific win rates from the data.""",

            "player_targeting": f"""Analyze which players on {self.current_team_name} we should target and which to avoid.

Consider:
1. Who is their star player? Stats and how to neutralize them?
2. Who is their weakest link? How to exploit?
3. Agent-specific vulnerabilities?
4. Suggested player matchups for our team?""",

            "pistol_strategy": f"""Deep dive into {self.current_team_name}'s pistol rounds.

Analyze:
1. Their attack pistol tendencies and win rate
2. Their defense pistol tendencies and win rate
3. Which side are they weaker on?
4. Specific strategies to exploit their pistol weaknesses?
5. What to expect if they win/lose pistol?""",

            "composition_counters": f"""Analyze {self.current_team_name}'s agent compositions and how to counter them.

Consider:
1. Their most common compositions per map
2. Key agents they rely on
3. Role distribution (duelist-heavy? controller-focused?)
4. Agent bans or counter-picks we should consider?
5. Compositions that historically do well against their style?""",

            "weakness_deep_dive": f"""Provide an exhaustive analysis of {self.current_team_name}'s weaknesses.

Go through every category:
1. Map pool weaknesses (specific maps, win rates)
2. Tactical weaknesses (pistols, post-plant, economy)
3. Player weaknesses (underperformers, limited agent pools)
4. Compositional weaknesses (role gaps, inflexibility)
5. Mental/form weaknesses (recent losses, pressure situations)

Rank each weakness and provide exploitation strategies."""
        }
        
        if analysis_type not in prompts:
            return f"Unknown analysis type: {analysis_type}"
        
        if not self.is_configured():
            return "Gemini not configured. Please add API key."
        
        if not self.chat:
            return "Chat session not initialized. Please load team data first."
        
        try:
            response = self.chat.send_message(prompts[analysis_type])
            return response.text
        except Exception as e:
            return f"Error: {e}"
    
    def _fallback_report(self) -> str:
        """Generate a basic report when Gemini is not available."""
        if not self.current_team_data:
            return "No data available."
        
        data = self.current_team_data
        overview = data.get('overview', {})
        weaknesses = data.get('weaknesses', {})
        
        report = f"""# Scouting Report: {self.current_team_name}

⚠️ **Note:** Gemini API not configured. Showing raw data summary.

## Overview
- **Record:** {overview.get('series_record', 'N/A')} ({overview.get('win_rate', 0)}% win rate)

## Map Stats
"""
        for m in overview.get('map_stats', [])[:5]:
            report += f"- {m['map'].title()}: {m['win_rate']}% WR ({m['games']} games)\n"
        
        report += "\n## Weaknesses\n"
        for w in weaknesses.get('weaknesses', []):
            report += f"- **{w['severity']}** - {w['category']}: {w['finding']}\n"
        
        report += "\n\n*For full AI analysis, configure Gemini API key.*"
        return report
    
    def _fallback_answer(self, question: str) -> str:
        """Basic answer when Gemini is not available."""
        return f"Gemini API not configured. Cannot answer: '{question}'\n\nPlease add your Gemini API key to enable AI-powered analysis."


@dataclass
class ChatMessage:
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = None
    
    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()


class ConversationManager:
    """Manages the chat conversation history."""
    
    def __init__(self):
        self.messages: List[ChatMessage] = []
        self.team_name: str = None
    
    def add_message(self, role: str, content: str):
        """Add a message to the conversation."""
        self.messages.append(ChatMessage(role=role, content=content))
    
    def get_history(self) -> List[Dict]:
        """Get conversation history as list of dicts."""
        return [{"role": m.role, "content": m.content, "time": m.timestamp.strftime("%H:%M")} 
                for m in self.messages]
    
    def clear(self):
        """Clear conversation history."""
        self.messages = []
    
    def set_team(self, team_name: str):
        """Set the current team and clear history."""
        self.team_name = team_name
        self.clear()


# Quick test
if __name__ == "__main__":
    print("Testing Gemini 2.5 Flash connection...")
    analyzer = GeminiAnalyzer()
    print(f"Gemini configured: {analyzer.is_configured()}")
    
    if analyzer.is_configured():
        # Quick test
        try:
            response = analyzer.client.models.generate_content(
                model=analyzer.MODEL_NAME,
                contents="Say 'Hello Cloud9!' in one line."
            )
            print(f"Test response: {response.text}")
        except Exception as e:
            print(f"Test failed: {e}")
    else:
        print("\nTo use Gemini, set the GEMINI_API_KEY in .env file:")
        print("  GEMINI_API_KEY=your_key_here")
        print("\nGet a free key at: https://aistudio.google.com/app/apikey")
