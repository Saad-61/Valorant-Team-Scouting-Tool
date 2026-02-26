// AI Chat Page - Conversational Analytics
import { useState, useRef, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/helpers';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import {
  Send, Bot, User, Loader2, Sparkles, Copy, Check,
  Table, BarChart3, AlertCircle, RefreshCw,
} from 'lucide-react';

export function ChatPage() {
  const { filters } = useAppStore();
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: "Hello! I'm your VCT Analytics AI. Ask me anything about team performance, player stats, map strategies, or opponent weaknesses. I can analyze data and provide actionable insights.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Suggested queries
  const suggestions = [
    "What are LOUD's biggest weaknesses?",
    "Compare win rates on Ascent vs Haven",
    "Who are the top fraggers this season?",
    "Show me eco round conversion rates by team",
    "Which teams struggle on defense?",
    "Agent pick rates in recent matches",
  ];

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.chat(input.trim());

      // Check if there's an error in the response
      if (response.error) {
        const errorMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: response.error.includes('Rate limit') || response.error.includes('429') 
            ? '⚠️ AI service is temporarily rate limited. Please wait a moment and try again.'
            : response.error.includes('quota') || response.error.includes('RESOURCE_EXHAUSTED')
            ? '⚠️ API quota exceeded. The Gemini AI service has reached its daily limit. Please try again later.'
            : `Sorry, an error occurred: ${response.error}`,
          timestamp: new Date(),
          error: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.interpretation || response.explanation || 'Analysis complete. See the data below.',
        timestamp: new Date(),
        sql: response.sql,
        data: response.results?.data || response.sql_results,
        error: false,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-c9-500 to-c9-400 flex items-center justify-center flex-shrink-0 shadow-c9-glow-sm">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2 px-4 py-3 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-2xl rounded-tl-sm">
              <Loader2 className="w-4 h-4 text-c9-500 animate-spin" />
              <span className="text-sm text-[var(--text-secondary)]">Analyzing data...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (show when no user messages yet) */}
      {messages.length === 1 && (
        <div className="px-4 pb-4">
          <div className="text-sm text-[var(--text-tertiary)] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-c9-500" />
            Try asking:
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-2 text-sm text-[var(--text-secondary)] bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg hover:border-c9-500/30 hover:text-[var(--text-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-c9-500/50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-[var(--border-primary)]">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about team performance, player stats, or strategies..."
              rows={1}
              className="w-full px-4 py-3 pr-12 bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-xl text-[var(--text-primary)] placeholder-[var(--text-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-c9-500/50 focus:border-c9-500 transition-all"
              style={{ minHeight: '48px', maxHeight: '120px' }}
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className={cn(
              'p-3 rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-c9-500/50',
              input.trim() && !loading
                ? 'bg-c9-500 hover:bg-c9-600 text-white shadow-c9-glow-sm hover:shadow-c9-glow'
                : 'bg-[var(--surface-secondary)] text-[var(--text-tertiary)] cursor-not-allowed'
            )}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-[var(--text-tertiary)] text-center mt-2">
          AI can analyze VCT Americas data including player stats, team performance, and match history.
        </p>
      </div>
    </div>
  );
}

// Message Bubble Component
const MessageBubble = forwardRef(function MessageBubble({ message }, ref) {
  const [copied, setCopied] = useState(false);
  const [showData, setShowData] = useState(false);

  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-c9-500/20'
            : 'bg-gradient-to-br from-c9-500 to-c9-400 shadow-c9-glow-sm'
        )}
      >
        {isUser ? (
          <User className="w-5 h-5 text-c9-500" />
        ) : (
          <Bot className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div
        className={cn(
          'max-w-[80%] space-y-2',
          isUser && 'text-right'
        )}
      >
        <div
          className={cn(
            'inline-block px-4 py-3 rounded-2xl',
            isUser
              ? 'bg-c9-500/20 text-[var(--text-primary)] rounded-tr-sm'
              : 'bg-[var(--surface-primary)] border border-[var(--border-primary)] text-[var(--text-secondary)] rounded-tl-sm',
            message.error && 'border border-danger-500/30'
          )}
        >
          {message.error && !isUser && (
            <div className="flex items-center gap-2 text-danger-500 text-sm mb-2">
              <AlertCircle className="w-4 h-4" />
              Error occurred
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </div>

        {/* SQL Query removed - hidden from user interface */}

        {/* Data Table (if available) */}
        {message.data && message.data.length > 0 && (
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] mb-2">
              <BarChart3 className="w-3 h-3" />
              {message.data.length} results
            </div>
            <div className="overflow-x-auto bg-[var(--surface-primary)] border border-[var(--border-primary)] rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-primary)]">
                    {Object.keys(message.data[0]).map((key) => (
                      <th key={key} className="px-3 py-2 text-left text-[var(--text-tertiary)] font-medium">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {message.data.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b border-[var(--border-primary)] last:border-0">
                      {Object.values(row).map((value, j) => (
                        <td key={j} className="px-3 py-2 text-[var(--text-secondary)]">
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {message.data.length > 10 && (
                <p className="text-xs text-[var(--text-tertiary)] py-2 px-3 border-t border-[var(--border-primary)]">
                  Showing 10 of {message.data.length} results
                </p>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={handleCopy}
              className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] rounded transition-colors focus:outline-none focus:ring-2 focus:ring-c9-500/50"
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-success-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="text-xs text-[var(--text-tertiary)]">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
});

export default ChatPage;
