"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Infinity, Menu, X, MessageSquare, Send, Trash2, ChevronLeft, ChevronRight, Copy, Check, BarChart3, Moon, Sun, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import AnalysisDashboard from './components/AnalysisDashboard';

const CHAT_SESSION_STORAGE_PREFIX = 'airis-evo-chat-session';
const CHAT_RESPONSE_CACHE_PREFIX = 'airis-evo-chat-response-cache';
const EMPTY_RESPONSE_MESSAGE = "Maaf, ada kesalahan pada respons.";
const CONNECTION_ERROR_MESSAGE = "Koneksi terputus atau ada kesalahan. Silakan coba lagi.";

function createChatSessionId(userId) {
  const randomId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${userId}:${randomId}`;
}

function getOrCreateChatSessionId(userId) {
  const storageKey = `${CHAT_SESSION_STORAGE_PREFIX}:${userId}`;
  const existingSessionId = sessionStorage.getItem(storageKey);

  if (existingSessionId) {
    return existingSessionId;
  }

  const newSessionId = createChatSessionId(userId);
  sessionStorage.setItem(storageKey, newSessionId);
  return newSessionId;
}

function normalizeQuestion(question) {
  return question.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getChatResponseCacheKey(sessionId) {
  return `${CHAT_RESPONSE_CACHE_PREFIX}:${sessionId}`;
}

function getCachedChatResponse(sessionId, question) {
  try {
    const cacheKey = getChatResponseCacheKey(sessionId);
    const cache = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
    const normalizedQuestion = normalizeQuestion(question);
    const cachedResponse = cache[normalizedQuestion];

    if (!cachedResponse || cachedResponse === EMPTY_RESPONSE_MESSAGE || cachedResponse.includes('Koneksi terputus')) {
      if (cachedResponse) {
        delete cache[normalizedQuestion];
        sessionStorage.setItem(cacheKey, JSON.stringify(cache));
      }

      return null;
    }

    return cachedResponse;
  } catch (err) {
    console.warn('Unable to read chat response cache:', err);
    return null;
  }
}

function setCachedChatResponse(sessionId, question, answer) {
  try {
    if (!answer || answer === EMPTY_RESPONSE_MESSAGE || answer.includes('Koneksi terputus')) {
      return;
    }

    const cacheKey = getChatResponseCacheKey(sessionId);
    const cache = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');

    cache[normalizeQuestion(question)] = answer;
    sessionStorage.setItem(cacheKey, JSON.stringify(cache));
  } catch (err) {
    console.warn('Unable to save chat response cache:', err);
  }
}

export default function AirisGemini() {
  const router = useRouter();
  const { user, profile, logout, loading: authLoading } = useAuth();
  
  const [activeTab, setActiveTab] = useState("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [chatSessionId, setChatSessionId] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Enable dark mode on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Copy to clipboard function
  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  // Auto scroll to newest message
  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, [messages, isLoading]);

  // Redirect to login if not authenticated (after auth check completes)
  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = '/login';
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (!user?.id) {
      setChatSessionId('');
      return;
    }

    setChatSessionId(getOrCreateChatSessionId(user.id));
  }, [user?.id]);

  // Handle logout
  const handleLogout = async () => {
    const currentUserId = user?.id;

    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      if (currentUserId) {
        sessionStorage.removeItem(`${CHAT_SESSION_STORAGE_PREFIX}:${currentUserId}`);
      }

      router.replace('/login');
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!user?.id) return;
    
    const userMessage = input;
    const currentSessionId = chatSessionId || getOrCreateChatSessionId(user.id);

    if (!chatSessionId) {
      setChatSessionId(currentSessionId);
    }

    setInput("");
    const newMsg = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newMsg]);
    setSidebarOpen(false); // Close sidebar on mobile when sending

    const cachedResponse = getCachedChatResponse(currentSessionId, userMessage);

    if (cachedResponse) {
      setMessages(prev => [...prev, { role: "assistant", content: cachedResponse }]);
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ 
          message: userMessage,
          sessionId: currentSessionId,
          user: {
            id: user?.id,
            email: user?.email,
            full_name: profile?.full_name,
            role: profile?.role
          }
        }),
      });
      
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'API error');
      }

      const assistantResponse = data.output || data.error || EMPTY_RESPONSE_MESSAGE;

      setCachedChatResponse(currentSessionId, userMessage, assistantResponse);
      setMessages(prev => [...prev, { role: "assistant", content: assistantResponse }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: error.message || CONNECTION_ERROR_MESSAGE }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      // Handle markdown table rows
      if (line.trim().startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim() !== "");
        if (line.includes('---')) return null;
        return (
          <div key={i} className="grid grid-cols-2 gap-4 border-b border-slate-700 py-3 hover:bg-slate-700/30 px-3 transition text-sm md:text-base">
            {cells.map((cell, j) => (
              <span key={j} className={j === 0 ? "font-semibold text-slate-100" : "text-slate-300"}>
                {cell.replace(/\*\*/g, '').trim()}
              </span>
            ))}
          </div>
        );
      }

      // Handle bold text
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-slate-100">{part.replace(/\*\*/g, '')}</strong>;
        }
        return part;
      });

      return (
        <p key={i} className="mb-4 leading-relaxed text-base md:text-lg text-slate-200 font-normal">
          {formattedLine}
        </p>
      );
    });
  };

  // Show loading while auth is being verified
  if (authLoading) {
    return (
      <div className="flex h-screen bg-slate-950 text-slate-100 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-950 dark:bg-slate-950 text-slate-100 dark:text-slate-100">
      
      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 lg:hidden transition-opacity backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 bg-gradient-to-b from-slate-900 to-slate-950 dark:from-slate-900 dark:to-slate-950 p-4 flex flex-col gap-3 border-r border-slate-800 dark:border-slate-800 transition-all duration-300 transform shadow-2xl ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        
        {/* Close button on mobile */}
        <button 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden mb-4 p-2 hover:bg-slate-800 dark:hover:bg-slate-800 rounded-lg transition text-slate-200"
        >
          <X size={24} />
        </button>

        {/* Collapse/Expand button on desktop */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center justify-center p-2 hover:bg-slate-800 dark:hover:bg-slate-800 rounded-lg transition mb-4 text-slate-400"
          title={sidebarCollapsed ? "Luaskan menu" : "Ciutkan menu"}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* LOGO */}
        <div className={`text-cyan-400 font-bold px-3 mb-8 flex items-center gap-2 transition-all duration-300 ${
          sidebarCollapsed ? 'text-sm justify-center' : 'text-2xl'
        }`}>
          <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 animate-pulse shadow-lg shadow-cyan-400/50"></div>
          {!sidebarCollapsed && <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Kalbar-1</span>}
        </div>

        {/* USER PROFILE CARD */}
        {user && !sidebarCollapsed && (
          <div className="bg-slate-700/30 border border-slate-600/30 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate">{profile?.full_name || user.email}</p>
                <p className="text-xs text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            {profile?.role && (
              <p className="text-xs text-slate-300 bg-slate-600/50 px-2 py-1 rounded w-fit">{profile.role}</p>
            )}
          </div>
        )}

        {/* NAV BUTTONS */}
        <button 
          onClick={() => { setActiveTab("chat"); setSidebarOpen(false); }} 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            activeTab === 'chat' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50 scale-105' : 'hover:bg-slate-800 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200'
          } ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
          title={sidebarCollapsed ? 'Chat' : ''}
        >
          <MessageSquare size={20} /> 
          {!sidebarCollapsed && <span className="font-medium">Chat</span>}
        </button>

        <button 
          onClick={() => { setActiveTab("analysis"); setSidebarOpen(false); }} 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            activeTab === 'analysis' ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50 scale-105' : 'hover:bg-slate-800 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200'
          } ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
          title={sidebarCollapsed ? 'Analysis' : ''}
        >
          <BarChart3 size={20} /> 
          {!sidebarCollapsed && <span className="font-medium">Analysis</span>}
        </button>

        {/* CLEAR CHAT BUTTON */}
        <button 
          onClick={() => {
            setMessages([]);
            setSidebarOpen(false);

            if (user?.id) {
              const newSessionId = createChatSessionId(user.id);
              sessionStorage.setItem(`${CHAT_SESSION_STORAGE_PREFIX}:${user.id}`, newSessionId);
              setChatSessionId(newSessionId);
            }
          }} 
          className={`mt-auto flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-xl transition-all duration-200 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
          title={sidebarCollapsed ? 'Clear Chat' : ''}
        >
          <Trash2 size={20} /> 
          {!sidebarCollapsed && <span className="font-medium">Clear Chat</span>}
        </button>

        {/* LOGOUT BUTTON */}
        <button 
          onClick={handleLogout}
          className={`flex items-center gap-3 px-4 py-3 text-amber-400 hover:text-amber-300 hover:bg-amber-900/20 rounded-xl transition-all duration-200 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
          title={sidebarCollapsed ? 'Logout' : ''}
        >
          <LogOut size={20} /> 
          {!sidebarCollapsed && <span className="font-medium">Logout</span>}
        </button>

        {/* FOOTER TEXT */}
        <div className={`text-xs text-slate-500 px-3 py-2 transition-all duration-300 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
          {!sidebarCollapsed ? '© 2026 AIRIS' : '©'}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-b from-slate-950 to-slate-900 dark:from-slate-950 dark:to-slate-900">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-800 dark:border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 shadow-xl">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition text-slate-300"
          >
            <Menu size={24} />
          </button>
          
          <h1 className="flex-1 lg:flex-none text-center lg:text-left text-4xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.02em'}}>
            Airis-Evo
          </h1>
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 hover:bg-slate-800 dark:hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-slate-200"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
          </button>
        </div>

        {/* CHAT CONTAINER */}
        {activeTab === "chat" ? (
          <>
            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 bg-gradient-to-b from-slate-900 to-slate-950">
              {/* WELCOME STATE */}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-4">
                  <div className="w-20 md:w-24 h-20 md:h-24 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 rounded-3xl mb-8 md:mb-12 flex items-center justify-center shadow-2xl shadow-cyan-500/40 animate-glow" aria-hidden>
                    <Infinity size={48} className="text-white" />
                  </div>
                  <h1 className="text-4xl md:text-6xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 animate-fadeInUp">
                    SEMANGAT PAGI!
                  </h1>
                  <p className="text-lg md:text-2xl text-slate-300 max-w-md leading-relaxed mb-8 animate-slideInRight">
                    Saya siap membantu Anda dengan berbagai pertanyaan dan tugas analisis.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl">
                    <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 hover:border-cyan-500/50 transition">
                      <div className="text-2xl mb-2">💬</div>
                      <p className="text-sm font-medium text-slate-300">Tanya Kapan Saja</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 hover:border-blue-500/50 transition">
                      <div className="text-2xl mb-2">📊</div>
                      <p className="text-sm font-medium text-slate-300">Analisis Data</p>
                    </div>
                    <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:border-purple-500/50 transition">
                      <div className="text-2xl mb-2">⚡</div>
                      <p className="text-sm font-medium text-slate-300">Respon Cepat</p>
                    </div>
                  </div>
                </div>
              )}

              {/* MESSAGES */}
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex gap-3 md:gap-4 max-w-4xl mx-auto w-full animate-fadeInUp ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* ASSISTANT AVATAR */}
                  {m.role === 'assistant' && (
                    <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex-shrink-0 flex items-center justify-center mt-1 shadow-lg shadow-cyan-500/40">
                      <Infinity size={20} className="text-white" />
                    </div>
                  )}

                  {/* MESSAGE BUBBLE */}
                  <div className={`flex-1 max-w-xs md:max-w-2xl px-5 md:px-6 py-3 md:py-4 rounded-2xl transition-all duration-200 group ${
                    m.role === 'user' 
                      ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white rounded-3xl rounded-tr-md shadow-lg shadow-cyan-500/20' 
                      : 'bg-slate-800 text-slate-100 border border-slate-700'
                  }`}>
                    <div className="text-sm md:text-base leading-relaxed">
                      {renderContent(m.content)}
                    </div>
                    {m.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(m.content, i)}
                        className="mt-2 text-xs px-2 py-1 rounded transition-all flex items-center gap-1 text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                        title="Copy response"
                      >
                        {copiedIndex === i ? (
                          <><Check size={14} /> Copied!</>
                        ) : (
                          <><Copy size={14} /> Copy</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* LOADING INDICATOR */}
              {isLoading && (
                <div className="flex gap-3 md:gap-4 max-w-4xl mx-auto w-full animate-fadeInUp">
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex-shrink-0 flex items-center justify-center mt-1 shadow-lg shadow-cyan-500/40">
                    <Infinity size={20} className="text-white animate-pulse" />
                  </div>
                  <div className="flex items-center gap-2 px-5 md:px-6 py-3 md:py-4 rounded-2xl bg-slate-800 border border-slate-700">
                    <span className="text-slate-300 mr-3">Airis mengetik</span>
                    <div className="typing-dots">
                      <span className="dot" />
                      <span className="dot" style={{animationDelay: '0.12s'}} />
                      <span className="dot" style={{animationDelay: '0.24s'}} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            {/* INPUT AREA */}
            <div className="px-4 md:px-8 py-4 md:py-6 bg-gradient-to-t from-slate-950 to-slate-900 border-t border-slate-800 shadow-2xl shadow-black/50">
              <div className="max-w-2xl mx-auto flex flex-col gap-3">
                {/* INPUT BOX */}
                <div className="flex gap-2 items-center bg-slate-800 rounded-full px-4 md:px-6 py-2 md:py-3 border-2 border-slate-700 focus-within:border-cyan-500 focus-within:shadow-lg focus-within:shadow-cyan-500/30 transition-all duration-200 hover:border-slate-600">
                  <input 
                    ref={inputRef}
                    className="flex-1 bg-transparent outline-none text-slate-100 placeholder-slate-500 text-sm md:text-base" 
                    placeholder="Tanya apa saja..." 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    disabled={isLoading}
                  />
                  <button 
                    onClick={handleSend} 
                    disabled={!input.trim() || isLoading}
                    className={`p-2 md:p-2 rounded-full transition-all duration-200 transform ${
                      input.trim() && !isLoading
                        ? 'text-cyan-400 hover:bg-slate-700 hover:text-cyan-300 active:scale-95' 
                        : 'text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </div>

                {/* DISCLAIMER */}
                <div className="text-center space-y-1">
                  <p className="text-xs md:text-xs text-slate-500">
                    A.I.R.I.S dapat melakukan kesalahan. Periksa informasi penting.
                  </p>
                  <p className="text-xs text-slate-600">
                    Dikembangkan oleh Rizky Fauzi
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : activeTab === "analysis" ? (
          <AnalysisDashboard />
        ) : null}
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(-10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(34, 211, 238, 0.4);
          }
          50% {
            box-shadow: 0 0 30px rgba(34, 211, 238, 0.6);
          }
        }

        .animate-fadeInUp {
          animation: fadeInUp 0.5s ease-out;
        }

        .animate-slideInRight {
          animation: slideInRight 0.5s ease-out;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        .typing-dots {
          display: flex;
          gap: 4px;
        }

        .typing-dots .dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: currentColor;
          animation: typing 1.4s infinite;
        }

        @keyframes typing {
          0%, 60%, 100% {
            opacity: 0.3;
          }
          30% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
