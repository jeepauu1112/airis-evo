"use client";
import { useState, useRef, useEffect } from 'react';
import { Bot, User, Calendar, MessageSquare, Send, Trash2, Sun, Moon, Monitor } from 'lucide-react';

export default function AirisGemini() {
  const [activeTab, setActiveTab] = useState("chat");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState('dark'); // Default
  const scrollRef = useRef(null);

  // LOGIKA THEME
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (t) => {
    const root = window.document.documentElement;
    if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const changeTheme = (t) => {
    setTheme(t);
    localStorage.setItem('theme', t);
    applyTheme(t);
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const newMsg = { role: "user", content: input };
    setMessages(prev => [...prev, newMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: input }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.output }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Koneksi terputus, bro." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, i) => {
      if (line.trim().startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim() !== "");
        if (line.includes('---')) return null;
        return (
          <div key={i} className="grid grid-cols-2 border-b border-gray-200 dark:border-[#444746] py-4 hover:bg-gray-50 dark:hover:bg-[#2a2b2c] px-2 transition text-[16px]">
            {cells.map((cell, j) => (
              <span key={j} className={j === 0 ? "font-semibold text-gray-800 dark:text-[#e3e3e3]" : "text-gray-600 dark:text-[#c4c7c5]"}>
                {cell.replace(/\*\*/g, '').trim()}
              </span>
            ))}
          </div>
        );
      }

      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedLine = parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={index} className="font-bold text-gray-900 dark:text-white">{part.replace(/\*\*/g, '')}</strong>;
        }
        return part;
      });

      return (
        <p key={i} className="mb-5 leading-relaxed text-[17px] text-gray-800 dark:text-[#e3e3e3] font-normal">
          {formattedLine}
        </p>
      );
    });
  };

  return (
    <div className="flex h-screen bg-white dark:bg-[#131314] text-gray-900 dark:text-[#e3e3e3] font-sans tracking-tight transition-colors duration-300">
      
      {/* SIDEBAR */}
      <div className="w-64 bg-gray-50 dark:bg-[#1e1f20] p-4 flex flex-col gap-2 border-r border-gray-200 dark:border-[#444746]">
        
        {/* THEME SWITCHER (KIRI ATAS) */}
        <div className="flex bg-gray-200 dark:bg-[#333537] p-1 rounded-full mb-6">
          <button onClick={() => changeTheme('light')} className={`flex-1 flex justify-center py-1.5 rounded-full transition ${theme === 'light' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-500'}`}><Sun size={16}/></button>
          <button onClick={() => changeTheme('dark')} className={`flex-1 flex justify-center py-1.5 rounded-full transition ${theme === 'dark' ? 'bg-[#131314] text-blue-400 shadow-sm' : 'text-gray-500'}`}><Moon size={16}/></button>
          <button onClick={() => changeTheme('system')} className={`flex-1 flex justify-center py-1.5 rounded-full transition ${theme === 'system' ? 'bg-gray-400 dark:bg-[#444746] text-white shadow-sm' : 'text-gray-500'}`}><Monitor size={16}/></button>
        </div>

        <div className="text-[#00A3AD] font-semibold text-2xl px-2 mb-8 flex items-center gap-2">⚡ A.I.R.I.S</div>
        <button onClick={() => setActiveTab("chat")} className={`flex items-center gap-3 p-3 rounded-full transition-all ${activeTab === 'chat' ? 'bg-[#004a4d] text-white' : 'hover:bg-gray-200 dark:hover:bg-[#333537] text-gray-600 dark:text-[#c4c7c5]'}`}><MessageSquare size={20} /> Chat</button>
        <button onClick={() => setMessages([])} className="mt-auto flex items-center gap-3 p-3 text-red-500 dark:text-[#f2b8b5] hover:bg-red-50 dark:hover:bg-red-900/10 rounded-full transition"><Trash2 size={20} /> Clear Chat</button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-white dark:bg-[#131314]">
        {activeTab === "chat" ? (
          <>
            <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-8">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-[#c4c7c5] opacity-80 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#00A3AD] to-[#004a4d] rounded-full mb-6 flex items-center justify-center shadow-lg">
                    <Bot size={28} className="text-white" />
                  </div>
                  <h1 className="text-4xl font-medium mb-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-[#00A3AD]">Semangat Pagi!</h1>
                  <p className="text-2xl">Ada yang bisa A.I.R.I.S bantu?</p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-5 max-w-4xl mx-auto ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#00A3AD] to-[#004a4d] flex-shrink-0 flex items-center justify-center mt-1"><Bot size={20} className="text-white" /></div>}
                  <div className={`p-2 rounded-2xl w-full ${m.role === 'user' ? 'bg-gray-100 dark:bg-[#303132] px-6 py-3 max-w-fit' : ''}`}>
                    {renderContent(m.content)}
                  </div>
                  {m.role === 'user' && <div className="w-9 h-9 rounded-full bg-orange-500 flex-shrink-0 flex items-center justify-center mt-1 text-white font-bold text-xs">R</div>}
                </div>
              ))}
              {isLoading && <div className="flex gap-4 items-center text-[#00A3AD] animate-pulse max-w-4xl mx-auto"><Bot size={20}/> <span>Mengetik...</span></div>}
              <div ref={scrollRef} />
            </div>
            
            <div className="p-4 md:p-8">
              <div className="max-w-3xl mx-auto flex flex-col gap-3">
                <div className="bg-gray-100 dark:bg-[#1e1f20] rounded-full flex items-center px-6 py-1 border border-transparent focus-within:border-gray-300 dark:focus-within:border-[#444746] transition-all shadow-md">
                  <input className="flex-1 bg-transparent outline-none py-4 text-gray-800 dark:text-[#e3e3e3]" placeholder="Tulis pesan..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} />
                  <button onClick={handleSend} className={`p-2 rounded-full ${input ? 'text-[#00A3AD] scale-110' : 'text-gray-400'}`} disabled={!input}><Send size={24} /></button>
                </div>
                <p className="text-center text-[12px] text-gray-500 dark:text-[#c4c7c5]">
                  A.I.R.I.S dapat melakukan kesalahan. Pertimbangkan untuk memeriksa informasi penting.
                </p>
                <p className="text-center text-[12px] text-gray-500 dark:text-[#c4c7c5]">
                  Dibuat oleh Rizky Fauzi
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
             <Calendar size={80} className="text-gray-300 dark:text-[#444746] mb-6" />
             <h2 className="text-3xl font-medium">Jadwal Kapal</h2>
             <p className="text-gray-500 dark:text-[#c4c7c5] mt-3">Segera hadir.</p>
          </div>
        )}
      </div>
    </div>
  );
}