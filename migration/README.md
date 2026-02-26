# Database Migration Files

This folder contains CSV export files used for migrating data to Supabase.

## Import Order (IMPORTANT!)

When importing to Supabase, follow this exact order to respect foreign key constraints:

### 1. Metadata Tables (no dependencies)
1. `export_agent_metadata.csv`
2. `export_map_metadata.csv`
3. `export_ingestion_log.csv`

### 2. Core Tables (sequential dependencies)
4. `export_series.csv`
5. `export_games.csv`
6. `export_rounds.csv`
7. `export_game_compositions.csv`
8. `export_player_round_stats.csv`
9. `export_player_economy.csv`
10. `export_weapon_kills.csv`

### 3. Views (auto-populated, skip manual import)
- `export_v_*` files are materialized views - they populate automatically after core data is imported

## Files in this folder

**Metadata:**
- `export_agent_metadata.csv` - VALORANT agent information
- `export_map_metadata.csv` - Map information
- `export_ingestion_log.csv` - Data ingestion tracking

**Core Data:**
- `export_series.csv` - Tournament series
- `export_games.csv` - Individual matches
- `export_rounds.csv` - Round-by-round data
- `export_game_compositions.csv` - Team compositions per game
- `export_player_round_stats.csv` - Player performance per round
- `export_player_economy.csv` - Economy tracking
- `export_weapon_kills.csv` - Weapon usage stats

**Views (Auto-generated):**
- `export_v_player_agent_pool.csv`
- `export_v_pistol_performance.csv`
- `export_v_post_plant_stats.csv`
- `export_v_round_win_types.csv`
- `export_v_team_agent_picks.csv`
- `export_v_team_compositions.csv`
- `export_v_team_map_stats.csv`
- `export_v_weapon_usage.csv`

## How to Use

### Option 1: Move CSV files here (recommended)
```bash
# Windows PowerShell
Move-Item export_*.csv migration/
```

### Option 2: Keep in root, reference from here
Just keep this README as documentation and leave CSV files in root.

## Supabase Import

See [SUPABASE_IMPORT_GUIDE.md](../SUPABASE_IMPORT_GUIDE.md) for detailed import instructions.
