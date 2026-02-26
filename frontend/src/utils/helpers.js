// Utility functions
import { clsx } from 'clsx';

/**
 * Combine class names with clsx
 */
export function cn(...inputs) {
  return clsx(inputs);
}

/**
 * Format percentage with proper sign
 */
export function formatPercent(value, decimals = 1) {
  if (value == null) return 'N/A';
  return `${Number(value).toFixed(decimals)}%`;
}

/**
 * Format number with commas
 */
export function formatNumber(value) {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat().format(value);
}

/**
 * Get severity color class
 */
export function getSeverityClass(severity) {
  switch (severity?.toUpperCase()) {
    case 'HIGH':
    case 'CRITICAL':
      return 'severity-high';
    case 'MEDIUM':
      return 'severity-medium';
    case 'LOW':
      return 'severity-low';
    default:
      return '';
  }
}

/**
 * Get severity badge color
 */
export function getSeverityColor(severity) {
  switch (severity?.toUpperCase()) {
    case 'HIGH':
    case 'CRITICAL':
      return { 
        bg: 'bg-gradient-to-br from-red-600/30 to-red-500/10', 
        text: 'text-red-400', 
        border: 'border-red-500/50',
        accent: '#ef4444'
      };
    case 'MEDIUM':
      return { 
        bg: 'bg-gradient-to-br from-amber-600/30 to-amber-500/10', 
        text: 'text-amber-400', 
        border: 'border-amber-500/50',
        accent: '#f59e0b'
      };
    case 'LOW':
      return { 
        bg: 'bg-gradient-to-br from-emerald-600/30 to-emerald-500/10', 
        text: 'text-emerald-400', 
        border: 'border-emerald-500/50',
        accent: '#10b981'
      };
    default:
      return { 
        bg: 'bg-gradient-to-br from-slate-600/30 to-slate-500/10', 
        text: 'text-slate-400', 
        border: 'border-slate-500/50',
        accent: '#64748b'
      };
  }
}

/**
 * Get win rate color based on threshold
 */
export function getWinRateColor(winRate) {
  if (winRate >= 60) return 'text-green-400';
  if (winRate >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

/**
 * Get trend indicator
 */
export function getTrendIndicator(value) {
  if (value > 0) return { icon: '↑', color: 'text-green-400', label: 'Improving' };
  if (value < 0) return { icon: '↓', color: 'text-red-400', label: 'Declining' };
  return { icon: '→', color: 'text-gray-400', label: 'Stable' };
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format map name for display
 */
export function formatMapName(mapName) {
  if (!mapName) return 'Unknown';
  return capitalize(mapName);
}

/**
 * Format agent name for display
 */
export function formatAgentName(agentName) {
  if (!agentName) return 'Unknown';
  // Handle special cases like KAY/O
  if (agentName.toLowerCase() === 'kayo') return 'KAY/O';
  return capitalize(agentName);
}

/**
 * Get agent role color
 */
export function getAgentRoleColor(role) {
  switch (role?.toLowerCase()) {
    case 'duelist':
      return 'text-red-400';
    case 'controller':
      return 'text-purple-400';
    case 'sentinel':
      return 'text-green-400';
    case 'initiator':
      return 'text-blue-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Calculate KDA
 */
export function calculateKDA(kills, deaths, assists) {
  if (deaths === 0) return ((kills + assists) || 0).toFixed(2);
  return ((kills + assists) / deaths).toFixed(2);
}

/**
 * Generate chart colors
 */
export const chartColors = {
  primary: '#00AEEF', // Cloud9 Blue
  secondary: '#10b981',
  tertiary: '#3b82f6',
  quaternary: '#f59e0b',
  quinary: '#8b5cf6',
  senary: '#ec4899',
  grid: 'rgba(255, 255, 255, 0.08)',
  text: '#a0a0b0',
};

/**
 * Chart colors array for use in charts - Updated with more vibrant, modern colors
 */
export const CHART_COLORS = [
  '#00AEEF', // Cloud9 Blue (primary)
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#14b8a6', // Teal
  '#a855f7', // Purple
];

/**
 * Gradient color pairs for charts
 */
export const CHART_GRADIENTS = [
  { start: '#00AEEF', end: '#0077B6' }, // Cloud9 Blue
  { start: '#10b981', end: '#059669' }, // Emerald
  { start: '#f59e0b', end: '#d97706' }, // Amber
  { start: '#8b5cf6', end: '#7c3aed' }, // Violet
  { start: '#ef4444', end: '#dc2626' }, // Red
  { start: '#ec4899', end: '#db2777' }, // Pink
];

/**
 * Map-specific colors - More distinct and vibrant
 */
export const MAP_COLORS = {
  'Ascent': '#22c55e',
  'Bind': '#f59e0b',
  'Breeze': '#0ea5e9',
  'Fracture': '#a855f7',
  'Haven': '#ef4444',
  'Icebox': '#06b6d4',
  'Lotus': '#f472b6',
  'Pearl': '#8b5cf6',
  'Split': '#10b981',
  'Sunset': '#f97316',
  'Abyss': '#6366f1',
};

/**
 * Agent role colors
 */
export const ROLE_COLORS = {
  Controller: { primary: '#10b981', secondary: '#059669' },
  Initiator: { primary: '#f59e0b', secondary: '#d97706' },
  Sentinel: { primary: '#3b82f6', secondary: '#2563eb' },
  Duelist: { primary: '#ef4444', secondary: '#dc2626' },
};

/**
 * Default chart config
 */
export const defaultChartConfig = {
  margin: { top: 20, right: 30, left: 20, bottom: 5 },
  animationDuration: 300,
};

/**
 * Delay utility for animations
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Truncate text
 */
export function truncate(str, length = 20) {
  if (!str) return '';
  return str.length > length ? str.slice(0, length) + '...' : str;
}
