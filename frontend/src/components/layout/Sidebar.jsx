// Sidebar Navigation Component - Cloud9 Themed
import { useState } from 'react';
import { cn } from '../../utils/helpers';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../ui/ThemeToggle';
import {
  LayoutDashboard,
  Target,
  Map,
  User,
  TrendingUp,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileText,
  Swords,
  Layers,
  Calendar,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Overview & KPIs',
  },
  {
    id: 'reports',
    label: 'Scouting Report',
    icon: FileText,
    description: 'Generate full report',
    primary: true,
  },
  {
    id: 'weaknesses',
    label: 'Opponent Analysis',
    icon: Target,
    description: 'Exploitable weaknesses',
  },
  {
    id: 'h2h',
    label: 'Head-to-Head',
    icon: Swords,
    description: 'Team comparison',
  },
  {
    id: 'maps',
    label: 'Map Performance',
    icon: Map,
    description: 'Win rates by map',
  },
  {
    id: 'players',
    label: 'Player Stats',
    icon: User,
    description: 'Individual performance',
  },
  {
    id: 'compositions',
    label: 'Agent Comps',
    icon: Layers,
    description: 'Agent pick rates',
  },
  {
    id: 'history',
    label: 'Match History',
    icon: Calendar,
    description: 'Recent matches',
  },
  {
    id: 'trends',
    label: 'Trend Analysis',
    icon: TrendingUp,
    description: 'Performance over time',
  },
  {
    id: 'chat',
    label: 'AI Analyst',
    icon: MessageSquare,
    description: 'Ask questions',
  },
];

const SECONDARY_ITEMS = [
  {
    id: 'reports',
    label: 'Reports',
    icon: FileText,
    description: 'Export scouting reports',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'App configuration',
  },
];

export function Sidebar({
  currentPage = 'dashboard',
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  className,
}) {
  const [hoveredItem, setHoveredItem] = useState(null);

  const handleNavigate = (id) => {
    onNavigate?.(id);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className={cn(
        'h-screen flex flex-col',
        'bg-[var(--surface-primary)] border-r border-[var(--border-primary)]',
        'fixed left-0 top-0 z-40',
        'transition-colors duration-300',
        className
      )}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-[var(--border-primary)]">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-c9-500 to-c9-400 flex items-center justify-center flex-shrink-0 shadow-c9-glow-sm">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex-1 min-w-0"
            >
              <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">Cloud9 Scout</h1>
              <p className="text-xs text-[var(--text-tertiary)] truncate">VCT Analytics</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        <div className="px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'relative group focus:outline-none focus:ring-2 focus:ring-c9-500/50',
                  item.primary && !isActive && 'bg-c9-500/10 border border-c9-500/30 hover:bg-c9-500/20',
                  isActive
                    ? 'bg-c9-500/10 text-c9-500'
                    : item.primary 
                      ? 'text-c9-400 hover:text-c9-300'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-c9-500 rounded-r-full"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}

                <Icon className={cn(
                  'w-5 h-5 flex-shrink-0 transition-transform',
                  isActive && 'text-c9-500',
                  hoveredItem === item.id && !isActive && 'scale-110'
                )} />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex-1 text-left min-w-0"
                    >
                      <span className="text-sm font-medium block truncate">
                        {item.label}
                      </span>
                      <span className="text-xs text-[var(--text-tertiary)] block truncate">
                        {item.description}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tooltip for collapsed state */}
                {collapsed && hoveredItem === item.id && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-[var(--surface-primary)] rounded-lg shadow-lg border border-[var(--border-primary)] whitespace-nowrap z-50">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                    <span className="text-xs text-[var(--text-tertiary)] block">{item.description}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Separator */}
        <div className="my-4 mx-4 border-t border-[var(--border-primary)]" />

        {/* Secondary Navigation */}
        <div className="px-3 space-y-1">
          {SECONDARY_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            
            return (
              <button
                key={item.id}
                onClick={() => handleNavigate(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                  'relative group focus:outline-none focus:ring-2 focus:ring-c9-500/50',
                  isActive
                    ? 'bg-c9-500/10 text-c9-500'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                )}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium truncate"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip for collapsed state */}
                {collapsed && hoveredItem === item.id && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-[var(--surface-primary)] rounded-lg shadow-lg border border-[var(--border-primary)] whitespace-nowrap z-50">
                    <span className="text-sm font-medium text-[var(--text-primary)]">{item.label}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Theme Toggle & Collapse */}
      <div className="p-3 border-t border-[var(--border-primary)] space-y-2">
        {/* Theme Toggle */}
        <div className={cn(
          'flex items-center',
          collapsed ? 'justify-center' : 'justify-between px-2'
        )}>
          {!collapsed && (
            <span className="text-xs text-[var(--text-tertiary)]">Theme</span>
          )}
          <ThemeToggle />
        </div>
        
        {/* Collapse Toggle */}
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-c9-500/50"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
}

export default Sidebar;
