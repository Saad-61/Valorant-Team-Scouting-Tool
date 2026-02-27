// Main Layout Component
import { useState } from 'react';
import { cn } from '../../utils/helpers';
import { motion } from 'framer-motion';
import { Sidebar } from './Sidebar';

export function Layout({
  children,
  currentPage = 'dashboard',
  onNavigate,
  teamName,
  className,
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const pageTitle = {
    dashboard: 'Dashboard',
    weaknesses: 'Opponent Weakness Analysis',
    h2h: 'Head-to-Head Comparison',
    maps: 'Map Performance',
    players: 'Player Statistics',
    compositions: 'Agent Compositions',
    history: 'Match History',
    trends: 'Trend Analysis',
    chat: 'AI Analyst',
    reports: 'Scouting Reports',
    settings: 'Settings',
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] transition-colors duration-300">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <motion.main
        initial={false}
        animate={{ marginLeft: sidebarCollapsed ? 80 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn('min-h-screen', className)}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-[var(--bg-primary)]/95 backdrop-blur-sm border-b border-[var(--border-primary)] transition-colors duration-300">
          <div className="h-full px-6 flex items-center justify-between">
            {/* Left: Page Title */}
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-[var(--text-primary)]">
                {pageTitle[currentPage] || 'Dashboard'}
              </h1>
              {teamName && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-c9-500/10 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-c9-500" />
                  <span className="text-sm font-medium text-c9-500">{teamName}</span>
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </motion.main>
    </div>
  );
}

export default Layout;
