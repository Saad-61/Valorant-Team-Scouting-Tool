"""
Simple Chat Interface for Dynamic Scouting Engine
CLI-based Q&A with AI-powered SQL generation
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dynamic_scouting_engine import DynamicScoutingEngine


def print_header():
    """Print the header."""
    print("\n" + "=" * 60)
    print("🎮 VALORANT SCOUTING ASSISTANT - AI-Powered Analysis")
    print("=" * 60)
    print("Ask any question about teams, players, maps, agents, etc.")
    print("Type 'teams' to see available teams")
    print("Type 'examples' to see example questions")
    print("Type 'sql' to show the last generated SQL")
    print("Type 'quit' to exit")
    print("=" * 60 + "\n")


def print_result(result: dict):
    """Pretty print the query result."""
    
    if result.get("error"):
        print(f"\n❌ Error: {result['error']}")
        return
    
    # Show SQL if available
    if result.get("sql"):
        print(f"\n📊 Generated SQL:")
        print("-" * 40)
        print(result["sql"][:500] + "..." if len(result["sql"]) > 500 else result["sql"])
    
    # Show results
    if result.get("results") and result["results"]["data"]:
        print(f"\n📋 Results ({result['results']['row_count']} rows):")
        print("-" * 40)
        
        # Print column headers
        columns = result["results"]["columns"]
        
        # Print data rows (limit to 10)
        for i, row in enumerate(result["results"]["data"][:10]):
            row_str = " | ".join(f"{k}: {v}" for k, v in row.items())
            print(f"  {row_str}")
        
        if result["results"]["row_count"] > 10:
            print(f"  ... and {result['results']['row_count'] - 10} more rows")
    
    # Show AI interpretation
    if result.get("interpretation"):
        print(f"\n🤖 AI Analysis:")
        print("-" * 40)
        print(result["interpretation"])


def main():
    """Main chat loop."""
    
    print_header()
    
    # Initialize engine
    engine = DynamicScoutingEngine()
    engine.connect()
    
    if not engine.is_ai_enabled():
        print("⚠️  Warning: Gemini AI not configured. Add GEMINI_API_KEY to .env file.")
        print("    Basic queries will still work, but no AI interpretation.\n")
    else:
        print("✅ Gemini AI connected - Full natural language queries enabled!\n")
    
    # Get teams
    teams = engine.get_all_teams()
    
    # Current team context
    current_team = None
    last_result = None
    
    while True:
        try:
            # Show current context
            context = f" [{current_team}]" if current_team else ""
            user_input = input(f"\n💬 You{context}: ").strip()
            
            if not user_input:
                continue
            
            # Handle commands
            if user_input.lower() == 'quit':
                print("\n👋 Goodbye!")
                break
            
            elif user_input.lower() == 'teams':
                print(f"\n📋 Available Teams ({len(teams)}):")
                for team in teams:
                    print(f"  • {team}")
                continue
            
            elif user_input.lower() == 'examples':
                print("\n📝 Example Questions:")
                for q in engine.suggest_questions(current_team):
                    print(f"  • {q}")
                continue
            
            elif user_input.lower() == 'sql':
                if last_result and last_result.get("sql"):
                    print(f"\n📊 Last SQL Query:")
                    print(last_result["sql"])
                else:
                    print("No SQL query generated yet.")
                continue
            
            elif user_input.lower().startswith('team '):
                team_name = user_input[5:].strip()
                if team_name in teams:
                    current_team = team_name
                    print(f"\n✅ Context set to: {current_team}")
                else:
                    # Find closest match
                    matches = [t for t in teams if team_name.lower() in t.lower()]
                    if matches:
                        print(f"Did you mean: {', '.join(matches)}")
                    else:
                        print(f"❌ Team '{team_name}' not found. Type 'teams' to see available teams.")
                continue
            
            elif user_input.lower() == 'clear':
                current_team = None
                print("\n🔄 Team context cleared.")
                continue
            
            # Process the question
            print("\n⏳ Analyzing... (AI query generation may take a few seconds)")
            
            result = engine.ask(user_input, current_team)
            last_result = result
            
            print_result(result)
            
        except KeyboardInterrupt:
            print("\n\n👋 Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ Error: {e}")
    
    engine.close()


if __name__ == "__main__":
    main()
