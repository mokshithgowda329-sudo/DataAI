import { useState, useRef, useEffect } from 'react';
import { Schema, Statistics, Anomaly, ChatMessage } from '../types';
import { DataEngine } from '../utils/dataEngine';
import { Send, Bot, User, Trash2, HelpCircle, Sparkles, RefreshCw } from 'lucide-react';

interface TabChatBotProps {
  dataset: Record<string, any>[];
  schema: Schema;
  stats: Statistics;
  anomalies: Anomaly[];
  correlations: any;
  geminiKey: string | null;
  onLogActivity: (action: string, details: string) => void;
}

const CHIPS_SUGGESTIONS = [
  "Average metrics of numeric columns",
  "What statistical anomalies are present?",
  "Show me the strongest correlations",
  "Summarize the general dataset trends"
];

export default function TabChatBot({ 
  dataset, 
  schema, 
  stats, 
  anomalies, 
  correlations, 
  geminiKey, 
  onLogActivity 
}: TabChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize with greeting
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'ai',
          text: `👋 **Welcome to the DataAI Assistant!** I am your cognitive data exploration companion.\n\nI have finished compiling **${dataset.length.toLocaleString()}** records with **${Object.keys(schema).length}** attributes. What would you like to explore today? Select one of the quick options below or write custom queries!`,
          timestamp: new Date()
        }
      ]);
    }
  }, [dataset, schema]);

  // Scroll to bottom on updates
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    // Log Chat message
    onLogActivity('CHAT', `User queried ChatBot: "${trimmed}"`);

    // Add user message
    const userMessage: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: trimmed,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMsg('');
    setLoading(true);

    try {
      let responseText = '';

      if (geminiKey) {
        // Secure call to server-side Gemini API route
        const schemaSummary: Record<string, any> = {};
        for (let col in schema) {
          schemaSummary[col] = {
            type: schema[col].type,
            missingRate: schema[col].missingRate.toFixed(1) + "%",
            sampleValues: schema[col].sampleValues
          };
        }

        const importantCorrs: string[] = [];
        const visited = new Set<string>();
        for (let cX in correlations) {
          for (let cY in correlations[cX]) {
            if (cX === cY) continue;
            const key = [cX, cY].sort().join('-');
            if (visited.has(key)) continue;
            visited.add(key);
            const r = correlations[cX][cY];
            if (r !== null && Math.abs(r) > 0.3) {
              importantCorrs.push(`${cX} & ${cY}: r = ${r}`);
            }
          }
        }

        const sampleRows = dataset.slice(0, 8);

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: trimmed,
            schemaSummary,
            importantCorrs,
            anomaliesCount: anomalies.length,
            sampleRows
          })
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Server HTTP Error ${response.status}`);
        }

        const data = await response.json();
        responseText = data.text || 'I analyzed the statistics, but could not produce a response text.';
      } else {
        // Run rule-based local queries
        responseText = DataEngine.askLocalAI(trimmed, schema, stats, anomalies, correlations);
      }

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: responseText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (e: any) {
      console.error(e);
      const errMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'ai',
        text: `⚠️ **Analytical Execution Failure:** ${e.message || 'Check your internet connection or active Gemini API key in Settings.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        sender: 'ai',
        text: `👋 Chat history reset! Let's resume our analytics. Ask me any question or choose one of the options below.`,
        timestamp: new Date()
      }
    ]);
  };

  // Minimal markdown processor for React render
  const renderMessageContent = (text: string) => {
    // Escape or clean strings simply, compiling headers and bold markers
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h5 key={idx} className="font-header text-sm font-semibold text-cyan-400 mt-2 mb-1">{line.replace('### ', '')}</h5>;
      }
      if (line.startsWith('#### ')) {
        return <h6 key={idx} className="font-header text-xs font-semibold text-purple-400 mt-1.5 mb-1">{line.replace('#### ', '')}</h6>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const cleaned = line.replace(/^[-*]\s+/, '');
        return (
          <ul key={idx} className="list-disc ml-5 space-y-0.5 my-1">
            <li className="text-xs">
              {cleaned.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-slate-100">{chunk}</strong> : chunk)}
            </li>
          </ul>
        );
      }

      // Default line with inline bold
      return (
        <p key={idx} className="text-xs leading-relaxed mb-1">
          {line.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-slate-100">{chunk}</strong> : chunk)}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] glass-panel border-slate-800 relative overflow-hidden shadow-2xl">
      {/* Header controls */}
      <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/20 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div>
            <h3 className="text-xs font-bold font-header text-slate-100">DataAI Cognitive Assistant</h3>
            <p className="text-[10px] text-slate-500 font-sans">
              Powered by {geminiKey ? <span className="text-emerald-400 font-semibold">Gemini 3.5 Flash</span> : <span className="text-purple-400 font-semibold">Local Rules</span>}
            </p>
          </div>
        </div>
        
        <button
          onClick={handleClearChat}
          className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all cursor-pointer"
          title="Clear Conversation Logs"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Conversation Thread */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-custom z-10 bg-slate-950/5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
          >
            <div className={`p-2.5 h-9 w-9 rounded-xl flex items-center justify-center border shrink-0 shadow-md ${
              msg.sender === 'user' 
                ? 'bg-slate-800 border-slate-700 text-slate-200' 
                : 'bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border-cyan-500/10 text-cyan-400'
            }`}>
              {msg.sender === 'user' ? <User className="w-4.5 h-4.5" /> : <Bot className="w-4.5 h-4.5" />}
            </div>

            <div className={`p-4 rounded-2xl shadow-md ${
              msg.sender === 'user'
                ? 'bg-gradient-to-r from-purple-600 to-cyan-600 border border-cyan-500/20 text-white rounded-tr-sm'
                : 'bg-slate-900/60 border border-slate-800 text-slate-200 rounded-tl-sm'
            }`}>
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                {msg.sender === 'user' ? 'Operator' : 'DataAI Agent'} 
                <span className="text-slate-500 lowercase text-[8px] font-normal">• {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="markdown-body select-text">
                {renderMessageContent(msg.text)}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-[80%] mr-auto items-center">
            <div className="p-2 h-9 w-9 rounded-xl flex items-center justify-center bg-slate-900 border border-slate-800 text-cyan-400 shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3 bg-slate-900/40 border border-slate-800 rounded-2xl text-[10px] text-slate-400 font-mono flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> DataAI is synthesizing parameters and compiling prompt matrix...
            </div>
          </div>
        )}
        <div ref={logsEndRef} />
      </div>

      {/* Input controls and prompt chips */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-3 z-10">
        {/* Suggestion Chips */}
        <div className="flex flex-wrap gap-2">
          {CHIPS_SUGGESTIONS.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(chip)}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 hover:text-slate-100 disabled:opacity-40 border border-slate-800 hover:border-cyan-500/25 text-slate-400 rounded-full text-[10px] font-semibold transition-all cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Text Area Input */}
        <div className="relative flex gap-3">
          <input
            type="text"
            value={inputMsg}
            onChange={(e) => setInputMsg(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSendMessage(inputMsg); }}
            placeholder={geminiKey ? "Ask a statistical question..." : "Enter query (e.g. average of Sales)"}
            disabled={loading}
            className="flex-1 glass-input pl-4 pr-12 py-3 text-sm focus:border-cyan-500/40"
          />
          <button
            onClick={() => handleSendMessage(inputMsg)}
            disabled={loading || !inputMsg.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-gradient-to-r from-purple-600 to-cyan-500 disabled:opacity-20 hover:shadow-cyan-500/10 active:scale-90 text-white rounded-lg transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
