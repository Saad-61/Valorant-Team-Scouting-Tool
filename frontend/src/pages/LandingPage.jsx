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
        className="relative py-12 px-4 overflow-hidden"
      >
        {/* Background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: 'url(/images/hero-bg.png)',
          }}
        />
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-c9-950/40 via-c9-950/20 to-c9-950/30" />
        {/* Subtle animated gradients */}
        <div className="absolute top-20 left-1/4 w-72 h-72 bg-c9-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-c9-400/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto text-center">
          {/* Logo Badge */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-c9-500/10 border border-c9-500/30 mb-6"
          >
            <Sparkles className="w-4 h-4 text-c9-500" />
            <span className="text-sm font-medium text-c9-500">AI-Powered Analytics</span>
          </motion.div>
          
          {/* Hero Title */}
          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-[var(--text-primary)] mb-4"
          >
            Cloud9 VCT
            <span className="block mt-2 bg-gradient-to-r from-c9-400 to-c9-600 bg-clip-text text-transparent">
              Scouting Dashboard
            </span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-8"
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
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-c9-500 to-c9-600 text-white font-semibold shadow-lg shadow-c9-500/25 hover:shadow-c9-500/40 transition-all duration-300 hover:scale-105"
            >
              <FileText className="w-5 h-5" />
              Generate Report
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <button
              onClick={() => onNavigate?.('chat')}
              className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-semibold hover:border-c9-500/50 transition-all duration-300 hover:scale-105"
            >
              <MessageSquare className="w-5 h-5" />
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
        className="flex-1 py-8 px-4"
      >
        <div className="max-w-5xl mx-auto">
          <motion.h2 
            variants={itemVariants}
            className="text-2xl font-bold text-[var(--text-primary)] text-center mb-2"
          >
            Everything You Need to Win
          </motion.h2>
          <motion.p 
            variants={itemVariants}
            className="text-[var(--text-secondary)] text-center mb-8 max-w-xl mx-auto"
          >
            Comprehensive tools for match preparation and competitive analysis
          </motion.p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((feature, index) => (
              <motion.button
                key={feature.title}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onNavigate?.(feature.page)}
                className="group relative p-6 rounded-2xl bg-[var(--surface-primary)] border border-[var(--border-primary)] hover:border-c9-500/50 transition-all duration-300 text-left overflow-hidden"
              >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg overflow-hidden`}>
                  <img 
                    src={feature.image} 
                    alt={feature.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 group-hover:text-c9-500 transition-colors">
                  {feature.title}
                </h3>
                
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  {feature.description}
                </p>
                
                <div className="inline-flex items-center gap-1 text-sm font-medium text-c9-500 opacity-0 group-hover:opacity-100 transition-opacity">
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
        className="py-8 px-4"
      >
        <div className="max-w-3xl mx-auto">
          <div className="p-6 rounded-2xl bg-gradient-to-br from-c9-500/10 to-c9-600/5 border border-c9-500/20">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-c9-500/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-c9-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                  Quick Start
                </h3>
                <p className="text-sm text-[var(--text-secondary)] mb-4">
                  Select a team from any page to start analyzing. Use the AI Analyst for custom questions, 
                  or generate a full scouting report with one click.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--surface-primary)] border border-[var(--border-primary)] text-xs text-[var(--text-secondary)]">
                    <Eye className="w-3 h-3" /> Select Team
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--surface-primary)] border border-[var(--border-primary)] text-xs text-[var(--text-secondary)]">
                    <Brain className="w-3 h-3" /> Analyze Data
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--surface-primary)] border border-[var(--border-primary)] text-xs text-[var(--text-secondary)]">
                    <FileText className="w-3 h-3" /> Export Report
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
        className="py-6 px-4 text-center border-t border-[var(--border-primary)]"
      >
        <p className="text-xs text-[var(--text-tertiary)]">
          Built for Cloud9 • VCT Analytics Platform • {new Date().getFullYear()}
        </p>
      </motion.footer>
    </motion.div>
  );
}

export default LandingPage;
