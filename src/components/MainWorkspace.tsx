import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Schema, Statistics, Anomaly } from '../types';
import { DataEngine, SampleDatasets } from '../utils/dataEngine';
import TabOverview from './TabOverview';
import TabDashboard from './TabDashboard';
import TabVisualizations from './TabVisualizations';
import TabPredictions from './TabPredictions';
import TabSQL from './TabSQL';
import TabDataViewer from './TabDataViewer';
import TabChatBot from './TabChatBot';
import TabSettings from './TabSettings';
import TabProfile from './TabProfile';
import DataParticlesBackground from './DataParticlesBackground';
import confetti from 'canvas-confetti';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  BarChart3, 
  Bot, 
  Cpu, 
  Database, 
  Grid, 
  History, 
  Layers, 
  LayoutGrid,
  LogOut, 
  Moon, 
  Play, 
  Plus, 
  Settings, 
  Sun, 
  Terminal, 
  TrendingUp, 
  Upload, 
  UserCircle,
  RefreshCw,
  Activity,
  ChevronDown,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Brain,
  BookmarkCheck
} from 'lucide-react';

interface MainWorkspaceProps {
  currentUserEmail: string;
  onLogout: () => void;
  onLogActivity: (action: string, details: string) => void;
}

export default function MainWorkspace({ 
  currentUserEmail, 
  onLogout, 
  onLogActivity
}: MainWorkspaceProps) {
  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'overview' | 'visualizations' | 'predictions' | 'sql' | 'dataviewer' | 'chatbot' | 'settings' | 'profile'>('dashboard');
  
  // Data state
  const [dataset, setDataset] = useState<Record<string, any>[] | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [schema, setSchema] = useState<Schema>({});
  const [stats, setStats] = useState<Statistics>({});
  const [correlations, setCorrelations] = useState<any>({});
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);

  // Real-time operations activity stream state
  const [activities, setActivities] = useState<any[]>([]);
  const [showActivities, setShowActivities] = useState(false);

  // Config credentials state
  const [geminiKey, setGeminiKey] = useState<string | null>(() => localStorage.getItem('dataai-gemini-key'));

  // Layout states
  const [isThemeDark, setIsThemeDark] = useState(true);
  const [fileLoading, setFileLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Firestore real-time subscriber for activity logs
  useEffect(() => {
    try {
      const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'), limit(10));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setActivities(docs);
      }, (error) => {
        console.error("Firestore activities snapshot error:", error);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Failed to connect activities stream:", err);
    }
  }, []);

  // File loading processor
  const handleDatasetCompilation = async (rawArray: Record<string, any>[], sourceName: string) => {
    try {
      setFileLoading(true);
      setUploadError('');

      if (!rawArray || rawArray.length === 0) {
        throw new Error("Parsed dataset is empty or corrupted.");
      }

      // Ingest calculations
      const computedSchema = DataEngine.detectSchema(rawArray);
      const computedStats = DataEngine.calculateBasicStats(rawArray, computedSchema);
      const computedCorrelations = DataEngine.calculateCorrelations(rawArray, computedSchema);
      const computedAnomalies = DataEngine.detectAnomalies(rawArray, computedSchema, computedStats);

      // Save states
      setDataset(rawArray);
      setFilename(sourceName);
      setSchema(computedSchema);
      setStats(computedStats);
      setCorrelations(computedCorrelations);
      setAnomalies(computedAnomalies);
      
      // Celebrate
      confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.55 }
      });

      // Log event
      onLogActivity('FILE_UPLOAD', `In-gested dataset ${sourceName} containing ${rawArray.length} records.`);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Verification failure during file compilation.');
    } finally {
      setFileLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const name = file.name;
    const ext = name.split('.').pop()?.toLowerCase();

    setFileLoading(true);
    setUploadError('');

    reader.onerror = () => {
      setUploadError('Failed to read file from local filesystem.');
      setFileLoading(false);
    };

    if (ext === 'xlsx' || ext === 'xls') {
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const rows = DataEngine.parseExcel(buffer);
          handleDatasetCompilation(rows, name);
        } catch (err: any) {
          setUploadError(err.message || 'Excel parser error.');
          setFileLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = async (event) => {
        try {
          const text = event.target?.result as string;
          let rows: Record<string, any>[] = [];

          if (ext === 'csv') {
            rows = await DataEngine.parseCSV(text);
          } else if (ext === 'json') {
            rows = DataEngine.parseJSON(text);
          } else if (ext === 'sql') {
            rows = DataEngine.parseSQL(text);
          } else {
            // Fallback CSV
            rows = await DataEngine.parseCSV(text);
          }

          handleDatasetCompilation(rows, name);
        } catch (err: any) {
          setUploadError(err.message || 'File interpretation error.');
          setFileLoading(false);
        }
      };
      reader.readAsText(file);
    }
  };

  const loadSampleDataset = (type: 'sales' | 'health') => {
    const rows = SampleDatasets[type];
    const sourceName = type === 'sales' ? 'Demo_Global_Sales.csv' : 'Demo_Fitness_Tracker.xlsx';
    handleDatasetCompilation(rows, sourceName);
  };

  const handleCleanDataset = () => {
    if (!dataset) return;
    try {
      const cleaned = DataEngine.cleanAndHealDataset(dataset, schema, stats, anomalies);
      handleDatasetCompilation(cleaned, `${filename.replace(/\.csv|\.xlsx|\.xls|\.json|\.sql/g, '')}_cleaned.csv`);
      onLogActivity('DATA_CLEANSE', `Executed dynamic self-healing pipeline. Imputed missing fields and clamped ${anomalies.length} statistical outliers.`);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'Error occurred while sanitizing and healing dataset.');
    }
  };

  const toggleTheme = () => {
    const nextTheme = isThemeDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', nextTheme);
    setIsThemeDark(!isThemeDark);
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-slate-50 dark:bg-[#05070f] relative overflow-hidden text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Floating background data particles */}
      <DataParticlesBackground />

      {/* Top Glassy Horizontal Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-white/70 dark:bg-[#060913]/70 border-b border-slate-200/50 dark:border-indigo-500/10 px-4 md:px-8 py-3.5 flex items-center justify-between w-full shadow-lg shadow-indigo-500/5 select-none">
        {/* Brand logo & tag */}
        <div className="flex items-center gap-3 shrink-0">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ scale: 1.05 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-950/60 border border-slate-200/60 dark:border-indigo-500/30 shadow-md shadow-indigo-500/5 select-none shrink-0"
          >
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600 dark:bg-cyan-400"></span>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span 
                className="text-xs font-black tracking-widest bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 dark:from-indigo-400 dark:via-purple-400 dark:to-cyan-300 bg-clip-text text-transparent uppercase font-space"
                style={{ fontFamily: '"Space Grotesk", sans-serif' }}
              >
                DataAI
              </span>
              <span className="text-[8px] text-slate-400 dark:text-slate-500 tracking-widest uppercase font-extrabold mt-0.5">
                Workspace Engine
              </span>
            </div>
          </motion.div>
        </div>

        {/* Tab Switcher Horizontal List */}
        <div className="flex items-center gap-1 overflow-x-auto max-w-full no-scrollbar px-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid, needsDb: false },
            { id: 'overview', label: 'Overview', icon: Layers, needsDb: true },
            { id: 'visualizations', label: 'Chart Builder', icon: BarChart3, needsDb: true },
            { id: 'predictions', label: 'Trends', icon: TrendingUp, needsDb: true },
            { id: 'sql', label: 'SQL', icon: Terminal, needsDb: true },
            { id: 'dataviewer', label: 'Spreadsheet', icon: Grid, needsDb: true },
            { id: 'chatbot', label: 'AI Chat', icon: Bot, needsDb: true },
            { id: 'profile', label: 'Profile', icon: UserCircle, needsDb: false },
            { id: 'settings', label: 'Settings', icon: Settings, needsDb: false },
          ].map((tab) => {
            const Icon = tab.icon;
            const isDisabled = tab.needsDb && !dataset;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                disabled={isDisabled}
                onClick={() => setActiveTab(tab.id as any)}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap shrink-0 ${
                  isSelected
                    ? 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-extrabold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {isSelected && (
                  <motion.div
                    layoutId="activeTabUnderline"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Actions & Profiles */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">


          {/* Theme mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-1.5 md:p-2 bg-white/40 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl transition-all cursor-pointer"
            title="Toggle UI Theme Mode"
          >
            {isThemeDark ? <Sun className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
          </button>

          {/* Logout button */}
          <button
            onClick={onLogout}
            className="p-1.5 md:p-2 bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-rose-500 hover:text-rose-400 rounded-xl transition-all flex items-center justify-center cursor-pointer font-bold animate-pulse"
            title="Disconnect Session"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto z-10 w-full">
        <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 relative">
          {dataset === null && activeTab !== 'settings' && activeTab !== 'profile' ? (
            showOnboarding ? (
              /* Animated Welcoming Page */
              <motion.div 
                key="onboarding"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center justify-center min-h-[calc(100vh-160px)] space-y-12 select-none py-6 text-center"
              >
                {/* Hero / Header Section */}
                <div className="space-y-4 max-w-2xl">
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold uppercase tracking-wider"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Welcome to DataAI Hub</span>
                  </motion.div>
                  
                  <motion.h2 
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-4xl md:text-6xl font-black font-header tracking-tight text-slate-800 dark:text-white"
                  >
                    The Smart <span className="text-gradient-purple-cyan">Data Workspace</span>
                  </motion.h2>
                  
                  <motion.p 
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed font-sans max-w-xl mx-auto"
                  >
                    Ingest tabular datasets, deploy machine learning regression modules, run local SQL computations, and synthesize secure executive briefs with Gemini.
                  </motion.p>
                </div>

                {/* Animated Core Capabilities Bento-Grid */}
                <motion.div 
                  initial="hidden"
                  animate="visible"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 0.3
                      }
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl"
                >
                  {[
                    {
                      icon: Brain,
                      title: "Cognitive AI Assistant",
                      desc: "Consult a live conversational agent trained to extract parameters and draft executive strategic narratives.",
                      color: "text-pink-600 dark:text-pink-400 bg-pink-500/10 border-pink-500/20"
                    },
                    {
                      icon: FileSpreadsheet,
                      title: "Universal Ingestion Engine",
                      desc: "Instantly parse CSV, JSON, Microsoft Excel, or SQL files to auto-generate attribute schemas in real-time.",
                      color: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                    },
                    {
                      icon: Cpu,
                      title: "Machine Learning Predictors",
                      desc: "Configure target parameters, choose linear or polynomial regressions, and evaluate validation weights.",
                      color: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20"
                    },
                    {
                      icon: Terminal,
                      title: "Client-Side SQL Workspace",
                      desc: "Interact with your data directly inside browser sandbox compiling standard DDL, DML, and DQL aggregates.",
                      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                    }
                  ].map((card, idx) => (
                    <motion.div
                      key={idx}
                      variants={{
                        hidden: { opacity: 0, y: 15 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      className="glass-panel p-6 border-slate-200 dark:border-slate-800 hover:border-indigo-500/20 flex gap-4 text-left items-start shadow-sm transition-all"
                    >
                      <div className={`p-3 rounded-xl shrink-0 border ${card.color}`}>
                        <card.icon className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold font-header text-slate-800 dark:text-slate-100">{card.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-sans">{card.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Main Action CTAs */}
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md pt-4"
                >
                  <button
                    onClick={() => setShowOnboarding(false)}
                    className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-700 hover:to-cyan-600 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/15 flex items-center justify-center gap-2 group transition-all active:scale-98 cursor-pointer"
                  >
                    <span>Proceed to Ingestion</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <div className="flex gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        loadSampleDataset('sales');
                      }}
                      className="flex-1 sm:flex-initial px-4 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5 text-cyan-500" />
                      <span>Sales Sample</span>
                    </button>
                    <button
                      onClick={() => {
                        loadSampleDataset('health');
                      }}
                      className="flex-1 sm:flex-initial px-4 py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900/50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
                      <span>Fitness Sample</span>
                    </button>
                  </div>
                </motion.div>

                {/* Trust Signatures */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-mono"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-500 animate-pulse" />
                  <span>Secure Local Sandbox • Powered by Gemini AI</span>
                </motion.div>
              </motion.div>
            ) : (
              // Ingest/Upload View State (with back button)
              <motion.div 
                key="upload"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col items-center justify-center min-h-[calc(100vh-140px)] space-y-8 select-none relative w-full"
              >
                {/* Back button to return to Onboarding hub */}
                <button
                  onClick={() => setShowOnboarding(true)}
                  className="sm:absolute sm:top-0 sm:left-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer self-start"
                >
                  <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Back to Welcome Hub</span>
                </button>

                <div className="text-center space-y-3">
                  <span className="text-[10px] tracking-widest uppercase font-extrabold text-cyan-500 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full">
                    Cognitive Intelligence Engine
                  </span>
                  <h2 className="text-4xl md:text-5xl font-extrabold font-header tracking-tight text-gradient-purple-cyan">
                    Ingest Analytical Dataset
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-lg mx-auto font-sans leading-relaxed">
                    Drag-and-drop or select a file to execute predictions, SQL metrics compilation, and Gemini narrative briefs.
                  </p>
                </div>

                {/* Ingestion Area Card */}
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full max-w-xl glass-panel glass-panel-hover p-10 md:p-12 text-center relative border-dashed border-2 border-slate-300 dark:border-slate-800 hover:border-cyan-400/40 cursor-pointer shadow-lg group"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".csv,.json,.xlsx,.xls,.sql"
                    className="hidden"
                  />

                  <div className="space-y-5">
                    <div className="inline-flex items-center justify-center p-5 rounded-2xl bg-cyan-500/5 group-hover:bg-cyan-500/10 border border-cyan-500/10 group-hover:border-cyan-400/30 text-cyan-500 shadow-md transition-all">
                      <Upload className="w-8 h-8 group-hover:scale-110 transition-all" />
                    </div>

                    <div className="space-y-1.5">
                      <h4 className="text-lg font-bold font-header text-slate-800 dark:text-slate-100">Select file to analyze</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">Supports tabular <strong>CSV, JSON, Microsoft Excel (.xlsx, .xls), or SQL dumps</strong>.</p>
                    </div>

                    <div className="flex justify-center gap-2 text-[10px] text-slate-500 font-mono font-semibold">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">CSV</span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">EXCEL</span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">JSON</span>
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded">SQL</span>
                    </div>
                  </div>
                </div>

                {/* Loading / Error States */}
                {fileLoading && (
                  <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 dark:text-cyan-400 text-xs rounded-xl flex items-center gap-2.5 font-mono animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin text-cyan-500" />
                    <span>Synchronizing database matrix and detecting attributes schema...</span>
                  </div>
                )}

                {uploadError && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:text-rose-400 text-xs rounded-xl flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
                    <span>Ingestion Error: {uploadError}</span>
                  </div>
                )}

                {/* Demo/Sample triggers */}
                <div className="space-y-3.5 text-center pt-4 border-t border-slate-200 dark:border-slate-900 w-full max-w-md">
                  <span className="text-[10px] text-slate-500 tracking-wider font-bold uppercase block">Or evaluate with preloaded matrices</span>
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={() => loadSampleDataset('sales')}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 active:scale-95 border border-slate-200 dark:border-slate-800 hover:border-cyan-500/25 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Database className="w-4 h-4 text-cyan-500" /> Global Sales Tracker
                    </button>
                    <button
                      onClick={() => loadSampleDataset('health')}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 active:scale-95 border border-slate-200 dark:border-slate-800 hover:border-purple-500/25 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <TrendingUp className="w-4 h-4 text-purple-500" /> Fitness Health Log
                    </button>
                  </div>
                </div>
              </motion.div>
            )
        ) : (
          // Ingested Active Workspace Tabs
          <div className="space-y-6">
            {/* Display active file row with beautiful glassy styling */}
            {dataset ? (
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-5 backdrop-blur-md shadow-sm">
                <div>
                  <h1 className="text-xl md:text-2xl font-black font-header tracking-tight text-slate-800 dark:text-slate-100 uppercase">
                    {activeTab === 'dashboard' ? 'Executive BI Dashboard' :
                     activeTab === 'overview' ? 'Attribute Metrics' :
                     activeTab === 'visualizations' ? 'Visual Charting' :
                     activeTab === 'predictions' ? 'Predictive Analytics' :
                     activeTab === 'sql' ? 'Client SQL Workspace' :
                     activeTab === 'dataviewer' ? 'Ingested Spreadsheet' :
                     activeTab === 'chatbot' ? 'Cognitive Assistant' :
                     activeTab === 'profile' ? 'Operator Profile Matrix' :
                     'Configuration Console'}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                    Ingested Dataset: <span className="text-indigo-600 dark:text-cyan-400 font-bold">{filename}</span> ({dataset.length.toLocaleString()} rows verified)
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setDataset(null);
                    setFilename('');
                    setActiveTab('dashboard');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-cyan-500 hover:shadow-cyan-500/10 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Ingest New Dataset
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-white/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-5 backdrop-blur-md shadow-sm">
                <div>
                  <h1 className="text-xl md:text-2xl font-black font-header tracking-tight text-slate-800 dark:text-slate-100 uppercase">
                    {activeTab === 'profile' ? 'Operator Profile Matrix' : 'Configuration Console'}
                  </h1>
                  <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">
                    Manage global environment settings, encryption parameters, and security credentials.
                  </p>
                </div>
              </div>
            )}

            {/* Active Tab renderers */}
            <div className="pt-2">
              {activeTab === 'dashboard' && (
                <TabDashboard 
                  dataset={dataset!} 
                  schema={schema} 
                  stats={stats} 
                  anomalies={anomalies} 
                  correlations={correlations}
                  filename={filename}
                  onLogActivity={onLogActivity}
                />
              )}

              {activeTab === 'overview' && (
                <TabOverview 
                  dataset={dataset} 
                  schema={schema} 
                  stats={stats} 
                  anomalies={anomalies} 
                  correlations={correlations}
                  filename={filename}
                  onCleanDataset={handleCleanDataset}
                />
              )}

              {activeTab === 'visualizations' && (
                <TabVisualizations 
                  dataset={dataset!} 
                  schema={schema} 
                />
              )}

              {activeTab === 'predictions' && (
                <TabPredictions 
                  dataset={dataset} 
                  schema={schema} 
                />
              )}

              {activeTab === 'sql' && (
                <TabSQL 
                  dataset={dataset} 
                  schema={schema} 
                  onLogActivity={onLogActivity}
                />
              )}

              {activeTab === 'dataviewer' && (
                <TabDataViewer 
                  dataset={dataset} 
                  schema={schema} 
                />
              )}

              {activeTab === 'chatbot' && (
                <TabChatBot 
                  dataset={dataset} 
                  schema={schema} 
                  stats={stats} 
                  anomalies={anomalies} 
                  correlations={correlations}
                  geminiKey={geminiKey}
                  onLogActivity={onLogActivity}
                />
              )}

              {activeTab === 'profile' && (
                <TabProfile 
                  currentUserEmail={currentUserEmail}
                  onLogout={onLogout}
                  onLogActivity={onLogActivity}
                />
              )}

              {activeTab === 'settings' && (
                <TabSettings 
                  initialKey={geminiKey} 
                  onSaveKey={(key) => setGeminiKey(key)} 
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  </div>
  );
}
