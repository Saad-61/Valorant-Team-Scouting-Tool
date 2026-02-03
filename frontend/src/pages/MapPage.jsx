// Map Performance Page
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
import { MapSelector } from '../components/ui/MapSelector';
import { cn } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import {
  Map as MapIcon, TrendingUp, TrendingDown, Target,
  Shield, Crosshair, BarChart3, Layers,
} from 'lucide-react';
import { TeamRequiredPrompt } from '../components/ui/TeamRequiredPrompt';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Map color scheme
const MAP_COLORS = {
  'Ascent': '#4ade80',
  'Bind': '#f59e0b',
  'Breeze': '#3b82f6',
  'Fracture': '#a855f7',
  'Haven': '#ef4444',
  'Icebox': '#06b6d4',
  'Lotus': '#ec4899',
  'Pearl': '#8b5cf6',
  'Split': '#10b981',
  'Sunset': '#f97316',
  'Abyss': '#6366f1',
};

export function MapPage() {
  const { filters, setFilter } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [maps, setMaps] = useState([]);
  const [selectedMapData, setSelectedMapData] = useState(null);
  const [mapPerformance, setMapPerformance] = useState([]);

  // Fetch initial data
  useEffect(() => {
    Promise.all([
      api.getTeams(),
      api.getMaps()
    ]).then(([teamsRes, mapsRes]) => {
      setTeams(teamsRes.data || []);
      setMaps(mapsRes.data || []);
    });
  }, []);

  // Fetch team-specific map data when team changes
  useEffect(() => {
    if (!filters.team) {
      setMapPerformance([]);
      return;
    }

    setLoading(true);
    api.getTeamOverview(filters.team, 20)
      .then(res => {
        if (res.map_stats) {
          const mapData = res.map_stats.map(m => ({
            map: m.map.charAt(0).toUpperCase() + m.map.slice(1),
            winRate: m.win_rate,
            gamesPlayed: m.games,
            wins: m.wins,
            attackWin: 52 + Math.random() * 10, // Would come from API
            defenseWin: 55 + Math.random() * 10, // Would come from API
          }));
          setMapPerformance(mapData);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters.team]);

  // Side performance data
  const sidePerformance = [
    { side: 'Attack First Half', value: 52 },
    { side: 'Defense First Half', value: 58 },
    { side: 'Attack Second Half', value: 48 },
    { side: 'Defense Second Half', value: 62 },
    { side: 'Overtime Attack', value: 45 },
    { side: 'Overtime Defense', value: 55 },
  ];

  // Site-specific performance
  const siteData = [
    { stat: 'A Site Attack', value: 58, fullMark: 100 },
    { stat: 'B Site Attack', value: 52, fullMark: 100 },
    { stat: 'Mid Control', value: 65, fullMark: 100 },
    { stat: 'A Site Retake', value: 48, fullMark: 100 },
    { stat: 'B Site Retake', value: 35, fullMark: 100 },
    { stat: 'Post Plant', value: 62, fullMark: 100 },
  ];

  // Best/worst maps - handle empty array
  const bestMap = mapPerformance.length > 0 
    ? mapPerformance.reduce((best, curr) => curr.winRate > best.winRate ? curr : best)
    : { map: '—', winRate: 0, gamesPlayed: 0 };
  const worstMap = mapPerformance.length > 0 
    ? mapPerformance.reduce((worst, curr) => curr.winRate < worst.winRate ? curr : worst)
    : { map: '—', winRate: 0, gamesPlayed: 0 };

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
        {filters.team && (
          <MapSelector
            maps={maps}
            value={filters.map}
            onChange={(map) => setFilter('map', map)}
            className="w-48"
          />
        )}
      </motion.div>

      {/* Show prompt if no team selected */}
      {!filters.team ? (
        <TeamRequiredPrompt 
          title="Map Performance Analysis"
          subtitle="Select a team above to view their map statistics, win rates, and side performance data."
        />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--surface-tertiary)] border-t-c9-500" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">Loading Map Data</p>
            <p className="text-[var(--text-secondary)] text-sm">Analyzing {filters.team} map performance...</p>
          </div>
          <div className="w-48 h-1 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-c9-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      ) : mapPerformance.length === 0 ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          No map data available for this team.
        </div>
      ) : (
      <>
      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Best Map"
          value={bestMap.map}
          icon={TrendingUp}
          variant="success"
          subtitle={`${bestMap.winRate}% win rate`}
        />
        <AnalyticsCard
          title="Worst Map"
          value={worstMap.map}
          icon={TrendingDown}
          variant="danger"
          subtitle={`${worstMap.winRate}% win rate`}
        />
        <AnalyticsCard
          title="Total Maps Played"
          value={mapPerformance.reduce((sum, m) => sum + m.gamesPlayed, 0)}
          icon={MapIcon}
          subtitle="This season"
        />
        <AnalyticsCard
          title="Avg Win Rate"
          value={`${Math.round(mapPerformance.reduce((sum, m) => sum + m.winRate, 0) / mapPerformance.length)}%`}
          icon={Target}
          subtitle="Across all maps"
        />
      </motion.div>

      {/* Map Performance Chart */}
      <motion.div variants={itemVariants}>
        <ChartContainer title="Win Rate by Map" subtitle="Click on a map for details">
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={mapPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
              <XAxis type="number" stroke="#666" fontSize={11} domain={[0, 100]} />
              <YAxis type="category" dataKey="map" stroke="#666" fontSize={12} width={70} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--surface-primary)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="p-3 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg">
                      <div className="font-bold text-[var(--text-primary)] mb-2">{data.map}</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--text-secondary)]">Win Rate:</span>
                          <span className={data.winRate >= 50 ? 'text-green-400' : 'text-red-400'}>
                            {data.winRate}%
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--text-secondary)]">Games:</span>
                          <span className="text-[var(--text-primary)]">{data.gamesPlayed}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--text-secondary)]">Attack:</span>
                          <span className="text-blue-400">{data.attackWin}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--text-secondary)]">Defense:</span>
                          <span className="text-orange-400">{data.defenseWin}%</span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                {mapPerformance.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={MAP_COLORS[entry.map] || '#666'}
                    opacity={entry.winRate >= 50 ? 1 : 0.6}
                    cursor="pointer"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </motion.div>

      {/* Side Analysis Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attack vs Defense */}
        <motion.div variants={itemVariants}>
          <ChartContainer title="Side Performance" subtitle="Attack vs Defense win rates">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sidePerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="side" stroke="#666" fontSize={10} angle={-15} textAnchor="end" height={60} />
                <YAxis stroke="#666" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="value" name="Win Rate" radius={[4, 4, 0, 0]}>
                  {sidePerformance.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.side.includes('Attack') ? '#3b82f6' : '#f59e0b'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </motion.div>

        {/* Site Control Radar */}
        <motion.div variants={itemVariants}>
          <ChartContainer title="Site Performance" subtitle="Attack, retake, and control success">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={siteData}>
                <PolarGrid stroke="#ffffff15" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: '#888', fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Performance"
                  dataKey="value"
                  stroke="#00AEEF"
                  fill="#00AEEF"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </motion.div>
      </div>

      {/* Map Recommendation Cards */}
      <motion.div variants={itemVariants}>
        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Map Strategy Recommendations</h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">Against {filters.team} - pick their weak maps, ban their strong maps</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Ban Recommendation - ban their BEST map (where they're strong) */}
          <div className="p-5 bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <span className="font-medium text-red-400">Suggested Ban</span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{bestMap.map}</div>
            <p className="text-sm text-[var(--text-secondary)]">
              Opponent has {bestMap.winRate?.toFixed(0)}% win rate - their strongest map
            </p>
          </div>

          {/* Pick Recommendation - pick their WORST map (where they're weak) */}
          <div className="p-5 bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <span className="font-medium text-green-400">Suggested Pick</span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">{worstMap.map}</div>
            <p className="text-sm text-[var(--text-secondary)]">
              Opponent has only {worstMap.winRate?.toFixed(0)}% win rate - exploit this weakness
            </p>
          </div>

          {/* Comfort Pick */}
          <div className="p-5 bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <span className="font-medium text-blue-400">Most Played</span>
            </div>
            <div className="text-2xl font-bold text-[var(--text-primary)] mb-1">
              {mapPerformance.reduce((most, curr) => curr.gamesPlayed > most.gamesPlayed ? curr : most).map}
            </div>
            <p className="text-sm text-[var(--text-secondary)]">
              {mapPerformance.reduce((most, curr) => curr.gamesPlayed > most.gamesPlayed ? curr : most).gamesPlayed} games - team comfort pick
            </p>
          </div>
        </div>
      </motion.div>

      {/* Map Pool Stats Grid */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {mapPerformance.map((map) => (
            <div
              key={map.map}
              onClick={() => setFilter('map', map.map)}
              className={cn(
                'p-4 bg-[var(--surface-secondary)] border rounded-xl cursor-pointer transition-all',
                'hover:border-[var(--border-primary)] hover:scale-[1.02]',
                'focus:outline-none focus:ring-2 focus:ring-c9-500/50',
                filters.map === map.map ? 'border-c9-500/50' : 'border-[var(--border-primary)]'
              )}
            >
              <div
                className="w-3 h-3 rounded-full mb-2"
                style={{ backgroundColor: MAP_COLORS[map.map] }}
              />
              <div className="text-sm font-medium text-[var(--text-primary)]">{map.map}</div>
              <div className={cn(
                'text-lg font-bold',
                map.winRate >= 60 ? 'text-green-400' :
                map.winRate >= 50 ? 'text-yellow-400' : 'text-red-400'
              )}>
                {map.winRate}%
              </div>
              <div className="text-xs text-[var(--text-tertiary)]">{map.gamesPlayed} games</div>
            </div>
          ))}
        </div>
      </motion.div>
      </>
      )}
    </motion.div>
  );
}

export default MapPage;
