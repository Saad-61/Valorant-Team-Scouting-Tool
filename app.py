"""
VALORANT Scouting Report Generator
Cloud9 Hackathon - January 2026

A Streamlit web app that generates automated scouting reports
for VALORANT esports teams using historical match data.
"""

import streamlit as st
import pandas as pd
from dynamic_scouting_engine import ScoutingEngine
from report_generator import ReportGenerator
import json

# Page config
st.set_page_config(
    page_title="VALORANT Scouting Report Generator",
    page_icon="🎮",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #ff4655;
        text-align: center;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1rem;
        color: #888;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 1rem;
        border-radius: 10px;
        border-left: 4px solid #ff4655;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
    }
    .stTabs [data-baseweb="tab"] {
        background-color: #1a1a2e;
        border-radius: 4px;
        padding: 10px 20px;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'scouting_data' not in st.session_state:
    st.session_state.scouting_data = None
if 'report' not in st.session_state:
    st.session_state.report = None
if 'chat_history' not in st.session_state:
    st.session_state.chat_history = []
if 'selected_team' not in st.session_state:
    st.session_state.selected_team = None


def main():
    # Header
    st.markdown('<p class="main-header">🎮 VALORANT Scouting Report Generator</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Cloud9 Hackathon 2026 - Automated Pre-Game Analysis</p>', unsafe_allow_html=True)
    
    # Sidebar
    with st.sidebar:
        st.image("https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Valorant_logo_-_pink_color_version.svg/512px-Valorant_logo_-_pink_color_version.svg.png", width=150)
        st.markdown("---")
        
        st.header("⚙️ Configuration")
        
        # API Key input
        api_key = st.text_input(
            "Gemini API Key (Optional)",
            type="password",
            help="Get a free key at https://makersuite.google.com/app/apikey"
        )
        
        if api_key:
            st.success("✅ API Key configured")
        else:
            st.info("💡 Without API key, basic reports will be generated")
        
        st.markdown("---")
        st.markdown("""
        ### 📖 How to Use
        1. Select opponent team
        2. Choose number of matches to analyze
        3. Click "Generate Report"
        4. Review insights and counter-strategies
        
        ### 🔗 Data Source
        - VCT Americas 2024-2025
        - 196 series, 6,878 rounds
        - 20+ professional teams
        """)
    
    # Main content
    try:
        engine = ScoutingEngine()
        engine.connect()
        teams = engine.get_all_teams()
        
        # Team selection
        col1, col2, col3 = st.columns([2, 1, 1])
        
        with col1:
            selected_team = st.selectbox(
                "🎯 Select Opponent Team",
                options=teams,
                index=teams.index("Sentinels") if "Sentinels" in teams else 0
            )
        
        with col2:
            last_n_matches = st.slider(
                "📊 Matches to Analyze",
                min_value=3,
                max_value=20,
                value=10,
                help="Number of recent series to include in analysis"
            )
        
        with col3:
            st.markdown("<br>", unsafe_allow_html=True)
            generate_btn = st.button("🔍 Generate Report", type="primary", use_container_width=False)
        
        st.markdown("---")
        
        # Generate report
        if generate_btn:
            with st.spinner(f"🔄 Analyzing {selected_team}'s recent matches..."):
                # Get scouting data
                st.session_state.scouting_data = engine.generate_full_scouting_data(selected_team, last_n_matches)
                
                # Generate report
                generator = ReportGenerator(api_key=api_key if api_key else None)
                st.session_state.report = generator.generate_scouting_report(
                    st.session_state.scouting_data, 
                    selected_team
                )
            
            st.success(f"✅ Scouting report generated for {selected_team}!")
            st.session_state.selected_team = selected_team
            st.session_state.chat_history = []  # Reset chat for new team
        
        # Display results
        if st.session_state.scouting_data:
            data = st.session_state.scouting_data
            
            # Quick stats row
            overview = data.get('overview', {})
            pistol = data.get('pistol_rounds', {})
            
            st.subheader(f"📈 Quick Stats: {selected_team}")
            
            col1, col2, col3, col4, col5 = st.columns(5)
            
            with col1:
                st.metric(
                    "Series Record",
                    overview.get('series_record', 'N/A'),
                    f"{overview.get('win_rate', 0)}% WR"
                )
            
            with col2:
                st.metric(
                    "Pistol Win Rate",
                    f"{pistol.get('overall_pistol_win_rate', 0)}%",
                    None
                )
            
            with col3:
                attack_wr = pistol.get('attack_pistol', {}).get('win_rate', 0)
                st.metric("Attack Pistol", f"{attack_wr}%")
            
            with col4:
                defense_wr = pistol.get('defense_pistol', {}).get('win_rate', 0)
                st.metric("Defense Pistol", f"{defense_wr}%")
            
            with col5:
                players = data.get('players', {}).get('players', [])
                if players:
                    top_player = max(players, key=lambda x: x.get('kd_ratio', 0))
                    st.metric("Top Player", top_player['name'], f"KD: {top_player['kd_ratio']}")
            
            st.markdown("---")
            
            # Tabs for detailed view
            tabs = st.tabs(["📋 Full Report", "⚠️ Weaknesses", "💬 Ask Questions", "🗺️ Map Stats", "👥 Players", "🎮 Compositions", "📊 Raw Data"])
            
            with tabs[0]:
                if st.session_state.report:
                    st.markdown(st.session_state.report)
                    
                    # Download button
                    st.download_button(
                        label="📥 Download Report",
                        data=st.session_state.report,
                        file_name=f"scouting_report_{selected_team.lower().replace(' ', '_')}.md",
                        mime="text/markdown"
                    )
            
            with tabs[1]:
                st.subheader(f"⚠️ Weaknesses Analysis: {selected_team}")
                weaknesses_data = data.get('weaknesses', {})
                weakness_list = weaknesses_data.get('weaknesses', [])
                
                # Summary
                if weakness_list:
                    summary = weaknesses_data.get('summary', '')
                    if 'CRITICAL' in summary:
                        st.error(f"🔴 {summary}")
                    else:
                        st.warning(f"⚠️ {summary}")
                    
                    st.markdown("---")
                    
                    # Display by severity
                    for severity in ['HIGH', 'MEDIUM', 'LOW']:
                        severity_weaknesses = [w for w in weakness_list if w['severity'] == severity]
                        if severity_weaknesses:
                            if severity == 'HIGH':
                                st.markdown("### 🔴 HIGH Severity (Exploit Immediately)")
                            elif severity == 'MEDIUM':
                                st.markdown("### 🟡 MEDIUM Severity (Good Opportunities)")
                            else:
                                st.markdown("### 🟢 LOW Severity (Minor Advantages)")
                            
                            for w in severity_weaknesses:
                                with st.expander(f"**{w['category']}:** {w['finding']}", expanded=(severity == 'HIGH')):
                                    st.markdown("**Details:**")
                                    for detail in w.get('details', []):
                                        st.markdown(f"- {detail}")
                                    st.success(f"💡 **Recommendation:** {w['recommendation']}")
                else:
                    st.success("✅ No significant weaknesses identified - this is a well-rounded team!")
                    st.info("Consider focusing on your own strengths rather than exploiting opponent weaknesses.")
            
            with tabs[2]:
                st.subheader(f"💬 Ask Questions About {selected_team}")
                st.markdown("Ask follow-up questions to dive deeper into specific aspects of the team.")
                
                # Quick question buttons
                st.markdown("**Quick Questions:**")
                col1, col2, col3, col4 = st.columns(4)
                
                quick_questions = [
                    ("What's their worst map?", col1),
                    ("Who's their best player?", col2),
                    ("What are their weaknesses?", col3),
                    ("How's their pistol?", col4)
                ]
                
                for question, col in quick_questions:
                    with col:
                        if st.button(question, key=f"quick_{question}"):
                            st.session_state.pending_question = question
                
                st.markdown("---")
                
                # Chat input
                user_question = st.text_input(
                    "Ask a question:",
                    placeholder="e.g., What agents does zekken play? How do they perform on Lotus?",
                    key="chat_input"
                )
                
                # Handle quick questions
                if hasattr(st.session_state, 'pending_question'):
                    user_question = st.session_state.pending_question
                    del st.session_state.pending_question
                
                if user_question:
                    with st.spinner("Analyzing..."):
                        generator = ReportGenerator(api_key=api_key if api_key else None)
                        response = generator.chat_about_team(
                            user_question,
                            st.session_state.scouting_data,
                            selected_team,
                            st.session_state.chat_history
                        )
                        
                        # Add to chat history
                        st.session_state.chat_history.append({
                            "user": user_question,
                            "assistant": response
                        })
                
                # Display chat history
                if st.session_state.chat_history:
                    st.markdown("---")
                    st.markdown("### Conversation History")
                    
                    for i, msg in enumerate(reversed(st.session_state.chat_history)):
                        with st.container():
                            st.markdown(f"**🙋 You:** {msg['user']}")
                            st.markdown(f"**🤖 Assistant:** {msg['assistant']}")
                            st.markdown("---")
                    
                    if st.button("🗑️ Clear Chat History"):
                        st.session_state.chat_history = []
                        st.rerun()
                else:
                    st.info("💡 Ask a question above to start exploring the data!")
            
            with tabs[3]:
                st.subheader("🗺️ Map Performance")
                map_stats = overview.get('map_stats', [])
                if map_stats:
                    df_maps = pd.DataFrame(map_stats)
                    df_maps['map'] = df_maps['map'].str.title()
                    df_maps = df_maps.rename(columns={
                        'map': 'Map',
                        'games': 'Games',
                        'wins': 'Wins',
                        'win_rate': 'Win Rate %',
                        'avg_round_diff': 'Avg Round Diff'
                    })
                    
                    # Bar chart
                    st.bar_chart(df_maps.set_index('Map')['Win Rate %'])
                    
                    # Table
                    st.dataframe(df_maps, width='stretch', hide_index=True)
                    
                    # Best/Worst maps
                    col1, col2 = st.columns(2)
                    with col1:
                        best_map = max(map_stats, key=lambda x: x['win_rate'])
                        st.success(f"✅ **Best Map:** {best_map['map'].title()} ({best_map['win_rate']}% WR)")
                    with col2:
                        worst_map = min(map_stats, key=lambda x: x['win_rate'])
                        st.error(f"❌ **Worst Map:** {worst_map['map'].title()} ({worst_map['win_rate']}% WR)")
            
            with tabs[4]:
                st.subheader("👥 Player Statistics")
                players = data.get('players', {}).get('players', [])
                if players:
                    # Player stats table
                    df_players = pd.DataFrame([{
                        'Player': p['name'],
                        'Games': p['games'],
                        'Kills': p['kills'],
                        'Deaths': p['deaths'],
                        'Assists': p['assists'],
                        'K/D': p['kd_ratio'],
                        'KDA': p['kda']
                    } for p in players])
                    
                    st.dataframe(df_players, width='stretch', hide_index=True)
                    
                    # Agent pools
                    st.subheader("🎭 Agent Pools")
                    for p in players:
                        with st.expander(f"**{p['name']}** (KD: {p['kd_ratio']})"):
                            if p.get('agent_pool'):
                                agent_df = pd.DataFrame(p['agent_pool'])
                                agent_df['agent'] = agent_df['agent'].str.title()
                                st.dataframe(agent_df, width='stretch', hide_index=True)
            
            with tabs[5]:
                st.subheader("🎮 Team Compositions")
                compositions = data.get('compositions', {})
                
                # Agent pick rates
                st.markdown("### Agent Pick Rates")
                agent_picks = compositions.get('agent_picks', [])
                if agent_picks:
                    df_agents = pd.DataFrame(agent_picks)
                    df_agents['agent'] = df_agents['agent'].str.title()
                    df_agents = df_agents.rename(columns={
                        'agent': 'Agent',
                        'role': 'Role',
                        'picks': 'Picks',
                        'pick_rate': 'Pick Rate %'
                    })
                    
                    col1, col2 = st.columns([2, 1])
                    with col1:
                        st.bar_chart(df_agents.set_index('Agent')['Pick Rate %'].head(10))
                    with col2:
                        st.dataframe(df_agents.head(10), width='stretch', hide_index=True)
                
                # Compositions by map
                st.markdown("### Compositions by Map")
                comps_by_map = compositions.get('compositions_by_map', {})
                for map_name, comps in comps_by_map.items():
                    with st.expander(f"**{map_name.title()}**"):
                        for c in comps[:3]:
                            st.markdown(f"- **{c['agents']}** ({c['pick_rate']}%, {c['times_played']}x)")
            
            with tabs[6]:
                st.subheader("📊 Raw Scouting Data")
                st.json(data)
        
        engine.close()
        
    except Exception as e:
        st.error(f"Error connecting to database: {e}")
        st.info("Make sure `valorant_esports.duckdb` is in the same directory as this app.")


if __name__ == "__main__":
    main()
