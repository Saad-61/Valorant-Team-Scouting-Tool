/** @type {import('tailwindcss').Config} */
/**
 * Cloud9 Esports Theme Configuration
 * 
 * Design Philosophy:
 * - Primary brand color: Cloud9 Blue (#00AEEF)
 * - Secondary: White (#FFFFFF)
 * - Professional, data-focused esports aesthetic
 * - Supports both light and dark modes
 * 
 * Color Adjustments:
 * - c9-blue-600 darkened for better contrast in light mode
 * - Dark mode uses darker backgrounds for reduced eye strain
 * - Accent colors chosen for WCAG AA compliance
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ============== CLOUD9 BRAND COLORS ==============
        // Primary Cloud9 Blue with extended palette
        'c9': {
          50: '#e6f7fe',   // Lightest - backgrounds
          100: '#b3e5fc',  // Light hover states
          200: '#80d4fa',  // Light accents
          300: '#4dc3f7',  // Medium light
          400: '#26b5f5',  // Medium
          500: '#00AEEF',  // PRIMARY CLOUD9 BLUE
          600: '#0095d9',  // Hover state - slightly darker
          700: '#007bb8',  // Active state
          800: '#006199',  // Dark accent
          900: '#004a7a',  // Darkest
        },
        
        // ============== SEMANTIC COLORS ==============
        // Background colors - uses CSS variables for theme switching
        background: {
          DEFAULT: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        
        // Surface/Card colors
        surface: {
          DEFAULT: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          hover: 'var(--surface-hover)',
          active: 'var(--surface-active)',
        },
        
        // Text colors
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
        
        // Border colors
        border: {
          DEFAULT: 'var(--border-primary)',
          secondary: 'var(--border-secondary)',
          focus: 'var(--border-focus)',
        },
        
        // ============== STATUS COLORS ==============
        // Success - Green tones
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
        
        // Warning - Amber tones
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        
        // Danger - Red tones
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        
        // Info - Blue tones (uses C9 blue)
        info: {
          50: '#e6f7fe',
          100: '#b3e5fc',
          500: '#00AEEF',
          600: '#0095d9',
          700: '#007bb8',
        },
      },
      
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      
      fontSize: {
        // Custom type scale for data-heavy UI
        'stat': ['2.5rem', { lineHeight: '1', fontWeight: '700' }],
      },
      
      boxShadow: {
        // Soft shadows for cards
        'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-dark': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        // Cloud9 blue glow effects
        'c9-glow': '0 0 20px rgba(0, 174, 239, 0.3)',
        'c9-glow-sm': '0 0 10px rgba(0, 174, 239, 0.2)',
        'c9-glow-lg': '0 0 40px rgba(0, 174, 239, 0.4)',
        // Focus ring
        'focus': '0 0 0 3px rgba(0, 174, 239, 0.4)',
      },
      
      borderRadius: {
        'card': '0.75rem',  // 12px - modern rounded corners
        'btn': '0.5rem',    // 8px - button corners
      },
      
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-c9': 'pulseC9 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseC9: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      
      backgroundImage: {
        // Subtle gradients using Cloud9 blue
        'c9-gradient': 'linear-gradient(135deg, #00AEEF 0%, #0077B6 100%)',
        'c9-gradient-light': 'linear-gradient(135deg, #e6f7fe 0%, #b3e5fc 100%)',
        'c9-gradient-dark': 'linear-gradient(135deg, #004a7a 0%, #002d4a 100%)',
      },
    },
  },
  plugins: [],
}
