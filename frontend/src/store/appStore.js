// State management store using Zustand
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Default welcome message for AI chat
const DEFAULT_CHAT_MESSAGE = {
  id: 1,
  role: 'assistant',
  content: "Hello! I'm your VCT Analytics AI. Ask me anything about team performance, player stats, map strategies, or opponent weaknesses. I can analyze data and provide actionable insights.",
  timestamp: new Date().toISOString(),
};

// Global app state with persistence
export const useAppStore = create(
  persist(
    (set, get) => ({
      // Filter state (used by pages)
      filters: {
        team: null,
        player: null,
        map: null,
        tournament: null,
        dateRange: { start: null, end: null },
      },
      
      // UI state
      sidebarCollapsed: false,
      isExporting: false,
      
      // Chat state (NOT persisted - clears on refresh, persists on navigation)
      chatMessages: [DEFAULT_CHAT_MESSAGE],
      
      // Chat actions
      addChatMessage: (message) => set((state) => ({
        chatMessages: [...state.chatMessages, {
          ...message,
          timestamp: message.timestamp || new Date().toISOString()
        }],
      })),
      clearChatMessages: () => set({ chatMessages: [DEFAULT_CHAT_MESSAGE] }),
      
      // Set individual filter
      setFilter: (key, value) => set((state) => ({
        filters: { ...state.filters, [key]: value },
      })),
      
      // Set multiple filters at once
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters },
      })),
      
      // Legacy individual setters for backward compatibility
      setSelectedTeam: (team) => set((state) => ({
        filters: { ...state.filters, team },
      })),
      setSelectedPlayer: (player) => set((state) => ({
        filters: { ...state.filters, player },
      })),
      setSelectedMap: (map) => set((state) => ({
        filters: { ...state.filters, map },
      })),
      setSelectedTournament: (tournament) => set((state) => ({
        filters: { ...state.filters, tournament },
      })),
      setDateRange: (dateRange) => set((state) => ({
        filters: { ...state.filters, dateRange },
      })),
      
      // UI actions
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setIsExporting: (value) => set({ isExporting: value }),
      
      // Reset filters
      resetFilters: () => set({
        filters: {
          team: null,
          player: null,
          map: null,
          tournament: null,
          dateRange: { start: null, end: null },
        },
      }),
    }),
    {
      name: 'c9-scout-storage', // localStorage key
      partialize: (state) => ({ filters: state.filters }), // Only persist filters, NOT chat
    }
  )
);

export default useAppStore;
