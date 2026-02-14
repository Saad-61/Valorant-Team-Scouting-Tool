"""
Report Generator - Uses Groq API to generate scouting reports
Converts raw data into actionable narrative insights
"""

from groq import Groq
import json
from typing import Dict, Any, Optional, List
import os
from dotenv import load_dotenv

load_dotenv()


class ReportGenerator:
    """Generate scouting reports using Groq API."""
    
    MODEL_NAME = "llama-3.3-70b-versatile"  # Groq's best model
    
    def __init__(self, api_key: str = None):
        """Initialize with Groq API key."""
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        if self.api_key:
            self.api_key = self.api_key.strip().strip('"').strip("'")
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None
    
    def is_configured(self) -> bool:
        """Check if API is configured."""
        return self.client is not None
    
    def generate_scouting_report(self, scouting_data: Dict[str, Any], opponent_name: str, chat_insights: List[Dict] = None) -> str:
        """Generate a full scouting report from raw data and optional chat insights.
        
        Args:
            scouting_data: Raw statistical data from database
            opponent_name: Team name
            chat_insights: Optional list of Q&A insights from chat, format:
                [{"question": "...", "answer": "...", "timestamp": "..."}, ...]
        """
        
        if not self.is_configured():
            return self._generate_fallback_report(scouting_data, opponent_name, chat_insights)
        
        prompt = self._build_prompt(scouting_data, opponent_name, chat_insights)
        
        try:
            response = self.client.chat.completions.create(
                model=self.MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=8192
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Groq API error: {e}")
            return self._generate_fallback_report(scouting_data, opponent_name, chat_insights)
    
    def _build_prompt(self, data: Dict[str, Any], opponent: str, chat_insights: List[Dict] = None) -> str:
        """Build the prompt for Gemini."""
        
        # Add chat insights section if available
        chat_context = ""
        if chat_insights and len(chat_insights) > 0:
            chat_context = "\n\n### AI Assistant Insights (from previous analysis)\n"
            for insight in chat_insights[-10:]:  # Last 10 Q&As
                chat_context += f"\n**Q: {insight.get('question')}**\n"
                chat_context += f"A: {insight.get('answer', insight.get('interpretation', 'N/A'))}\n"
        
        return f"""You are a professional VALORANT esports analyst creating a scouting report for Cloud9's coaching staff.

Generate a comprehensive, actionable scouting report for the opponent team: **{opponent}**

Use the following data to create your analysis. Be specific with numbers and percentages. Focus on actionable insights.

## RAW DATA:

### Team Overview
{json.dumps(data.get('overview', {}), indent=2, default=str)}

### Team Compositions
{json.dumps(data.get('compositions', {}), indent=2, default=str)}

### Pistol Round Performance
{json.dumps(data.get('pistol_rounds', {}), indent=2, default=str)}

### Player Statistics
{json.dumps(data.get('players', {}), indent=2, default=str)}

### Round Win Patterns
{json.dumps(data.get('round_patterns', {}), indent=2, default=str)}

### Weapon Economy
{json.dumps(data.get('weapon_economy', {}), indent=2, default=str)}

### Team Weaknesses Analysis
{json.dumps(data.get('weaknesses', {}), indent=2, default=str)}
{chat_context}

---

## REPORT FORMAT

Generate the scouting report with these sections:

### 📊 TEAM OVERVIEW
- Recent form and series record
- Best and worst maps (with win rates)
- Overall strength assessment

### 🎯 COMMON STRATEGIES
- Attack-side tendencies (pistol rounds, preferred executes)
- Defense-side tendencies (setups, rotations)
- Post-plant behavior (conversion rates)

### 👤 KEY PLAYER TENDENCIES
- Star players to watch (highest KD)
- Player agent pools and comfort picks
- Potential weak links

### 🎮 AGENT COMPOSITIONS
- Most played compositions per map
- Role distribution preferences
- Flex picks and pocket picks

### ⚠️ WEAKNESSES & EXPLOITS (CRITICAL SECTION)
- List ALL identified weaknesses from the data
- Rate severity (HIGH/MEDIUM/LOW)
- Specific recommendations for each weakness
- This should be the most detailed section

### ⚔️ HOW TO WIN (Counter-Strategy Recommendations)
- Exploitable weaknesses based on data
- Map veto suggestions
- Agent counter-picks
- Tactical adjustments to make

Be concise but thorough. Use bullet points. Include specific percentages and statistics to back up every claim.

IMPORTANT: If AI Assistant Insights are provided above, incorporate those findings into relevant sections of the report.
"""
    
    def _generate_fallback_report(self, data: Dict[str, Any], opponent: str, chat_insights: List[Dict] = None) -> str:
        """Generate a basic report without LLM when API is not available."""
        
        overview = data.get('overview', {})
        compositions = data.get('compositions', {})
        pistol = data.get('pistol_rounds', {})
        players = data.get('players', {})
        weapons = data.get('weapon_economy', {})
        weaknesses = data.get('weaknesses', {})
        
        report = f"""# 📋 SCOUTING REPORT: {opponent.upper()}

---

## 📊 TEAM OVERVIEW

**Recent Form:** {overview.get('series_record', 'N/A')} ({overview.get('win_rate', 0)}% win rate)

**Recent Matches:**
"""
        for match in overview.get('recent_series', [])[:5]:
            report += f"- vs {match['opponent']}: {match['result']} ({match['score']}) - {match['tournament']}\n"
        
        report += "\n**Map Performance:**\n"
        for m in overview.get('map_stats', [])[:5]:
            report += f"- {m['map'].title()}: {m['win_rate']}% WR ({m['wins']}/{m['games']} games), Avg Round Diff: {m['avg_round_diff']:+.1f}\n"
        
        report += f"""
---

## 🎯 PISTOL ROUND TENDENCIES

**Attack Pistol:** {pistol.get('attack_pistol', {}).get('win_rate', 0)}% win rate ({pistol.get('attack_pistol', {}).get('wins', 0)}/{pistol.get('attack_pistol', {}).get('total', 0)})
**Defense Pistol:** {pistol.get('defense_pistol', {}).get('win_rate', 0)}% win rate ({pistol.get('defense_pistol', {}).get('wins', 0)}/{pistol.get('defense_pistol', {}).get('total', 0)})
**Overall Pistol:** {pistol.get('overall_pistol_win_rate', 0)}%

---

## 👤 PLAYER STATISTICS

"""
        for p in players.get('players', [])[:5]:
            report += f"**{p['name']}** - KD: {p['kd_ratio']}, KDA: {p['kda']}\n"
            report += f"  - Stats: {p['kills']}K / {p['deaths']}D / {p['assists']}A over {p['games']} games\n"
            if p.get('agent_pool'):
                agents = ", ".join([f"{a['agent'].title()} ({a['games']})" for a in p['agent_pool'][:3]])
                report += f"  - Agent Pool: {agents}\n"
            report += "\n"
        
        report += "---\n\n## 🎮 AGENT COMPOSITIONS\n\n"
        
        for map_name, comps in compositions.get('compositions_by_map', {}).items():
            report += f"**{map_name.title()}:**\n"
            for c in comps[:2]:
                report += f"- {c['agents']} ({c['pick_rate']}%, played {c['times_played']}x)\n"
            report += "\n"
        
        report += "**Overall Agent Picks:**\n"
        for a in compositions.get('agent_picks', [])[:8]:
            report += f"- {a['agent'].title()} ({a['role']}): {a['pick_rate']}% pick rate\n"
        
        report += f"""
---

## 🔫 WEAPON PREFERENCES

"""
        for w in weapons.get('weapon_usage', [])[:5]:
            report += f"- {w['weapon'].title()}: {w['kills']} kills across {w['games']} games\n"
        
        # WEAKNESSES SECTION
        report += """
---

## ⚠️ WEAKNESSES & EXPLOITS

"""
        weakness_list = weaknesses.get('weaknesses', [])
        if weakness_list:
            report += f"**Summary:** {weaknesses.get('summary', 'Analysis complete')}\n\n"
            
            for severity in ['HIGH', 'MEDIUM', 'LOW']:
                severity_weaknesses = [w for w in weakness_list if w['severity'] == severity]
                if severity_weaknesses:
                    emoji = {'HIGH': '🔴', 'MEDIUM': '🟡', 'LOW': '🟢'}[severity]
                    report += f"### {emoji} {severity} Priority\n"
                    for w in severity_weaknesses:
                        report += f"- **{w['category']}**: {w['finding']}\n"
                        if w.get('recommendation'):
                            report += f"  - *Recommendation:* {w['recommendation']}\n"
                    report += "\n"
        else:
            report += "*No significant weaknesses identified - this is a well-rounded team.*\n"
        
        report += """
---

## ⚔️ HOW TO WIN

**⚠️ Note:** For detailed counter-strategy recommendations, please configure a Gemini API key.

**Basic Recommendations based on data:**
"""
        map_stats = overview.get('map_stats', [])
        if map_stats:
            best_map = max(map_stats, key=lambda x: x['win_rate'])
            worst_map = min(map_stats, key=lambda x: x['win_rate'])
            report += f"- **BAN** {best_map['map'].title()} ({best_map['win_rate']}% WR) - their best map\n"
            report += f"- **PICK** {worst_map['map'].title()} ({worst_map['win_rate']}% WR) - their worst map\n"
        
        attack_pistol = pistol.get('attack_pistol', {}).get('win_rate', 50)
        defense_pistol = pistol.get('defense_pistol', {}).get('win_rate', 50)
        if attack_pistol > defense_pistol + 10:
            report += f"- Focus on winning **defense pistols** - they're weaker on attack pistol ({attack_pistol}% vs {defense_pistol}%)\n"
        elif defense_pistol > attack_pistol + 10:
            report += f"- Focus on winning **attack pistols** - they're weaker on defense pistol ({defense_pistol}% vs {attack_pistol}%)\n"
        
        # Add chat insights if available
        if chat_insights and len(chat_insights) > 0:
            report += """
---

## 💬 AI ASSISTANT INSIGHTS

Based on previous analysis and queries:

"""
            for insight in chat_insights[-5:]:  # Last 5 Q&As
                report += f"**Q: {insight.get('question')}**\n"
                report += f"{insight.get('answer', insight.get('interpretation', 'N/A'))}\n\n"
        
            report += f"- Focus on winning **attack pistols** - they're weaker on defense pistol ({defense_pistol}% vs {attack_pistol}%)\n"
        
        report += "\n---\n*Report generated by Cloud9 Scouting Tool*"
        
        return report
    
    def generate_quick_summary(self, scouting_data: Dict[str, Any], opponent_name: str) -> str:
        """Generate a quick 1-paragraph summary."""
        
        if not self.is_configured():
            overview = scouting_data.get('overview', {})
            return f"{opponent_name} has a {overview.get('series_record', 'N/A')} record ({overview.get('win_rate', 0)}% WR) in recent matches."
        
        prompt = f"""In 2-3 sentences, summarize this VALORANT team's current form and key characteristics:

Team: {opponent_name}
Data: {json.dumps(scouting_data.get('overview', {}), default=str)}

Be specific with numbers. Focus on win rate, best maps, and recent form."""
        
        try:
            response = self.client.chat.completions.create(
                model=self.MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=200
            )
            return response.choices[0].message.content
        except Exception as e:
            overview = scouting_data.get('overview', {})
            return f"{opponent_name} has a {overview.get('series_record', 'N/A')} record ({overview.get('win_rate', 0)}% WR) in recent matches."
    
    def chat_about_team(self, question: str, team_data: Dict[str, Any], team_name: str, chat_history: list = None) -> str:
        """Answer follow-up questions about a team using the scouting data."""
        
        if not self.is_configured():
            return self._fallback_chat_response(question, team_data, team_name)
        
        history_context = ""
        if chat_history:
            history_context = "\n\nPrevious conversation:\n"
            for msg in chat_history[-5:]:
                history_context += f"User: {msg.get('user', '')}\nAssistant: {msg.get('assistant', '')}\n"
        
        prompt = f"""You are a VALORANT esports analyst assistant. Answer the user's question about {team_name} using ONLY the data provided below.

Be specific with numbers and percentages. If the data doesn't contain information to answer the question, say so.

## TEAM DATA:
{json.dumps(team_data, indent=2, default=str)}
{history_context}

## USER QUESTION:
{question}

Provide a concise, data-backed answer. Use bullet points for clarity when listing multiple items."""

        try:
            response = self.client.chat.completions.create(
                model=self.MODEL_NAME,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=2048
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Groq API error: {e}")
            return self._fallback_chat_response(question, team_data, team_name)
    
    def _fallback_chat_response(self, question: str, team_data: Dict[str, Any], team_name: str) -> str:
        """Generate a basic response without LLM."""
        
        question_lower = question.lower()
        
        if any(word in question_lower for word in ['weakness', 'weak', 'exploit', 'bad']):
            weaknesses = team_data.get('weaknesses', {}).get('weaknesses', [])
            if weaknesses:
                response = f"**{team_name}'s Weaknesses:**\n\n"
                for w in weaknesses:
                    response += f"- **{w['severity']}** - {w['category']}: {w['finding']}\n"
                return response
            return f"No significant weaknesses identified for {team_name}."
        
        elif any(word in question_lower for word in ['best map', 'good map', 'strongest map']):
            map_stats = team_data.get('overview', {}).get('map_stats', [])
            if map_stats:
                best = max(map_stats, key=lambda x: x['win_rate'])
                return f"**{team_name}'s best map is {best['map'].title()}** with a {best['win_rate']}% win rate ({best['wins']}/{best['games']} games)."
            return "No map data available."
        
        elif any(word in question_lower for word in ['worst map', 'bad map', 'weakest map']):
            map_stats = team_data.get('overview', {}).get('map_stats', [])
            if map_stats:
                worst = min(map_stats, key=lambda x: x['win_rate'])
                return f"**{team_name}'s worst map is {worst['map'].title()}** with a {worst['win_rate']}% win rate ({worst['wins']}/{worst['games']} games). Consider forcing this map in veto."
            return "No map data available."
        
        elif any(word in question_lower for word in ['best player', 'star', 'carry', 'top player']):
            players = team_data.get('players', {}).get('players', [])
            if players:
                best = max(players, key=lambda x: x.get('kd_ratio', 0))
                agents = ", ".join([a['agent'].title() for a in best.get('agent_pool', [])[:3]])
                return f"**{team_name}'s star player is {best['name']}** with a {best['kd_ratio']} KD ({best['kills']}K/{best['deaths']}D). Main agents: {agents}"
            return "No player data available."
        
        elif any(word in question_lower for word in ['pistol', 'pistol round']):
            pistol = team_data.get('pistol_rounds', {})
            attack = pistol.get('attack_pistol', {}).get('win_rate', 0)
            defense = pistol.get('defense_pistol', {}).get('win_rate', 0)
            return f"**{team_name}'s Pistol Performance:**\n- Attack pistol: {attack}%\n- Defense pistol: {defense}%\n- Overall: {pistol.get('overall_pistol_win_rate', 0)}%"
        
        elif any(word in question_lower for word in ['agent', 'comp', 'composition', 'pick']):
            comps = team_data.get('compositions', {})
            agents = comps.get('agent_picks', [])[:5]
            if agents:
                response = f"**{team_name}'s Top Agents:**\n"
                for a in agents:
                    response += f"- {a['agent'].title()} ({a['role']}): {a['pick_rate']}% pick rate\n"
                return response
            return "No composition data available."
        
        elif any(word in question_lower for word in ['record', 'form', 'recent', 'win']):
            overview = team_data.get('overview', {})
            response = f"**{team_name}'s Recent Form:** {overview.get('series_record', 'N/A')} ({overview.get('win_rate', 0)}% WR)\n\n"
            for match in overview.get('recent_series', [])[:5]:
                response += f"- vs {match['opponent']}: {match['result']} ({match['score']})\n"
            return response
        
        else:
            return f"To answer specific questions about {team_name}, please configure a Gemini API key. Available topics: weaknesses, maps, players, pistol rounds, compositions, recent form."


# Test
if __name__ == "__main__":
    generator = ReportGenerator()
    print(f"Gemini configured: {generator.is_configured()}")
