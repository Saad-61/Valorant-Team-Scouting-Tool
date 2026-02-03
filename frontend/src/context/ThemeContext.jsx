/**
 * Cloud9 Theme Context
 * 
 * Provides theme management for the application:
 * - Light/Dark mode toggle
 * - Persistent theme preference via localStorage
 * - System preference detection
 * - Smooth theme transitions
 */

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const ThemeContext = createContext(undefined);

const THEME_STORAGE_KEY = 'c9-theme-preference';

/**
 * Get initial theme from localStorage or system preference
 */
function getInitialTheme() {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }
  
  // Default to light mode
  return 'light';
}

/**
 * Theme Provider Component
 * Wraps the application and provides theme context
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(getInitialTheme);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Store preference
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);
  
  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only auto-switch if user hasn't set a preference
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (!stored) {
        setThemeState(e.matches ? 'dark' : 'light');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Toggle theme with smooth transition
  const toggleTheme = useCallback(() => {
    setIsTransitioning(true);
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    
    // Reset transition state after animation
    setTimeout(() => setIsTransitioning(false), 300);
  }, []);
  
  // Set specific theme
  const setTheme = useCallback((newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      setIsTransitioning(true);
      setThemeState(newTheme);
      setTimeout(() => setIsTransitioning(false), 300);
    }
  }, []);
  
  // Reset to system preference
  const resetToSystem = useCallback(() => {
    localStorage.removeItem(THEME_STORAGE_KEY);
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches 
      ? 'dark' 
      : 'light';
    setTheme(systemTheme);
  }, [setTheme]);
  
  const value = {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isTransitioning,
    toggleTheme,
    setTheme,
    resetToSystem,
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Custom hook to access theme context
 * @throws Error if used outside ThemeProvider
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

export default ThemeContext;
