"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Infinity, Menu, X, MessageSquare, Send, Copy, Check, BarChart3, Moon, Sun, LogOut, User, PanelLeftClose, Trash2 } from 'lucide-react';
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
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') return true;

    return localStorage.getItem('airis-evo-theme') !== 'light';
  });
  const [chatSessionId, setChatSessionId] = useState('');
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Enable dark mode on mount
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('airis-evo-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('airis-evo-theme', 'light');
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

  const shellClass = isDarkMode
    ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-black text-slate-100'
    : 'bg-white text-slate-950';
  const sidebarSurfaceClass = isDarkMode
    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-r border-slate-700/50 shadow-2xl'
    : 'bg-[#f7f7f8] border-r border-slate-200';
  const mainSurfaceClass = isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-black' : 'bg-slate-50';
  const backgroundImageOpacityClass = isDarkMode ? 'opacity-15' : 'opacity-30';
  const backgroundOverlayClass = isDarkMode
    ? 'bg-gradient-to-br from-slate-900/70 via-slate-800/65 to-black/75'
    : 'bg-gradient-to-br from-white/68 via-slate-50/64 to-slate-100/68';
  const iconButtonClass = isDarkMode
    ? 'text-slate-400 hover:bg-slate-700/50 hover:text-cyan-300'
    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-950';
  const navActiveClass = isDarkMode ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/30' : 'bg-slate-200 text-slate-950';
  const navIdleClass = isDarkMode
    ? 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-100'
    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-950';
  const promptButtonClass = isDarkMode
    ? 'border-slate-700/50 bg-slate-800/40 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-700/50'
    : 'border-slate-200 text-slate-700 hover:bg-slate-100';
  const userBubbleClass = isDarkMode
    ? 'rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20'
    : 'rounded-3xl bg-slate-100 text-slate-950';
  const composerClass = isDarkMode
    ? 'bg-slate-700/50 border border-slate-600 focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/30'
    : 'bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.16),0_8px_24px_rgba(15,23,42,0.08)] focus-within:shadow-[0_0_0_1px_rgba(8,145,178,0.45),0_8px_24px_rgba(15,23,42,0.08)]';
  const disabledSendClass = isDarkMode
    ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
    : 'bg-slate-200 text-slate-400 cursor-not-allowed';

  return (
    <div className={`flex h-screen ${shellClass}`}>
      
      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col gap-2 p-3 text-sm transition-all duration-300 transform ${sidebarSurfaceClass} ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
        
        <div className="mb-8 flex items-center gap-2 px-2 pt-2">
          {sidebarCollapsed ? (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className={`flex h-10 flex-1 items-center justify-center rounded-lg transition ${iconButtonClass}`}
              title="Buka sidebar"
            >
              <Infinity size={24} className="text-cyan-300" />
            </button>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2 text-xl font-semibold">
              <Infinity size={22} className="flex-shrink-0 text-cyan-300" />
              <span className="truncate">AIRIS-EVO</span>
            </div>
          )}

          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(true)}
              className={`hidden h-9 w-9 items-center justify-center rounded-lg transition lg:flex ${iconButtonClass}`}
              title="Tutup sidebar"
            >
              <PanelLeftClose size={21} />
            </button>
          )}

          <button
            onClick={() => setSidebarOpen(false)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg transition lg:hidden ${iconButtonClass}`}
            title="Tutup menu"
          >
            <X size={22} />
          </button>
        </div>

        {/* USER PROFILE CARD */}
        {user && !sidebarCollapsed && (
          <div className={`hidden mb-3 rounded-lg px-3 py-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-slate-100' : 'text-slate-950'}`}>{profile?.full_name || user.email}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            {profile?.role && (
              <p className="text-xs text-slate-500 px-1 py-0.5 w-fit">{profile.role}</p>
            )}
          </div>
        )}

        {/* NAV BUTTONS */}
        <button 
          onClick={() => { setActiveTab("chat"); setSidebarOpen(false); }} 
          className={`flex h-10 items-center gap-3 rounded-lg px-3 transition ${
            activeTab === 'chat' ? navActiveClass : navIdleClass
          } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
          title={sidebarCollapsed ? 'Chat' : ''}
        >
          <MessageSquare size={20} /> 
          {!sidebarCollapsed && <span className="font-medium">Chat</span>}
        </button>

        <button 
          onClick={() => { setActiveTab("analysis"); setSidebarOpen(false); }} 
          className={`flex h-10 items-center gap-3 rounded-lg px-3 transition ${
            activeTab === 'analysis' ? navActiveClass : navIdleClass
          } ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
          title={sidebarCollapsed ? 'Analysis' : ''}
        >
          <BarChart3 size={20} /> 
          {!sidebarCollapsed && <span className="font-medium">Analysis</span>}
        </button>

        {user && (
          <div className={`mt-auto rounded-lg px-3 py-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'} ${sidebarCollapsed ? 'lg:px-0' : ''}`}>
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500">
                <User size={17} className="text-white" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${isDarkMode ? 'text-slate-100' : 'text-slate-950'}`}>{profile?.full_name || user.email}</p>
                  <p className="truncate text-xs text-slate-500">{user.email}</p>
                </div>
              )}
            </div>
            {profile?.role && !sidebarCollapsed && (
              <p className="mt-3 px-1 text-xs text-slate-500">{profile.role}</p>
            )}
          </div>
        )}

        {/* LOGOUT BUTTON */}
        <button 
          onClick={handleLogout}
          className={`flex h-10 items-center gap-3 rounded-lg px-3 transition ${navIdleClass} ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
          title={sidebarCollapsed ? 'Logout' : ''}
        >
          <LogOut size={20} /> 
          {!sidebarCollapsed && <span className="font-medium">Logout</span>}
        </button>

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
          className={`flex h-10 items-center gap-3 rounded-lg px-3 transition ${navIdleClass} ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
          title={sidebarCollapsed ? 'Hapus chat' : ''}
        >
          <Trash2 size={20} />
          {!sidebarCollapsed && <span className="font-medium">Hapus chat</span>}
        </button>

        {/* FOOTER TEXT */}
        <div className={`hidden px-3 py-2 text-xs text-slate-600 transition-all duration-300 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
          {!sidebarCollapsed ? '© 2026 AIRIS' : '©'}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className={`relative flex flex-1 flex-col overflow-hidden ${mainSurfaceClass}`}>
        <div
          className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500 ${backgroundImageOpacityClass}`}
          style={{
            backgroundImage: 'url(https://res.cloudinary.com/cdb-klb1/image/upload/v1780291636/DSC06031_ewwkyo.jpg)'
          }}
        />
        <div className={`absolute inset-0 transition-colors duration-500 ${backgroundOverlayClass}`} />
        
        {/* HEADER */}
        <div className="relative z-10 flex h-24 flex-shrink-0 items-center justify-between px-3 md:px-5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition lg:hidden ${iconButtonClass}`}
            title="Buka menu"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex flex-1 flex-col items-center gap-1 lg:items-start">
            <Image
              src="https://res.cloudinary.com/cdb-klb1/image/upload/v1780321996/PLN_IPS_Logo_vmda13.png"
              alt="PLN IPS"
              width={190}
              height={56}
              className="h-10 w-auto sm:h-12"
              priority
            />
            <h1
              className="text-center text-base font-bold uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 sm:text-lg lg:text-left"
              style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}
            >
              IPP KALBAR-1 2X100 MW
            </h1>
          </div>
          
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`flex h-10 w-10 items-center justify-center rounded-lg transition ${iconButtonClass}`}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        {/* CHAT CONTAINER */}
        {activeTab === "chat" ? (
          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
              {/* WELCOME STATE */}
              {messages.length === 0 && (
                <div className={`mx-auto flex h-full max-w-3xl flex-col items-center justify-center px-4 pb-20 text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${isDarkMode ? 'bg-slate-800/40 border border-slate-700/50 shadow-2xl shadow-cyan-500/20' : 'bg-slate-100'}`} aria-hidden>
                    <Infinity size={30} className="text-cyan-300" />
                  </div>
                  <h1 className={`mb-3 text-3xl font-semibold md:text-[2.15rem] ${isDarkMode ? 'text-slate-100' : 'text-slate-950'}`}>
                    Apa yang bisa saya bantu?
                  </h1>
                  <p className={`mb-8 max-w-xl text-base leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Tanyakan kebutuhan operasional, spesifikasi peralatan, atau analisis data.
                  </p>
                  <div className="hidden w-full max-w-2xl grid-cols-1 gap-3 md:grid-cols-3">
                    <button onClick={() => setInput('Berikan spesifikasi generator')} className={`rounded-xl border px-4 py-3 text-left transition [&>div]:hidden ${promptButtonClass}`}>
                      <div className="text-2xl mb-2">💬</div>
                      <p className="text-sm font-medium text-slate-300">Spesifikasi generator</p>
                    </button>
                    <button onClick={() => setInput('Analisa data performa unit')} className={`rounded-xl border px-4 py-3 text-left transition [&>div]:hidden ${promptButtonClass}`}>
                      <div className="text-2xl mb-2">📊</div>
                      <p className="text-sm font-medium text-slate-300">Analisis Data</p>
                    </button>
                    <button onClick={() => setInput('Buat ringkasan kondisi unit')} className={`rounded-xl border px-4 py-3 text-left transition [&>div]:hidden ${promptButtonClass}`}>
                      <div className="text-2xl mb-2">⚡</div>
                      <p className="text-sm font-medium text-slate-300">Ringkasan unit</p>
                    </button>
                  </div>
                </div>
              )}

              {/* MESSAGES */}
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`mx-auto flex w-full max-w-3xl gap-4 py-4 animate-fadeInUp ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* MESSAGE BUBBLE */}
                  <div className={`group max-w-[85%] px-4 py-3 text-sm leading-relaxed md:text-base ${
                    m.role === 'user' 
                      ? userBubbleClass 
                      : `max-w-none flex-1 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`
                  }`}>
                    <div>
                      {renderContent(m.content)}
                    </div>
                    {m.role === 'assistant' && (
                      <button
                        onClick={() => copyToClipboard(m.content, i)}
                        className={`mt-2 flex items-center gap-1 rounded px-2 py-1 text-xs transition ${iconButtonClass}`}
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
                <div className="mx-auto flex w-full max-w-3xl gap-4 py-4 animate-fadeInUp">
                  <div className={`flex items-center gap-2 py-3 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    <span className="mr-3">Airis mengetik</span>
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
            <div className="px-4 pb-4 pt-2 md:px-8 md:pb-6">
              <div className="mx-auto flex max-w-4xl flex-col gap-3">
                {/* INPUT BOX */}
                <div className="flex items-center gap-4">
                  <div className={`flex min-h-14 flex-1 items-center gap-2 rounded-[28px] px-4 py-2 transition ${composerClass}`}>
                    <input 
                      ref={inputRef}
                      className={`flex-1 bg-transparent text-sm outline-none placeholder-slate-500 md:text-base ${isDarkMode ? 'text-slate-100' : 'text-slate-950'}`}
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
                      className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
                        input.trim() && !isLoading
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 active:scale-95' 
                          : disabledSendClass
                      }`}
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>

                {/* DISCLAIMER */}
                <div className="text-center">
                  <p className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
                    A.I.R.I.S dapat melakukan kesalahan. Periksa informasi penting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === "analysis" ? (
          <div className="relative z-10 flex min-h-0 flex-1">
            <AnalysisDashboard isDarkMode={isDarkMode} />
          </div>
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
