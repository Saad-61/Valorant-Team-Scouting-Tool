// Head-to-Head Comparison Page
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from 'recharts';
import { AnalyticsCard } from '../components/ui/AnalyticsCard';
import { ChartContainer } from '../components/ui/ChartContainer';
import { TeamSelector } from '../components/ui/TeamSelector';
import { cn } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import {
  Users, Trophy, Swords, TrendingUp, TrendingDown,
  Target, Map as MapIcon, Shield,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function HeadToHeadPage() {
  const { filters, setFilter } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [team2, setTeam2] = useState('');
  const [h2hData, setH2hData] = useState(null);
  const [team1Overview, setTeam1Overview] = useState(null);
  const [team2Overview, setTeam2Overview] = useState(null);

  const [team1Comps, setTeam1Comps] = useState(null);
  const [team2Comps, setTeam2Comps] = useState(null);

  // Fetch teams
  useEffect(() => {
    api.getTeams().then(res => setTeams(res.data || []));
  }, []);

  // Fetch H2H data when both teams are selected
  useEffect(() => {
    if (!filters.team || !team2 || filters.team === team2) {
      setH2hData(null);
      setTeam1Overview(null);
      setTeam2Overview(null);
      return;
    }

    setLoading(true);
    
    Promise.all([
      api.getHeadToHead(filters.team, team2),
      api.getFullScoutingData(filters.team, 10),
      api.getFullScoutingData(team2, 10),
    ])
      .then(([h2h, t1Scout, t2Scout]) => {
        console.log('H2H Response:', h2h);
        console.log('Team1 Scout:', t1Scout);
        console.log('Team2 Scout:', t2Scout);
        
        setH2hData(h2h);
        // API returns { team_name, num_matches, data: {...} }
        // getFullScoutingData already extracts res.data, so t1Scout = { team_name, num_matches, data: {...} }
        setTeam1Overview(t1Scout?.data?.overview || t1Scout?.overview);
        setTeam2Overview(t2Scout?.data?.overview || t2Scout?.overview);
        setTeam1Comps(t1Scout?.data?.compositions || t1Scout?.compositions);
        setTeam2Comps(t2Scout?.data?.compositions || t2Scout?.compositions);
      })
      .catch(err => {
        console.error('H2H fetch error:', err);
      })
      .finally(() => setLoading(false));
  }, [filters.team, team2]);

  // Build comparison data for radar chart using real data
  const getComparisonRadar = () => {
    if (!team1Overview || !team2Overview) return [];
    
    // Calculate map overlap strength
    const t1Maps = team1Overview.map_stats || [];
    const t2Maps = team2Overview.map_stats || [];
    const avgT1WR = t1Maps.length > 0 ? t1Maps.reduce((s, m) => s + m.win_rate, 0) / t1Maps.length : 50;
    const avgT2WR = t2Maps.length > 0 ? t2Maps.reduce((s, m) => s + m.win_rate, 0) / t2Maps.length : 50;
    
    return [
      { stat: 'Win Rate', team1: team1Overview.win_rate || 50, team2: team2Overview.win_rate || 50 },
      { stat: 'Map Pool', team1: avgT1WR, team2: avgT2WR },
      { stat: 'Strong Maps', team1: t1Maps.filter(m => m.win_rate >= 60).length * 15, team2: t2Maps.filter(m => m.win_rate >= 60).length * 15 },
      { stat: 'Consistency', team1: 100 - (t1Maps.length > 0 ? Math.abs(Math.max(...t1Maps.map(m => m.win_rate)) - Math.min(...t1Maps.map(m => m.win_rate))) : 50), team2: 100 - (t2Maps.length > 0 ? Math.abs(Math.max(...t2Maps.map(m => m.win_rate)) - Math.min(...t2Maps.map(m => m.win_rate))) : 50) },
    ];
  };

  // Get common maps for comparison
  const getMapComparison = () => {
    if (!team1Overview?.map_stats || !team2Overview?.map_stats) return [];
    
    const t1Maps = new Map(team1Overview.map_stats.map(m => [m.map, m]));
    const t2Maps = new Map(team2Overview.map_stats.map(m => [m.map, m]));
    
    const commonMaps = [];
    t1Maps.forEach((t1Data, mapName) => {
      if (t2Maps.has(mapName)) {
        const t2Data = t2Maps.get(mapName);
        commonMaps.push({
          map: mapName.charAt(0).toUpperCase() + mapName.slice(1),
          team1WinRate: t1Data.win_rate,
          team2WinRate: t2Data.win_rate,
          team1Games: t1Data.games,
          team2Games: t2Data.games,
          advantage: t1Data.win_rate > t2Data.win_rate ? filters.team : (t2Data.win_rate > t1Data.win_rate ? team2 : 'Even'),
        });
      }
    });
    
    return commonMaps.sort((a, b) => Math.abs(b.team1WinRate - b.team2WinRate) - Math.abs(a.team1WinRate - a.team2WinRate));
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Team Selectors */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4">
          <TeamSelector
            teams={teams}
            value={filters.team}
            onChange={(team) => setFilter('team', team)}
            placeholder="Select Team 1..."
            className="w-64"
          />
          
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--surface-secondary)] border border-[var(--border-primary)]">
            <Swords className="w-5 h-5 text-c9-500" />
          </div>
          
          <TeamSelector
            teams={teams.filter(t => t !== filters.team)}
            value={team2}
            onChange={setTeam2}
            placeholder="Select Team 2..."
            className="w-64"
          />
        </div>
      </motion.div>

      {/* Prompt when teams not selected */}
      {(!filters.team || !team2) ? (
        <motion.div 
          variants={itemVariants}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-c9-500/10 flex items-center justify-center mb-6">
            <Swords className="w-10 h-10 text-c9-500" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
            Head-to-Head Comparison
          </h2>
          <p className="text-[var(--text-secondary)] max-w-md">
            Select two teams above to compare their statistics, map performance, and head-to-head record.
          </p>
        </motion.div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--surface-tertiary)] border-t-c9-500" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">Comparing Teams</p>
            <p className="text-[var(--text-secondary)] text-sm">{filters.team} vs {team2}</p>
          </div>
          <div className="w-48 h-1 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-c9-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      ) : (!team1Overview || !team2Overview) ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="p-4 rounded-full bg-yellow-500/10">
            <Target className="w-12 h-12 text-yellow-500" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">No Comparison Data</p>
            <p className="text-[var(--text-secondary)] text-sm">Unable to load data for these teams. Try different teams.</p>
          </div>
        </div>
      ) : (
        <>
          {/* H2H Record */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[var(--surface-secondary)] rounded-xl p-6 border border-[var(--border-primary)] text-center">
              <div className="text-4xl font-bold text-c9-500 mb-2">
                {h2hData?.team1_wins || 0}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">{filters.team} Wins</div>
            </div>
            
            <div className="bg-[var(--surface-secondary)] rounded-xl p-6 border border-[var(--border-primary)] text-center">
              <div className="text-4xl font-bold text-[var(--text-primary)] mb-2">
                {h2hData?.total_matches || 0}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">Total Matches</div>
            </div>
            
            <div className="bg-[var(--surface-secondary)] rounded-xl p-6 border border-[var(--border-primary)] text-center">
              <div className="text-4xl font-bold text-red-500 mb-2">
                {h2hData?.team2_wins || 0}
              </div>
              <div className="text-sm text-[var(--text-secondary)]">{team2} Wins</div>
            </div>
          </motion.div>

          {/* KPI Comparison */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsCard
              title={`${filters.team} Win Rate`}
              value={`${team1Overview?.win_rate || 0}%`}
              icon={Trophy}
              variant="primary"
              subtitle="Recent performance"
            />
            <AnalyticsCard
              title={`${team2} Win Rate`}
              value={`${team2Overview?.win_rate || 0}%`}
              icon={Trophy}
              subtitle="Recent performance"
            />
            <AnalyticsCard
              title="Map Overlap"
              value={`${h2hData?.common_maps?.length || 0} maps`}
              icon={MapIcon}
              subtitle="Shared map pool"
            />
            <AnalyticsCard
              title="Recent Form"
              value={team1Overview?.win_rate > team2Overview?.win_rate ? filters.team : team2}
              icon={TrendingUp}
              variant="success"
              subtitle="Better recent record"
            />
          </motion.div>

          {/* Map-by-Map Comparison */}
          <motion.div variants={itemVariants}>
            <ChartContainer title="Map Pool Comparison" subtitle="Win rates by map for each team">
              <div className="space-y-3">
                {getMapComparison().map((mapData, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border bg-[var(--surface-secondary)] border-[var(--border-primary)]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-[var(--text-primary)]">{mapData.map}</span>
                      <span className={cn(
                        'text-sm font-medium px-2 py-1 rounded',
                        mapData.advantage === filters.team ? 'bg-c9-500/20 text-c9-400' :
                        mapData.advantage === team2 ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      )}>
                        {mapData.advantage === 'Even' ? 'Even' : `${mapData.advantage} favored`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-c9-400">{filters.team}</span>
                          <span className="text-sm font-bold text-c9-400">{mapData.team1WinRate}%</span>
                        </div>
                        <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-c9-500 rounded-full" 
                            style={{ width: `${mapData.team1WinRate}%` }} 
                          />
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">{mapData.team1Games} games</div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-red-400">{team2}</span>
                          <span className="text-sm font-bold text-red-400">{mapData.team2WinRate}%</span>
                        </div>
                        <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-500 rounded-full" 
                            style={{ width: `${mapData.team2WinRate}%` }} 
                          />
                        </div>
                        <div className="text-xs text-[var(--text-tertiary)] mt-1">{mapData.team2Games} games</div>
                      </div>
                    </div>
                  </div>
                ))}
                {getMapComparison().length === 0 && (
                  <div className="text-center py-8 text-[var(--text-secondary)]">
                    No common map data available
                  </div>
                )}
              </div>
            </ChartContainer>
          </motion.div>

          {/* Radar Comparison */}
          <motion.div variants={itemVariants}>
            <ChartContainer title="Overall Comparison" subtitle="Performance metrics head-to-head">
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={getComparisonRadar()}>
                  <PolarGrid stroke="var(--border-primary)" />
                  <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} />
                  <Radar
                    name={filters.team}
                    dataKey="team1"
                    stroke="#00AEEF"
                    fill="#00AEEF"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name={team2}
                    dataKey="team2"
                    stroke="#ef4444"
                    fill="#ef4444"
                    fillOpacity={0.3}
                  />
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface-primary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </motion.div>

          {/* Match History */}
          {h2hData?.matches && h2hData.matches.length > 0 && (
            <motion.div variants={itemVariants}>
              <ChartContainer title="Head-to-Head History" subtitle="Previous encounters between these teams">
                <div className="space-y-3">
                  {h2hData.matches.map((match, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center justify-between p-4 rounded-lg border',
                        'bg-[var(--surface-secondary)] border-[var(--border-primary)]'
                      )}
                    >
                      <div className="flex-1">
                        <span className="text-sm text-[var(--text-secondary)]">
                          {match.tournament || 'VCT Match'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={cn(
                          'font-bold',
                          match.winner === filters.team ? 'text-c9-500' : 'text-[var(--text-secondary)]'
                        )}>
                          {filters.team}
                        </span>
                        <span className="px-3 py-1 bg-[var(--surface-tertiary)] rounded text-sm font-mono">
                          {match.score || '2-1'}
                        </span>
                        <span className={cn(
                          'font-bold',
                          match.winner === team2 ? 'text-red-500' : 'text-[var(--text-secondary)]'
                        )}>
                          {team2}
                        </span>
                      </div>
                      <div className="text-sm text-[var(--text-tertiary)]">
                        {match.event || 'VCT Americas'}
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

export default HeadToHeadPage;
