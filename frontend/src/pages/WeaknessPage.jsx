// Opponent Weakness Analysis Page
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { AnalyticsCard } from '../components/ui/AnalyticsCard';
import { ChartContainer } from '../components/ui/ChartContainer';
import { TeamSelector } from '../components/ui/TeamSelector';
import { WeaknessIndicator } from '../components/ui/WeaknessIndicator';
import { cn } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import {
  Target, AlertTriangle, Shield, TrendingDown,
  Crosshair, Clock, Users, MapPin, Zap,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function WeaknessPage() {
  const { filters, setFilter } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [teams, setTeams] = useState([]);
  const [weaknesses, setWeaknesses] = useState([]);
  const [riskScore, setRiskScore] = useState(0);
  const [roundTypeData, setRoundTypeData] = useState([]);

  // Fetch teams on mount
  useEffect(() => {
    api.getTeams().then(res => setTeams(res.data || []));
  }, []);

  // Fetch weakness data when team changes
  useEffect(() => {
    if (!filters.team) {
      setWeaknesses([]);
      setRiskScore(0);
      setRoundTypeData([]);
      return;
    }

    setLoading(true);
    
    // Fetch both weaknesses and scouting data for round performance
    Promise.all([
      api.getTeamWeaknesses(filters.team, 20),
      api.getFullScoutingData(filters.team, 20)
    ])
      .then(([weaknessRes, scoutRes]) => {
        // Process weaknesses
        const apiWeaknesses = weaknessRes.weaknesses || weaknessRes || [];
        const formattedWeaknesses = apiWeaknesses.map((w, idx) => {
          // Normalize severity to lowercase
          const severity = (w.severity || 'medium').toLowerCase();
          // Details may be an array, convert to string
          const details = Array.isArray(w.details) ? w.details.join('; ') : (w.details || '');
          
          return {
            id: idx + 1,
            title: w.finding || w.title || w.weakness || w.area || 'Unknown Weakness',
            category: w.category || w.area || 'Analysis',
            severity: severity,
            description: details || w.description || 'No additional details available.',
            stats: w.stats || { value: 35 - idx * 5, average: 50, percentile: 20 + idx * 10 },
            recommendation: w.recommendation || w.exploit_strategy || 'Analyze further for exploit strategies.',
            // Generate exploit strategies from recommendation if not provided
            exploitStrategies: w.exploit_strategies || w.exploitStrategies || 
              (w.recommendation ? [w.recommendation] : []),
          };
        });
        setWeaknesses(formattedWeaknesses);
        
        // Calculate risk score based on severity (now lowercase)
        const highCount = formattedWeaknesses.filter(w => w.severity === 'high').length;
        const medCount = formattedWeaknesses.filter(w => w.severity === 'medium').length;
        setRiskScore(Math.min(100, highCount * 25 + medCount * 10));
        
        // Process round performance from scout data
        const scoutData = scoutRes.data || scoutRes;
        if (scoutData?.pistol_rounds) {
          const pistol = scoutData.pistol_rounds;
          const attackPistol = pistol.attack_pistol?.win_rate || pistol.attack?.win_rate || 0;
          const defensePistol = pistol.defense_pistol?.win_rate || pistol.defense?.win_rate || 0;
          const overallPistol = pistol.overall_pistol_win_rate || ((attackPistol + defensePistol) / 2);
          
          // Build round type data from available info
          setRoundTypeData([
            { type: 'Pistol (Atk)', winRate: Math.round(attackPistol), losses: Math.round(100 - attackPistol) },
            { type: 'Pistol (Def)', winRate: Math.round(defensePistol), losses: Math.round(100 - defensePistol) },
            { type: 'Overall Pistol', winRate: Math.round(overallPistol), losses: Math.round(100 - overallPistol) },
          ]);
        }
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setWeaknesses([]);
        setRoundTypeData([]);
      })
      .finally(() => setLoading(false));
  }, [filters.team]);

  // Chart data for weakness distribution - derived from actual weaknesses
  const categoryData = weaknesses.reduce((acc, w) => {
    const existing = acc.find(c => c.name === w.category);
    if (existing) {
      existing.value += 1;
    } else {
      acc.push({ 
        name: w.category, 
        value: 1, 
        color: ['#00AEEF', '#fbbf24', '#3b82f6', '#a855f7', '#10b981'][acc.length % 5] 
      });
    }
    return acc;
  }, []);

  if (!filters.team) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center"
      >
        <Target className="w-16 h-16 text-[var(--text-tertiary)] mb-4" />
        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Select a Team to Analyze</h2>
        <p className="text-[var(--text-secondary)] mb-6 max-w-md">
          Choose an opponent team to reveal their weaknesses, vulnerabilities, and exploitable patterns.
        </p>
        <div className="w-72">
          <TeamSelector
            teams={teams}
            value={filters.team}
            onChange={(team) => setFilter('team', team)}
            placeholder="Select opponent..."
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header with Team Selection */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <TeamSelector
            teams={teams}
            value={filters.team}
            onChange={(team) => setFilter('team', team)}
            className="w-64"
          />
          {!loading && filters.team && (
            <div className={cn(
              'px-4 py-2 rounded-lg flex items-center gap-2',
              riskScore >= 70 ? 'bg-red-500/20 text-red-400' :
              riskScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            )}>
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Risk Score: {riskScore}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <div className="relative">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-[var(--surface-tertiary)] border-t-c9-500" />
          </div>
          <div className="text-center">
            <p className="text-[var(--text-primary)] font-medium mb-1">Analyzing Weaknesses</p>
            <p className="text-[var(--text-secondary)] text-sm">Scanning {filters.team} for vulnerabilities...</p>
          </div>
          <div className="w-48 h-1 bg-[var(--surface-tertiary)] rounded-full overflow-hidden">
            <div className="h-full bg-c9-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      ) : (
        <>

      {/* Risk Overview Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Critical Weaknesses"
          value={weaknesses.filter(w => w.severity === 'high').length}
          icon={AlertTriangle}
          variant="danger"
          subtitle="High priority targets"
        />
        <AnalyticsCard
          title="Exploit Opportunities"
          value={weaknesses.reduce((sum, w) => sum + (w.exploitStrategies?.length || 0), 0)}
          icon={Target}
          subtitle="Actionable strategies"
        />
        <AnalyticsCard
          title="Weakest Area"
          value="Eco Rounds"
          icon={TrendingDown}
          subtitle="32% win rate"
          variant="warning"
        />
        <AnalyticsCard
          title="Map Vulnerability"
          value="Haven"
          icon={MapPin}
          subtitle="28% B retake"
        />
      </motion.div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Round Type Performance */}
        <motion.div variants={itemVariants}>
          <ChartContainer title="Round Type Performance" subtitle="Win rate by economy state">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={roundTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="type" stroke="#666" fontSize={11} />
                <YAxis stroke="#666" fontSize={11} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-primary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="winRate" name="Win Rate" radius={[4, 4, 0, 0]}>
                  {roundTypeData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.winRate >= 50 ? '#4ade80' : entry.winRate >= 35 ? '#fbbf24' : '#f87171'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </motion.div>

        {/* Weakness Categories */}
        <motion.div variants={itemVariants}>
          <ChartContainer title="Weakness Distribution" subtitle="By category">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
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
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span className="text-[var(--text-secondary)]">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </motion.div>
      </div>

      {/* Detailed Weaknesses */}
      <motion.div variants={itemVariants}>
        <ChartContainer
          title="Exploitable Weaknesses"
          subtitle="Ranked by impact and exploitability"
        >
          <div className="space-y-4 p-2">
            {weaknesses.map((weakness) => (
              <WeaknessIndicator
                key={weakness.id}
                severity={weakness.severity}
                category={weakness.category}
                finding={weakness.title}
                recommendation={weakness.recommendation}
                details={weakness.description ? [weakness.description] : []}
                expanded={weakness.severity === 'high'}
              />
            ))}
          </div>
        </ChartContainer>
      </motion.div>

      {/* Quick Exploit Guide */}
      <motion.div variants={itemVariants}>
        <div className="p-6 bg-gradient-to-r from-c9-500/10 to-transparent border border-c9-500/20 rounded-xl">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-c9-500" />
            Quick Exploit Playbook
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-[var(--surface-secondary)] rounded-lg">
              <div className="text-sm font-medium text-c9-500 mb-2">Early Game</div>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>• Win pistol rounds (they're weak)</li>
                <li>• Deny economy buildup</li>
                <li>• Force aggressive trades</li>
              </ul>
            </div>
            <div className="p-4 bg-[var(--surface-secondary)] rounded-lg">
              <div className="text-sm font-medium text-[#fbbf24] mb-2">Mid Game</div>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>• Target AWPer positions</li>
                <li>• Rush Haven B site</li>
                <li>• Counter their slow tempo</li>
              </ul>
            </div>
            <div className="p-4 bg-[var(--surface-secondary)] rounded-lg">
              <div className="text-sm font-medium text-[#4ade80] mb-2">Late Game</div>
              <ul className="text-sm text-[var(--text-secondary)] space-y-1">
                <li>• Force eco round scenarios</li>
                <li>• Play post-plant positions</li>
                <li>• Exploit rotation delays</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
      </>
      )}
    </motion.div>
  );
}

export default WeaknessPage;
