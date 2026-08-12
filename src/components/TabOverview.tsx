import { useState, useEffect } from 'react';
import { Schema, Statistics, Anomaly } from '../types';
import { DataEngine } from '../utils/dataEngine';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  ShieldCheck, 
  HelpCircle, 
  Columns, 
  Layers, 
  Cpu, 
  Compass, 
  Activity, 
  CheckCircle2, 
  Zap, 
  FileText, 
  Download, 
  ArrowRight, 
  Loader2, 
  Sliders, 
  RefreshCw, 
  Info 
} from 'lucide-react';

interface TabOverviewProps {
  dataset: Record<string, any>[];
  schema: Schema;
  stats: Statistics;
  anomalies: Anomaly[];
  correlations: any;
  filename: string;
  onCleanDataset?: () => void;
}

type OverviewSubTab = 'summary' | 'health' | 'ai-narrative';

export default function TabOverview({ 
  dataset, 
  schema, 
  stats, 
  anomalies, 
  correlations, 
  filename,
  onCleanDataset
}: TabOverviewProps) {
  const [subTab, setSubTab] = useState<OverviewSubTab>('summary');

  // AI Narrative State (Feature 4)
  const [aiFocus, setAiFocus] = useState<'default' | 'financial' | 'quality' | 'strategic'>('default');
  const [aiNarrative, setAiNarrative] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');
  
  // Real-time loading indicator strings for Gemini API
  const [loadingStep, setLoadingStep] = useState<string>('Analyzing metadata matrices...');
  
  useEffect(() => {
    if (!isGenerating) return;
    const steps = [
      'Scanning complete dataset columns...',
      'Mapping Pearson correlation variables...',
      'Detecting abnormal outlier records...',
      'Formulating secure prompt payload...',
      'Awaiting response from Gemini 3.5 Flash...',
      'Synthesizing narrative logic structures...',
      'Compiling executive summary recommendations...'
    ];
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % steps.length;
      setLoadingStep(steps[index]);
    }, 2800);
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Key stats values
  const totalRows = dataset.length;
  const numColumns = Object.keys(schema).length;
  const totalCells = totalRows * numColumns;

  // --- Dynamic Data Health profiling logic (Feature 1) ---
  // 1. Completeness Index
  let nullCount = 0;
  Object.values(schema).forEach(meta => {
    nullCount += meta.nullCount || 0;
  });
  const completeness = totalCells > 0 ? 100 * (1 - nullCount / totalCells) : 100;

  // 2. Uniqueness Index (ratio of cardinality across categoricals)
  const categoricalCols = Object.keys(schema).filter(col => schema[col].type === 'categorical' || schema[col].type === 'text');
  let uniquenessSum = 0;
  categoricalCols.forEach(col => {
    uniquenessSum += (schema[col].uniqueCount / totalRows);
  });
  const uniqueness = categoricalCols.length > 0 
    ? Math.min(100, (uniquenessSum / categoricalCols.length) * 100) 
    : 85; // Default reference health if none

  // 3. Stability Index (inverse outlier skew count)
  const stability = totalRows > 0 ? Math.max(20, 100 - (anomalies.length / totalRows) * 1000) : 100;

  // 4. Density Index (active information density, non-zero values)
  let zeroCount = 0;
  dataset.forEach(row => {
    Object.keys(row).forEach(col => {
      if (row[col] === 0 || row[col] === '0') {
        zeroCount++;
      }
    });
  });
  const density = totalCells > 0 ? 100 * (1 - (nullCount + zeroCount) / totalCells) : 90;

  // Combined Health Score
  const healthScore = Math.min(100, Math.max(10, (completeness * 0.4) + (stability * 0.3) + (uniqueness * 0.15) + (density * 0.15)));

  // Generate warnings dynamically
  const warnings: { col: string; severity: 'High' | 'Medium' | 'Low'; issue: string; remediation: string }[] = [];
  
  Object.entries(schema).forEach(([col, meta]) => {
    if (meta.nullCount > 0) {
      const rate = (meta.nullCount / totalRows) * 100;
      warnings.push({
        col,
        severity: rate > 12 ? 'High' : 'Medium',
        issue: `Missing values detected (${meta.nullCount} null cells, ${rate.toFixed(1)}% missingness)`,
        remediation: `Use the Spreadsheet tools or median imputation to backfill this column's null fields. Median value: ${stats[col]?.type === 'numeric' ? (stats[col] as any).median : 'N/A'}.`
      });
    }
  });

  const colOutliers: Record<string, number> = {};
  anomalies.forEach(a => {
    colOutliers[a.column] = (colOutliers[a.column] || 0) + 1;
  });
  Object.entries(colOutliers).forEach(([col, count]) => {
    const rate = (count / totalRows) * 100;
    warnings.push({
      col,
      severity: rate > 6 ? 'High' : 'Medium',
      issue: `Skew / outliers detected (${count} records outside 3σ, ${rate.toFixed(1)}% outlier rate)`,
      remediation: `Review these rows in the Spreadsheet viewer or apply a standard log clamp to stabilize predictions of ${col}.`
    });
  });

  Object.entries(schema).forEach(([col, meta]) => {
    if (meta.uniqueCount === 1) {
      warnings.push({
        col,
        severity: 'High',
        issue: `Zero Variance Detected (Column has only 1 unique value)`,
        remediation: `This column cannot be correlated with other variables because it is constant. Consider excluding it from predictions.`
      });
    }
  });

  Object.entries(schema).forEach(([col, meta]) => {
    if ((meta.type === 'categorical' || meta.type === 'text') && meta.uniqueCount > 60 && totalRows > 120) {
      warnings.push({
        col,
        severity: 'Low',
        issue: `High Cardinality Warning (${meta.uniqueCount} distinct string categories)`,
        remediation: `This category is extremely wide. Consider group consolidation or binning to avoid memory blowouts during processing.`
      });
    }
  });

  if (warnings.length === 0) {
    warnings.push({
      col: 'Dataset Wide',
      severity: 'Low',
      issue: 'Zero structural data quality anomalies found',
      remediation: 'No critical adjustments required. All columns are fully populated and stable for training models.'
    });
  }

  // Render narrative summary matching original
  const narrative = DataEngine.generateNarrativeSummary(dataset, schema, stats, correlations, anomalies);

  const formatFirebaseTimestamp = (num: number | null | undefined) => {
    return DataEngine.formatNumber(num);
  };

  // --- Executive AI Brief download logic (Feature 4) ---
  const handleDownloadBrief = () => {
    if (!aiNarrative) return;
    const blob = new Blob([aiNarrative], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename.replace(/\.[^/.]+$/, "")}_executive_brief.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Gemini Narrative API query logic (Feature 4) ---
  const generateAiNarrative = async () => {
    setIsGenerating(true);
    setAiError('');
    
    // Build secure summaries to pass to API
    const schemaSummary = Object.entries(schema).reduce((acc, [col, meta]) => {
      acc[col] = {
        type: meta.type,
        uniqueCount: meta.uniqueCount,
        nullCount: meta.nullCount,
        missingRate: meta.missingRate
      };
      return acc;
    }, {} as any);

    const statsSummary = Object.entries(stats).reduce((acc, [col, stat]) => {
      if (stat.type === 'numeric') {
        acc[col] = {
          mean: stat.mean,
          median: stat.median,
          min: stat.min,
          max: stat.max,
          stdDev: stat.stdDev
        };
      } else if (stat.type === 'categorical' || stat.type === 'text') {
        acc[col] = {
          uniqueCount: stat.uniqueCount,
          mode: stat.mode,
          topCategories: stat.topCategories?.slice(0, 3) || []
        };
      }
      return acc;
    }, {} as any);

    try {
      const response = await fetch('/api/narrative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          schemaSummary,
          statsSummary,
          anomaliesCount: anomalies.length,
          correlations,
          filename,
          focus: aiFocus
        })
      });

      if (!response.ok) {
        throw new Error(`Synthesis API returned error status ${response.status}`);
      }

      const data = await response.json();
      setAiNarrative(data.narrative || '');
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Failed to generate AI narrative brief. Check API keys.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 select-none">
      {/* Top Welcome Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900/40 border border-slate-800 rounded-2xl p-6 shadow-sm gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md">
            Ingestion Complete
          </span>
          <h2 className="text-2xl font-extrabold font-header text-slate-100 mt-2">
            Active Dataset: <span className="text-gradient-purple-cyan">{filename}</span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            DataAI is compiling parameters, detecting warnings, and synthesising narrative profiles.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-950/60 rounded-xl border border-slate-800 text-xs shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-md" />
          <span className="text-slate-400 font-semibold">Cognitive Analytics Live</span>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex border-b border-slate-800/80 gap-2 overflow-x-auto no-scrollbar">
        <button
          id="btn-subtab-summary"
          onClick={() => setSubTab('summary')}
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            subTab === 'summary' 
              ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
          }`}
        >
          <Compass className="w-4 h-4" />
          Operational Summary
        </button>
        <button
          id="btn-subtab-health"
          onClick={() => setSubTab('health')}
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            subTab === 'health' 
              ? 'border-purple-400 text-purple-400 font-bold bg-purple-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
          }`}
        >
          <Activity className="w-4 h-4" />
          Data Health Profiler <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded-full uppercase font-bold">F1</span>
        </button>
        <button
          id="btn-subtab-ai"
          onClick={() => setSubTab('ai-narrative')}
          className={`px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
            subTab === 'ai-narrative' 
              ? 'border-pink-400 text-pink-400 font-bold bg-pink-500/5' 
              : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
          }`}
        >
          <Zap className="w-4 h-4" />
          AI Executive Strategic Narrative <span className="text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded-full uppercase font-bold">F4</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {/* SUB-TAB 1: OPERATIONAL SUMMARY */}
          {subTab === 'summary' && (
            <div className="space-y-8">
              {/* KPI Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-panel p-6 relative border-slate-800 overflow-hidden shadow-lg shadow-cyan-500/5">
                  <div className="absolute right-3 top-3 bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/10 text-cyan-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Records</span>
                  <h3 className="text-3xl font-extrabold font-header mt-1.5 text-slate-100">
                    {totalRows.toLocaleString()}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1.5">Tabular rows compiled</p>
                </div>

                <div className="glass-panel p-6 relative border-slate-800 overflow-hidden shadow-lg shadow-purple-500/5">
                  <div className="absolute right-3 top-3 bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/10 text-purple-400">
                    <Columns className="w-5 h-5" />
                  </div>
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Parameters</span>
                  <h3 className="text-3xl font-extrabold font-header mt-1.5 text-slate-100">
                    {numColumns}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1.5">Meta schema attributes detected</p>
                </div>

                <div className="glass-panel p-6 relative border-slate-800 overflow-hidden shadow-lg shadow-rose-500/5">
                  <div className="absolute right-3 top-3 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/10 text-rose-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Anomalies</span>
                  <h3 className="text-3xl font-extrabold font-header mt-1.5 text-slate-100">
                    {anomalies.length}
                  </h3>
                  {anomalies.length > 0 ? (
                    <p className="text-[10px] text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                      Skew detected in {[...new Set(anomalies.map(a => a.column))].length} variables
                    </p>
                  ) : (
                    <p className="text-[10px] text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Within standard deviations
                    </p>
                  )}
                </div>

                <div className="glass-panel p-6 relative border-slate-800 overflow-hidden shadow-lg shadow-amber-500/5">
                  <div className="absolute right-3 top-3 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/10 text-amber-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    {Object.keys(schema).filter(col => schema[col].type === 'numeric')[0] 
                      ? `Avg ${Object.keys(schema).filter(col => schema[col].type === 'numeric')[0]}` 
                      : 'Average Metric'}
                  </span>
                  <h3 className="text-3xl font-extrabold font-header mt-1.5 text-slate-100">
                    {Object.keys(schema).filter(col => schema[col].type === 'numeric')[0] && stats[Object.keys(schema).filter(col => schema[col].type === 'numeric')[0]]
                      ? formatFirebaseTimestamp((stats[Object.keys(schema).filter(col => schema[col].type === 'numeric')[0]] as any).mean) 
                      : 'N/A'}
                  </h3>
                  <p className="text-[10px] text-slate-500 mt-1.5">Primary numerical average</p>
                </div>
              </div>

              {/* Main Narrative Insight and Schema Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Rule-Based summaries (7 cols) */}
                <div className="lg:col-span-7 glass-panel p-6 md:p-8 border-slate-800 shadow-xl shadow-cyan-500/2">
                  <h3 className="text-xl font-bold font-header flex items-center gap-2.5 text-slate-100 mb-6 border-b border-slate-800/80 pb-3">
                    <Compass className="w-5 h-5 text-cyan-400" /> Ingestion Rule-Based Brief
                  </h3>
                  
                  <div className="text-slate-300 text-sm leading-relaxed space-y-4">
                    {narrative.split('\n').map((line, i) => {
                      if (line.startsWith('### ')) {
                        return <h4 key={i} className="text-lg font-bold font-header text-slate-100 mt-5">{line.replace('### ', '')}</h4>;
                      }
                      if (line.startsWith('#### ')) {
                        return <h5 key={i} className="text-sm font-semibold font-header text-cyan-400 mt-4">{line.replace('#### ', '')}</h5>;
                      }
                      if (line.startsWith('- ')) {
                        return (
                          <ul key={i} className="list-disc ml-5 space-y-1">
                            <li className="text-slate-300">
                              {line.replace('- ', '').split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="text-slate-100 font-bold">{chunk}</strong> : chunk)}
                            </li>
                          </ul>
                        );
                      }
                      if (line.trim() === '') return <div key={i} className="h-2" />;
                      
                      return (
                        <p key={i}>
                          {line.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="text-slate-100 font-bold">{chunk}</strong> : chunk)}
                        </p>
                      );
                    })}
                  </div>
                </div>

                {/* Database Schema Viewer (5 cols) */}
                <div className="lg:col-span-5 glass-panel p-6 border-slate-800 shadow-xl shadow-purple-500/2 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xl font-bold font-header flex items-center gap-2.5 text-slate-100 mb-6 border-b border-slate-800/80 pb-3">
                      <Cpu className="w-5 h-5 text-purple-400" /> Compiled Attribute Metadata
                    </h3>

                    <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/25">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                            <th className="p-3">Attribute</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Null Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(schema).map(([col, meta]) => (
                            <tr key={col} className="border-b border-slate-900 hover:bg-slate-900/20">
                              <td className="p-3 font-semibold text-slate-200">{col}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-md border ${
                                  meta.type === 'numeric' ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' :
                                  meta.type === 'temporal' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' :
                                  meta.type === 'categorical' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                  'bg-slate-500/10 border-slate-500/20 text-slate-400'
                                }`}>
                                  {meta.type}
                                </span>
                              </td>
                              <td className="p-3 font-mono text-slate-400">{meta.missingRate.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 mt-4 text-slate-400 text-xs flex gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>Types and values are auto-detected. Numerical columns can be plotted, mapped, and predicted.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 2: DATA HEALTH & QUALITY PROFILER (Feature 1) */}
          {subTab === 'health' && (
            <div className="space-y-8">
              {/* Health Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Dynamic Gauge Circular Meter (4 cols) */}
                <div className="lg:col-span-4 glass-panel p-6 md:p-8 border-slate-800 shadow-xl flex flex-col items-center justify-center text-center">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">Aggregate Data Integrity</h4>
                  
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    {/* SVG Progress Circle */}
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="88"
                        cy="88"
                        r="74"
                        className="stroke-slate-900 fill-transparent"
                        strokeWidth="12"
                      />
                      <circle
                        cx="88"
                        cy="88"
                        r="74"
                        className={`fill-transparent transition-all duration-1000 ${
                          healthScore > 85 ? 'stroke-cyan-400' :
                          healthScore > 65 ? 'stroke-purple-400' :
                          'stroke-rose-400'
                        }`}
                        strokeWidth="12"
                        strokeDasharray={2 * Math.PI * 74}
                        strokeDashoffset={2 * Math.PI * 74 * (1 - healthScore / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-extrabold text-white font-header tracking-tight">{healthScore.toFixed(1)}%</span>
                      <span className={`text-[10px] font-extrabold uppercase mt-1 tracking-wider px-2 py-0.5 rounded-md ${
                        healthScore > 85 ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                        healthScore > 65 ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {healthScore > 85 ? 'Excellent Health' : healthScore > 65 ? 'Sufficient Stability' : 'Intervention Needed'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 text-xs text-slate-400 leading-relaxed font-sans px-4">
                    Score calculated in real-time by verifying completeness, structural variance, outliers, and active parameter density.
                  </div>
                </div>

                {/* Index Bars (8 cols) */}
                <div className="lg:col-span-8 glass-panel p-6 md:p-8 border-slate-800 shadow-xl space-y-6">
                  <h3 className="text-lg font-bold font-header text-slate-100 border-b border-slate-800/80 pb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-purple-400 animate-pulse" /> Diagnostic Metrics Breakdown
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Completeness Index */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Completeness Index
                        </span>
                        <span className="font-mono text-cyan-400 font-bold">{completeness.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2.5 rounded-full border border-slate-900 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${completeness}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">Measures the ratio of populated cells. Missing rates degrade classification.</p>
                    </div>

                    {/* Uniqueness Index */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Compass className="w-4 h-4 text-purple-400" /> Uniqueness (Cardinality)
                        </span>
                        <span className="font-mono text-purple-400 font-bold">{uniqueness.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2.5 rounded-full border border-slate-900 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${uniqueness}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">Measures category uniqueness across rows. High ratios block categorization models.</p>
                    </div>

                    {/* Stability Index */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" /> Variance Stability
                        </span>
                        <span className="font-mono text-amber-400 font-bold">{stability.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2.5 rounded-full border border-slate-900 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${stability}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">Checks for outliers outside 3 standard deviations. Outliers distort regression slopes.</p>
                    </div>

                    {/* Density Index */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <Cpu className="w-4 h-4 text-emerald-400" /> Active Density Index
                        </span>
                        <span className="font-mono text-emerald-400 font-bold">{density.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2.5 rounded-full border border-slate-900 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                          style={{ width: `${density}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-500">Measures active non-zero numeric content ratios. Dominant zeroes skew weights.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Self-Healing Panel */}
              {onCleanDataset && (warnings.length > 0 && !warnings[0].issue.includes("Zero structural data quality anomalies")) && (
                <div className="glass-panel p-6 border-cyan-500/20 bg-indigo-950/20 shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-cyan-400 font-bold">
                        <Zap className="w-5 h-5 animate-pulse text-cyan-400" />
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-100">AI-Powered Self-Healing Pipeline</h4>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed max-w-2xl font-sans">
                        Automatically impute missing values (using numeric medians and categorical modes) and stabilize statistical outliers beyond 3 standard deviations. This creates a clean, fully-aligned copy of the dataset and optimizes model training.
                      </p>
                    </div>
                    <button
                      onClick={onCleanDataset}
                      className="px-5 py-3 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:shadow-cyan-500/15 active:scale-98 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Execute 1-Click Cleanse</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Data Quality Warnings Table */}
              <div className="glass-panel p-6 border-slate-800 shadow-xl">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-4 mb-6">
                  <div>
                    <h3 className="text-lg font-bold font-header text-slate-100 flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-rose-400" /> Data Integrity Quality Logs
                    </h3>
                    <p className="text-slate-400 text-xs mt-1">
                      Actionable recommendations compiled by scanning data columns.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-slate-950/60 text-slate-400 border border-slate-800">
                    {warnings.length} Active Checks Compiled
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/20">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900/40 text-slate-400 font-semibold border-b border-slate-800">
                        <th className="p-4">Target Attribute</th>
                        <th className="p-4">Risk Severity</th>
                        <th className="p-4">Identified Quality Issue</th>
                        <th className="p-4">Automated Remediation Workflow</th>
                      </tr>
                    </thead>
                    <tbody>
                      {warnings.map((w, index) => (
                        <tr key={index} className="border-b border-slate-900 hover:bg-slate-900/10 transition-all">
                          <td className="p-4 font-semibold text-slate-200">{w.col}</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 text-[9px] font-extrabold uppercase rounded border ${
                              w.severity === 'High' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                              w.severity === 'Medium' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                              'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                            }`}>
                              {w.severity}
                            </span>
                          </td>
                          <td className="p-4 font-medium text-slate-300">{w.issue}</td>
                          <td className="p-4 text-slate-400 leading-relaxed font-sans">{w.remediation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 3: AI EXECUTIVE STRATEGIC NARRATIVE (Feature 4) */}
          {subTab === 'ai-narrative' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Configuration Sidebar (4 cols) */}
                <div className="lg:col-span-4 glass-panel p-6 md:p-8 border-slate-800 shadow-xl flex flex-col justify-between h-full">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-base font-bold font-header text-slate-200 flex items-center gap-2">
                        <Sliders className="w-4.5 h-4.5 text-pink-400" /> Synthesis Focus
                      </h4>
                      <p className="text-slate-400 text-xs mt-1">
                        Select an analytical model layer to focus strategic generation.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {[
                        { id: 'default', label: 'Default Business Brief', desc: 'Holistic correlations, health, and next steps.' },
                        { id: 'financial', label: 'Financial & KPI Focus', desc: 'Analyzes margins, ROI, and numeric ratios.' },
                        { id: 'quality', label: 'Data Quality & Hygiene', desc: 'Focuses on outlier impacts and remediation.' },
                        { id: 'strategic', label: 'Executive Operational Plays', desc: 'Direct, actionable management proposals.' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          id={`btn-focus-${item.id}`}
                          onClick={() => setAiFocus(item.id as any)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all hover:scale-[1.01] flex flex-col cursor-pointer ${
                            aiFocus === item.id 
                              ? 'bg-pink-500/5 border-pink-500/40 text-pink-400 shadow-md shadow-pink-500/5' 
                              : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-900/30'
                          }`}
                        >
                          <span className="text-xs font-bold">{item.label}</span>
                          <span className="text-[10px] text-slate-400 mt-1 font-sans">{item.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-900 space-y-4">
                    <button
                      id="btn-trigger-ai-narrative"
                      onClick={generateAiNarrative}
                      disabled={isGenerating}
                      className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-pink-500/15 active:scale-98 transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 cursor-pointer"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Strategic Brief...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 animate-pulse" />
                          <span>Synthesise AI Briefing</span>
                        </>
                      )}
                    </button>
                    
                    <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Secure, server-side Gemini 3.5 Flash connection</span>
                    </div>
                  </div>
                </div>

                {/* Narrative View Panel (8 cols) */}
                <div className="lg:col-span-8 glass-panel border-slate-800 shadow-xl overflow-hidden flex flex-col justify-between min-h-[480px]">
                  {/* Top Header of View Panel */}
                  <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800/80 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shadow-md shadow-pink-500/30" />
                      <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">Executive Narrative Board</span>
                    </div>
                    {aiNarrative && (
                      <button
                        id="btn-download-ai-brief"
                        onClick={handleDownloadBrief}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5 text-cyan-400" /> Download Brief (.md)
                      </button>
                    )}
                  </div>

                  {/* Body Content of View Panel */}
                  <div className="p-6 md:p-8 flex-grow">
                    {isGenerating ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[350px] space-y-4">
                        <Loader2 className="w-10 h-10 text-pink-500 animate-spin" />
                        <div className="text-center">
                          <p className="text-sm font-bold text-slate-200">Generative Engine Active</p>
                          <p className="text-xs text-pink-400 font-semibold mt-1.5 animate-pulse">{loadingStep}</p>
                        </div>
                      </div>
                    ) : aiError ? (
                      <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-center p-6 space-y-3">
                        <AlertTriangle className="w-10 h-10 text-rose-500" />
                        <div className="max-w-md">
                          <p className="text-sm font-bold text-rose-400">Synthesis Error</p>
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed bg-rose-500/5 border border-rose-500/15 p-3 rounded-lg font-mono">
                            {aiError}
                          </p>
                        </div>
                      </div>
                    ) : aiNarrative ? (
                      <div className="markdown-body text-slate-300 text-sm leading-relaxed space-y-5">
                        {aiNarrative.split('\n').map((line, i) => {
                          if (line.startsWith('### ') || line.startsWith('###')) {
                            const txt = line.replace(/###\s*/, '');
                            return <h4 key={i} className="text-lg font-bold font-header text-slate-100 border-b border-slate-800/50 pb-2 mt-6">{txt}</h4>;
                          }
                          if (line.startsWith('## ') || line.startsWith('##')) {
                            const txt = line.replace(/##\s*/, '');
                            return <h3 key={i} className="text-xl font-extrabold font-header text-pink-400 mt-7">{txt}</h3>;
                          }
                          if (line.startsWith('#### ') || line.startsWith('####')) {
                            const txt = line.replace(/####\s*/, '');
                            return <h5 key={i} className="text-sm font-semibold font-header text-purple-400 mt-4">{txt}</h5>;
                          }
                          if (line.startsWith('- ') || line.startsWith('* ')) {
                            const clean = line.replace(/^[-*]\s*/, '');
                            return (
                              <ul key={i} className="list-disc ml-5 space-y-1">
                                <li className="text-slate-300">
                                  {clean.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="text-white font-bold">{chunk}</strong> : chunk)}
                                </li>
                              </ul>
                            );
                          }
                          if (/^\d+\.\s*/.test(line)) {
                            const clean = line.replace(/^\d+\.\s*/, '');
                            const num = line.match(/^\d+/)?.[0] || '1';
                            return (
                              <div key={i} className="flex gap-2.5 items-start mt-2">
                                <span className="w-5 h-5 rounded bg-pink-500/10 border border-pink-500/20 text-pink-400 text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                                  {num}
                                </span>
                                <p className="text-slate-300">
                                  {clean.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="text-white font-bold">{chunk}</strong> : chunk)}
                                </p>
                              </div>
                            );
                          }
                          if (line.trim() === '') return <div key={i} className="h-2" />;
                          
                          return (
                            <p key={i}>
                              {line.split('**').map((chunk, j) => j % 2 === 1 ? <strong key={j} className="text-white font-bold">{chunk}</strong> : chunk)}
                            </p>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full min-h-[350px] text-center p-6 space-y-4">
                        <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="max-w-sm">
                          <p className="text-sm font-bold text-slate-300">No narrative brief synthesized</p>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Click the 'Synthesise AI Briefing' button on the left to initiate server-side strategic data parsing.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Info Footer of View Panel */}
                  <div className="px-6 py-3 bg-slate-950/60 border-t border-slate-900 text-[10px] text-slate-500 flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>The Executive board runs securely server-side using Gemini. Insights do not represent investment or regulatory advice.</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
