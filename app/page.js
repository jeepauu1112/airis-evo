"use client";
import { useState, useRef, useEffect } from 'react';
import { Brain, Menu, X, Calendar, MessageSquare, Send, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AirisGemini() {
  const [activeTab, setActiveTab] = useState("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Enable dark mode on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Auto scroll to newest message
  useEffect(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    setInput("");
    const newMsg = { role: "user", content: userMessage };
    setMessages(prev => [...prev, newMsg]);
    setIsLoading(true);
    setSidebarOpen(false); // Close sidebar on mobile when sending

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: userMessage }),
      });
      
      if (!res.ok) throw new Error('API error');
      
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.output || "Maaf, ada kesalahan pada respons." }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Koneksi terputus atau ada kesalahan. Silakan coba lagi." }]);
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
          <div key={i} className="grid grid-cols-2 gap-4 border-b border-gray-200 dark:border-[#444746] py-3 hover:bg-gray-50 dark:hover:bg-[#2a2b2c] px-3 transition text-sm md:text-base">
            {cells.map((cell, j) => (
              <span key={j} className={j === 0 ? "font-semibold text-gray-800 dark:text-[#e3e3e3]" : "text-gray-600 dark:text-[#c4c7c5]"}>
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
          return <strong key={index} className="font-bold text-gray-900 dark:text-white">{part.replace(/\*\*/g, '')}</strong>;
        }
        return part;
      });

      return (
        <p key={i} className="mb-4 leading-relaxed text-base md:text-lg text-gray-800 dark:text-[#e3e3e3] font-normal">
          {formattedLine}
        </p>
      );
    });
  };

  return (
    <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-[#e3e3e3]">
      
      {/* MOBILE SIDEBAR OVERLAY */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 bg-gray-50 dark:bg-[#1e1f20] p-4 flex flex-col gap-3 border-r border-gray-200 dark:border-[#444746] transition-all duration-300 transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
        
        {/* Close button on mobile */}
        <button 
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden mb-4 p-2 hover:bg-gray-200 dark:hover:bg-[#333537] rounded-lg transition"
        >
          <X size={24} />
        </button>

        {/* Collapse/Expand button on desktop */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center justify-center p-2 hover:bg-gray-200 dark:hover:bg-[#333537] rounded-lg transition mb-4"
          title={sidebarCollapsed ? "Luaskan menu" : "Ciutkan menu"}
        >
          {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* LOGO */}
        <div className={`text-[#00A3AD] font-bold px-3 mb-8 flex items-center gap-2 transition-all duration-300 ${
          sidebarCollapsed ? 'text-sm justify-center' : 'text-2xl'
        }`}>
          <div className="w-2 h-2 rounded-full bg-[#00A3AD] animate-pulse"></div>
          {!sidebarCollapsed && ''}
        </div>

        {/* NAV BUTTONS */}
        <button 
          onClick={() => { setActiveTab("chat"); setSidebarOpen(false); }} 
          className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
            activeTab === 'chat' ? 'bg-gradient-to-r from-[#00A3AD] to-[#008a8f] text-white shadow-lg scale-105' : 'hover:bg-gray-200 dark:hover:bg-[#333537] text-gray-600 dark:text-[#c4c7c5]'
          } ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
          title={sidebarCollapsed ? 'Chat' : ''}
        >
          <MessageSquare size={20} /> 
          {!sidebarCollapsed && <span className="font-medium">Chat</span>}
        </button>

        {/* CLEAR CHAT BUTTON */}
        <button 
          onClick={() => { setMessages([]); setSidebarOpen(false); }} 
          className={`mt-auto flex items-center gap-3 px-4 py-3 text-red-500 dark:text-[#f2b8b5] hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 ${sidebarCollapsed ? 'lg:justify-center' : ''}`}
          title={sidebarCollapsed ? 'Clear Chat' : ''}
        >
          <Trash2 size={20} /> 
          {!sidebarCollapsed && <span className="font-medium">Clear Chat</span>}
        </button>

        {/* FOOTER TEXT */}
        <div className={`text-xs text-gray-500 dark:text-[#8a8c8e] px-3 py-2 transition-all duration-300 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
          {!sidebarCollapsed ? '© 2026 AIRIS' : '©'}
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200 dark:border-[#444746] bg-white dark:bg-[#131314]">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-[#2a2b2c] rounded-lg transition"
          >
            <Menu size={24} />
          </button>
          
          <h1 className="flex-1 lg:flex-none text-center lg:text-left text-4xl font-bold tracking-tight text-[#00A3AD]" style={{fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', letterSpacing: '-0.02em'}}>
            Airis-Evo
          </h1>
          
          <div></div>
        </div>

        {/* CHAT CONTAINER */}
        {activeTab === "chat" ? (
          <>
            {/* MESSAGES AREA */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8">
              {/* WELCOME STATE */}
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-[#c4c7c5] text-center px-4">
                  <div className="w-12 md:w-16 h-12 md:h-16 bg-gradient-to-br from-[#00A3AD] to-[#004a4d] rounded-full mb-6 md:mb-8 flex items-center justify-center shadow-lg">
                    <Brain size={32} className="text-white md:w-9 md:h-9" />
                  </div>
                  <h1 className="text-3xl md:text-5xl font-bold mb-3 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-[#00A3AD]">
                    SEMANGAT PAGI!
                  </h1>
                  <p className="text-lg md:text-2xl text-gray-600 dark:text-[#c4c7c5] max-w-md">
                    Saya siap membantu Anda dengan berbagai pertanyaan dan tugas.
                  </p>
                </div>
              )}

              {/* MESSAGES */}
              {messages.map((m, i) => (
                <div 
                  key={i} 
                  className={`flex gap-3 md:gap-4 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2 ${
                    m.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {/* ASSISTANT AVATAR */}
                  {m.role === 'assistant' && (
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-[#00A3AD] to-[#004a4d] flex-shrink-0 flex items-center justify-center mt-1 shadow-md">
                      <Brain size={18} className="text-white" />
                    </div>
                  )}

                  {/* MESSAGE BUBBLE */}
                  <div className={`flex-1 max-w-xs md:max-w-2xl px-4 md:px-5 py-3 md:py-4 rounded-2xl transition-all duration-200 ${
                    m.role === 'user' 
                      ? 'bg-gray-800 dark:bg-gray-700 text-white rounded-3xl rounded-br-none shadow-md' 
                      : 'bg-gray-100 dark:bg-[#1e1f20] text-gray-800 dark:text-[#e3e3e3]'
                  }`}>
                    <div className="text-sm md:text-base leading-relaxed">
                      {renderContent(m.content)}
                    </div>
                  </div>
                </div>
              ))}

              {/* LOADING INDICATOR */}
              {isLoading && (
                <div className="flex gap-3 md:gap-4 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-bottom-2">
                  <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-[#00A3AD] to-[#004a4d] flex-shrink-0 flex items-center justify-center mt-1">
                    <Brain size={18} className="text-white animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1 px-4 md:px-5 py-3 md:py-4 rounded-2xl bg-gray-100 dark:bg-[#1e1f20]">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              )}

              <div ref={scrollRef} />
            </div>

            {/* INPUT AREA */}
            <div className="px-4 md:px-8 py-4 md:py-6 bg-white dark:bg-[#131314] border-t border-gray-200 dark:border-[#444746]">
              <div className="max-w-2xl mx-auto flex flex-col gap-3">
                {/* INPUT BOX */}
                <div className="flex gap-2 items-center bg-gray-100 dark:bg-[#2a2b2c] rounded-full px-4 md:px-6 py-2 md:py-3 border-2 border-transparent focus-within:border-[#00A3AD] transition-all duration-200 shadow-sm hover:shadow-md">
                  <input 
                    ref={inputRef}
                    className="flex-1 bg-transparent outline-none text-gray-900 dark:text-[#e3e3e3] placeholder-gray-500 dark:placeholder-[#8a8c8e] text-sm md:text-base" 
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
                        ? 'text-[#00A3AD] hover:bg-gray-200 dark:hover:bg-[#3a3b3c] active:scale-95' 
                        : 'text-gray-300 dark:text-[#42464a] cursor-not-allowed'
                    }`}
                  >
                    <Send size={20} />
                  </button>
                </div>

                {/* DISCLAIMER */}
                <div className="text-center space-y-1">
                  <p className="text-xs md:text-xs text-gray-500 dark:text-[#8a8c8e]">
                    A.I.R.I.S dapat melakukan kesalahan. Periksa informasi penting.
                  </p>
                  <p className="text-xs text-gray-400 dark:text-[#71777a]">
                    Dikembangkan oleh Rizky Fauzi
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          // PLACEHOLDER FOR OTHER TABS
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-gray-500 dark:text-[#8a8c8e]">
            <Calendar size={64} className="mb-6 opacity-50" />
            <h2 className="text-3xl font-semibold mb-2">Jadwal Kapal</h2>
            <p className="text-lg">Segera hadir.</p>
          </div>
        )}
      </div>
    </div>
  );
}