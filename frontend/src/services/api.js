// API Integration Layer
import axios from 'axios';

const API_BASE = '/api';

const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(new Error(message));
  }
);

// ============== TEAM ENDPOINTS ==============

export const getTeams = () => 
  axiosInstance.get('/teams').then(res => ({ data: res.data }));

export const getMaps = () =>
  Promise.resolve({ 
    data: ['Ascent', 'Bind', 'Breeze', 'Fracture', 'Haven', 'Icebox', 'Lotus', 'Pearl', 'Split', 'Sunset', 'Abyss']
  });

export const getTeamOverview = (teamName, numMatches = 10) =>
  axiosInstance.get(`/overview/${encodeURIComponent(teamName)}`, { 
    params: { num_matches: numMatches } 
  }).then(res => res.data);

export const getTeamWeaknesses = (teamName, numMatches = 10) =>
  axiosInstance.get(`/weaknesses/${encodeURIComponent(teamName)}`, { 
    params: { num_matches: numMatches } 
  }).then(res => res.data);

export const getTeamCompositions = (teamName, numMatches = 10) =>
  axiosInstance.get(`/compositions/${encodeURIComponent(teamName)}`, { 
    params: { num_matches: numMatches } 
  }).then(res => res.data);

export const getFullScoutingData = (teamName, numMatches = 10) =>
  axiosInstance.get(`/scout/${encodeURIComponent(teamName)}`, { 
    params: { num_matches: numMatches } 
  }).then(res => res.data);

// ============== PLAYER ENDPOINTS ==============

export const getPlayerStats = (teamName, numMatches = 10) =>
  axiosInstance.get(`/players/${encodeURIComponent(teamName)}`, { 
    params: { num_matches: numMatches } 
  }).then(res => res.data);

// ============== MAP ENDPOINTS ==============

export const getPistolStats = (teamName, numMatches = 10) =>
  axiosInstance.get(`/pistol/${encodeURIComponent(teamName)}`, { 
    params: { num_matches: numMatches } 
  }).then(res => res.data);

// ============== HEAD TO HEAD ==============

export const getHeadToHead = (team1, team2) =>
  axiosInstance.get(`/h2h/${encodeURIComponent(team1)}/${encodeURIComponent(team2)}`)
    .then(res => res.data);

// ============== AI ENDPOINTS ==============

export const askQuestion = (question, teamName = null) =>
  axiosInstance.post('/ask', { question, team_name: teamName }).then(res => res.data);

export const getSuggestions = (teamName = null) =>
  axiosInstance.get('/suggestions', { params: { team_name: teamName } }).then(res => res.data);

// ============== REPORT GENERATION ==============

export const generateReport = (teamName, numMatches = 10, chatInsights = []) =>
  axiosInstance.post('/generate-report', { 
    team_name: teamName, 
    num_matches: numMatches,
    chat_insights: chatInsights 
  }).then(res => res.data);

// ============== HEALTH CHECK ==============

export const healthCheck = () =>
  axiosInstance.get('/').then(res => res.data);

// Export default API object for use in components
const api = {
  getTeams,
  getMaps,
  getTeamOverview,
  getTeamWeaknesses,
  getTeamCompositions,
  getFullScoutingData,
  getPlayerStats,
  getPistolStats,
  getHeadToHead,
  askQuestion,
  chat: askQuestion,
  getSuggestions,
  generateReport,
  healthCheck,
};

export default api;
