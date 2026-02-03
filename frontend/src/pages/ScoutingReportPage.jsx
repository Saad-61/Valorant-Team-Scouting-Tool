// Automated Scouting Report Generator Page
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { AnalyticsCard } from '../components/ui/AnalyticsCard';
import { ChartContainer } from '../components/ui/ChartContainer';
import { TeamSelector } from '../components/ui/TeamSelector';
import { TeamRequiredPrompt } from '../components/ui/TeamRequiredPrompt';
import { cn } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import {
  FileText, Download, Trophy, Target, Users, Map as MapIcon, Shield,
  AlertTriangle, TrendingUp, TrendingDown, Crosshair, Zap,
  Eye, Brain, Swords, Clock, ChevronDown, ChevronRight,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

// Role colors
const ROLE_COLORS = {
  Controller: '#10B981',
  Initiator: '#F59E0B',
  Sentinel: '#3B82F6',
  Duelist: '#EF4444',
};

export function ScoutingReportPage() {
  const { filters, setFilter } = useAppStore();
  const [teams, setTeams] = useState([]);
  const [scoutData, setScoutData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    mapPool: true,
    compositions: true,
    players: true,
    weaknesses: true,
    strategies: true,
  });
  const reportRef = useRef(null);

  // Fetch teams
  useEffect(() => {
    api.getTeams().then(res => setTeams(res.data || []));
  }, []);

  // Fetch full scouting data when team changes
  useEffect(() => {
    if (!filters.team) {
      setScoutData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    
    api.getFullScoutingData(filters.team)
      .then(res => {
        console.log('Scout API Raw Response:', res);
        // API response: { team_name, num_matches, data: { overview, players, etc } }
        // getFullScoutingData does .then(res => res.data), so res = { team_name, num_matches, data: {...} }
        // The actual scouting data is in res.data
        const scoutingData = res?.data;
        
        if (!scoutingData || !scoutingData.overview) {
          console.warn('No overview data in response. scoutingData:', scoutingData);
          setError('No scouting data available for this team');
          setScoutData(null);
        } else {
          console.log('Setting scout data with overview:', scoutingData.overview);
          setScoutData(scoutingData);
        }
      })
      .catch(err => {
        console.error('Scouting data fetch error:', err);
        setError(`Failed to load scouting data: ${err.message}`);
        setScoutData(null);
      })
      .finally(() => setLoading(false));
  }, [filters.team]);

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Export report as text/markdown
  const exportReport = () => {
    if (!scoutData) return;

    const report = generateTextReport();
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filters.team}_scouting_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Generate text report
  const generateTextReport = () => {
    const { overview, compositions, pistol_rounds, players, round_patterns, weapon_economy, weaknesses } = scoutData;
    
    let report = `# Scouting Report: ${filters.team}\n`;
    report += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    // Overview
    report += `## Team Overview\n`;
    report += `- **Win Rate:** ${overview?.win_rate?.toFixed(1) || 0}%\n`;
    report += `- **Series Record:** ${overview?.series_record || 'N/A'}\n\n`;
    
    // Map Pool
    report += `## Map Pool Analysis\n`;
    if (overview?.map_stats) {
      overview.map_stats.forEach(map => {
        report += `### ${map.map}\n`;
        report += `- Games: ${map.games}\n`;
        report += `- Win Rate: ${map.win_rate?.toFixed(1) || 0}%\n`;
        report += `- Avg Round Diff: ${map.avg_round_diff?.toFixed(1) || 0}\n\n`;
      });
    }
    
    // Agent Compositions
    report += `## Agent Compositions\n`;
    if (compositions?.agent_picks) {
      report += `### Top Agents\n`;
      compositions.agent_picks.slice(0, 5).forEach(agent => {
        report += `- **${agent.agent}** (${agent.role}): ${agent.pick_rate?.toFixed(1)}% pick rate\n`;
      });
      report += `\n`;
    }
    
    // Weaknesses (nested structure)
    report += `## Identified Weaknesses\n`;
    const weaknessList = weaknesses?.weaknesses || [];
    if (weaknessList.length) {
      weaknessList.forEach((w, i) => {
        report += `### ${i + 1}. ${w.category || w.area || 'Weakness'}\n`;
        report += `- **Severity:** ${w.severity || 'Medium'}\n`;
        report += `- **Finding:** ${w.finding || 'N/A'}\n`;
        report += `- **Details:** ${Array.isArray(w.details) ? w.details.join('; ') : (w.details || 'N/A')}\n`;
        report += `- **Recommendation:** ${w.recommendation || 'N/A'}\n\n`;
      });
    } else {
      report += `No major weaknesses identified.\n\n`;
    }
    
    // Players (nested structure)
    report += `## Player Profiles\n`;
    const playerList = players?.players || [];
    if (playerList.length) {
      playerList.forEach(player => {
        report += `### ${player.name || player.player_name}\n`;
        report += `- **K/D:** ${(player.kd_ratio || player.kd)?.toFixed(2) || 'N/A'}\n`;
        report += `- **Games:** ${player.games || 'N/A'}\n`;
        report += `- **Agent Pool:** ${Array.isArray(player.agent_pool) ? player.agent_pool.join(', ') : (player.agent_pool || 'N/A')}\n\n`;
      });
    }
    
    // Strategies
    report += `## Strategic Tendencies\n`;
    if (pistol_rounds) {
      report += `### Pistol Rounds\n`;
      report += `- **Attack Win Rate:** ${pistol_rounds.attack_pistol?.win_rate?.toFixed(1) || pistol_rounds.attack?.toFixed(1) || 0}%\n`;
      report += `- **Defense Win Rate:** ${pistol_rounds.defense_pistol?.win_rate?.toFixed(1) || pistol_rounds.defense?.toFixed(1) || 0}%\n`;
      report += `- **Overall Pistol Win Rate:** ${pistol_rounds.overall_pistol_win_rate?.toFixed(1) || 0}%\n\n`;
    }
    if (round_patterns) {
      report += `### Round Patterns\n`;
      const attackPatterns = round_patterns.win_conditions?.attack || [];
      const defensePatterns = round_patterns.win_conditions?.defense || [];
      attackPatterns.slice(0, 2).forEach(p => {
        report += `- **Attack ${p.condition}:** ${p.percentage?.toFixed(1) || 0}%\n`;
      });
      defensePatterns.slice(0, 2).forEach(p => {
        report += `- **Defense ${p.condition}:** ${p.percentage?.toFixed(1) || 0}%\n`;
      });
      report += `\n`;
    }
    
    return report;
  };

  // Section header component
  const SectionHeader = ({ title, icon: Icon, section, color = 'c9-500' }) => (
    <button
      onClick={() => toggleSection(section)}
      className={cn(
        'w-full flex items-center justify-between p-4 rounded-lg',
        'bg-[var(--surface-secondary)] border border-[var(--border-primary)]',
        'hover:bg-[var(--surface-tertiary)] transition-colors'
      )}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}/20`}>
          <Icon className={`w-5 h-5 text-${color}`} />
        </div>
        <span className="font-bold text-[var(--text-primary)]">{title}</span>
      </div>
      {expandedSections[section] ? (
        <ChevronDown className="w-5 h-5 text-[var(--text-secondary)]" />
      ) : (
        <ChevronRight className="w-5 h-5 text-[var(--text-secondary)]" />
      )}
    </button>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-c9-500/20">
            <FileText className="w-6 h-6 text-c9-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Scouting Report Generator</h1>
            <p className="text-sm text-[var(--text-secondary)]">Automated tactical analysis for match preparation</p>
          </div>
        </div>
        <TeamSelector
          teams={teams}
          value={filters.team}
          onChange={(team) => setFilter('team', team)}
          placeholder="Select team to scout..."
          className="w-64"
        />
      </motion.div>

      {/* No team selected */}
      {!filters.team ? (
        <TeamRequiredPrompt 
          title="Automated Scouting Report"
          subtitle="Select a team above to generate a comprehensive scouting report including strategies, compositions, weaknesses, and player tendencies."
        />
      ) : loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--surface-tertiary)] border-t-c9-500" />
            <div className="absolute inset-0 animate-ping rounded-full border-2 border-c9-500 opacity-20 h-16 w-16" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">Generating Scouting Report</p>
            <p className="text-[var(--text-secondary)] text-sm">Analyzing {filters.team} data...</p>
          </div>
          <div className="w-64 h-1.5 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-c9-500 to-c9-400 rounded-full animate-pulse" style={{ width: '70%' }} />
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="p-4 rounded-full bg-red-500/10">
            <AlertTriangle className="w-12 h-12 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">Failed to Load Data</p>
            <p className="text-[var(--text-secondary)] text-sm">{error}</p>
          </div>
          <button
            onClick={() => {
              // Trigger a refetch by resetting and re-setting the team
              const currentTeam = filters.team;
              setFilter('team', null);
              setTimeout(() => setFilter('team', currentTeam), 100);
            }}
            className="px-4 py-2 bg-c9-500 text-white rounded-lg hover:bg-c9-600 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : !scoutData || !scoutData.overview ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="p-4 rounded-full bg-yellow-500/10">
            <AlertTriangle className="w-12 h-12 text-yellow-500" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">No Data Available</p>
            <p className="text-[var(--text-secondary)] text-sm">No scouting data found for {filters.team}</p>
          </div>
        </div>
      ) : (
        <div ref={reportRef} className="space-y-6">
          {/* Export Button */}
          <motion.div variants={itemVariants} className="flex justify-end">
            <button
              onClick={exportReport}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-c9-500 text-white hover:bg-c9-600 transition-colors',
                'font-medium shadow-lg'
              )}
            >
              <Download className="w-4 h-4" />
              Export Report
            </button>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnalyticsCard
              title="Overall Win Rate"
              value={`${scoutData.overview?.win_rate?.toFixed(1) || 0}%`}
              icon={Trophy}
              variant={scoutData.overview?.win_rate >= 50 ? 'success' : 'danger'}
              subtitle={scoutData.overview?.series_record || 'N/A'}
            />
            <AnalyticsCard
              title="Map Pool Size"
              value={scoutData.overview?.map_stats?.length || 0}
              icon={MapIcon}
              subtitle="Maps in rotation"
            />
            <AnalyticsCard
              title="Weaknesses Found"
              value={scoutData.weaknesses?.weaknesses?.length || 0}
              icon={AlertTriangle}
              variant={(scoutData.weaknesses?.weaknesses?.length || 0) > 0 ? 'warning' : 'success'}
              subtitle="Exploitable areas"
            />
            <AnalyticsCard
              title="Players Analyzed"
              value={scoutData.players?.players?.length || 0}
              icon={Users}
              subtitle="Active roster"
            />
          </motion.div>

          {/* Overview Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Team Overview" icon={Eye} section="overview" />
            {expandedSections.overview && (
              <div className="p-4 rounded-lg border bg-[var(--surface-primary)] border-[var(--border-primary)]">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-2">Recent Performance</h4>
                    <div className="space-y-2">
                      {scoutData.overview?.recent_series?.slice(0, 3).map((series, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-[var(--surface-secondary)]">
                          <span className="text-sm text-[var(--text-primary)]">{series.opponent}</span>
                          <span className={cn(
                            'text-sm font-bold',
                            series.result === 'W' ? 'text-green-400' : 'text-red-400'
                          )}>
                            {series.score}
                          </span>
                        </div>
                      )) || <span className="text-[var(--text-tertiary)]">No recent series data</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-2">Pistol Round Stats</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[var(--text-tertiary)]">Attack</span>
                          <span className={(scoutData.pistol_rounds?.attack_pistol?.win_rate || 0) >= 50 ? 'text-green-400' : 'text-red-400'}>
                            {(scoutData.pistol_rounds?.attack_pistol?.win_rate || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" 
                            style={{ width: `${scoutData.pistol_rounds?.attack_pistol?.win_rate || 0}%` }} 
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-[var(--text-tertiary)]">Defense</span>
                          <span className={(scoutData.pistol_rounds?.defense_pistol?.win_rate || 0) >= 50 ? 'text-green-400' : 'text-red-400'}>
                            {(scoutData.pistol_rounds?.defense_pistol?.win_rate || 0).toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" 
                            style={{ width: `${scoutData.pistol_rounds?.defense_pistol?.win_rate || 0}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-2">Round Patterns</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Elimination Rate</span>
                        <span className="text-[var(--text-primary)]">{scoutData.round_patterns?.elimination_rate?.toFixed(1) || 0}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Post-Plant Conv.</span>
                        <span className="text-[var(--text-primary)]">{scoutData.round_patterns?.post_plant_conversion?.toFixed(1) || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Map Pool Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Map Pool Analysis" icon={MapIcon} section="mapPool" />
            {expandedSections.mapPool && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scoutData.overview?.map_stats?.map((map, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-4 rounded-lg border',
                      'bg-[var(--surface-secondary)] border-[var(--border-primary)]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-[var(--text-primary)] capitalize">{map.map}</span>
                      <span className={cn(
                        'text-lg font-bold',
                        map.win_rate >= 50 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {(map.win_rate || 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] mb-3">{map.games} games played</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Wins</span>
                        <span className="text-green-400">{map.wins}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[var(--text-tertiary)]">Avg Diff</span>
                        <span className={(map.avg_round_diff || 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {map.avg_round_diff >= 0 ? '+' : ''}{(map.avg_round_diff || 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                )) || <div className="text-[var(--text-tertiary)]">No map data available</div>}
              </div>
            )}
          </motion.div>

          {/* Agent Compositions Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Agent Compositions" icon={Users} section="compositions" />
            {expandedSections.compositions && (
              <div className="p-4 rounded-lg border bg-[var(--surface-primary)] border-[var(--border-primary)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-3">Top Picked Agents</h4>
                    <div className="space-y-2">
                      {scoutData.compositions?.agent_picks?.slice(0, 6).map((agent, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-[var(--surface-secondary)]">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{agent.agent}</span>
                            <span 
                              className="px-2 py-0.5 text-xs rounded"
                              style={{ backgroundColor: `${ROLE_COLORS[agent.role]}20`, color: ROLE_COLORS[agent.role] }}
                            >
                              {agent.role}
                            </span>
                          </div>
                          <span className="text-sm font-bold text-c9-400">{agent.pick_rate?.toFixed(0)}%</span>
                        </div>
                      )) || <span className="text-[var(--text-tertiary)]">No agent data</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-3">Role Distribution</h4>
                    <div className="space-y-3">
                      {Object.entries(scoutData.compositions?.role_distribution || {}).map(([role, value]) => (
                        <div key={role}>
                          <div className="flex justify-between text-sm mb-1">
                            <span style={{ color: ROLE_COLORS[role] }}>{role}</span>
                            <span className="text-[var(--text-primary)]">{value?.toFixed(0)}%</span>
                          </div>
                          <div className="h-2 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ width: `${value || 0}%`, backgroundColor: ROLE_COLORS[role] }} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Weaknesses Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Identified Weaknesses" icon={AlertTriangle} section="weaknesses" color="yellow-500" />
            {expandedSections.weaknesses && (
              <div className="space-y-3">
                {(scoutData.weaknesses?.weaknesses?.length > 0) ? scoutData.weaknesses.weaknesses.map((weakness, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-4 rounded-lg border-l-4',
                      'bg-[var(--surface-secondary)]',
                      weakness.severity?.toUpperCase() === 'HIGH' ? 'border-l-red-500' :
                      weakness.severity?.toUpperCase() === 'MEDIUM' ? 'border-l-yellow-500' :
                      'border-l-blue-500'
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-[var(--text-primary)]">{weakness.category || weakness.area || `Weakness #${idx + 1}`}</span>
                      <span className={cn(
                        'px-2 py-1 text-xs rounded font-medium',
                        weakness.severity?.toUpperCase() === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                        weakness.severity?.toUpperCase() === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      )}>
                        {weakness.severity || 'Medium'}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] mb-1 font-medium">{weakness.finding}</p>
                    <p className="text-sm text-[var(--text-secondary)] mb-2">{Array.isArray(weakness.details) ? weakness.details.join('; ') : weakness.details}</p>
                    <div className="flex items-start gap-2 p-2 rounded bg-[var(--surface-tertiary)]">
                      <Brain className="w-4 h-4 text-c9-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-c9-400">{weakness.recommendation}</p>
                    </div>
                  </div>
                )) : (
                  <div className="p-4 rounded-lg bg-[var(--surface-secondary)] text-center text-[var(--text-secondary)]">
                    No significant weaknesses identified
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Player Profiles Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Player Profiles" icon={Crosshair} section="players" />
            {expandedSections.players && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scoutData.players?.players?.map((player, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      'p-4 rounded-lg border',
                      'bg-[var(--surface-secondary)] border-[var(--border-primary)]'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-[var(--text-primary)]">{player.name || player.player_name}</span>
                      <span className={cn(
                        'text-lg font-bold',
                        (player.kd_ratio || player.kd || 0) >= 1 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {(player.kd_ratio || player.kd)?.toFixed(2) || 'N/A'} K/D
                      </span>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mb-2">
                      {player.games} games • {player.kills}/{player.deaths}/{player.assists} KDA
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(Array.isArray(player.agent_pool) ? player.agent_pool : (player.agent_pool || '').split(', ').filter(a => a))?.slice(0, 4).map((agent, aidx) => (
                        <span
                          key={aidx}
                          className="px-2 py-1 text-xs rounded bg-[var(--surface-tertiary)] text-[var(--text-secondary)] capitalize"
                        >
                          {agent}
                        </span>
                      ))}
                    </div>
                  </div>
                )) || <div className="text-[var(--text-tertiary)]">No player data available</div>}
              </div>
            )}
          </motion.div>

          {/* Strategies Section */}
          <motion.div variants={itemVariants} className="space-y-3">
            <SectionHeader title="Strategic Analysis" icon={Brain} section="strategies" />
            {expandedSections.strategies && (
              <div className="p-4 rounded-lg border bg-[var(--surface-primary)] border-[var(--border-primary)]">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-yellow-400" />
                      Weapon Economy
                    </h4>
                    <div className="space-y-2 text-sm">
                      {scoutData.weapon_economy?.weapon_usage?.slice(0, 4).map((weapon, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-[var(--surface-secondary)]">
                          <span className="text-[var(--text-primary)] capitalize">{weapon.weapon}</span>
                          <span className="text-[var(--text-tertiary)]">{weapon.kills || 0} kills</span>
                        </div>
                      )) || <span className="text-[var(--text-tertiary)]">No weapon data</span>}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                      <Swords className="w-4 h-4 text-red-400" />
                      Key Insights
                    </h4>
                    <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                      <div className="p-2 rounded bg-[var(--surface-secondary)]">
                        {(scoutData.pistol_rounds?.attack_pistol?.win_rate || 0) >= 50 
                          ? '✅ Strong attack pistol rounds - expect aggressive buys'
                          : '⚠️ Weak attack pistols - may play passive early rounds'}
                      </div>
                      <div className="p-2 rounded bg-[var(--surface-secondary)]">
                        {(scoutData.round_patterns?.post_plant?.[0]?.conversion_rate || 0) >= 50
                          ? '✅ Strong post-plant conversion - plays time well'
                          : '⚠️ Lower post-plant conversion - may struggle in clutches'}
                      </div>
                      <div className="p-2 rounded bg-[var(--surface-secondary)]">
                        {scoutData.overview?.map_stats?.length >= 5
                          ? '✅ Deep map pool - versatile team'
                          : '⚠️ Limited map pool - predictable vetoes'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export default ScoutingReportPage;
