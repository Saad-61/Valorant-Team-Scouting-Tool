# VALORANT Tactical Scouting Tool - Database Documentation

**Cloud9 Hackathon - January 2026**

---

## 📊 Project Status

### ✅ **Completed**
- [x] Database schema design optimized for available GRID data
- [x] DuckDB database initialization with 10 core tables
- [x] 8 analytical views for tactical scouting
- [x] Full data ingestion pipeline (196 series, 6,878 rounds)
- [x] Agent metadata (28 agents with role mappings)
- [x] Map metadata (11 competitive maps)
- [x] Web-based database viewer
- [x] Python query tools

### 🎯 **Ready For**
- [ ] Feature extraction for scouting reports
- [ ] Team tactical analysis queries
- [ ] Player performance aggregations
- [ ] Counter-strategy generation
- [ ] Report visualization/export

---

## 📦 Database Summary

**File:** `valorant_esports.duckdb` (Size: ~15 MB)

| Metric | Count |
|--------|-------|
| **Series** | 196 |
| → Full Depth-4 Data | 129 (66%) |
| → Metadata Only (Depth-2) | 67 (34%) |
| **Games** | 491 |
| **Rounds** | 6,878 |
| **Player-Round Stats** | 68,780 |
| **Agent Compositions** | 3,240 |
| **Weapon Kill Records** | 22,488 |
| **Player Economy Snapshots** | 3,240 |

**Coverage:**
- Tournaments: VCT Americas 2024-2025 (Kickoff, Stage 1, Stage 2)
- Teams: 20+ professional teams
- Maps: 12 competitive maps
- Time Period: January 2024 - January 2026

---

## 🗄️ Database Schema

### **Core Tables**

#### 1. `series`
Represents a best-of-N match between two teams.

| Column | Type | Description |
|--------|------|-------------|
| `series_id` | BIGINT | Primary key (GRID series ID) |
| `tournament_id` | TEXT | Tournament identifier |
| `tournament_name` | TEXT | Full tournament name |
| `stage` | TEXT | Tournament stage (Groups, Playoffs, etc.) |
| `start_time_scheduled` | TIMESTAMP | Scheduled start time |
| `started_at` | TIMESTAMP | Actual start time |
| `updated_at` | TIMESTAMP | Last update time |
| `finished` | BOOLEAN | Whether series is complete |
| `best_of` | INTEGER | Series format (BO1, BO3, BO5) |
| `team1_id` | TEXT | First team ID |
| `team1_name` | TEXT | First team name |
| `team2_id` | TEXT | Second team ID |
| `team2_name` | TEXT | Second team name |
| `winner_team_id` | TEXT | Winning team ID |
| `loser_team_id` | TEXT | Losing team ID |
| `team1_score` | INTEGER | Maps won by team1 |
| `team2_score` | INTEGER | Maps won by team2 |
| `has_depth4_data` | BOOLEAN | Whether full round data exists |
| `depth_level` | INTEGER | 2 (metadata) or 4 (full data) |

---

#### 2. `games`
Individual map matches within a series.

| Column | Type | Description |
|--------|------|-------------|
| `game_id` | TEXT | Primary key (UUID) |
| `series_id` | BIGINT | Foreign key to series |
| `sequence_number` | INTEGER | Game number in series (1, 2, 3...) |
| `map_name` | TEXT | Map played (ascent, bind, etc.) |
| `team1_id` | TEXT | First team ID |
| `team1_name` | TEXT | First team name |
| `team2_id` | TEXT | Second team ID |
| `team2_name` | TEXT | Second team name |
| `team1_score` | INTEGER | Rounds won by team1 |
| `team2_score` | INTEGER | Rounds won by team2 |
| `winner_team_id` | TEXT | Winning team ID |
| `team1_start_side` | TEXT | Starting side ('attacker' or 'defender') |
| `started` | BOOLEAN | Whether game started |
| `finished` | BOOLEAN | Whether game completed |
| `total_rounds` | INTEGER | Total rounds played |

---

#### 3. `rounds`
Round-by-round outcomes and details.

| Column | Type | Description |
|--------|------|-------------|
| `round_id` | TEXT | Primary key (game_id + round_number) |
| `game_id` | TEXT | Foreign key to games |
| `series_id` | BIGINT | Foreign key to series |
| `round_number` | INTEGER | Round number (1-based) |
| `attacker_team_id` | TEXT | Attacking team ID |
| `defender_team_id` | TEXT | Defending team ID |
| `winner_team_id` | TEXT | Round winner ID |
| `winner_side` | TEXT | Winning side ('attacker' or 'defender') |
| `win_type` | TEXT | How round was won (opponentEliminated, bombExploded, bombDefused, timeExpired) |
| `bomb_planted` | BOOLEAN | Whether spike was planted |
| `bomb_defuse_started` | BOOLEAN | Whether defuse was attempted |
| `bomb_defused` | BOOLEAN | Whether spike was defused |
| `is_pistol_round` | BOOLEAN | Round 1, 13, or OT pistols |
| `half` | TEXT | 'first', 'second', or 'overtime' |
| `round_type` | TEXT | Planned: 'pistol', 'eco', 'force', 'full_buy' |

---

#### 4. `player_round_stats`
Per-player statistics for each round.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key (game_id + round + player_id) |
| `game_id` | TEXT | Foreign key to games |
| `series_id` | BIGINT | Foreign key to series |
| `round_number` | INTEGER | Round number |
| `player_id` | TEXT | Player identifier |
| `player_name` | TEXT | Player name |
| `team_id` | TEXT | Team ID |
| `agent` | TEXT | Agent played (jett, omen, etc.) |
| `agent_role` | TEXT | Agent role (Duelist, Controller, Sentinel, Initiator) |
| `side` | TEXT | 'attacker' or 'defender' |
| `kills` | INTEGER | Kills in round |
| `deaths` | INTEGER | Deaths in round |
| `assists` | INTEGER | Assists in round |
| `headshots` | INTEGER | Headshot kills |
| `alive_at_end` | BOOLEAN | Survived the round |
| `current_health` | INTEGER | Health at round end |
| `current_armor` | INTEGER | Armor at round end |
| `clutch_situation` | BOOLEAN | Planned: outnumbered scenario |

---

#### 5. `weapon_kills`
Kills by weapon type per round (for economy analysis).

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key |
| `game_id` | TEXT | Foreign key to games |
| `series_id` | BIGINT | Foreign key to series |
| `round_number` | INTEGER | Round number |
| `team_id` | TEXT | Team ID |
| `weapon_name` | TEXT | Weapon used (phantom, vandal, ghost, etc.) |
| `kill_count` | INTEGER | Number of kills with weapon |

---

#### 6. `game_compositions`
Team agent compositions per game.

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key |
| `game_id` | TEXT | Foreign key to games |
| `series_id` | BIGINT | Foreign key to series |
| `map_name` | TEXT | Map played |
| `team_id` | TEXT | Team ID |
| `team_name` | TEXT | Team name |
| `agent` | TEXT | Agent picked |
| `agent_role` | TEXT | Agent role |
| `player_id` | TEXT | Player ID |
| `player_name` | TEXT | Player name |

---

#### 7. `player_economy`
End-of-game economic snapshot (GRID limitation: no per-round economy).

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT | Primary key |
| `game_id` | TEXT | Foreign key to games |
| `series_id` | BIGINT | Foreign key to series |
| `player_id` | TEXT | Player ID |
| `player_name` | TEXT | Player name |
| `team_id` | TEXT | Team ID |
| `agent` | TEXT | Agent played |
| `final_money` | INTEGER | Credits at game end |
| `final_loadout_value` | INTEGER | Equipment value |
| `final_net_worth` | INTEGER | Total net worth |
| `total_kills` | INTEGER | Kills in game |
| `total_deaths` | INTEGER | Deaths in game |
| `total_assists` | INTEGER | Assists in game |
| `total_headshots` | INTEGER | Headshots in game |

---

### **Metadata Tables**

#### 8. `agent_metadata`
Static agent information and role mappings.

| Column | Type | Description |
|--------|------|-------------|
| `agent_id` | TEXT | Primary key (lowercase agent name) |
| `agent_name` | TEXT | Display name |
| `role` | TEXT | Duelist, Controller, Sentinel, Initiator |
| `abilities` | TEXT | JSON array of ability names (optional) |

**Agents:** 28 agents (all competitive agents as of 2026)

---

#### 9. `map_metadata`
Map information (site coordinates for future site inference).

| Column | Type | Description |
|--------|------|-------------|
| `map_name` | TEXT | Primary key (ascent, bind, etc.) |
| `map_display_name` | TEXT | Capitalized name |
| `site_count` | INTEGER | 2 or 3 (Haven/Lotus have 3 sites) |
| `site_a_x`, `site_a_y` | DOUBLE | Site A coordinates (future use) |
| `site_b_x`, `site_b_y` | DOUBLE | Site B coordinates |
| `site_c_x`, `site_c_y` | DOUBLE | Site C coordinates (Haven/Lotus) |

**Maps:** 11 maps (Ascent, Bind, Breeze, Fracture, Haven, Icebox, Lotus, Pearl, Split, Sunset, Abyss)

---

#### 10. `ingestion_log`
Tracks ingestion status per series.

| Column | Type | Description |
|--------|------|-------------|
| `series_id` | BIGINT | Primary key |
| `ingested_at` | TIMESTAMP | When ingested |
| `source_path` | TEXT | Source directory |
| `depth_level` | INTEGER | 2 or 4 |
| `games_count` | INTEGER | Number of games |
| `rounds_count` | INTEGER | Number of rounds |
| `status` | TEXT | 'success', 'partial', 'error' |
| `error_message` | TEXT | Error details if failed |

---

## 📊 Analytical Views

Pre-built views for common scouting queries.

### 1. `v_team_map_stats`
Team performance by map (win rate, round differential).

### 2. `v_pistol_performance`
Pistol round win rates by team, map, and side.

### 3. `v_round_win_types`
Distribution of round win conditions (elimination, explosion, defuse, timeout).

### 4. `v_team_agent_picks`
Agent pick rates by team and map.

### 5. `v_player_agent_pool`
Player agent pools with aggregate stats (KDA by agent).

### 6. `v_post_plant_stats`
Post-plant conversion rates (attacker wins after plant vs defender retakes).

### 7. `v_weapon_usage`
Weapon usage patterns by team, map, and round type.

### 8. `v_team_compositions`
Team composition archetypes (duelist count, controller count, etc.).

---

## 🔄 How to Share the Database

### **Option 1: Share the .duckdb File**
```
File: valorant_esports.duckdb (~15 MB)
```

**Recipients need:**
1. DuckDB Python package: `pip install duckdb`
2. The `.duckdb` file
3. Optional: Python scripts (`explore_db.py`, `web_viewer.py`)

**Access:**
```python
import duckdb
conn = duckdb.connect('valorant_esports.duckdb', read_only=True)
result = conn.execute("SELECT * FROM series LIMIT 10").fetchall()
```

---

### **Option 2: Export to Portable Format**

**Export as Parquet** (most efficient):
```python
import duckdb
conn = duckdb.connect('valorant_esports.duckdb')
conn.execute("EXPORT DATABASE 'export_dir' (FORMAT PARQUET)")
```

**Export as CSV** (most compatible):
```python
conn.execute("COPY series TO 'series.csv' (HEADER, DELIMITER ',')")
conn.execute("COPY games TO 'games.csv' (HEADER, DELIMITER ',')")
# ... repeat for each table
```

---

### **Option 3: Cloud Storage**
- Upload `.duckdb` file to Google Drive / Dropbox / OneDrive
- Share link with team members
- File is ~15 MB (small enough for free storage)

---

### **Option 4: Git Repository** ⚠️
- DuckDB files are binary and don't compress well
- Consider using Git LFS if pushing to GitHub
- Alternative: Export to Parquet and commit those files

---

## 🚀 Usage Instructions

### **Setup**
```bash
# Install dependencies
pip install duckdb

# Optional: for pandas integration
pip install pandas

# Optional: for web viewer
# (No additional deps needed)
```

### **Quick Queries**
```bash
# Explore database
python explore_db.py

# Run SQL query
python explore_db.py "SELECT * FROM series WHERE winner_team_id = '93'"

# Start web viewer
python web_viewer.py
# Then open: http://localhost:8000
```

### **Python API**
```python
import duckdb

# Connect
conn = duckdb.connect('valorant_esports.duckdb', read_only=True)

# Query
result = conn.execute("""
    SELECT team_name, map_name, win_rate
    FROM v_team_map_stats
    WHERE games_played >= 5
    ORDER BY win_rate DESC
""").fetchall()

# Export to pandas (if installed)
df = conn.execute("SELECT * FROM player_round_stats").df()
```

---

## 🎯 What's Feasible for Scouting

### ✅ **Fully Supported**
- Map pool analysis (win rates, pick rates)
- Agent meta analysis (compositions, pick rates)
- Round outcome patterns (win types, post-plant success)
- Pistol round performance
- Player agent pools and KDA
- Weapon economy patterns (pistol vs rifle rounds)
- Composition archetypes
- Score state analysis

### ⚠️ **Limited Data**
- Economy analysis (game-level only, not per-round)
- Site preference (requires coordinate mapping)
- Retake patterns (inference from post-plant data)

### ❌ **Not Available**
- First blood events (no explicit flags in data)
- Utility usage timing/locations (no event stream)
- Player positioning timelines (only snapshots)
- Opening duel statistics
- Exact plant/defuse timestamps

---

## 📈 Sample Insights

**Most Picked Agents:**
1. Omen (Controller) - 374 picks
2. Viper (Controller) - 347 picks
3. Sova (Initiator) - 266 picks

**Round Win Types:**
- Elimination: 62.1%
- Bomb Defused: 22.5%
- Bomb Exploded: 12.3%
- Time Expired: 3.1%

**Top Player (by KD):**
- aspas (Jett): 920 kills, 581 deaths, 1.58 KD

---

## 🛠️ Tools Included

| File | Purpose |
|------|---------|
| `init_db.py` | Initialize database schema |
| `ingest_data.py` | Ingest GRID JSON files |
| `explore_db.py` | Command-line query tool |
| `web_viewer.py` | Web-based database browser |
| `interactive_db.py` | Interactive SQL shell |

---

## 🔮 Next Steps for Hackathon

1. **Feature Extraction** - Build scouting report queries
2. **Team Analysis** - Per-team tactical summaries
3. **Player Profiles** - Agent pools and playstyles
4. **Counter-Strategy** - Exploit opponent weaknesses
5. **Report Generation** - Export as PDF/HTML/JSON
6. **API/MCP Wrapper** - Expose via HTTP or Model Context Protocol

---

## 📝 Design Decisions

| Decision | Rationale |
|----------|-----------|
| DuckDB over PostgreSQL | Embedded, portable, no server setup |
| Depth-4 focus | Tactical analysis requires round-level data |
| Agent roles from static mapping | GRID doesn't provide role data |
| Game-level economy only | GRID limitations (no per-round economy) |
| Pre-computed views | Performance optimization for common queries |
| Weapon kills table | Economic analysis and buy pattern detection |

---

## 🤝 Team Sharing Checklist

- [ ] Share `valorant_esports.duckdb` file (via Drive/Dropbox)
- [ ] Share Python tools (`explore_db.py`, `web_viewer.py`)
- [ ] Share this documentation file
- [ ] Ensure teammates have `duckdb` installed
- [ ] Coordinate on next features to build

---

**Database Schema Version:** 1.0  
**Last Updated:** January 20, 2026  
**Contact:** Cloud9 Hackathon Team
