import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000, // 60 seconds for AI calls
});

// Response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Team endpoints
export const getTeams = () => api.get('/teams').then(res => res.data);

export const getTeamOverview = (teamName, numMatches = 10) => 
  api.get(`/overview/${encodeURIComponent(teamName)}`, { params: { num_matches: numMatches } })
    .then(res => res.data);

export const getPlayerStats = (teamName, numMatches = 10) =>
  api.get(`/players/${encodeURIComponent(teamName)}`, { params: { num_matches: numMatches } })
    .then(res => res.data);

export const getCompositions = (teamName, numMatches = 10) =>
  api.get(`/compositions/${encodeURIComponent(teamName)}`, { params: { num_matches: numMatches } })
    .then(res => res.data);

export const getWeaknesses = (teamName, numMatches = 10) =>
  api.get(`/weaknesses/${encodeURIComponent(teamName)}`, { params: { num_matches: numMatches } })
    .then(res => res.data);

export const getPistolStats = (teamName, numMatches = 10) =>
  api.get(`/pistol/${encodeURIComponent(teamName)}`, { params: { num_matches: numMatches } })
    .then(res => res.data);

export const getHeadToHead = (team1, team2) =>
  api.get(`/h2h/${encodeURIComponent(team1)}/${encodeURIComponent(team2)}`)
    .then(res => res.data);

export const getFullScoutingData = (teamName, numMatches = 10) =>
  api.get(`/scout/${encodeURIComponent(teamName)}`, { params: { num_matches: numMatches } })
    .then(res => res.data);

// AI endpoints
export const askQuestion = (question, teamName = null) =>
  api.post('/ask', { question, team_name: teamName }).then(res => res.data);

export const getSuggestions = (teamName = null) =>
  api.get('/suggestions', { params: { team_name: teamName } }).then(res => res.data);

export default api;
