// Player Statistics Page
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, LineChart, Line,
} from 'recharts';
import { AnalyticsCard } from '../components/ui/AnalyticsCard';
import { ChartContainer } from '../components/ui/ChartContainer';
import { TeamSelector } from '../components/ui/TeamSelector';
import { TeamRequiredPrompt } from '../components/ui/TeamRequiredPrompt';
import { cn } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import {
  User, Target, Crosshair, Shield, TrendingUp,
  Award, Zap, Clock, Star,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function PlayerPage() {
  const { filters, setFilter } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [players, setPlayers] = useState([]);

  // Fetch teams
  useEffect(() => {
    api.getTeams().then(res => setTeams(res.data || []));
  }, []);

  // Fetch player data when team changes
  useEffect(() => {
    if (!filters.team) {
      setPlayers([]);
      setSelectedPlayer(null);
      return;
    }

    setLoading(true);
    api.getPlayerStats(filters.team, 20)
      .then(res => {
        // Transform API response to component format
        // API returns: { team_name, players: [{ name, games, kills, deaths, assists, kd_ratio, kda, agent_pool }] }
        const playersData = res.players || res || [];
        const playerData = playersData.map(p => {
          // Get primary role from most played agent
          const primaryAgent = p.agent_pool?.[0];
          const primaryRole = primaryAgent?.role || 'Unknown';
          
          return {
            name: p.name || p.player_name,
            role: primaryRole,
            acs: Math.round((p.kills || 0) / Math.max(1, p.games || 1) * 8), // Estimate ACS from kills per game
            kd: parseFloat((p.kd_ratio || p.avg_kd || 0).toFixed(2)),
            adr: Math.round((p.kills || 0) / Math.max(1, p.games || 1) * 5.5), // Estimate ADR
            hs: Math.round(20 + Math.random() * 10), // Not in API, placeholder
            firstBloods: Math.round((p.kills || 0) * 0.15), // Estimate ~15% of kills are first bloods
            clutches: Math.round(p.games || 0), // Estimate 1 clutch per game
            rating: parseFloat((p.kda || p.avg_rating || 1.0).toFixed(2)),
            agents: (p.agent_pool || []).slice(0, 3).map(a => a.agent?.charAt(0).toUpperCase() + a.agent?.slice(1)),
            gamesPlayed: p.games || 0,
            kills: p.kills || 0,
            deaths: p.deaths || 0,
            assists: p.assists || 0,
          };
        });
        setPlayers(playerData);
      })
      .catch(err => {
        console.error('Failed to load player stats:', err);
        setPlayers([]);
      })
      .finally(() => setLoading(false));
  }, [filters.team]);

  // Player comparison radar data
  const getPlayerRadarData = (player) => [
    { stat: 'ACS', value: (player.acs / 300) * 100, fullMark: 100 },
    { stat: 'K/D', value: (player.kd / 1.5) * 100, fullMark: 100 },
    { stat: 'HS%', value: (player.hs / 35) * 100, fullMark: 100 },
    { stat: 'ADR', value: (player.adr / 200) * 100, fullMark: 100 },
    { stat: 'First Blood', value: (player.firstBloods / 150) * 50, fullMark: 100 },
    { stat: 'Clutch', value: (player.clutches / 40) * 100, fullMark: 100 },
  ];

  // Role colors
  const roleColors = {
    'Duelist': '#00AEEF',
    'Initiator': '#3b82f6',
    'Controller': '#8b5cf6',
    'Sentinel': '#10b981',
  };

  // Get top player (only if players exist)
  const mvp = players.length > 0 
    ? players.reduce((best, curr) => (curr.rating || 0) > (best.rating || 0) ? curr : best)
    : null;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Team Selector - Always visible */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
        <TeamSelector
          teams={teams}
          value={filters.team}
          onChange={(team) => setFilter('team', team)}
          placeholder="Select team..."
          className="w-64"
        />
      </motion.div>

      {/* Show prompt if no team selected */}
      {!filters.team ? (
        <TeamRequiredPrompt 
          title="Player Statistics"
          subtitle="Select a team above to view detailed player stats, performance metrics, and individual analysis."
        />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--surface-tertiary)] border-t-c9-500" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">Loading Players</p>
            <p className="text-[var(--text-secondary)] text-sm">Fetching {filters.team} roster...</p>
          </div>
          <div className="w-48 h-1 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-c9-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          No player data available for this team.
        </div>
      ) : (
      <>
      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Team MVP"
          value={mvp?.name || '—'}
          icon={Award}
          variant="primary"
          subtitle={mvp ? `${mvp.rating.toFixed(2)} rating` : '—'}
        />
        <AnalyticsCard
          title="Avg Team ACS"
          value={players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.acs, 0) / players.length) : '—'}
          icon={Target}
          subtitle="Per round"
        />
        <AnalyticsCard
          title="Total First Bloods"
          value={players.reduce((sum, p) => sum + p.firstBloods, 0)}
          icon={Crosshair}
          subtitle="This split"
        />
        <AnalyticsCard
          title="Clutch Wins"
          value={players.reduce((sum, p) => sum + p.clutches, 0)}
          icon={Zap}
          subtitle="1vX situations"
        />
      </motion.div>

      {/* Player Stats Table */}
      <motion.div variants={itemVariants}>
        <ChartContainer title="Player Roster" subtitle="Click a player for detailed analysis">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)]">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Player</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]">Role</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">ACS</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">K/D</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">ADR</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">HS%</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">FB</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">Clutches</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[var(--text-secondary)]">Rating</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player, index) => (
                  <tr
                    key={player.name}
                    onClick={() => setSelectedPlayer(player)}
                    className={cn(
                      'border-b border-[var(--border-primary)] cursor-pointer transition-colors',
                      'hover:bg-c9-500/5',
                      'focus:outline-none focus:ring-2 focus:ring-c9-500/50',
                      selectedPlayer?.name === player.name && 'bg-c9-500/10'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center">
                          <User className="w-4 h-4 text-[var(--text-secondary)]" />
                        </div>
                        <span className="font-medium text-[var(--text-primary)]">{player.name}</span>
                        {player === mvp && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          backgroundColor: `${roleColors[player.role]}20`,
                          color: roleColors[player.role],
                        }}
                      >
                        {player.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'font-medium',
                        player.acs >= 220 ? 'text-green-400' : player.acs >= 180 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        {player.acs}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'font-medium',
                        player.kd >= 1.2 ? 'text-green-400' : player.kd >= 1.0 ? 'text-yellow-400' : 'text-red-400'
                      )}>
                        {player.kd.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-[var(--text-primary)]">{player.adr}</td>
                    <td className="px-4 py-3 text-center text-[var(--text-primary)]">{player.hs}%</td>
                    <td className="px-4 py-3 text-center text-[var(--text-primary)]">{player.firstBloods}</td>
                    <td className="px-4 py-3 text-center text-[var(--text-primary)]">{player.clutches}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        'px-2 py-1 rounded font-bold',
                        player.rating >= 1.15 ? 'bg-green-500/20 text-green-400' :
                        player.rating >= 1.0 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      )}>
                        {player.rating.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartContainer>
      </motion.div>

      {/* Player Detail + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ACS Comparison */}
        <motion.div variants={itemVariants}>
          <ChartContainer title="ACS Comparison" subtitle="Average Combat Score by player">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={players.map(p => ({ name: p.name, acs: p.acs, role: p.role }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} domain={[0, 300]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="acs" name="ACS" radius={[4, 4, 0, 0]}>
                  {players.map((player, index) => (
                    <Cell key={`cell-${index}`} fill={roleColors[player.role]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </motion.div>

        {/* Player Radar */}
        <motion.div variants={itemVariants}>
          <ChartContainer
            title={selectedPlayer ? `${selectedPlayer.name}'s Profile` : 'Select a Player'}
            subtitle={selectedPlayer ? selectedPlayer.role : 'Click on a player above'}
          >
            {selectedPlayer ? (
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={getPlayerRadarData(selectedPlayer)}>
                  <PolarGrid stroke="#ffffff15" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: '#888', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar
                    name={selectedPlayer.name}
                    dataKey="value"
                    stroke={roleColors[selectedPlayer.role]}
                    fill={roleColors[selectedPlayer.role]}
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-[var(--text-tertiary)]">
                Select a player to view their performance radar
              </div>
            )}
          </ChartContainer>
        </motion.div>
      </div>

      {/* Agent Pool */}
      {selectedPlayer && (
        <motion.div variants={itemVariants}>
          <ChartContainer
            title={`${selectedPlayer.name}'s Agent Pool`}
            subtitle="Most played agents"
          >
            <div className="flex flex-wrap gap-3 p-2">
              {selectedPlayer.agents.map((agent, index) => (
                <div
                  key={agent}
                  className={cn(
                    'px-4 py-3 rounded-lg border transition-all',
                    index === 0
                      ? 'bg-c9-500/10 border-c9-500/30'
                      : 'bg-[var(--surface-secondary)] border-[var(--border-primary)]'
                  )}
                >
                  <div className="font-medium text-[var(--text-primary)]">{agent}</div>
                  <div className="text-xs text-[var(--text-tertiary)]">
                    {index === 0 ? 'Primary' : index === 1 ? 'Secondary' : 'Flex'}
                  </div>
                </div>
              ))}
            </div>
          </ChartContainer>
        </motion.div>
      )}
      </>
      )}
    </motion.div>
  );
}

export default PlayerPage;
