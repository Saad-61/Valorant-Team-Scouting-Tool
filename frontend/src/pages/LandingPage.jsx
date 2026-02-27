// Landing Page - Welcome & Feature Overview
import { motion } from 'framer-motion';
import {
  Shield, BarChart3, Brain, Eye,
  ArrowRight, Sparkles, Zap,
  ChevronRight, FileText, MessageSquare,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const FEATURES = [
  {
    image: '/images/icons/scout-report.png',
    title: 'Scouting Reports',
    description: 'Generate comprehensive AI-powered reports with one click',
    color: 'from-blue-500 to-cyan-500',
    page: 'reports',
  },
  {
    image: '/images/icons/weaknesses.png',
    title: 'Opponent Analysis',
    description: 'Discover exploitable weaknesses and tendencies',
    color: 'from-red-500 to-orange-500',
    page: 'weaknesses',
  },
  {
    image: '/images/icons/ai-analyst.png',
    title: 'AI Analyst',
    description: 'Ask questions naturally and get instant insights',
    color: 'from-purple-500 to-pink-500',
    page: 'chat',
  },
  {
    image: '/images/icons/head-to-head.png',
    title: 'Head-to-Head',
    description: 'Compare any two teams across all metrics',
    color: 'from-amber-500 to-yellow-500',
    page: 'h2h',
  },
  {
    image: '/images/icons/map-analytics.png',
    title: 'Map Analytics',
    description: 'Win rates, pick rates, and side preferences by map',
    color: 'from-green-500 to-emerald-500',
    page: 'maps',
  },
  {
    image: '/images/icons/players.png',
    title: 'Player Statistics',
    description: 'Individual performance metrics and comparisons',
    color: 'from-indigo-500 to-violet-500',
    page: 'players',
  },
];

const STATS = [
  { label: 'Teams Tracked', value: '50+', icon: Shield },
  { label: 'Matches Analyzed', value: '500+', icon: BarChart3 },
  { label: 'AI Insights', value: '∞', icon: Brain },
];

export function LandingPage({ onNavigate }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-[calc(100vh-4rem)] flex flex-col"
    >
      {/* Hero Section */}
      <motion.section 
        variants={itemVariants}
        className="relative py-20 px-4 overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-c9-50/40 dark:from-gray-900 dark:via-c9-950 dark:to-gray-900"
      >
        {/* Geometric background patterns */}
        <div className="absolute inset-0 opacity-40 dark:opacity-20">
          {/* Grid pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(to right, rgb(0 174 239 / 0.1) 1px, transparent 1px),
                             linear-gradient(to bottom, rgb(0 174 239 / 0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }} />
          {/* Diagonal lines */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-10 left-10 w-64 h-64 border-2 border-c9-500/20 rounded-lg transform rotate-12" />
            <div className="absolute top-32 right-20 w-48 h-48 border-2 border-blue-500/20 rounded-full" />
            <div className="absolute bottom-20 left-1/4 w-56 h-56 border-2 border-c9-400/20 rounded-lg transform -rotate-6" />
          </div>
        </div>
        
        {/* Animated gradient orbs */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-br from-c9-500/30 to-blue-500/20 dark:from-c9-500/20 dark:to-blue-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute bottom-10 -right-20 w-[32rem] h-[32rem] bg-gradient-to-tl from-blue-500/25 to-c9-600/20 dark:from-blue-500/15 dark:to-c9-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          {/* Logo Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-gray-800/80 border-2 border-c9-500/50 dark:border-c9-400/50 mb-8 backdrop-blur-sm shadow-lg shadow-c9-500/20"
          >
            <Sparkles className="w-4 h-4 text-c9-500" />
            <span className="text-sm font-semibold text-c9-600 dark:text-c9-400">AI-Powered Analytics</span>
          </motion.div>
          
          {/* Hero Title */}
          <motion.h1 
            variants={itemVariants}
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.2] pb-2"
          >
            <span className="block text-gray-900 dark:text-white pb-1">Cloud9 VCT</span>
            <span className="block mt-2 pb-2 bg-gradient-to-r from-c9-500 via-blue-500 to-c9-600 dark:from-c9-400 dark:via-blue-400 dark:to-c9-500 bg-clip-text text-transparent">
              Scouting Dashboard
            </span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Professional-grade competitive analysis for VALORANT esports. 
            Get tactical insights, discover weaknesses, and prepare winning strategies.
          </motion.p>
          
          {/* CTA Buttons */}
          <motion.div 
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-4"
          >
            <button
              onClick={() => onNavigate?.('reports')}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-c9-500 to-c9-600 hover:from-c9-600 hover:to-blue-600 text-white font-bold shadow-xl shadow-c9-500/40 hover:shadow-2xl hover:shadow-c9-500/50 transition-all duration-300 hover:scale-105 transform"
            >
              <FileText className="w-5 h-5" />
              Generate Report
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button
              onClick={() => onNavigate?.('chat')}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white font-bold hover:border-c9-500 dark:hover:border-c9-400 hover:shadow-xl transition-all duration-300 hover:scale-105 transform"
            >
              <MessageSquare className="w-5 h-5 text-c9-500 dark:text-c9-400" />
              Ask AI Analyst
            </button>
          </motion.div>
        </div>
      </motion.section>

      {/* Stats Section - Commented out for now */}
      {/* <motion.section 
        variants={itemVariants}
        className="py-8 px-4 relative"
      >
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat rounded-xl"
          style={{
            backgroundImage: 'url(/images/stats-bg.png)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-c9-950/30 to-c9-950/40 rounded-xl" />
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-4 relative">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-xl bg-[var(--surface-primary)]/80 border border-[var(--border-primary)]"
            >
              <stat.icon className="w-6 h-6 text-c9-500 mx-auto mb-2" />
              <div className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">{stat.value}</div>
              <div className="text-xs md:text-sm text-[var(--text-tertiary)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.section> */}

      {/* Features Grid */}
      <motion.section 
        variants={itemVariants}
        className="flex-1 py-12 px-4"
      >
        <div className="max-w-5xl mx-auto">
          <motion.h2 
            variants={itemVariants}
            className="text-3xl font-bold text-[var(--text-primary)] text-center mb-3"
          >
            Everything You Need to Win
          </motion.h2>
          <motion.p 
            variants={itemVariants}
            className="text-lg text-[var(--text-secondary)] text-center mb-10 max-w-2xl mx-auto"
          >
            Comprehensive tools for match preparation and competitive analysis
          </motion.p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, index) => (
              <motion.button
                key={feature.title}
                variants={itemVariants}
                whileHover={{ scale: 1.03, y: -6 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onNavigate?.(feature.page)}
                className="group relative p-6 rounded-2xl bg-[var(--surface-primary)] border-2 border-[var(--border-primary)] hover:border-c9-500/60 hover:shadow-xl hover:shadow-c9-500/10 transition-all duration-300 text-left overflow-hidden"
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-[0.07] transition-opacity duration-300`} />
                
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:shadow-xl overflow-hidden transition-all duration-300`}>
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-c9-600 dark:group-hover:text-c9-400 transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                  {feature.description}
                </p>
                
                <div className="inline-flex items-center gap-1 text-sm font-semibold text-c9-500 opacity-0 group-hover:opacity-100 transform translate-x-0 group-hover:translate-x-1 transition-all">
                  Explore <ChevronRight className="w-4 h-4" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Quick Start Guide */}
      <motion.section 
        variants={itemVariants}
        className="py-8 px-4 mb-8"
      >
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-c9-500/15 to-c9-600/10 dark:from-c9-500/10 dark:to-c9-600/5 border-2 border-c9-500/30 dark:border-c9-500/20 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-c9-500 to-c9-600 flex items-center justify-center flex-shrink-0 shadow-md">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  Quick Start
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                  Select a team from any page to start analyzing. Use the AI Analyst for custom questions, 
                  or generate a full scouting report with one click.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-c9-500/30 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <Eye className="w-3.5 h-3.5 text-c9-500" /> Select Team
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-c9-500/30 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <Brain className="w-3.5 h-3.5 text-c9-500" /> Analyze Data
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-c9-500/30 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <FileText className="w-3.5 h-3.5 text-c9-500" /> Export Report
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <motion.footer 
        variants={itemVariants}
        className="py-8 px-4 text-center border-t border-[var(--border-primary)] bg-gradient-to-b from-transparent to-gray-50/50 dark:to-gray-900/50"
      >
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          Built for <span className="text-c9-500 font-bold">Cloud9</span> • VCT Analytics Platform • {new Date().getFullYear()}
        </p>
      </motion.footer>
    </motion.div>
  );
}

export default LandingPage;
