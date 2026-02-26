// Main App Component - Cloud9 VCT Scouting Dashboard
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layout } from './components/layout/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { WeaknessPage } from './pages/WeaknessPage';
import { MapPage } from './pages/MapPage';
import { ChatPage } from './pages/ChatPage';
import { PlayerPage } from './pages/PlayerPage';
import { TrendPage } from './pages/TrendPage';
import { HeadToHeadPage } from './pages/HeadToHeadPage';
import { CompositionsPage } from './pages/CompositionsPage';
import { MatchHistoryPage } from './pages/MatchHistoryPage';
import { ScoutingReportPage } from './pages/ScoutingReportPage';
import { useAppStore } from './store/appStore';
import { exportToPDF } from './utils/export';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import toast, { Toaster } from 'react-hot-toast';

// Page components mapping
const PAGES = {
  dashboard: DashboardPage,
  weaknesses: WeaknessPage,
  maps: MapPage,
  chat: ChatPage,
  players: PlayerPage,
  trends: TrendPage,
  h2h: HeadToHeadPage,
  compositions: CompositionsPage,
  history: MatchHistoryPage,
  reports: ScoutingReportPage,
  settings: () => <PlaceholderPage title="Settings" description="Application configuration options." />,
};

// Placeholder for pages not yet implemented
function PlaceholderPage({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--surface-secondary)] flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">{title}</h2>
      <p className="text-[var(--text-secondary)] max-w-md">{description}</p>
    </div>
  );
}

// Toast wrapper that respects theme
function ThemedToaster() {
  const { isDark } = useTheme();
  
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: isDark ? '#1e293b' : '#ffffff',
          color: isDark ? '#f8fafc' : '#0f172a',
          border: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          boxShadow: isDark 
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.4)' 
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: isDark ? '#1e293b' : '#ffffff',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: isDark ? '#1e293b' : '#ffffff',
          },
        },
      }}
    />
  );
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { filters } = useAppStore();

  // Handle export
  const handleExport = async () => {
    try {
      toast.loading('Generating report...', { id: 'export' });
      
      // Get the main content element
      const content = document.getElementById('dashboard-content');
      if (content) {
        await exportToPDF(content, `VCT-Scouting-Report-${filters.team || 'Overview'}`);
        toast.success('Report exported successfully!', { id: 'export' });
      } else {
        toast.error('Could not generate report', { id: 'export' });
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Export failed', { id: 'export' });
    }
  };

  // Get current page component
  const PageComponent = PAGES[currentPage] || DashboardPage;

  return (
    <>
      {/* Toast notifications */}
      <ThemedToaster />

      <Layout
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        teamName={filters.team}
        onExport={currentPage === 'reports' ? handleExport : undefined}
      >
        <div id="dashboard-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <PageComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </Layout>
    </>
  );
}

// Main App wrapper with ThemeProvider
function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
