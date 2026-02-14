// Agent Compositions Page
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { AnalyticsCard } from '../components/ui/AnalyticsCard';
import { ChartContainer } from '../components/ui/ChartContainer';
import { TeamSelector } from '../components/ui/TeamSelector';
import { TeamRequiredPrompt } from '../components/ui/TeamRequiredPrompt';
import { cn } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import {
  Users, Crosshair, Shield, Eye, Layers,
  Target, TrendingUp, Zap,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Role colors
const ROLE_COLORS = {
  'Duelist': '#00AEEF',
  'Initiator': '#3b82f6',
  'Controller': '#8b5cf6',
  'Sentinel': '#10b981',
};

// Role icons
const ROLE_ICONS = {
  'Duelist': Crosshair,
  'Initiator': Eye,
  'Controller': Layers,
  'Sentinel': Shield,
};

export function CompositionsPage() {
  const { filters, setFilter } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [compositions, setCompositions] = useState(null);

  // Fetch teams
  useEffect(() => {
    api.getTeams().then(res => setTeams(res.data || []));
  }, []);

  // Fetch composition data when team changes
  useEffect(() => {
    if (!filters.team) {
      setCompositions(null);
      return;
    }

    setLoading(true);
    api.getTeamCompositions(filters.team, 20)
      .then(res => {
        setCompositions(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filters.team]);

  // Process agent pick rates - use agent_picks from API
  const getAgentPickRates = () => {
    if (!compositions?.agent_picks) return [];
    
    return compositions.agent_picks
      .sort((a, b) => b.pick_rate - a.pick_rate)
      .slice(0, 10)
      .map(agent => ({
        name: agent.agent.charAt(0).toUpperCase() + agent.agent.slice(1),
        pickRate: Math.round(agent.pick_rate),
        picks: agent.picks || 0,
        role: agent.role || 'Unknown',
        color: ROLE_COLORS[agent.role] || '#6b7280',
      }));
  };

  // Process role distribution - use role_distribution from API
  const getRoleDistribution = () => {
    if (!compositions?.role_distribution) return [];
    
    return Object.entries(compositions.role_distribution).map(([role, value]) => ({
      name: role,
      value: Math.round(value),
      color: ROLE_COLORS[role] || '#6b7280',
    }));
  };

  // Get compositions by map
  const getCompositionsByMap = () => {
    if (!compositions?.compositions_by_map) return [];
    
    return Object.entries(compositions.compositions_by_map).map(([map, comps]) => ({
      map: map.charAt(0).toUpperCase() + map.slice(1),
      compositions: comps.map(c => ({
        agents: c.agents.split(', ').map(a => a.charAt(0).toUpperCase() + a.slice(1)),
        timesPlayed: c.times_played,
        pickRate: Math.round(c.pick_rate),
      })),
    })).sort((a, b) => b.compositions[0]?.timesPlayed - a.compositions[0]?.timesPlayed);
  };

  const agentPickRates = getAgentPickRates();
  const roleDistribution = getRoleDistribution();
  const compositionsByMap = getCompositionsByMap();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Team Selector */}
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
          title="Agent Compositions"
          subtitle="Select a team above to view their agent pick rates, role preferences, and common team compositions."
        />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--surface-tertiary)] border-t-c9-500" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">Loading Compositions</p>
            <p className="text-[var(--text-secondary)] text-sm">Analyzing {filters.team} agent picks...</p>
          </div>
          <div className="w-48 h-1 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-c9-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      ) : !compositions ? (
        <div className="text-center py-12 text-[var(--text-secondary)]">
          No composition data available for this team.
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsCard
              title="Most Played Agent"
              value={agentPickRates[0]?.name || '—'}
              icon={Target}
              variant="primary"
              subtitle={agentPickRates[0] ? `${agentPickRates[0].pickRate}% pick rate` : '—'}
            />
            <AnalyticsCard
              title="Unique Agents"
              value={compositions?.agent_picks?.length || 0}
              icon={Users}
              subtitle="In agent pool"
            />
            <AnalyticsCard
              title="Primary Role"
              value={roleDistribution[0]?.name || '—'}
              icon={roleDistribution[0] ? ROLE_ICONS[roleDistribution[0].name] || Shield : Shield}
              subtitle="Most common role"
            />
            <AnalyticsCard
              title="Maps Played"
              value={compositionsByMap.length || 0}
              icon={Layers}
              subtitle="Unique map pool"
            />
          </motion.div>

          {/* Agent Pick Rates Chart */}
          <motion.div variants={itemVariants}>
            <ChartContainer title="Agent Pick Rates" subtitle="Most frequently selected agents">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={agentPickRates} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
                  <XAxis type="number" stroke="#666" fontSize={11} domain={[0, 100]} />
                  <YAxis type="category" dataKey="name" stroke="#666" fontSize={12} width={80} />
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
                          <div className="font-bold text-[var(--text-primary)] mb-2">{data.name}</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-secondary)]">Role:</span>
                              <span style={{ color: data.color }}>{data.role}</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-secondary)]">Pick Rate:</span>
                              <span className="text-[var(--text-primary)]">{data.pickRate}%</span>
                            </div>
                            <div className="flex justify-between gap-4">
                              <span className="text-[var(--text-secondary)]">Win Rate:</span>
                              <span className={data.winRate >= 50 ? 'text-green-400' : 'text-red-400'}>
                                {data.winRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="pickRate" radius={[0, 4, 4, 0]}>
                    {agentPickRates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Role Distribution */}
            <motion.div variants={itemVariants}>
              <ChartContainer title="Role Distribution" subtitle="Agent role preferences">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {roleDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface-primary)',
                        border: '1px solid var(--border-primary)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </motion.div>

            {/* Map Compositions */}
            <motion.div variants={itemVariants}>
              <ChartContainer title="Compositions by Map" subtitle="Team compositions per map">
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {compositionsByMap.length > 0 ? compositionsByMap.map((mapData) => (
                    <div
                      key={mapData.map}
                      className={cn(
                        'p-4 rounded-lg border',
                        'bg-[var(--surface-secondary)] border-[var(--border-primary)]'
                      )}
                    >
                      <div className="font-bold text-c9-400 mb-2">{mapData.map}</div>
                      <div className="space-y-2">
                        {mapData.compositions.slice(0, 2).map((comp, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex items-center gap-1 flex-wrap">
                              {comp.agents.map((agent, aidx) => (
                                <span
                                  key={aidx}
                                  className="px-2 py-1 text-xs rounded bg-[var(--surface-tertiary)] text-[var(--text-secondary)]"
                                >
                                  {agent}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 ml-2">
                              <span className="text-sm font-medium text-c9-400">{comp.pickRate}%</span>
                              <span className="text-xs text-[var(--text-tertiary)]">{comp.timesPlayed}x</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-8 text-[var(--text-secondary)]">
                      No composition data available
                    </div>
                  )}
                </div>
              </ChartContainer>
            </motion.div>
          </div>
        </>
      )}
    </motion.div>
  );
}

export default CompositionsPage;
