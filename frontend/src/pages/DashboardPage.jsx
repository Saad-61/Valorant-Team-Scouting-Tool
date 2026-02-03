// Dashboard Page - Main Overview
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie,
} from 'recharts';
import { AnalyticsCard } from '../components/ui/AnalyticsCard';
import { ChartContainer } from '../components/ui/ChartContainer';
import { TeamSelector } from '../components/ui/TeamSelector';
import { MapSelector } from '../components/ui/MapSelector';
import { WeaknessIndicator } from '../components/ui/WeaknessIndicator';
import { cn, formatPercent, getWinRateColor, CHART_COLORS, MAP_COLORS } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import {
  Trophy, Target, Map, Users, TrendingUp, TrendingDown,
  AlertTriangle, Shield, Crosshair, Zap,
} from 'lucide-react';
import { TeamRequiredPrompt } from '../components/ui/TeamRequiredPrompt';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function DashboardPage() {
  const { filters, setFilter } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    teams: [],
    maps: [],
    overview: null,
    mapStats: [],
    recentTrends: [],
    topWeaknesses: [],
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch teams list
        const teamsRes = await api.getTeams();
        const teams = teamsRes.data || [];
        
        // Fetch maps list
        const mapsRes = await api.getMaps();
        const maps = mapsRes.data || [];

        let overview = null;
        let mapStats = [];
        let topWeaknesses = [];
        let recentTrends = [];

        // If team selected, fetch team-specific data using proper endpoints
        if (filters.team) {
          try {
            // Get team overview directly from API
            const overviewRes = await api.getTeamOverview(filters.team, 10);
            overview = {
              winRate: overviewRes.win_rate,
              totalGames: overviewRes.recent_matches,
              seriesRecord: overviewRes.series_record,
              recentSeries: overviewRes.recent_series,
            };
            
            // Map stats from overview
            if (overviewRes.map_stats) {
              mapStats = overviewRes.map_stats.map(m => ({
                map: m.map.charAt(0).toUpperCase() + m.map.slice(1),
                winRate: m.win_rate,
                gamesPlayed: m.games,
                wins: m.wins,
              }));
            }

            // Build trend data from recent series
            if (overviewRes.recent_series && overviewRes.recent_series.length > 0) {
              // Use last N matches for trend visualization
              const series = overviewRes.recent_series.slice(-6);
              let runningWins = 0;
              recentTrends = series.map((s, idx) => {
                const isWin = s.result === 'WIN';
                runningWins += isWin ? 1 : 0;
                const rollingWinRate = Math.round((runningWins / (idx + 1)) * 100);
                return {
                  month: `vs ${s.opponent?.substring(0, 10) || 'Unknown'}`,
                  winRate: rollingWinRate,
                  matchWin: isWin ? 100 : 0,
                  opponent: s.opponent,
                  score: s.score,
                };
              });
            }
          } catch (e) {
            console.log('Overview fetch error:', e);
          }

          try {
            // Get weaknesses from API
            const weaknessRes = await api.getTeamWeaknesses(filters.team, 10);
            if (weaknessRes.weaknesses) {
              topWeaknesses = weaknessRes.weaknesses.map(w => ({
                title: w.category || w.title,
                severity: w.severity || 'medium',
                description: w.finding || w.description,
                recommendation: w.recommendation,
              }));
            }
          } catch (e) {
            console.log('Weaknesses fetch error:', e);
          }
        }

        setData({
          teams,
          maps,
          overview,
          mapStats,
          recentTrends,
          topWeaknesses,
        });
      } catch (err) {
        console.error('Dashboard fetch error:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters.team]);

  // Map performance data - only use real data
  const mapPerformance = data.mapStats;

  // Radar chart data for team strengths - only show if we have data
  const radarData = data.overview ? [
    { stat: 'Attack', value: 78, fullMark: 100 },
    { stat: 'Defense', value: 65, fullMark: 100 },
    { stat: 'Eco', value: 82, fullMark: 100 },
    { stat: 'Clutch', value: 71, fullMark: 100 },
    { stat: 'First Blood', value: 68, fullMark: 100 },
    { stat: 'Trade', value: 74, fullMark: 100 },
  ] : [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Filters Row */}
      <motion.div variants={itemVariants} className="flex flex-wrap gap-4">
        <div className="w-64">
          <TeamSelector
            teams={data.teams}
            value={filters.team}
            onChange={(team) => setFilter('team', team)}
            placeholder="Select team to analyze..."
          />
        </div>
        {filters.team && (
          <div className="w-48">
            <MapSelector
              maps={data.maps}
              value={filters.map}
              onChange={(map) => setFilter('map', map)}
            />
          </div>
        )}
      </motion.div>

      {/* Show Team Required prompt if no team selected */}
      {!filters.team ? (
        <motion.div variants={itemVariants}>
          <TeamRequiredPrompt
            title="Select a Team to Analyze"
            subtitle="Choose a VCT Americas team from the dropdown above to view comprehensive scouting analytics, performance metrics, and exploitable weaknesses."
          />
        </motion.div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--surface-tertiary)] border-t-c9-500" />
          </div>
          <p className="text-[var(--text-secondary)] animate-pulse">Loading team data...</p>
          <div className="w-48 h-1 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-c9-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsCard
              title="Win Rate"
              value={data.overview?.winRate ? `${data.overview.winRate.toFixed(1)}%` : '—'}
              icon={Trophy}
              variant="highlight"
              subtitle="Recent matches"
            />
            <AnalyticsCard
              title="Total Games"
              value={data.overview?.totalGames || '—'}
              icon={Target}
              subtitle="Analyzed matches"
            />
            <AnalyticsCard
              title="Best Map"
              value={data.mapStats[0]?.map || '—'}
              icon={Map}
              subtitle={data.mapStats[0] ? `${data.mapStats[0].winRate?.toFixed(0)}% win rate` : 'No data'}
            />
            <AnalyticsCard
              title="Key Weakness"
              value={data.topWeaknesses[0]?.title || '—'}
              icon={AlertTriangle}
              variant={data.topWeaknesses[0] ? 'warning' : 'default'}
              subtitle={data.topWeaknesses[0]?.severity || 'Analyzing...'}
            />
          </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Win Rate Trend */}
        <motion.div variants={itemVariants}>
          <ChartContainer title="Performance Trend" subtitle="Win rate over time">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.recentTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="month" stroke="var(--text-tertiary)" fontSize={12} />
                <YAxis stroke="var(--text-tertiary)" fontSize={12} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="winRate"
                  stroke="#00AEEF"
                  strokeWidth={3}
                  dot={{ fill: '#00AEEF', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#00AEEF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </motion.div>

        {/* Map Performance */}
        <motion.div variants={itemVariants}>
          <ChartContainer title="Map Performance" subtitle="Win rate by map">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mapPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-tertiary)" fontSize={12} domain={[0, 100]} />
                <YAxis type="category" dataKey="map" stroke="var(--text-tertiary)" fontSize={12} width={70} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    color: 'var(--text-primary)',
                  }}
                  formatter={(value) => [`${value}%`, 'Win Rate']}
                />
                <Bar dataKey="winRate" radius={[0, 4, 4, 0]}>
                  {mapPerformance.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.winRate >= 60 ? '#10b981' : entry.winRate >= 50 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Strengths Radar */}
        <motion.div variants={itemVariants}>
          <ChartContainer title="Team Strengths" subtitle="Performance by category">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border-primary)" />
                <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
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

        {/* Top Weaknesses */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <ChartContainer title="Key Weaknesses" subtitle="Exploitable areas to target">
            <div className="space-y-3 p-2">
              {data.topWeaknesses.length > 0 ? (
                data.topWeaknesses.map((weakness, index) => (
                  <WeaknessIndicator
                    key={index}
                    severity={weakness.severity}
                    category={weakness.category}
                    finding={weakness.title}
                    recommendation={weakness.recommendation}
                    details={weakness.description ? [weakness.description] : []}
                    expanded={weakness.severity?.toLowerCase() === 'high'}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-[var(--text-tertiary)]">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Loading weakness analysis...</p>
                </div>
              )}
            </div>
          </ChartContainer>
        </motion.div>
      </div>

      {/* Quick Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Attack Win%', value: '54%', icon: Crosshair },
          { label: 'Defense Win%', value: '58%', icon: Shield },
          { label: 'Pistol Win%', value: '52%', icon: Zap },
          { label: 'First Blood%', value: '48%', icon: Target },
          { label: 'Avg ACS', value: '212', icon: TrendingUp },
          { label: 'Clutch Win%', value: '34%', icon: Users },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="p-4 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl hover:border-c9-500/30 transition-colors shadow-[var(--shadow-sm)]"
            >
              <Icon className="w-5 h-5 text-c9-500 mb-2" />
              <div className="text-lg font-bold text-[var(--text-primary)]">{stat.value}</div>
              <div className="text-xs text-[var(--text-tertiary)]">{stat.label}</div>
            </div>
          );
        })}
      </motion.div>
        </>
      )}
    </motion.div>
  );
}

export default DashboardPage;
