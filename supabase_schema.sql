-- Supabase PostgreSQL Schema for VALORANT Scouting Tool
-- Run this in Supabase SQL Editor FIRST before importing data

-- Core Tables
CREATE TABLE IF NOT EXISTS series (
    series_id BIGINT PRIMARY KEY,
    tournament_name TEXT,
    team1_name TEXT,
    team2_name TEXT,
    team1_id TEXT,
    team2_id TEXT,
    winner_team_id TEXT,
    team1_score INTEGER,
    team2_score INTEGER,
    started_at TIMESTAMP,
    finished BOOLEAN,
    best_of INTEGER
);

CREATE TABLE IF NOT EXISTS games (
    game_id BIGINT PRIMARY KEY,
    series_id BIGINT REFERENCES series(series_id),
    map TEXT,
    game_number INTEGER,
    team1_score INTEGER,
    team2_score INTEGER,
    winner_team_id TEXT,
    team1_attack_rounds INTEGER,
    team1_defense_rounds INTEGER,
    team2_attack_rounds INTEGER,
    team2_defense_rounds INTEGER,
    duration_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS rounds (
    round_id BIGINT PRIMARY KEY,
    game_id BIGINT REFERENCES games(game_id),
    round_number INTEGER,
    winning_team_id TEXT,
    win_type TEXT,
    attacking_team_id TEXT,
    defending_team_id TEXT,
    spike_planted BOOLEAN,
    spike_defused BOOLEAN
);

CREATE TABLE IF NOT EXISTS player_round_stats (
    id SERIAL PRIMARY KEY,
    round_id BIGINT,
    game_id BIGINT,
    player_id TEXT,
    player_name TEXT,
    team_id TEXT,
    team_name TEXT,
    agent TEXT,
    kills INTEGER,
    deaths INTEGER,
    assists INTEGER,
    damage INTEGER,
    loadout_value INTEGER,
    remaining_credits INTEGER,
    spent_credits INTEGER
);

CREATE TABLE IF NOT EXISTS weapon_kills (
    id SERIAL PRIMARY KEY,
    round_id BIGINT,
    game_id BIGINT,
    killer_id TEXT,
    killer_name TEXT,
    victim_id TEXT,
    victim_name TEXT,
    weapon TEXT,
    damage_type TEXT,
    killer_team_id TEXT,
    victim_team_id TEXT
);

CREATE TABLE IF NOT EXISTS game_compositions (
    id SERIAL PRIMARY KEY,
    game_id BIGINT,
    team_id TEXT,
    team_name TEXT,
    player_id TEXT,
    player_name TEXT,
    agent TEXT,
    role TEXT
);

CREATE TABLE IF NOT EXISTS player_economy (
    id SERIAL PRIMARY KEY,
    game_id BIGINT,
    round_number INTEGER,
    player_id TEXT,
    player_name TEXT,
    team_id TEXT,
    loadout_value INTEGER,
    remaining_credits INTEGER,
    spent_credits INTEGER,
    weapon TEXT,
    armor TEXT
);

CREATE TABLE IF NOT EXISTS agent_metadata (
    agent TEXT PRIMARY KEY,
    role TEXT,
    abilities TEXT
);

CREATE TABLE IF NOT EXISTS map_metadata (
    map TEXT PRIMARY KEY,
    callouts TEXT,
    release_date DATE
);

CREATE TABLE IF NOT EXISTS ingestion_log (
    id SERIAL PRIMARY KEY,
    series_id BIGINT,
    ingested_at TIMESTAMP DEFAULT NOW(),
    status TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_games_series ON games(series_id);
CREATE INDEX IF NOT EXISTS idx_rounds_game ON rounds(game_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_game ON player_round_stats(game_id);
CREATE INDEX IF NOT EXISTS idx_player_stats_team ON player_round_stats(team_name);
CREATE INDEX IF NOT EXISTS idx_player_stats_player ON player_round_stats(player_name);
CREATE INDEX IF NOT EXISTS idx_weapon_kills_game ON weapon_kills(game_id);
CREATE INDEX IF NOT EXISTS idx_compositions_game ON game_compositions(game_id);
CREATE INDEX IF NOT EXISTS idx_compositions_team ON game_compositions(team_name);

-- Views (recreate the analytical views)
CREATE OR REPLACE VIEW v_team_map_stats AS
SELECT 
    team_name,
    g.map,
    COUNT(*) as games,
    SUM(CASE WHEN winner_team_id = gc.team_id THEN 1 ELSE 0 END) as wins,
    ROUND(100.0 * SUM(CASE WHEN winner_team_id = gc.team_id THEN 1 ELSE 0 END) / COUNT(*), 1) as win_rate,
    AVG(CASE WHEN winner_team_id = gc.team_id THEN team1_score - team2_score ELSE team2_score - team1_score END) as avg_round_diff
FROM game_compositions gc
JOIN games g ON gc.game_id = g.game_id
GROUP BY team_name, gc.team_id, g.map;

CREATE OR REPLACE VIEW v_team_agent_picks AS
SELECT 
    team_name,
    agent,
    role,
    COUNT(*) as games,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY team_name), 1) as pick_rate
FROM game_compositions
GROUP BY team_name, agent, role;

CREATE OR REPLACE VIEW v_player_agent_pool AS
SELECT 
    player_name,
    team_name,
    agent,
    COUNT(DISTINCT game_id) as games,
    SUM(kills) as total_kills,
    SUM(deaths) as total_deaths,
    ROUND(1.0 * SUM(kills) / NULLIF(SUM(deaths), 0), 2) as kd_ratio
FROM player_round_stats
GROUP BY player_name, team_name, agent;

CREATE OR REPLACE VIEW v_pistol_performance AS
SELECT 
    prs.team_name,
    r.attacking_team_id = gc.team_id as is_attack,
    COUNT(*) as rounds,
    SUM(CASE WHEN r.winning_team_id = gc.team_id THEN 1 ELSE 0 END) as wins,
    ROUND(100.0 * SUM(CASE WHEN r.winning_team_id = gc.team_id THEN 1 ELSE 0 END) / COUNT(*), 1) as win_rate
FROM rounds r
JOIN player_round_stats prs ON r.round_id = prs.round_id
JOIN game_compositions gc ON prs.game_id = gc.game_id AND prs.team_name = gc.team_name
WHERE r.round_number IN (1, 13)
GROUP BY prs.team_name, gc.team_id, r.attacking_team_id = gc.team_id;

CREATE OR REPLACE VIEW v_weapon_usage AS
SELECT 
    killer_team_id as team_id,
    wk.game_id,
    weapon,
    COUNT(*) as kills
FROM weapon_kills wk
GROUP BY killer_team_id, wk.game_id, weapon;

CREATE OR REPLACE VIEW v_round_win_types AS
SELECT 
    prs.team_name,
    r.win_type,
    r.attacking_team_id = gc.team_id as on_attack,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY prs.team_name, r.attacking_team_id = gc.team_id), 1) as percentage
FROM rounds r
JOIN player_round_stats prs ON r.round_id = prs.round_id
JOIN game_compositions gc ON prs.game_id = gc.game_id AND prs.team_name = gc.team_name
WHERE r.winning_team_id = gc.team_id
GROUP BY prs.team_name, gc.team_id, r.win_type, r.attacking_team_id = gc.team_id;
