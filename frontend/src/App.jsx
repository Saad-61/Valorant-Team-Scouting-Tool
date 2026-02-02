import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Send, 
  Bot, 
  User, 
  AlertCircle, 
  Loader2, 
  Database, 
  Shield, 
  Target,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';
import { getTeams, askQuestion, getSuggestions } from './api';

function App() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeams,
  });

  // Fetch suggestions when team changes
  const { data: suggestionsData } = useQuery({
    queryKey: ['suggestions', selectedTeam],
    queryFn: () => getSuggestions(selectedTeam),
    enabled: !!selectedTeam,
  });

  // Ask question mutation
  const askMutation = useMutation({
    mutationFn: ({ question, team }) => askQuestion(question, team),
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: data.interpretation || 'No interpretation available.',
        sql: data.sql,
        results: data.results,
        error: data.error,
      }]);
    },
    onError: (error) => {
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, something went wrong.',
        error: error.message,
      }]);
    }
  });

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Welcome message when team selected
  useEffect(() => {
    if (selectedTeam) {
      setMessages([{
        type: 'assistant',
        content: `Now scouting **${selectedTeam}**. Ask me anything about their performance, strategies, player stats, or compositions. I can generate custom SQL queries to find specific insights!`,
      }]);
    }
  }, [selectedTeam]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || askMutation.isPending) return;

    const question = input.trim();
    setMessages(prev => [...prev, { type: 'user', content: question }]);
    setInput('');
    askMutation.mutate({ question, team: selectedTeam });
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  // Team Selection Screen
  if (!selectedTeam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-valorant-red/5 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 right-32 w-96 h-96 rounded-full bg-c9-blue/5 blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute top-1/2 left-1/4 w-32 h-32 rounded-full bg-yellow-500/5 blur-2xl animate-pulse" style={{animationDelay: '4s'}}></div>
        </div>
        
        <div className="max-w-2xl w-full text-center relative z-10">
          {/* Logo/Header */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="relative">
                <Shield className="w-12 h-12 text-valorant-red glow" />
                <div className="absolute inset-0 w-12 h-12 bg-valorant-red/20 rounded-full blur-lg"></div>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-valorant-red to-pink-400 bg-clip-text text-transparent">
                VALORANT Scouting
              </h1>
            </div>
            <p className="text-gray-400 text-lg font-medium">
              AI-powered competitive analysis for <span className="text-c9-blue font-semibold">Cloud9</span>
            </p>
          </div>

          {/* Team Selector */}
          <div className="bg-gray-800/30 rounded-2xl p-8 backdrop-blur-lg border border-gray-700/50 shadow-2xl hover:border-valorant-red/50 transition-all duration-300 group">
            <label className="block text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
              Select a team to scout
            </label>
            
            {teamsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-valorant-red" />
              </div>
            ) : (
              <div className="relative">
                <select
                  className="w-full bg-gray-900/80 border border-gray-600 rounded-xl px-6 py-4 text-lg appearance-none cursor-pointer hover:border-valorant-red hover:shadow-lg hover:shadow-valorant-red/20 transition-all duration-300 focus:outline-none focus:border-valorant-red focus:ring-2 focus:ring-valorant-red/20 backdrop-blur-sm"
                  value=""
                  onChange={(e) => setSelectedTeam(e.target.value)}
                >
                  <option value="" disabled>Choose a team...</option>
                  {teams.map(team => (
                    <option key={team} value={team} className="bg-gray-900">{team}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            )}

            <p className="text-gray-500 text-sm mt-4">
              {teams.length} teams available in database
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-6 mt-12">
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-2xl p-6 border border-gray-700/30 backdrop-blur-sm hover:border-c9-blue/50 hover:shadow-lg hover:shadow-c9-blue/10 transition-all duration-300 group">
              <Database className="w-8 h-8 text-c9-blue mb-3 mx-auto group-hover:scale-110 transition-transform duration-300" />
              <p className="text-lg font-semibold text-white mb-1">196</p>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Series</p>
            </div>
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-2xl p-6 border border-gray-700/30 backdrop-blur-sm hover:border-valorant-red/50 hover:shadow-lg hover:shadow-valorant-red/10 transition-all duration-300 group">
              <Target className="w-8 h-8 text-valorant-red mb-3 mx-auto group-hover:scale-110 transition-transform duration-300" />
              <p className="text-lg font-semibold text-white mb-1">6,878</p>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Rounds</p>
            </div>
            <div className="bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-2xl p-6 border border-gray-700/30 backdrop-blur-sm hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-300 group">
              <Sparkles className="w-8 h-8 text-yellow-500 mb-3 mx-auto group-hover:scale-110 transition-transform duration-300" />
              <p className="text-lg font-semibold text-white mb-1">AI</p>
              <p className="text-sm text-gray-400 uppercase tracking-wider">Analysis</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat Interface
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gray-900/60 backdrop-blur-xl border-b border-gray-800/60 px-6 py-6 sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Shield className="w-10 h-10 text-valorant-red glow" />
              <div className="absolute inset-0 w-10 h-10 bg-valorant-red/10 rounded-full blur-lg"></div>
            </div>
            <div>
              <h1 className="font-bold text-xl bg-gradient-to-r from-valorant-red to-pink-400 bg-clip-text text-transparent">
                VALORANT Scouting
              </h1>
              <p className="text-sm text-gray-400 font-medium">Powered by <span className="text-blue-400">Gemini AI</span></p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Currently scouting</p>
              <p className="font-semibold text-valorant-red">{selectedTeam}</p>
            </div>
            <button
              onClick={() => setSelectedTeam(null)}
              className="px-4 py-2 text-sm bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-gray-700/20 font-medium border border-gray-600/50 hover:border-gray-500"
            >
              Change Team
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg, idx) => (
            <Message key={idx} message={msg} />
          ))}
          
          {askMutation.isPending && (
            <div className="flex items-start gap-3 message-enter">
              <div className="w-8 h-8 rounded-full bg-c9-blue flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-gray-800/50 rounded-xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="loading-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span className="loading-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                  <span className="loading-dot w-2 h-2 bg-gray-400 rounded-full"></span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Suggestions */}
      {suggestionsData?.suggestions && messages.length <= 1 && (
        <div className="px-6 pb-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-gray-500 mb-4 font-medium uppercase tracking-wider">Suggested questions:</p>
            <div className="flex flex-wrap gap-3">
              {suggestionsData.suggestions.slice(0, 4).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2.5 text-sm bg-gradient-to-r from-gray-800/60 to-gray-700/60 hover:from-gray-700/80 hover:to-gray-600/80 rounded-xl transition-all duration-300 text-gray-300 hover:text-white border border-gray-600/30 hover:border-gray-500/50 backdrop-blur-sm hover:shadow-lg hover:shadow-gray-600/10 font-medium"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <footer className="bg-gray-900/60 backdrop-blur-xl border-t border-gray-800/60 px-6 py-6">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-4">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${selectedTeam}'s performance...`}
              className="flex-1 bg-gray-800/80 border border-gray-700/50 rounded-2xl px-6 py-4 focus:outline-none focus:border-valorant-red focus:ring-2 focus:ring-valorant-red/20 transition-all duration-300 backdrop-blur-sm hover:border-gray-600 text-lg placeholder:text-gray-500"
              disabled={askMutation.isPending}
            />
            <button
              type="submit"
              disabled={!input.trim() || askMutation.isPending}
              className={clsx(
                "px-6 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-lg",
                input.trim() && !askMutation.isPending
                  ? "bg-gradient-to-r from-valorant-red to-pink-500 hover:from-red-500 hover:to-pink-600 text-white hover:shadow-valorant-red/30 hover:scale-105 glow"
                  : "bg-gray-700/50 text-gray-500 cursor-not-allowed backdrop-blur-sm"
              )}
            >
              {askMutation.isPending ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <Send className="w-6 h-6" />
              )}
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
}

// Message Component
function Message({ message }) {
  const [showSql, setShowSql] = useState(false);
  const isUser = message.type === 'user';

  return (
    <div className={clsx(
      "flex items-start gap-4 message-enter",
      isUser && "flex-row-reverse"
    )}>
      <div className={clsx(
        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg",
        isUser ? "bg-gradient-to-br from-valorant-red to-pink-500 glow" : "bg-gradient-to-br from-c9-blue to-blue-600 glow-blue"
      )}>
        {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </div>
      
      <div className={clsx(
        "max-w-[80%] rounded-2xl px-6 py-4 shadow-lg backdrop-blur-sm border",
        isUser 
          ? "bg-gradient-to-br from-valorant-red/20 to-pink-500/20 border-valorant-red/30" 
          : "bg-gradient-to-br from-gray-800/60 to-gray-900/60 border-gray-700/40"
      )}>
        {/* Content */}
        <div className="prose prose-invert prose-sm">
          {message.content.split('**').map((part, i) => 
            i % 2 === 0 ? part : <strong key={i}>{part}</strong>
          )}
        </div>

        {/* Error */}
        {message.error && (
          <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {message.error}
          </div>
        )}

        {/* SQL Toggle */}
        {message.sql && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <button
              onClick={() => setShowSql(!showSql)}
              className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
            >
              <Database className="w-3 h-3" />
              {showSql ? 'Hide SQL' : 'Show SQL'}
            </button>
            {showSql && (
              <pre className="mt-2 text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                {message.sql}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
