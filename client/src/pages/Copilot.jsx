import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { copilotApi } from '../api/client';
import { useToast } from '../context/ToastContext';
import { 
  Bot, 
  Send, 
  User, 
  Plus, 
  Trash2, 
  Sparkles, 
  FileText, 
  Dna, 
  ChevronRight,
  MessageSquare,
  ShieldCheck,
  Square,
  Zap
} from 'lucide-react';

export default function Copilot() {
  const navigate = useNavigate();
  const { error } = useToast();
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const abortControllerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const userScrolledUpRef = useRef(false);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  useEffect(() => {
    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  const handleScroll = () => {
    if (!chatContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    userScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 100;
  };

  const loadConversations = async () => {
    try {
      const res = await copilotApi.getConversations();
      const list = res.data.conversations || [];
      setConversations(list);
      if (list.length > 0) {
        setActiveConvId(list[0].id);
      } else {
        setMessages([
          {
            id: 'welcome_1',
            role: 'assistant',
            content: "Hello! I am your AI Recruitment Copilot powered by TalentIQ RAG intelligence. I can search candidates across your vector database, compare technical backgrounds, analyze skill evidence, and generate personalized interview questions. What role are you recruiting for today?",
            candidate_references: []
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const res = await copilotApi.getConversationById(convId);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSend = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim() || isStreaming) return;

    setInputText('');
    userScrolledUpRef.current = false;

    const tempUserMsg = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: text.trim()
    };

    const tempAssistantMsgId = `assistant_${Date.now()}`;
    const tempAssistantMsg = {
      id: tempAssistantMsgId,
      role: 'assistant',
      content: '',
      candidate_references: []
    };

    setMessages(prev => [...prev, tempUserMsg, tempAssistantMsg]);
    setIsStreaming(true);

    const token = localStorage.getItem('talentiq_token');
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/copilot/chat-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: activeConvId
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              
              if (data.conversation_id && !activeConvId) {
                setActiveConvId(data.conversation_id);
                setConversations(prev => [
                  { id: data.conversation_id, title: text.substring(0, 30) + '...', updated_at: new Date().toISOString() },
                  ...prev
                ]);
              }

              if (data.token) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === tempAssistantMsgId
                      ? { ...m, content: m.content + data.token }
                      : m
                  )
                );
              }

              if (data.done && data.candidate_chips) {
                setMessages(prev =>
                  prev.map(m =>
                    m.id === tempAssistantMsgId
                      ? { ...m, candidate_references: data.candidate_chips }
                      : m
                  )
                );
              }
            } catch (jsonErr) {
              // Ignore non-json chunk lines
            }
          }
        }
      }

    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream stopped by user');
      } else {
        console.error('Streaming error:', err);
        error('Failed to complete streaming response: ' + err.message);
        setMessages(prev =>
          prev.map(m =>
            m.id === tempAssistantMsgId
              ? { ...m, content: m.content || "An error occurred retrieving data from the AI service. Please try again." }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const startNewChat = () => {
    if (isStreaming) handleStopGeneration();
    setActiveConvId(null);
    setMessages([
      {
        id: `welcome_${Date.now()}`,
        role: 'assistant',
        content: "New conversation initiated. Ask me anything about your candidate repository or specific hiring requirements.",
        candidate_references: []
      }
    ]);
  };

  const handleDeleteConv = async (convId, e) => {
    e.stopPropagation();
    try {
      await copilotApi.deleteConversation(convId);
      const remaining = conversations.filter(c => c.id !== convId);
      setConversations(remaining);
      if (activeConvId === convId) {
        if (remaining.length > 0) {
          setActiveConvId(remaining[0].id);
        } else {
          startNewChat();
        }
      }
    } catch (err) {
      error('Failed to delete conversation: ' + err.message);
    }
  };

  const promptSuggestions = [
    "Find five Java developers with Spring Boot and MySQL experience.",
    "Compare the top candidates for backend architecture.",
    "Who has the strongest documented REST API experience?",
    "Generate personalized technical interview questions for candidate Vikram."
  ];

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-[calc(100vh-4rem)] flex flex-col space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-bold uppercase mb-1">
            Module 4 & 11: Real-time Streaming Copilot
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">
            AI Recruitment Intelligence Copilot
          </h1>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Server-Sent Events (SSE) Active</span>
        </div>
      </div>

      {/* Main Copilot Shell */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 min-h-0">
        {/* Left: Saved Conversations History */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col justify-between hidden lg:flex border border-slate-800">
          <div className="space-y-3 min-h-0 flex flex-col">
            <button
              onClick={startNewChat}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-glow-cyan"
            >
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </button>

            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 pt-2">
              Recent Consultations
            </p>

            <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-2.5 rounded-xl cursor-pointer text-xs transition-all flex items-center justify-between group ${
                    activeConvId === conv.id
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConv(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
            <p className="font-semibold text-slate-300 mb-0.5">Strict Tenant Isolation</p>
            <p>Your search history and retrieved candidates are private to your account.</p>
          </div>
        </div>

        {/* Right: Interactive Chat Stream */}
        <div className="lg:col-span-3 glass-panel rounded-2xl flex flex-col justify-between overflow-hidden border border-cyan-500/20 shadow-2xl">
          {/* Messages list */}
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
          >
            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant';
              const isLastAssistant = isAssistant && idx === messages.length - 1;

              return (
                <div
                  key={m.id || idx}
                  className={`flex gap-3 sm:gap-3.5 ${isAssistant ? 'items-start' : 'items-start flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    isAssistant
                      ? 'bg-gradient-to-tr from-cyan-500 to-purple-600 text-white shadow-glow-cyan'
                      : 'bg-slate-800 text-slate-200 border border-slate-700'
                  }`}>
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`max-w-2xl space-y-3 ${isAssistant ? 'text-left' : 'text-right'}`}>
                    <div className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-lg ${
                      isAssistant
                        ? 'bg-slate-900/90 border border-slate-700/80 text-slate-200'
                        : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-medium'
                    }`}>
                      {m.content}
                      {/* Typing cursor when streaming this message */}
                      {isStreaming && isLastAssistant && (
                        <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse align-middle" />
                      )}
                    </div>

                    {/* Grounded Candidate Reference Chips */}
                    {isAssistant && m.candidate_references && m.candidate_references.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                          Verified Candidate Records ({m.candidate_references.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {m.candidate_references.map((c, cIdx) => (
                            <div
                              key={cIdx}
                              onClick={() => navigate(`/candidates/${c.id}`)}
                              className="glass-pill p-2.5 rounded-xl text-left cursor-pointer hover:border-cyan-400 transition-all group flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                  {c.name.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 truncate">
                                    {c.name}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {c.experience_years} yrs · {c.skills?.slice(0, 3).join(', ')}
                                  </p>
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300 flex-shrink-0" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Prompt Suggestions Pills */}
          <div className="px-4 sm:px-6 py-2 border-t border-slate-800 bg-navy-950/40 flex items-center gap-2 overflow-x-auto">
            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 flex-shrink-0">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Suggestions:
            </span>
            {promptSuggestions.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt)}
                disabled={isStreaming}
                className="glass-pill text-[10px] text-slate-300 hover:text-cyan-300 px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 transition-colors disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Box with Stop Generation option */}
          <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/70">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask about candidate experience, compare skills, or request interview questions..."
                className="flex-1 px-4 py-3 rounded-xl bg-slate-950 border border-slate-700/80 text-white placeholder-slate-400 text-xs sm:text-sm focus:outline-none focus:border-cyan-400 transition-all"
              />

              {isStreaming ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-lg transition-all flex items-center gap-1.5 flex-shrink-0"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs shadow-glow-cyan transition-all flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
