-- Supabase PostgreSQL Schema for VALORANT Scouting Tool
-- THIS IS THE FINAL PERFECT SCHEMA - RUN THIS ONCE
-- All columns match CSV exports exactly

-- Drop existing schema if needed
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Core Tables (import in this order)

-- 1. series (no dependencies)
CREATE TABLE series (
    series_id BIGINT PRIMARY KEY,
    tournament_id BIGINT,
    tournament_name TEXT,
    stage TEXT,
    start_time_scheduled TIMESTAMP,
    started_at TIMESTAMP,
    updated_at TIMESTAMP,
    finished BOOLEAN,
    best_of INTEGER,
    team1_id TEXT,
    team1_name TEXT,
    team2_id TEXT,
    team2_name TEXT,
    winner_team_id TEXT,
    loser_team_id TEXT,
    team1_score INTEGER,
    team2_score INTEGER,
    has_depth4_data BOOLEAN,
    depth_level INTEGER
);

-- 2. games (depends on series)
CREATE TABLE games (
    game_id TEXT PRIMARY KEY,
    series_id BIGINT,
    sequence_number INTEGER,
    map_name TEXT,
    team1_id TEXT,
    team1_name TEXT,
    team2_id TEXT,
    team2_name TEXT,
    team1_score INTEGER,
    team2_score INTEGER,
    winner_team_id TEXT,
    team1_start_side TEXT,
    started BOOLEAN,
    finished BOOLEAN,
    total_rounds INTEGER
);

-- 3. rounds (depends on games)
CREATE TABLE rounds (
    round_id TEXT PRIMARY KEY,
    game_id TEXT,
    series_id BIGINT,
    round_number INTEGER,
    attacker_team_id TEXT,
    defender_team_id TEXT,
    winner_team_id TEXT,
    winner_side TEXT,
    win_type TEXT,
    bomb_planted BOOLEAN,
    bomb_defuse_started BOOLEAN,
    bomb_defused BOOLEAN,
    is_pistol_round BOOLEAN,
    half TEXT,
    round_type TEXT
);

-- 4. agent_metadata (no dependencies)
CREATE TABLE agent_metadata (
    agent_id TEXT PRIMARY KEY,
    agent_name TEXT,
    role TEXT,
    abilities TEXT
);

-- 5. map_metadata (no dependencies)
CREATE TABLE map_metadata (
    map_name TEXT PRIMARY KEY,
    map_display_name TEXT,
    site_count INTEGER,
    site_a_x FLOAT,
    site_a_y FLOAT,
    site_b_x FLOAT,
    site_b_y FLOAT,
    site_c_x FLOAT,
    site_c_y FLOAT
);

-- 6. game_compositions (depends on games)
CREATE TABLE game_compositions (
    id TEXT PRIMARY KEY,
    game_id TEXT,
    series_id BIGINT,
    map_name TEXT,
    team_id TEXT,
    team_name TEXT,
    agent TEXT,
    agent_role TEXT,
    player_id TEXT,
    player_name TEXT
);

-- 7. player_round_stats (depends on games)
CREATE TABLE player_round_stats (
    id TEXT PRIMARY KEY,
    game_id TEXT,
    series_id BIGINT,
    round_number INTEGER,
    player_id TEXT,
    player_name TEXT,
    team_id TEXT,
    agent TEXT,
    agent_role TEXT,
    side TEXT,
    kills INTEGER,
    deaths INTEGER,
    assists INTEGER,
    headshots INTEGER,
    alive_at_end BOOLEAN,
    current_health INTEGER,
    current_armor INTEGER,
    clutch_situation TEXT
);

-- 8. player_economy (depends on games)
CREATE TABLE player_economy (
    id TEXT PRIMARY KEY,
    game_id TEXT,
    series_id BIGINT,
    player_id TEXT,
    player_name TEXT,
    team_id TEXT,
    agent TEXT,
    final_money INTEGER,
    final_loadout_value INTEGER,
    final_net_worth INTEGER,
    total_kills INTEGER,
    total_deaths INTEGER,
    total_assists INTEGER,
    total_headshots INTEGER
);

-- 9. weapon_kills (depends on games)
CREATE TABLE weapon_kills (
    id TEXT PRIMARY KEY,
    game_id TEXT,
    series_id BIGINT,
    round_number INTEGER,
    team_id TEXT,
    weapon_name TEXT,
    kill_count INTEGER
);

-- 10. ingestion_log (no dependencies)
CREATE TABLE ingestion_log (
    series_id BIGINT PRIMARY KEY,
    ingested_at TIMESTAMP,
    source_path TEXT,
    depth_level INTEGER,
    games_count INTEGER,
    rounds_count INTEGER,
    status TEXT,
    error_message TEXT
);

-- Analytical Views (import these last)

-- 11. v_team_map_stats
CREATE TABLE v_team_map_stats (
    team_id TEXT,
    team_name TEXT,
    map_name TEXT,
    games_played INTEGER,
    wins INTEGER,
    losses INTEGER,
    win_rate FLOAT,
    rounds_won INTEGER,
    rounds_lost INTEGER,
    round_diff_ratio FLOAT
);

-- 12. v_team_agent_picks
CREATE TABLE v_team_agent_picks (
    team_id TEXT,
    team_name TEXT,
    map_name TEXT,
    agent TEXT,
    agent_role TEXT,
    times_picked INTEGER,
    unique_players INTEGER
);

-- 13. v_player_agent_pool
CREATE TABLE v_player_agent_pool (
    player_id TEXT,
    player_name TEXT,
    agent TEXT,
    agent_role TEXT,
    games_played INTEGER,
    total_kills INTEGER,
    total_deaths INTEGER,
    kd_ratio FLOAT,
    total_headshots INTEGER
);

-- 14. v_pistol_performance
CREATE TABLE v_pistol_performance (
    team_id TEXT,
    map_name TEXT,
    side TEXT,
    pistol_wins INTEGER,
    first_half_pistol_wins INTEGER,
    second_half_pistol_wins INTEGER
);

-- 15. v_weapon_usage
CREATE TABLE v_weapon_usage (
    team_id TEXT,
    map_name TEXT,
    is_pistol_round BOOLEAN,
    weapon_name TEXT,
    total_kills INTEGER,
    games_with_weapon INTEGER
);

-- 16. v_round_win_types
CREATE TABLE v_round_win_types (
    team_id TEXT,
    map_name TEXT,
    side TEXT,
    win_type TEXT,
    count INTEGER,
    percentage FLOAT
);

-- 17. v_team_compositions
CREATE TABLE v_team_compositions (
    game_id TEXT,
    series_id BIGINT,
    map_name TEXT,
    team_id TEXT,
    team_name TEXT,
    composition TEXT,
    duelist_count INTEGER,
    controller_count INTEGER,
    sentinel_count INTEGER,
    initiator_count INTEGER
);

-- 18. v_post_plant_stats
CREATE TABLE v_post_plant_stats (
    map_name TEXT,
    attacker_team_id TEXT,
    defender_team_id TEXT,
    total_plants INTEGER,
    attacker_wins_after_plant INTEGER,
    defender_retakes INTEGER,
    attacker_conversion_rate FLOAT
);

-- Create indexes for performance
CREATE INDEX idx_games_series ON games(series_id);
CREATE INDEX idx_games_game_id ON games(game_id);
CREATE INDEX idx_rounds_game ON rounds(game_id);
CREATE INDEX idx_rounds_round_id ON rounds(round_id);
CREATE INDEX idx_player_stats_game ON player_round_stats(game_id);
CREATE INDEX idx_player_stats_team ON player_round_stats(team_id);
CREATE INDEX idx_player_stats_player ON player_round_stats(player_name);
CREATE INDEX idx_weapon_kills_game ON weapon_kills(game_id);
CREATE INDEX idx_compositions_game ON game_compositions(game_id);
CREATE INDEX idx_compositions_team ON game_compositions(team_name);
CREATE INDEX idx_compositions_id ON game_compositions(id);
