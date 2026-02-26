# Supabase Import Guide - ONE TIME SETUP

## Step 1: Run Schema (SQL Editor)

1. Open Supabase SQL Editor
2. Copy and paste ALL of `supabase_schema.sql`
3. Click RUN - this creates all tables

## Step 2: Import CSVs (Table Editor) - IN THIS EXACT ORDER

**Core Data (Import First):**

1. `export_series.csv` → Table: `series`
2. `export_games.csv` → Table: `games`
3. `export_rounds.csv` → Table: `rounds`
4. `export_agent_metadata.csv` → Table: `agent_metadata`
5. `export_map_metadata.csv` → Table: `map_metadata`

**Game Data (Import Second):** 6. `export_game_compositions.csv` → Table: `game_compositions` 7. `export_player_round_stats.csv` → Table: `player_round_stats` 8. `export_player_economy.csv` → Table: `player_economy` 9. `export_weapon_kills.csv` → Table: `weapon_kills`

**Logs (Import Third):** 10. `export_ingestion_log.csv` → Table: `ingestion_log`

**Analytics Views (Import Last):** 11. `export_v_team_map_stats.csv` → Table: `v_team_map_stats` 12. `export_v_team_agent_picks.csv` → Table: `v_team_agent_picks` 13. `export_v_player_agent_pool.csv` → Table: `v_player_agent_pool` 14. `export_v_pistol_performance.csv` → Table: `v_pistol_performance` 15. `export_v_weapon_usage.csv` → Table: `v_weapon_usage` 16. `export_v_round_win_types.csv` → Table: `v_round_win_types` 17. `export_v_team_compositions.csv` → Table: `v_team_compositions` 18. `export_v_post_plant_stats.csv` → Table: `v_post_plant_stats`

## Step 3: Get Connection String

1. Project Settings (gear icon) → Database
2. Scroll down to "Connection string"
3. Select "URI" mode
4. Copy the connection string (looks like: `postgresql://postgres:[PASSWORD]@...`)
5. Replace `[YOUR-PASSWORD]` with your actual database password

## Step 4: Update .env File

```
DATABASE_URL=postgresql://postgres:your-password@db.xxxxx.supabase.co:5432/postgres
GROQ_API_KEY=your_groq_api_key_here
```

## Done!

Your database is now on Supabase. Test locally with:

```bash
cd backend
python main.py
```

Then deploy to Vercel with the DATABASE_URL environment variable.
