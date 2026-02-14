/**
 * Theme Toggle Button Component
 * 
 * Animated toggle for switching between light and dark modes
 * Features:
 * - Smooth icon transitions
 * - Accessible (keyboard navigable, proper aria labels)
 * - Cloud9 styled
 */

import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, isTransitioning } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg
        bg-[var(--surface-secondary)]
        border border-[var(--border-primary)]
        hover:bg-[var(--surface-hover)]
        hover:border-c9-500/50
        focus:outline-none focus:ring-2 focus:ring-c9-500/50 focus:ring-offset-2
        transition-all duration-200
        ${isTransitioning ? 'scale-95' : 'scale-100'}
        ${className}
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative w-5 h-5">
        {/* Sun Icon */}
        <Sun
          className={`
            absolute inset-0 w-5 h-5 text-amber-500
            transition-all duration-300
            ${isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
          `}
        />
        
        {/* Moon Icon */}
        <Moon
          className={`
            absolute inset-0 w-5 h-5 text-c9-400
            transition-all duration-300
            ${isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}
          `}
        />
      </div>
    </button>
  );
}

/**
 * Compact theme toggle for tight spaces
 */
export function ThemeToggleCompact({ className = '' }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <button
      onClick={toggleTheme}
      className={`
        p-1.5 rounded-md
        text-[var(--text-secondary)]
        hover:text-[var(--text-primary)]
        hover:bg-[var(--surface-hover)]
        focus:outline-none focus:ring-2 focus:ring-c9-500/50
        transition-colors duration-200
        ${className}
      `}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-4 h-4" />
      ) : (
        <Moon className="w-4 h-4" />
      )}
    </button>
  );
}
