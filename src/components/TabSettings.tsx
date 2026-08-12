import { useState, useEffect } from 'react';
import { Save, ShieldAlert, Sparkles, Shield, KeyRound, CheckCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TabSettingsProps {
  onSaveKey: (key: string) => void;
  initialKey: string | null;
}

export default function TabSettings({ onSaveKey, initialKey }: TabSettingsProps) {
  const [apiKey, setApiKey] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(initialKey || '');
  }, [initialKey]);

  const handleSave = () => {
    const trimmed = apiKey.trim();
    localStorage.setItem('dataai-gemini-key', trimmed);
    onSaveKey(trimmed);
    setSaved(true);
    
    // Celebrate
    confetti({
      particleCount: 100,
      spread: 60,
      origin: { y: 0.8 }
    });

    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Configuration panel */}
      <div className="glass-panel p-6 md:p-8 border-slate-800 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
          <span className="p-2 bg-gradient-to-br from-purple-600/10 to-cyan-500/10 border border-cyan-500/10 text-cyan-400 rounded-xl">
            <KeyRound className="w-5 h-5" />
          </span>
          <div>
            <h3 className="text-lg font-bold font-header text-slate-100">Cognitive Credentials Setup</h3>
            <p className="text-xs text-slate-400">Manage API secure access token for advanced Gemini AI queries.</p>
          </div>
        </div>

        {saved && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 font-medium animate-fadeIn">
            <CheckCircle className="w-4 h-4" />
            <span>Success: Cognitive access credentials have been securely stored.</span>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-400 block">Personal Google Gemini API Key</label>
          <div className="relative flex flex-col sm:flex-row gap-3">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="flex-1 glass-input px-4 py-3 text-sm font-mono tracking-wider"
            />
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-500 hover:shadow-cyan-500/10 active:scale-98 rounded-xl font-semibold text-xs text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Credentials
            </button>
          </div>
          <span className="text-[10px] text-slate-500 leading-normal block pt-1">
            *This token is saved inside your browser&apos;s isolated LocalStorage cache. It is never transmitted to other public servers and remains securely contained.
          </span>
        </div>
      </div>

      {/* Platform Architecture Information card */}
      <div className="glass-panel p-6 border-slate-800 space-y-4">
        <h4 className="text-sm font-bold font-header flex items-center gap-2 text-slate-100">
          <Shield className="w-4.5 h-4.5 text-cyan-400" /> Platform Architecture & Privacy Protocols
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-400">
          <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1.5">
            <span className="font-bold text-slate-200 block">Server-Side Proxy Architecture</span>
            <p>Your API key is used strictly server-side within the isolated container. Queries are structured efficiently into token-dense mathematical matrices to preserve security boundaries.</p>
          </div>

          <div className="p-4 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1.5">
            <span className="font-bold text-slate-200 block">Auditable Activities Log</span>
            <p>Every SQL statement run, Chat Bot request made, or file loaded is logged in real-time inside your Firebase Firestore database for compliance and admin oversight auditing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
