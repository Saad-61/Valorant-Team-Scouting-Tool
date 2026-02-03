"""
VALORANT Scouting Report Generator - IMPROVED UX VERSION
Cloud9 Hackathon - January 2026

KEY IMPROVEMENTS:
1. Cleaner layout with progressive disclosure
2. AI insights prominently displayed
3. Visual hierarchy (KPIs first, details hidden)
4. Better chat integration
5. Actionable recommendations
"""

import streamlit as st
import pandas as pd
from dynamic_scouting_engine import ScoutingEngine
from report_generator import ReportGenerator
import json

# Page config
st.set_page_config(
    page_title="VALORANT Scouting Intelligence",
    page_icon="🎯",
    layout="wide",
    initial_sidebar_state="collapsed"  # Cleaner initial view
)

# Custom CSS - Improved visual hierarchy
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        font-weight: bold;
        color: #ff4655;
        text-align: center;
        margin-bottom: 0.5rem;
    }
    .sub-header {
        font-size: 1.2rem;
        color: #888;
        text-align: center;
        margin-bottom: 3rem;
    }
    .kpi-card {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        padding: 1.5rem;
        border-radius: 12px;
        border-left: 5px solid #ff4655;
        text-align: center;
    }
    .kpi-value {
        font-size: 2.5rem;
        font-weight: bold;
        color: #ff4655;
    }
    .kpi-label {
        font-size: 0.9rem;
        color: #aaa;
        margin-top: 0.5rem;
    }
    .insight-box {
        background: #1a1a2e;
        padding: 1.5rem;
        border-radius: 12px;
        border-left: 5px solid #00ff88;
        margin: 1rem 0;
    }
    .recommendation {
        background: #2a2a3e;
        padding: 1rem;
        border-radius: 8px;
        margin: 0.5rem 0;
        border-left: 3px solid #ffd700;
    }
    .search-box {
        font-size: 1.2rem;
        padding: 1rem;
        border-radius: 12px;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'scouting_data' not in st.session_state:
    st.session_state.scouting_data = None
if 'selected_team' not in st.session_state:
    st.session_state.selected_team = None
if 'show_details' not in st.session_state:
    st.session_state.show_details = {
        'maps': False,
        'players': False,
        'comps': False,
        'weaknesses': False
    }


def generate_ai_insights(data, team_name):
    """Generate quick AI insights from data."""
    insights = []
    
    overview = data.get('overview', {})
    pistol = data.get('pistol_rounds', {})
    weaknesses = data.get('weaknesses', {}).get('weaknesses', [])
    
    # Map insights
    map_stats = overview.get('map_stats', [])
    if map_stats:
        best_map = max(map_stats, key=lambda x: x['win_rate'])
        worst_map = min(map_stats, key=lambda x: x['win_rate'])
        
        if best_map['win_rate'] > 70:
            insights.append(f"🚫 **BAN {best_map['map'].upper()}** - {best_map['win_rate']}% win rate (their best map)")
        
        if worst_map['win_rate'] < 45:
            insights.append(f"🎯 **PICK {worst_map['map'].upper()}** - Only {worst_map['win_rate']}% win rate (exploit this)")
    
    # Pistol insights
    if pistol.get('overall_pistol_win_rate', 0) < 45:
        insights.append(f"💰 **Force pistol fights** - {pistol.get('overall_pistol_win_rate')}% pistol win rate (below average)")
    elif pistol.get('overall_pistol_win_rate', 0) > 60:
        insights.append(f"⚠️ **Strong pistol rounds** - {pistol.get('overall_pistol_win_rate')}% win rate (be cautious)")
    
    # Player insights
    players = data.get('players', {}).get('players', [])
    if players:
        top_player = max(players, key=lambda x: x.get('kd_ratio', 0))
        insights.append(f"🎯 **Target {top_player['name']}** - Highest KD ({top_player['kd_ratio']}) - shut them down to win")
    
    # High severity weaknesses
    critical_weaknesses = [w for w in weaknesses if w.get('severity') == 'HIGH']
    if critical_weaknesses:
        for w in critical_weaknesses[:2]:  # Top 2
            insights.append(f"⚡ **{w['category']}**: {w['recommendation']}")
    
    return insights


def main():
    try:
        engine = ScoutingEngine()
        engine.connect()
        teams = engine.get_all_teams()
        
        # ============ LANDING PAGE - Team Selection ============
        if not st.session_state.selected_team:
            st.markdown('<p class="main-header">🎯 VALORANT SCOUTING INTELLIGENCE</p>', unsafe_allow_html=True)
            st.markdown('<p class="sub-header">"Know Your Enemy"</p>', unsafe_allow_html=True)
            
            st.markdown("<br>", unsafe_allow_html=True)
            
            # Search-style team selector
            col1, col2, col3 = st.columns([1, 2, 1])
            with col2:
                selected_team = st.selectbox(
                    "🔍 Search opponent team:",
                    options=[""] + teams,
                    placeholder="Type team name...",
                    label_visibility="visible"
                )
                
                if selected_team:
                    if st.button("🚀 Generate Scouting Report", type="primary", use_container_width=False):
                        st.session_state.selected_team = selected_team
                        st.rerun()
            
            st.markdown("<br><br>", unsafe_allow_html=True)
            
            # Popular teams
            st.markdown("### 🔥 Popular Teams")
            cols = st.columns(5)
            popular = ["Sentinels", "LOUD", "Cloud9", "100 Thieves", "Evil Geniuses"]
            for idx, team in enumerate(popular):
                if team in teams:
                    with cols[idx % 5]:
                        if st.button(team, use_container_width=False):
                            st.session_state.selected_team = team
                            st.rerun()
        
        # ============ DASHBOARD - Scouting Report ============
        else:
            team_name = st.session_state.selected_team
            
            # Header with back button
            col1, col2, col3 = st.columns([1, 3, 1])
            with col1:
                if st.button("← Back"):
                    st.session_state.selected_team = None
                    st.session_state.scouting_data = None
                    st.rerun()
            with col2:
                st.markdown(f"<h1 style='text-align: center; color: #ff4655;'>{team_name}</h1>", unsafe_allow_html=True)
            with col3:
                if st.session_state.scouting_data:
                    st.download_button(
                        "📥 Export",
                        data=json.dumps(st.session_state.scouting_data, indent=2),
                        file_name=f"scout_{team_name.lower().replace(' ', '_')}.json",
                        mime="application/json"
                    )
            
            st.markdown("---")
            
            # Load data if not already loaded
            if not st.session_state.scouting_data:
                with st.spinner(f"🔄 Analyzing {team_name}..."):
                    st.session_state.scouting_data = engine.generate_full_scouting_data(team_name, 10)
            
            data = st.session_state.scouting_data
            overview = data.get('overview', {})
            pistol = data.get('pistol_rounds', {})
            players = data.get('players', {}).get('players', [])
            
            # ============ KPI CARDS ============
            st.markdown("### 📊 Quick Stats")
            col1, col2, col3, col4 = st.columns(4)
            
            with col1:
                st.markdown(f"""
                <div class="kpi-card">
                    <div class="kpi-value">{overview.get('win_rate', 0)}%</div>
                    <div class="kpi-label">Win Rate</div>
                    <div style="color: #aaa; margin-top: 0.5rem;">{overview.get('series_record', 'N/A')}</div>
                </div>
                """, unsafe_allow_html=True)
            
            with col2:
                st.markdown(f"""
                <div class="kpi-card">
                    <div class="kpi-value">{pistol.get('overall_pistol_win_rate', 0)}%</div>
                    <div class="kpi-label">Pistol Win Rate</div>
                    <div style="color: #aaa; margin-top: 0.5rem;">ATK: {pistol.get('attack_pistol', {}).get('win_rate', 0)}% | DEF: {pistol.get('defense_pistol', {}).get('win_rate', 0)}%</div>
                </div>
                """, unsafe_allow_html=True)
            
            with col3:
                map_stats = overview.get('map_stats', [])
                best_map = max(map_stats, key=lambda x: x['win_rate']) if map_stats else {'map': 'N/A', 'win_rate': 0}
                st.markdown(f"""
                <div class="kpi-card">
                    <div class="kpi-value">{best_map['map'].title()}</div>
                    <div class="kpi-label">Best Map</div>
                    <div style="color: #aaa; margin-top: 0.5rem;">{best_map['win_rate']}% WR</div>
                </div>
                """, unsafe_allow_html=True)
            
            with col4:
                if players:
                    star_player = max(players, key=lambda x: x.get('kd_ratio', 0))
                    st.markdown(f"""
                    <div class="kpi-card">
                        <div class="kpi-value">{star_player['name']}</div>
                        <div class="kpi-label">Star Player</div>
                        <div style="color: #aaa; margin-top: 0.5rem;">{star_player['kd_ratio']} KD</div>
                    </div>
                    """, unsafe_allow_html=True)
            
            st.markdown("<br>", unsafe_allow_html=True)
            
            # ============ AI INSIGHTS (PROMINENT) ============
            st.markdown("### 🎯 Key Insights & Recommendations")
            insights = generate_ai_insights(data, team_name)
            
            if insights:
                insight_html = "<div class='insight-box'>"
                for insight in insights:
                    insight_html += f"<div class='recommendation'>{insight}</div>"
                insight_html += "</div>"
                st.markdown(insight_html, unsafe_allow_html=True)
            else:
                st.info("💡 Not enough data for AI insights")
            
            st.markdown("---")
            
            # ============ DETAILED SECTIONS (EXPANDABLE) ============
            st.markdown("### 📋 Detailed Analysis")
            
            # Maps Section
            with st.expander("🗺️ MAP PERFORMANCE", expanded=False):
                if map_stats:
                    df_maps = pd.DataFrame(map_stats)
                    df_maps['map'] = df_maps['map'].str.title()
                    
                    # Visual chart
                    st.bar_chart(df_maps.set_index('map')['win_rate'])
                    
                    # Table
                    st.dataframe(df_maps, width='stretch', hide_index=True)
            
            # Players Section
            with st.expander("👥 PLAYER BREAKDOWN", expanded=False):
                if players:
                    for p in players[:5]:  # Top 5
                        col1, col2, col3 = st.columns([2, 1, 1])
                        with col1:
                            st.markdown(f"**{p['name']}**")
                        with col2:
                            st.metric("KD", p['kd_ratio'])
                        with col3:
                            st.metric("Games", p['games'])
            
            # Compositions Section
            with st.expander("🎮 AGENT COMPOSITIONS", expanded=False):
                compositions = data.get('compositions', {})
                agent_picks = compositions.get('agent_picks', [])[:10]
                
                if agent_picks:
                    df = pd.DataFrame(agent_picks)
                    st.bar_chart(df.set_index('agent')['pick_rate'])
            
            # Weaknesses Section (CRITICAL)
            with st.expander("⚠️ WEAKNESSES TO EXPLOIT", expanded=True):  # Default open
                weaknesses = data.get('weaknesses', {}).get('weaknesses', [])
                
                if weaknesses:
                    high = [w for w in weaknesses if w['severity'] == 'HIGH']
                    if high:
                        st.error("🔴 HIGH PRIORITY TARGETS")
                        for w in high:
                            st.markdown(f"**{w['category']}**: {w['finding']}")
                            st.success(f"💡 {w['recommendation']}")
                            st.markdown("---")
            
            st.markdown("<br>", unsafe_allow_html=True)
            
            # ============ CHAT SECTION (ALWAYS VISIBLE) ============
            st.markdown("### 💬 Ask Questions")
            
            col1, col2 = st.columns([3, 1])
            with col1:
                user_question = st.text_input(
                    "Ask anything about this team:",
                    placeholder=f"e.g., What agents does {team_name} play on Ascent?",
                    label_visibility="collapsed"
                )
            with col2:
                ask_button = st.button("Ask", type="primary", use_container_width=False)
            
            if ask_button and user_question:
                st.info(f"🤖 Analyzing: {user_question}")
                # Here you'd call your AI backend
        
        engine.close()
        
    except Exception as e:
        st.error(f"Error: {e}")


if __name__ == "__main__":
    main()
