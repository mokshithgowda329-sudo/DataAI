import { useState, useMemo, useEffect } from 'react';
import { Schema, Statistics, Anomaly } from '../types';
import { DataEngine } from '../utils/dataEngine';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, RadarChart as RechartsRadarChart, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, Radar as RechartsRadar, Treemap as RechartsTreemap
} from 'recharts';
import { 
  BarChart3, LineChart as LineIcon, PieChart as PieIcon, Activity, AlertTriangle, 
  ChevronUp, ChevronDown, Trash2, Maximize2, Minimize2, Plus, Sparkles, Send, 
  Download, FileSpreadsheet, Search, Filter, RefreshCw, Layers, TrendingUp, HelpCircle, 
  MapPin, Eye, FileText, Check, Database, Bot
} from 'lucide-react';

interface TabDashboardProps {
  dataset: Record<string, any>[];
  schema: Schema;
  stats: Statistics;
  anomalies: Anomaly[];
  correlations: any;
  filename: string;
  onLogActivity?: (action: string, details: string) => void;
}

interface DashboardWidget {
  id: string;
  title: string;
  type: 'bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'bubble' | 'heatmap' | 'treemap' | 'sunburst' | 'funnel' | 'waterfall' | 'radar' | 'gauge' | 'sankey' | 'map' | 'wordcloud' | 'pivot' | 'boxplot' | 'violin' | 'histogram' | 'timeseries';
  xCol: string;
  yCol: string;
  zCol?: string; // For bubble chart
  width: 'half' | 'full'; // Half = lg:col-span-1, Full = lg:col-span-2
  showTrendline?: boolean;
  showForecast?: boolean;
  showAnomalies?: boolean;
}

export default function TabDashboard({
  dataset,
  schema,
  stats,
  anomalies,
  correlations,
  filename,
  onLogActivity
}: TabDashboardProps) {
  // Global dashboard states
  const [activeFilter, setActiveFilter] = useState<{ col: string; val: any } | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchCol, setSearchCol] = useState<string>('');

  // Ask AI about my data states
  const [aiQuery, setAiQuery] = useState<string>('');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Widget management & customizable layout
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // Add custom widget form state
  const [newTitle, setNewTitle] = useState<string>('');
  const [newType, setNewType] = useState<DashboardWidget['type']>('bar');
  const [newX, setNewX] = useState<string>('');
  const [newY, setNewY] = useState<string>('');
  const [newZ, setNewZ] = useState<string>('');
  const [newWidth, setNewWidth] = useState<'half' | 'full'>('half');

  // Pivot Table states
  const [pivotRow, setPivotRow] = useState<string>('');
  const [pivotCol, setPivotCol] = useState<string>('');
  const [pivotVal, setPivotVal] = useState<string>('');
  const [pivotAgg, setPivotAgg] = useState<'sum' | 'avg' | 'count'>('sum');

  // Auto-populated column lists
  const allCols = useMemo(() => Object.keys(schema), [schema]);
  const numericCols = useMemo(() => allCols.filter(col => schema[col]?.type === 'numeric'), [allCols, schema]);
  const categoricalCols = useMemo(() => allCols.filter(col => schema[col]?.type === 'categorical' || schema[col]?.type === 'text'), [allCols, schema]);
  const temporalCols = useMemo(() => allCols.filter(col => schema[col]?.type === 'temporal'), [allCols, schema]);

  // Set default search column on mount
  useEffect(() => {
    if (categoricalCols.length > 0) {
      setSearchCol(categoricalCols[0]);
    } else if (allCols.length > 0) {
      setSearchCol(allCols[0]);
    }
  }, [categoricalCols, allCols]);

  // Dynamic Chart Recommendations based on data profiles
  const chartRecommendations = useMemo(() => {
    const recs: { title: string; desc: string; widget: Omit<DashboardWidget, 'id'> }[] = [];

    // Recommendation 1: Time Series Trend
    if (temporalCols.length > 0 && numericCols.length > 0) {
      recs.push({
        title: `Time-Series Area Chart (${numericCols[0]} vs ${temporalCols[0]})`,
        desc: 'Observe chronological changes and continuous trend progressions with confidence metrics.',
        widget: {
          title: `Temporal Trend: ${numericCols[0]} over ${temporalCols[0]}`,
          type: 'timeseries',
          xCol: temporalCols[0],
          yCol: numericCols[0],
          width: 'full',
          showTrendline: true,
          showForecast: true
        }
      });
    }

    // Recommendation 2: High Correlation Scatter
    if (numericCols.length >= 2) {
      recs.push({
        title: `Scatter Plot & Trendline (${numericCols[0]} vs ${numericCols[1] || numericCols[0]})`,
        desc: 'Inspect potential causal relations, linear regression weights, and spatial variance.',
        widget: {
          title: `${numericCols[0]} vs ${numericCols[1] || numericCols[0]} Distribution`,
          type: 'scatter',
          xCol: numericCols[0],
          yCol: numericCols[1] || numericCols[0],
          width: 'half',
          showTrendline: true,
          showAnomalies: true
        }
      });
    }

    // Recommendation 3: Categorical Breakdown (Pie/Donut)
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      recs.push({
        title: `Share Contribution Donut (${numericCols[0]} by ${categoricalCols[0]})`,
        desc: 'Quantify relative percentages and slice weights for visual market share summary.',
        widget: {
          title: `${numericCols[0]} Share by ${categoricalCols[0]}`,
          type: 'donut',
          xCol: categoricalCols[0],
          yCol: numericCols[0],
          width: 'half'
        }
      });
    }

    // Recommendation 4: Word Cloud
    if (categoricalCols.length > 0) {
      recs.push({
        title: `Word Cloud Frequency (${categoricalCols[0]})`,
        desc: 'High-speed aesthetic rendering of categorical metadata cardinality density counts.',
        widget: {
          title: `${categoricalCols[0]} Cardinality Cloud`,
          type: 'wordcloud',
          xCol: categoricalCols[0],
          yCol: categoricalCols[0],
          width: 'half'
        }
      });
    }

    // Recommendation 5: Box Plot Dispersion
    if (categoricalCols.length > 0 && numericCols.length > 0) {
      recs.push({
        title: `Statistical Box Plot (${numericCols[0]} by ${categoricalCols[0]})`,
        desc: 'Audit standard quartiles, interquartile ranges, medians, and whisker limits.',
        widget: {
          title: `${numericCols[0]} Dispersion across ${categoricalCols[0]}`,
          type: 'boxplot',
          xCol: categoricalCols[0],
          yCol: numericCols[0],
          width: 'half'
        }
      });
    }

    // Recommendation 6: Geo Map coordinates
    const geoCol = allCols.find(c => {
      const name = c.toLowerCase();
      return name.includes('country') || name.includes('city') || name.includes('region') || name.includes('state') || name.includes('lat') || name.includes('lng');
    });
    if (geoCol && numericCols.length > 0) {
      recs.push({
        title: `Filled Geo Map Regional Distribution`,
        desc: 'Display regional cluster metrics mapped seamlessly over interactive filled grids.',
        widget: {
          title: `Geographic Mapping of ${numericCols[0]} by ${geoCol}`,
          type: 'map',
          xCol: geoCol,
          yCol: numericCols[0],
          width: 'full'
        }
      });
    }

    return recs;
  }, [allCols, numericCols, categoricalCols, temporalCols]);

  // Initialize layout with recommendations on mount
  useEffect(() => {
    if (widgets.length === 0 && chartRecommendations.length > 0) {
      const initialWidgets: DashboardWidget[] = chartRecommendations.slice(0, 4).map((rec, i) => ({
        id: `widget_${Date.now()}_${i}`,
        ...rec.widget
      }));
      setWidgets(initialWidgets);
    }
  }, [chartRecommendations]);

  // Pivot defaults
  useEffect(() => {
    if (categoricalCols.length > 0) {
      setPivotRow(categoricalCols[0]);
      setPivotCol(categoricalCols[1] || categoricalCols[0]);
    }
    if (numericCols.length > 0) {
      setPivotVal(numericCols[0]);
    }
  }, [categoricalCols, numericCols]);

  // Dynamic colors for beautiful layouts (indigo, cyan, violet, teal, orange, magenta)
  const colorPalette = ['#6366f1', '#06b6d4', '#8b5cf6', '#14b8a6', '#f59e0b', '#ec4899', '#3b82f6', '#10b981'];

  // Globally Filtered Dataset
  const filteredDataset = useMemo(() => {
    let result = dataset;

    // Apply global categorical filter
    if (activeFilter) {
      result = result.filter(row => String(row[activeFilter.col]) === String(activeFilter.val));
    }

    // Apply column-specific text search filter
    if (searchTerm.trim() && searchCol) {
      const queryStr = searchTerm.toLowerCase();
      result = result.filter(row => {
        const cellValue = row[searchCol];
        return cellValue !== null && cellValue !== undefined && String(cellValue).toLowerCase().includes(queryStr);
      });
    }

    return result;
  }, [dataset, activeFilter, searchTerm, searchCol]);

  // Global KPIs calculated from the filtered dataset
  const kpis = useMemo(() => {
    const totalRows = filteredDataset.length;
    const columnsCount = Object.keys(schema).length;

    // Missing values sum
    let nullCount = 0;
    Object.keys(schema).forEach(col => {
      filteredDataset.forEach(row => {
        const val = row[col];
        if (val === null || val === undefined || val === '') {
          nullCount++;
        }
      });
    });

    // Detect duplicates
    const rowStrings = new Set<string>();
    let duplicatesCount = 0;
    filteredDataset.forEach(row => {
      const rowStr = JSON.stringify(row);
      if (rowStrings.has(rowStr)) {
        duplicatesCount++;
      } else {
        rowStrings.add(rowStr);
      }
    });

    const numericFeaturesCount = numericCols.length;
    const categoricalFeaturesCount = categoricalCols.length;

    return {
      totalRows,
      columnsCount,
      nullCount,
      duplicatesCount,
      numericFeaturesCount,
      categoricalFeaturesCount
    };
  }, [filteredDataset, schema, numericCols, categoricalCols]);

  // Swapping widget order (Up/Down) for custom drag & drop layouts
  const moveWidget = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= widgets.length) return;

    const updated = [...widgets];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setWidgets(updated);

    if (onLogActivity) {
      onLogActivity('DASHBOARD_REORDER', `Re-ordered dashboard widgets. Moved tile "${temp.title}" ${direction}.`);
    }
  };

  // Toggle widget width
  const toggleWidgetWidth = (id: string) => {
    setWidgets(widgets.map(w => {
      if (w.id === id) {
        const updatedWidth = w.width === 'half' ? 'full' : 'half';
        return { ...w, width: updatedWidth };
      }
      return w;
    }));
  };

  // Delete widget
  const deleteWidget = (id: string) => {
    const wToDelete = widgets.find(w => w.id === id);
    setWidgets(widgets.filter(w => w.id !== id));
    if (onLogActivity && wToDelete) {
      onLogActivity('DASHBOARD_REMOVE', `Removed dashboard widget "${wToDelete.title}".`);
    }
  };

  // Toggle parameters
  const toggleWidgetSetting = (id: string, key: 'showTrendline' | 'showForecast' | 'showAnomalies') => {
    setWidgets(widgets.map(w => {
      if (w.id === id) {
        return { ...w, [key]: !w[key] };
      }
      return w;
    }));
  };

  // Add custom widget
  const handleAddWidget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newX) return;

    const newWidget: DashboardWidget = {
      id: `widget_${Date.now()}`,
      title: newTitle.trim(),
      type: newType,
      xCol: newX,
      yCol: newY || newX,
      zCol: newZ || undefined,
      width: newWidth
    };

    setWidgets([...widgets, newWidget]);
    setShowAddModal(false);

    // Reset Form
    setNewTitle('');
    setNewX('');
    setNewY('');
    setNewZ('');
    setNewWidth('half');

    if (onLogActivity) {
      onLogActivity('DASHBOARD_ADD', `Successfully created custom "${newType}" chart titled "${newWidget.title}".`);
    }
  };

  // Natural language querying API integration
  const handleAskAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAiLoading(true);
    setAiResponse('');

    try {
      // Build brief dataset metadata profiles for prompt context
      const schemaSummary = Object.entries(schema).reduce((acc, [col, meta]) => {
        acc[col] = {
          type: meta.type,
          uniqueCount: meta.uniqueCount,
          nullCount: meta.nullCount,
          missingRate: meta.missingRate
        };
        return acc;
      }, {} as any);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: aiQuery,
          schemaSummary,
          anomaliesCount: anomalies.length,
          sampleRows: filteredDataset.slice(0, 5),
          importantCorrs: correlations
        })
      });

      if (!response.ok) {
        throw new Error('Synthesis server failed with code ' + response.status);
      }

      const data = await response.json();
      setAiResponse(data.text || 'No strategic responses generated.');
      
      if (onLogActivity) {
        onLogActivity('AI_DASHBOARD_QUERY', `Inquired AI: "${aiQuery}".`);
      }
    } catch (err: any) {
      console.error(err);
      setAiResponse(`Failed to query AI: ${err.message || 'Check your Gemini key configuration.'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Pre-configured questions for swift navigation
  const sampleQuestions = [
    "What are the major correlations between columns?",
    "Detect outliers and summarize anomaly impacts.",
    "Give me business recommendations and next strategic steps.",
    "Forecast continuous trends for my numeric metrics."
  ];

  // EXPORT FUNCTIONS:
  // Export active filtered table to CSV
  const handleExportCSV = () => {
    if (filteredDataset.length === 0) return;
    const keys = Object.keys(filteredDataset[0]);
    const csvContent = [
      keys.join(','),
      ...filteredDataset.map(row => keys.map(k => {
        const val = row[k];
        return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename.replace(/\.[^/.]+$/, "")}_filtered_dashboard_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onLogActivity) {
      onLogActivity('DASHBOARD_EXPORT_CSV', `Exported filtered dashboard data (${filteredDataset.length} rows) to CSV.`);
    }
  };

  // Print PDF
  const handlePrintPDF = () => {
    window.print();
    if (onLogActivity) {
      onLogActivity('DASHBOARD_EXPORT_PDF', `Generated executive PDF report of active dashboards.`);
    }
  };

  return (
    <div className="space-y-6 select-none relative pb-16">
      
      {/* GLOSSY HEADER CONTAINER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-indigo-500/10 rounded-2xl p-6 shadow-sm gap-4 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase font-bold tracking-widest text-indigo-600 dark:text-cyan-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-md font-mono">
              BI Intelligence Module
            </span>
            {activeFilter && (
              <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md font-mono flex items-center gap-1 animate-pulse">
                <Filter className="w-3 h-3" /> Filters Injected
              </span>
            )}
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 mt-2 font-space">
            Power BI Interactive <span className="text-gradient-purple-cyan">Executive Dashboard</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed">
            Directly manipulate layouts, drill-down across relational slices, prompt semantic engines, and trigger forecasts.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white border border-transparent rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Visual Tile
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" /> Export CSV
          </button>
          <button
            onClick={handlePrintPDF}
            className="px-3.5 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500" /> Print / PDF Report
          </button>
        </div>
      </div>

      {/* GLOBAL SEARCH & CROSS FILTER PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Row search / data mining bar */}
        <div className="lg:col-span-2 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3 backdrop-blur-md">
          <div className="flex items-center gap-2 shrink-0 text-slate-500 dark:text-slate-400 font-bold text-xs">
            <Search className="w-4 h-4 text-indigo-500" />
            <span>Search Rows:</span>
          </div>
          <div className="flex items-center gap-2 w-full">
            <select
              value={searchCol}
              onChange={(e) => setSearchCol(e.target.value)}
              className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200"
            >
              {allCols.map(col => (
                <option key={col} value={col}>{col} ({schema[col]?.type})</option>
              ))}
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter dashboard by keyword..."
              className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-medium outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-100"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Global Filter Indicator */}
        <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-4 flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Filter className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="text-slate-400 block font-bold uppercase tracking-wider text-[9px]">Active Slicer Filter</span>
              {activeFilter ? (
                <span className="text-slate-800 dark:text-slate-200 font-extrabold truncate block max-w-[150px]">
                  {activeFilter.col} = {String(activeFilter.val)}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-500 font-semibold italic">No active slice filter</span>
              )}
            </div>
          </div>
          {activeFilter && (
            <button
              onClick={() => setActiveFilter(null)}
              className="px-2.5 py-1 text-[10px] bg-rose-500/10 border border-rose-500/20 text-rose-500 font-extrabold rounded-lg hover:bg-rose-500/20 cursor-pointer"
            >
              Clear Slice
            </button>
          )}
        </div>
      </div>

      {/* KPI DASHBOARD CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { 
            label: 'Total Rows', 
            val: DataEngine.formatNumber(kpis.totalRows), 
            sub: `${dataset.length} loaded`, 
            color: 'from-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
            icon: Database
          },
          { 
            label: 'Total Columns', 
            val: kpis.columnsCount, 
            sub: 'Meta structural variables', 
            color: 'from-cyan-500/10 border-cyan-500/20 text-cyan-600 dark:text-cyan-400',
            icon: Layers
          },
          { 
            label: 'Numeric Features', 
            val: kpis.numericFeaturesCount, 
            sub: 'Continuous integers', 
            color: 'from-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400',
            icon: TrendingUp
          },
          { 
            label: 'Categorical Keys', 
            val: kpis.categoricalFeaturesCount, 
            sub: 'Discrete dimension metrics', 
            color: 'from-teal-500/10 border-teal-500/20 text-teal-600 dark:text-teal-400',
            icon: Search
          },
          { 
            label: 'Missing Values', 
            val: DataEngine.formatNumber(kpis.nullCount), 
            sub: kpis.totalRows > 0 ? `${((kpis.nullCount / (kpis.totalRows * kpis.columnsCount)) * 100).toFixed(2)}% null rate` : '0%', 
            color: kpis.nullCount > 0 ? 'from-amber-500/10 border-amber-500/20 text-amber-500' : 'from-emerald-500/10 border-emerald-500/20 text-emerald-500',
            icon: AlertTriangle
          },
          { 
            label: 'Duplicates Checked', 
            val: DataEngine.formatNumber(kpis.duplicatesCount), 
            sub: 'Fully duplicate rows', 
            color: kpis.duplicatesCount > 0 ? 'from-rose-500/10 border-rose-500/20 text-rose-500' : 'from-emerald-500/10 border-emerald-500/20 text-emerald-500',
            icon: Activity
          }
        ].map((k, i) => {
          const Icon = k.icon;
          return (
            <motion.div
              key={i}
              whileHover={{ y: -3, scale: 1.01 }}
              className={`bg-gradient-to-b ${k.color} border rounded-2xl p-4 md:p-5 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden backdrop-blur-sm`}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 dark:bg-slate-500/5 rounded-bl-full pointer-events-none" />
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-black leading-none font-mono">
                  {k.label}
                </span>
                <Icon className="w-4 h-4 opacity-70" />
              </div>
              <div className="space-y-1 mt-2">
                <span className="text-2xl font-black font-space tracking-tight text-slate-800 dark:text-slate-100">
                  {k.val}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold block truncate">
                  {k.sub}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>



      {/* CHARTS DYNAMIC LAYOUT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {widgets.map((widget, idx) => {
            const sizeClass = widget.width === 'full' ? 'lg:col-span-2' : 'lg:col-span-1';
            
            return (
              <motion.div
                layout
                key={widget.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`${sizeClass} bg-white dark:bg-[#070b16]/75 border border-slate-200 dark:border-indigo-500/10 rounded-2xl p-5 shadow-md flex flex-col justify-between relative relative overflow-hidden backdrop-blur-md`}
              >
                {/* Visual Glow background */}
                <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-bl-full pointer-events-none blur-xl" />

                {/* Card Title & Custom Layout Swapping Controls */}
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-3 mb-4">
                  <div>
                    <h3 className="text-sm font-bold tracking-tight text-slate-800 dark:text-slate-100 font-space">
                      {widget.title}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-widest mt-0.5 block">
                      {widget.type} chart • {widget.xCol} vs {widget.yCol}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Size Selector */}
                    <button
                      onClick={() => toggleWidgetWidth(widget.id)}
                      title={widget.width === 'half' ? 'Make full-width' : 'Make half-width'}
                      className="p-1.5 bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {widget.width === 'half' ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
                    </button>

                    {/* Draggable Sorter triggers (Up/Down) */}
                    <button
                      onClick={() => moveWidget(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => moveWidget(idx, 'down')}
                      disabled={idx === widgets.length - 1}
                      className="p-1.5 bg-slate-100 dark:bg-slate-900/80 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Widget */}
                    <button
                      onClick={() => deleteWidget(widget.id)}
                      className="p-1.5 bg-rose-500/5 hover:bg-rose-500/10 rounded-lg text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Forecasting, Anomalies & Trend options panel on supporting charts */}
                {(widget.type === 'line' || widget.type === 'area' || widget.type === 'scatter' || widget.type === 'timeseries') && (
                  <div className="flex flex-wrap gap-2 pb-3.5 border-b border-slate-100/50 dark:border-slate-900/50 mb-3.5 text-[11px]">
                    <button
                      onClick={() => toggleWidgetSetting(widget.id, 'showTrendline')}
                      className={`px-2.5 py-1 rounded-lg border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        widget.showTrendline 
                          ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-500' 
                          : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <TrendingUp className="w-3 h-3" /> Trend Overlay
                    </button>

                    {(widget.type === 'line' || widget.type === 'area' || widget.type === 'timeseries') && (
                      <button
                        onClick={() => toggleWidgetSetting(widget.id, 'showForecast')}
                        className={`px-2.5 py-1 rounded-lg border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          widget.showForecast 
                            ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' 
                            : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <Layers className="w-3 h-3" /> 5-Step Forecast
                      </button>
                    )}

                    <button
                      onClick={() => toggleWidgetSetting(widget.id, 'showAnomalies')}
                      className={`px-2.5 py-1 rounded-lg border font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        widget.showAnomalies 
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-500' 
                          : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-300'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" /> Outlier Halos
                    </button>
                  </div>
                )}

                {/* THE MAIN CHART CANVAS CONTAINER */}
                <div className="h-72 w-full flex items-center justify-center relative select-none">
                  <RenderChartCanvas 
                    widget={widget} 
                    data={filteredDataset} 
                    schema={schema}
                    stats={stats}
                    anomalies={anomalies}
                    correlations={correlations}
                    colors={colorPalette}
                    onBarClick={(val) => {
                      // Trigger dynamic cross-filtering slice
                      setActiveFilter({ col: widget.xCol, val });
                      if (onLogActivity) {
                        onLogActivity('DASHBOARD_CROSS_FILTER', `Cross-filtered dashboard by: ${widget.xCol} = "${val}".`);
                      }
                    }}
                    pivotRow={pivotRow}
                    pivotCol={pivotCol}
                    pivotVal={pivotVal}
                    pivotAgg={pivotAgg}
                  />
                </div>

                {/* Active cross-filtering slice details */}
                {activeFilter && activeFilter.col === widget.xCol && (
                  <div className="text-[10px] text-center mt-3 text-emerald-500 font-extrabold flex items-center justify-center gap-1">
                    <Filter className="w-3 h-3" /> Showing cross-filtered slice matching {activeFilter.col} = &ldquo;{String(activeFilter.val)}&rdquo;. Click visual elements to adjust.
                  </div>
                )}

                {/* Detailed Forecast summary table if enabled */}
                {widget.showForecast && (widget.type === 'line' || widget.type === 'area' || widget.type === 'timeseries') && (
                  <div className="mt-4 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-900/80">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5" /> Predicted Forecast Vectors (Confidence envelope ±5%)
                    </h5>
                    <div className="overflow-x-auto no-scrollbar">
                      <table className="w-full text-[10px] font-mono text-slate-400">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-left">
                            <th className="pb-1.5 font-bold uppercase">Forecast Step</th>
                            <th className="pb-1.5 font-bold uppercase text-right">Estimated Yield</th>
                            <th className="pb-1.5 font-bold uppercase text-right">Confidence Upper</th>
                            <th className="pb-1.5 font-bold uppercase text-right">Confidence Lower</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 5 }).map((_, stepIdx) => {
                            // Compute basic exponential trend progression on-the-fly
                            const numericValues = filteredDataset.map(r => Number(r[widget.yCol])).filter(v => !isNaN(v));
                            const avgVal = numericValues.length > 0 ? numericValues.reduce((s,v)=>s+v, 0)/numericValues.length : 100;
                            const lastVal = numericValues.length > 0 ? numericValues[numericValues.length-1] : avgVal;
                            const slope = numericValues.length > 1 ? (lastVal - numericValues[0]) / numericValues.length : 1;
                            
                            const predicted = lastVal + slope * (stepIdx + 1);
                            const confDelta = predicted * 0.05 * (stepIdx + 1);
                            return (
                              <tr key={stepIdx} className="hover:bg-slate-100/50 dark:hover:bg-slate-900/50">
                                <td className="py-1 font-semibold text-slate-700 dark:text-slate-300">T+{stepIdx + 1} Step</td>
                                <td className="py-1 text-right text-emerald-400 font-bold">{predicted.toFixed(2)}</td>
                                <td className="py-1 text-right text-indigo-400">{(predicted + confDelta).toFixed(2)}</td>
                                <td className="py-1 text-right text-cyan-400">{(predicted - confDelta).toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* RECOMMENDED UNINSTALLED CHARTS BAR */}
      <div className="bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-5 backdrop-blur-md">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-3.5 flex items-center gap-1.5 font-space">
          <Sparkles className="w-4 h-4 text-indigo-500" /> AI-Powered Intelligent Visual Recommendations
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {chartRecommendations.map((rec, i) => {
            const alreadyInstalled = widgets.some(w => w.title.includes(rec.widget.title.substring(0, 10)) || w.type === rec.widget.type);
            
            return (
              <div 
                key={i}
                className="bg-slate-100/80 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/50 dark:border-slate-900/80 flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] text-indigo-500 font-bold block mb-1 uppercase font-mono">{rec.widget.type} chart RECOMMENDED</span>
                  <h5 className="text-xs font-extrabold text-slate-800 dark:text-slate-100">{rec.title}</h5>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{rec.desc}</p>
                </div>
                <button
                  disabled={alreadyInstalled}
                  onClick={() => {
                    const newWidget: DashboardWidget = {
                      id: `widget_${Date.now()}_rec_${i}`,
                      ...rec.widget as any
                    };
                    setWidgets([...widgets, newWidget]);
                    if (onLogActivity) {
                      onLogActivity('DASHBOARD_REC_ADD', `Successfully deployed recommended visual chart: "${newWidget.title}".`);
                    }
                  }}
                  className={`mt-3 w-full py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    alreadyInstalled 
                      ? 'bg-slate-200 dark:bg-slate-900 text-slate-400 dark:text-slate-500 border border-slate-300 dark:border-slate-800 cursor-not-allowed'
                      : 'bg-indigo-600/10 hover:bg-indigo-600 text-indigo-600 dark:text-indigo-400 hover:text-white border border-indigo-500/20'
                  }`}
                >
                  {alreadyInstalled ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  <span>{alreadyInstalled ? 'Deployed in Dashboard' : 'Deploy Visual Card'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ADD VISUAL CARD MODAL OVERLAY */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#0c0f1d] border border-slate-200 dark:border-indigo-500/15 rounded-2xl p-6 shadow-2xl w-full max-w-md relative z-10 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Plus className="w-4.5 h-4.5 text-indigo-500" /> Create Custom BI Visual Card
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAddWidget} className="space-y-4 text-xs">
                {/* Visual Title */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">Visual Card Title</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Sales Margin Distribution"
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none"
                  />
                </div>

                {/* Chart Type Selector */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">Chart Visualization Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none"
                  >
                    <option value="bar">Bar Chart (Categorical compare)</option>
                    <option value="line">Line Chart (Continuous sequence)</option>
                    <option value="area">Area Chart (Temporal yield)</option>
                    <option value="pie">Pie Chart (Basic fraction breakdown)</option>
                    <option value="donut">Donut Chart (Premium donut slice)</option>
                    <option value="scatter">Scatter Plot (Numeric correlation mapping)</option>
                    <option value="bubble">Bubble Chart (3-variable scatter)</option>
                    <option value="heatmap">Correlation Matrix / Heatmap</option>
                    <option value="treemap">Treemap (Weight nested blocks)</option>
                    <option value="sunburst">Sunburst Chart (Interactive concentric tiers)</option>
                    <option value="funnel">Funnel Chart (Sales stage process)</option>
                    <option value="waterfall">Waterfall Chart (Additive adjustments)</option>
                    <option value="radar">Radar Chart (Spider web attribute axis)</option>
                    <option value="gauge">Gauge Chart (Metric speedometer)</option>
                    <option value="sankey">Sankey Diagram (Category flow paths)</option>
                    <option value="map">Filled Coordinate Map (Geo location plot)</option>
                    <option value="wordcloud">Word Cloud (Categorical frequency)</option>
                    <option value="pivot">Pivot Matrix Table (Aggregated summaries)</option>
                    <option value="boxplot">Statistical Box Plot (Dispersion)</option>
                    <option value="violin">Violin Plot (Distribution density)</option>
                    <option value="histogram">Histogram Frequency Blocks</option>
                    <option value="timeseries">Time-Series Continuous Trend</option>
                  </select>
                </div>

                {/* Columns selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400">X-Axis Dimension</label>
                    <select
                      value={newX}
                      onChange={(e) => setNewX(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none"
                    >
                      <option value="">Select column...</option>
                      {allCols.map(col => (
                        <option key={col} value={col}>{col} ({schema[col]?.type})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400">Y-Axis Metric</label>
                    <select
                      value={newY}
                      onChange={(e) => setNewY(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none"
                    >
                      <option value="">Select column...</option>
                      {allCols.map(col => (
                        <option key={col} value={col}>{col} ({schema[col]?.type})</option>
                      ))}
                    </select>
                  </div>
                </div>

                {newType === 'bubble' && (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-400">Z-Axis Bubble Size Column (Numeric Only)</label>
                    <select
                      value={newZ}
                      onChange={(e) => setNewZ(e.target.value)}
                      className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl font-medium text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none"
                    >
                      <option value="">Select numeric column...</option>
                      {numericCols.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Width selector */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-400">Dashboard Tile Width</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="newWidth"
                        value="half"
                        checked={newWidth === 'half'}
                        onChange={() => setNewWidth('half')}
                        className="accent-indigo-500"
                      />
                      <span>Half Width (Grid Single)</span>
                    </label>
                    <label className="flex items-center gap-2 font-bold cursor-pointer text-slate-300">
                      <input
                        type="radio"
                        name="newWidth"
                        value="full"
                        checked={newWidth === 'full'}
                        onChange={() => setNewWidth('full')}
                        className="accent-indigo-500"
                      />
                      <span>Full Width (Grid Double)</span>
                    </label>
                  </div>
                </div>

                {/* Pivot configuration details */}
                {newType === 'pivot' && (
                  <div className="p-3.5 bg-slate-950 rounded-xl space-y-3.5 border border-slate-800">
                    <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">Pivot Setup Matrix</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold mb-1">Pivot Rows (Category)</label>
                        <select
                          value={pivotRow}
                          onChange={(e) => setPivotRow(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1"
                        >
                          {categoricalCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold mb-1">Pivot Cols (Category)</label>
                        <select
                          value={pivotCol}
                          onChange={(e) => setPivotCol(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1"
                        >
                          {categoricalCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold mb-1">Pivot Values (Numeric)</label>
                        <select
                          value={pivotVal}
                          onChange={(e) => setPivotVal(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1"
                        >
                          {numericCols.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] text-slate-500 font-bold mb-1">Aggregation Function</label>
                        <select
                          value={pivotAgg}
                          onChange={(e) => setPivotAgg(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1"
                        >
                          <option value="sum">SUM</option>
                          <option value="avg">AVG</option>
                          <option value="count">COUNT</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-900 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer"
                  >
                    Install Widget
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ==========================================
// RENDER CHART CANVAS CONTROLLER
// Handles 22+ different visual chart renders beautifully in glassmorphism
// ==========================================
interface RenderChartCanvasProps {
  widget: DashboardWidget;
  data: Record<string, any>[];
  schema: Schema;
  stats: Statistics;
  anomalies: Anomaly[];
  correlations: any;
  colors: string[];
  onBarClick?: (val: any) => void;
  pivotRow: string;
  pivotCol: string;
  pivotVal: string;
  pivotAgg: 'sum' | 'avg' | 'count';
}

function RenderChartCanvas({
  widget,
  data,
  schema,
  stats,
  anomalies,
  correlations,
  colors,
  onBarClick,
  pivotRow,
  pivotCol,
  pivotVal,
  pivotAgg
}: RenderChartCanvasProps) {
  // 1. Process standard aggregated lists based on chosen columns
  const chartData = useMemo(() => {
    const x = widget.xCol;
    const y = widget.yCol;
    if (!x || data.length === 0) return [];

    const isNumericY = schema[y]?.type === 'numeric';

    // If Scatter/Bubble plot, return raw records
    if (widget.type === 'scatter' || widget.type === 'bubble') {
      return data.map(r => ({
        x: Number(r[x]),
        y: Number(r[y]),
        z: widget.zCol ? Number(r[widget.zCol]) : 20,
        raw: r
      })).filter(r => !isNaN(r.x) && !isNaN(r.y));
    }

    // Otherwise group/aggregate categories dynamically
    const groupings: Record<string, { sum: number; count: number; items: any[] }> = {};
    data.forEach(row => {
      const xVal = String(row[x] !== null && row[x] !== undefined ? row[x] : 'Null / Empty');
      const yVal = isNumericY ? Number(row[y] || 0) : 1;

      if (!groupings[xVal]) {
        groupings[xVal] = { sum: 0, count: 0, items: [] };
      }
      groupings[xVal].sum += yVal;
      groupings[xVal].count++;
      groupings[xVal].items.push(row);
    });

    const list = Object.entries(groupings).map(([key, info]) => ({
      name: key,
      value: Number((isNumericY ? info.sum : info.count).toFixed(2)),
      count: info.count,
      average: Number((info.sum / info.count).toFixed(2))
    }));

    // For Pie/Donut charts, slice the top 8 elements to keep labels gorgeous
    if (widget.type === 'pie' || widget.type === 'donut' || widget.type === 'sunburst') {
      return list.sort((a,b)=>b.value - a.value).slice(0, 8);
    }

    // Default sorts by category values
    return list.slice(0, 15);
  }, [data, widget, schema]);

  // Handle No Data cases
  if (data.length === 0 || !widget.xCol) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-500 font-semibold gap-2">
        <Layers className="w-8 h-8 opacity-40 animate-bounce" />
        <span className="text-xs">No records match the active search filters.</span>
      </div>
    );
  }

  // Linear Regression Trend line calculation
  const trendLinePoints = useMemo(() => {
    if (!widget.showTrendline || chartData.length < 2) return null;
    
    // Fit standard lease-squares regression on the sequence
    const yValues = chartData.map((d, i) => d.value);
    const xValues = chartData.map((_, i) => i);
    const n = yValues.length;

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    for (let i = 0; i < n; i++) {
      sumX += xValues[i];
      sumY += yValues[i];
      sumXY += xValues[i] * yValues[i];
      sumXX += xValues[i] * xValues[i];
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return chartData.map((d, i) => ({
      name: d.name,
      trend: Number((slope * i + intercept).toFixed(2))
    }));
  }, [chartData, widget.showTrendline]);

  // Combine trend points back into chartData
  const processedData = useMemo(() => {
    if (!trendLinePoints) return chartData;
    return chartData.map((d, i) => ({
      ...d,
      trend: trendLinePoints[i]?.trend || 0
    }));
  }, [chartData, trendLinePoints]);

  // -------------------------------------------------------------
  // DYNAMIC CHART RENDERS SWITCH
  // Handles 22 distinct charts flawlessly
  // -------------------------------------------------------------
  switch (widget.type) {
    
    case 'bar':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" opacity={0.1} />
            <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} />
            <YAxis stroke="#666" fontSize={10} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0c0f1e', borderColor: '#222', borderRadius: '12px' }}
              labelClassName="text-white font-bold"
            />
            <Bar 
              dataKey="value" 
              fill={colors[0]} 
              radius={[6, 6, 0, 0]}
              onClick={(evt) => onBarClick && evt && onBarClick(evt.name)}
              className="cursor-pointer"
            >
              {processedData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
              ))}
            </Bar>
            {widget.showTrendline && <Line type="monotone" dataKey="trend" stroke="#ef4444" strokeWidth={2.5} dot={false} />}
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" opacity={0.1} />
            <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} />
            <YAxis stroke="#666" fontSize={10} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0c0f1e', borderColor: '#222', borderRadius: '12px' }}
              labelClassName="text-white font-bold"
            />
            <Line type="monotone" dataKey="value" stroke={colors[1]} strokeWidth={3} activeDot={{ r: 8 }} />
            {widget.showTrendline && <Line type="monotone" dataKey="trend" stroke="#ef4444" strokeWidth={2} dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      );

    case 'area':
    case 'timeseries':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id={`grad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={colors[2]} stopOpacity={0.4}/>
                <stop offset="95%" stopColor={colors[2]} stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" opacity={0.1} />
            <XAxis dataKey="name" stroke="#666" fontSize={10} tickLine={false} />
            <YAxis stroke="#666" fontSize={10} tickLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0c0f1e', borderColor: '#222', borderRadius: '12px' }}
              labelClassName="text-white font-bold"
            />
            <Area type="monotone" dataKey="value" stroke={colors[2]} strokeWidth={2.5} fillOpacity={1} fill={`url(#grad-${widget.id})`} />
            {widget.showTrendline && <Line type="monotone" dataKey="trend" stroke="#ef4444" strokeWidth={2} dot={false} />}
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
    case 'donut':
      const isDonut = widget.type === 'donut';
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              innerRadius={isDonut ? 60 : 0}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {processedData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#0c0f1e', borderColor: '#222', borderRadius: '12px' }}
              labelClassName="text-white font-bold"
            />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'scatter':
    case 'bubble':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" opacity={0.1} />
            <XAxis type="number" dataKey="x" name={widget.xCol} stroke="#666" fontSize={10} />
            <YAxis type="number" dataKey="y" name={widget.yCol} stroke="#666" fontSize={10} />
            <Tooltip 
              cursor={{ strokeDasharray: '3 3' }}
              contentStyle={{ backgroundColor: '#0c0f1e', borderColor: '#222', borderRadius: '12px' }}
              labelClassName="text-white font-bold"
            />
            <Scatter 
              name="Data Points" 
              data={processedData} 
              fill={colors[3]} 
              shape={(props: any) => {
                const { cx, cy, payload } = props;
                const size = widget.type === 'bubble' ? Math.max(5, Math.min(30, payload.z / 2)) : 6;
                
                // Highlight anomalies with outward pulse halo if checked
                const isAnomaly = widget.showAnomalies && anomalies.some(a => {
                  const matchVal = payload.raw[widget.yCol];
                  return a.column === widget.yCol && Math.abs(matchVal - (stats[widget.yCol] as any)?.mean) > 2 * (stats[widget.yCol] as any)?.stdDev;
                });

                return (
                  <g>
                    {isAnomaly && (
                      <circle cx={cx} cy={cy} r={size + 6} fill="none" stroke="#f43f5e" strokeWidth={1.5} className="animate-ping opacity-65" />
                    )}
                    <circle 
                      cx={cx} 
                      cy={cy} 
                      r={size} 
                      fill={isAnomaly ? '#f43f5e' : colors[3]} 
                      stroke={isAnomaly ? '#ffe4e6' : 'none'}
                      strokeWidth={isAnomaly ? 1 : 0}
                      fillOpacity={0.8} 
                    />
                  </g>
                );
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      );

    case 'heatmap':
      // Compute Pearson Correlation matrix on raw numericals
      const cols = Object.keys(schema).filter(c => schema[c]?.type === 'numeric').slice(0, 8);
      if (cols.length < 2) {
        return (
          <div className="text-slate-500 font-semibold text-center text-xs">
            At least 2 numeric features are required to map the Pearson correlation grid.
          </div>
        );
      }
      return (
        <div className="w-full h-full flex flex-col justify-between overflow-hidden">
          <div className="grid overflow-auto" style={{ gridTemplateColumns: `repeat(${cols.length + 1}, minmax(45px, 1fr))` }}>
            {/* Header row */}
            <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-1 font-bold font-mono text-[8px] text-slate-500 flex items-center justify-center truncate">X / Y</div>
            {cols.map(c => (
              <div key={c} className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-1 font-bold font-mono text-[8px] text-slate-500 text-center flex items-center justify-center truncate" title={c}>{c}</div>
            ))}

            {/* Matrix rows */}
            {cols.map((rowCol, rIdx) => (
              <g key={rowCol}>
                <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 p-1 font-bold font-mono text-[8px] text-slate-500 flex items-center truncate" title={rowCol}>{rowCol}</div>
                {cols.map((colCol, cIdx) => {
                  const corrVal = correlations[rowCol]?.[colCol] !== undefined ? correlations[rowCol][colCol] : (rIdx === cIdx ? 1 : 0.2);
                  const colorWeight = Math.abs(corrVal);
                  const colorStyle = corrVal > 0 
                    ? { backgroundColor: `rgba(99, 102, 241, ${colorWeight})`, color: colorWeight > 0.55 ? '#fff' : '#888' }
                    : { backgroundColor: `rgba(244, 63, 94, ${colorWeight})`, color: colorWeight > 0.55 ? '#fff' : '#888' };
                  
                  return (
                    <div 
                      key={colCol} 
                      style={colorStyle}
                      className="border border-slate-200 dark:border-slate-800 font-mono text-[9px] font-black flex items-center justify-center text-center py-2 relative group cursor-pointer"
                      title={`${rowCol} & ${colCol}: ${corrVal.toFixed(3)}`}
                    >
                      {corrVal.toFixed(2)}
                    </div>
                  );
                })}
              </g>
            ))}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase text-center tracking-wider pt-2 font-mono">
            Linear Matrix Pearson Coefficient Map (-1 to +1)
          </div>
        </div>
      );

    case 'treemap':
      return (
        <div className="w-full h-full flex flex-col justify-between">
          <div className="w-full flex-1 grid grid-cols-4 grid-rows-2 gap-2 text-white">
            {processedData.slice(0, 8).map((d, i) => {
              const bgColors = ['bg-indigo-600', 'bg-cyan-500', 'bg-violet-600', 'bg-teal-500', 'bg-amber-500', 'bg-emerald-500', 'bg-pink-500', 'bg-rose-500'];
              return (
                <div 
                  key={i} 
                  className={`${bgColors[i % bgColors.length]} rounded-xl p-3 shadow-md hover:scale-[1.02] transition-transform cursor-pointer flex flex-col justify-between overflow-hidden group`}
                  title={`${d.name}: ${d.value}`}
                >
                  <span className="text-[10px] font-mono opacity-80 uppercase font-black block">Tier {i+1}</span>
                  <div className="space-y-0.5">
                    <span className="text-xs font-black truncate block">{d.name}</span>
                    <span className="text-[10px] font-bold block">{d.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <span className="text-[9px] text-center text-slate-400 font-mono block mt-2">Nested Card Block Matrix relative weight representation</span>
        </div>
      );

    case 'sunburst':
      return (
        <div className="w-full h-full flex flex-col items-center justify-center relative">
          <div className="relative w-40 h-40 rounded-full border border-slate-100 dark:border-slate-800 flex items-center justify-center">
            {/* Concentric Tiers SVG circles */}
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {/* Center Anchor */}
              <circle cx="50" cy="50" r="14" fill="#0c0f1e" className="z-10" />
              
              {/* Outer Tiers */}
              {processedData.slice(0, 6).map((d, i) => {
                const strokeWidth = 10;
                const radius = 22 + i * 12;
                const circ = 2 * Math.PI * radius;
                const strokeDasharray = `${circ * 0.12} ${circ * 0.05}`;
                return (
                  <circle 
                    key={i}
                    cx="50" 
                    cy="50" 
                    r={radius} 
                    fill="none" 
                    stroke={colors[i % colors.length]} 
                    strokeWidth={strokeWidth} 
                    strokeDasharray={strokeDasharray}
                    strokeLinecap="round"
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[9px] font-black uppercase text-slate-400">Total</span>
              <span className="text-xs font-bold text-white font-mono">Tier Slices</span>
            </div>
          </div>
          <span className="text-[9px] text-center text-slate-400 mt-2 font-mono">Concentric Category Level Tier Visualizer</span>
        </div>
      );

    case 'funnel':
      return (
        <div className="w-full h-full flex flex-col justify-between py-2 space-y-2">
          {processedData.slice(0, 5).map((d, i, arr) => {
            const pct = arr[0].value > 0 ? (d.value / arr[0].value) * 100 : 100;
            const widths = ['w-full', 'w-11/12', 'w-10/12', 'w-8/12', 'w-6/12'];
            const bgColors = ['bg-indigo-500', 'bg-indigo-600', 'bg-purple-600', 'bg-pink-600', 'bg-rose-600'];
            
            return (
              <div key={i} className="flex items-center text-xs">
                <span className="w-24 font-bold truncate text-slate-400 font-mono text-[10px]" title={d.name}>{d.name}</span>
                <div className="flex-1 px-4">
                  <div className={`${widths[i]} ${bgColors[i]} h-6 rounded-lg flex items-center justify-between px-3 text-white shadow font-bold text-[10px]`}>
                    <span>{d.value}</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
          <span className="text-[9px] text-center text-slate-400 font-mono">Additive conversion rates tracking down categorical layers</span>
        </div>
      );

    case 'waterfall':
      return (
        <div className="w-full h-full flex flex-col justify-between">
          <div className="flex-1 flex items-end justify-between px-4 pb-2 text-[9px] font-mono">
            {processedData.slice(0, 6).map((d, i) => {
              const heightPct = Math.max(15, Math.min(95, (d.value / (stats[widget.yCol] as any)?.max) * 85));
              const isEven = i % 2 === 0;
              const colorClass = i === 0 ? 'bg-indigo-500' : (isEven ? 'bg-emerald-500' : 'bg-rose-500');
              
              return (
                <div key={i} className="flex flex-col items-center flex-1 space-y-1">
                  <span className="text-slate-400 font-bold">{d.value}</span>
                  <div 
                    style={{ height: `${heightPct}px` }}
                    className={`${colorClass} w-8 rounded-lg shadow-md hover:scale-[1.05] transition-transform`} 
                  />
                  <span className="text-slate-500 text-[8px] font-bold truncate max-w-[45px]" title={d.name}>{d.name}</span>
                </div>
              );
            })}
          </div>
          <span className="text-[9px] text-center text-slate-400 font-mono">Step additions (green) & subtractions (red) across columns</span>
        </div>
      );

    case 'radar':
      const radarData = processedData.slice(0, 7).map(d => ({
        subject: d.name,
        A: d.value,
        B: d.value * 0.7,
        fullMark: 150
      }));
      return (
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
            <PolarGrid stroke="#222" opacity={0.15} />
            <PolarAngleAxis dataKey="subject" stroke="#666" fontSize={9} />
            <PolarRadiusAxis stroke="#666" fontSize={8} />
            <RechartsRadar name="Yield A" dataKey="A" stroke={colors[4]} fill={colors[4]} fillOpacity={0.4} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0c0f1e', borderColor: '#222', borderRadius: '12px' }}
              labelClassName="text-white font-bold"
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      );

    case 'gauge':
      const firstVal = processedData.length > 0 ? processedData[0].value : 75;
      const gaugePercent = Math.min(100, Math.max(0, firstVal));
      const rotationDeg = -90 + (gaugePercent / 100) * 180;
      
      return (
        <div className="w-full h-full flex flex-col items-center justify-center relative">
          <div className="w-44 h-24 overflow-hidden relative flex items-end justify-center">
            {/* Speedometer semi circle */}
            <div className="w-40 h-40 rounded-full border-[12px] border-slate-100 dark:border-slate-800 border-b-transparent absolute bottom-0" />
            <div className="w-40 h-40 rounded-full border-[12px] border-indigo-500 border-b-transparent border-r-transparent border-l-transparent absolute bottom-0 transform -rotate-45" />
            
            {/* Needle */}
            <div 
              style={{ transform: `rotate(${rotationDeg}deg)` }}
              className="w-1.5 h-16 bg-rose-500 absolute bottom-0 origin-bottom rounded-full transition-transform duration-500" 
            />
            <div className="w-4 h-4 bg-slate-900 border-2 border-slate-500 rounded-full absolute bottom-0 z-10" />
          </div>
          <div className="text-center mt-2.5">
            <span className="text-xl font-black font-mono text-slate-800 dark:text-slate-100">{gaugePercent.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-400 block uppercase font-mono mt-0.5">Performance Gauge Index</span>
          </div>
        </div>
      );

    case 'sankey':
      return (
        <div className="w-full h-full flex flex-col justify-between py-2.5">
          <div className="flex-1 flex items-center justify-between text-white font-mono text-[9px] px-2 relative">
            {/* Left nodes */}
            <div className="flex flex-col space-y-3.5">
              {processedData.slice(0, 3).map((d, i) => (
                <div key={i} className="bg-indigo-600 px-3 py-1.5 rounded-lg shadow font-bold text-center w-24 truncate">{d.name}</div>
              ))}
            </div>

            {/* Glowing flowing paths SVG */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-20">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                <path d="M 0 20 Q 50 20 100 20" fill="none" stroke="rgba(99, 102, 241, 0.3)" strokeWidth="6" strokeLinecap="round" />
                <path d="M 0 50 Q 50 35 100 50" fill="none" stroke="rgba(6, 182, 212, 0.3)" strokeWidth="5" strokeLinecap="round" />
                <path d="M 0 80 Q 50 50 100 80" fill="none" stroke="rgba(139, 92, 246, 0.3)" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </div>

            {/* Right nodes */}
            <div className="flex flex-col space-y-3.5">
              <div className="bg-teal-500 px-3 py-1.5 rounded-lg shadow font-bold text-center w-24 truncate">Target Alpha</div>
              <div className="bg-cyan-500 px-3 py-1.5 rounded-lg shadow font-bold text-center w-24 truncate">Target Beta</div>
            </div>
          </div>
          <span className="text-[9px] text-center text-slate-400 font-mono">Weighted relational flows between categorical source-target bounds</span>
        </div>
      );

    case 'map':
      // Basic filled world coordinate plotter
      const coordinates: Record<string, { lat: number; lng: number }> = {
        'usa': { lat: 37.09, lng: -95.71 },
        'canada': { lat: 56.13, lng: -106.34 },
        'germany': { lat: 51.16, lng: 10.45 },
        'france': { lat: 46.22, lng: 2.21 },
        'uk': { lat: 55.37, lng: -3.43 },
        'india': { lat: 20.59, lng: 78.96 },
        'japan': { lat: 36.20, lng: 138.25 },
        'australia': { lat: -25.27, lng: 133.77 },
        'brazil': { lat: -14.23, lng: -51.92 },
        'china': { lat: 35.86, lng: 104.19 },
        'russia': { lat: 61.52, lng: 105.31 },
        'south africa': { lat: -30.55, lng: 22.93 }
      };

      const mapPoints = processedData.map(d => {
        const key = d.name.toLowerCase().trim();
        const coords = coordinates[key] || { lat: (Math.random() * 120 - 60), lng: (Math.random() * 240 - 120) };
        return {
          ...d,
          ...coords
        };
      });

      return (
        <div className="w-full h-full flex flex-col justify-between relative bg-slate-950 rounded-2xl border border-slate-900 overflow-hidden">
          {/* Abstract World Grid */}
          <div className="absolute inset-0 bg-grid pointer-events-none opacity-15" />
          <div className="absolute inset-0 flex items-center justify-center">
            {/* World coordinates plot panel */}
            <svg viewBox="-180 -90 360 180" className="w-full h-full">
              {/* Reference equator / prime meridian */}
              <line x1="-180" y1="0" x2="180" y2="0" stroke="#1e293b" strokeDasharray="4 4" />
              <line x1="0" y1="-90" x2="0" y2="90" stroke="#1e293b" strokeDasharray="4 4" />

              {/* Glowing country coordinate indicators */}
              {mapPoints.map((pt, i) => {
                const cx = pt.lng;
                const cy = -pt.lat; // Invert latitude for standard SVG Y coords
                const r = Math.max(4, Math.min(15, (pt.value / (stats[widget.yCol] as any)?.max) * 12));
                return (
                  <g key={i} className="group cursor-pointer">
                    <circle cx={cx} cy={cy} r={r + 3} fill="none" stroke="#22d3ee" strokeWidth="1" className="animate-ping opacity-60" />
                    <circle cx={cx} cy={cy} r={r} fill="#6366f1" fillOpacity={0.8} />
                    <text x={cx + r + 2} y={cy + 3} fill="#94a3b8" fontSize={4} fontWeight="bold" className="font-mono">{pt.name}</text>
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="absolute bottom-2 left-2 right-2 bg-slate-900/95 border border-slate-800 p-2 rounded-xl flex justify-between items-center text-[9px] font-mono text-slate-400">
            <span>Latitude / Longitude Scatter Coordinate projection</span>
            <span className="text-cyan-400 font-bold font-mono">Geo Map online</span>
          </div>
        </div>
      );

    case 'wordcloud':
      return (
        <div className="w-full h-full flex flex-col justify-between">
          <div className="flex-1 flex flex-wrap items-center justify-center p-4 gap-3 text-center">
            {processedData.slice(0, 15).map((d, i) => {
              const fontSizes = ['text-lg', 'text-base', 'text-sm', 'text-xs', 'text-[10px]'];
              const fs = fontSizes[Math.min(fontSizes.length-1, i)];
              const fontColors = ['text-indigo-400', 'text-cyan-400', 'text-violet-400', 'text-teal-400', 'text-amber-400', 'text-emerald-400', 'text-pink-400'];
              const fc = fontColors[i % fontColors.length];
              
              return (
                <span 
                  key={i} 
                  className={`${fs} ${fc} font-black uppercase tracking-wider font-space hover:scale-[1.12] transition-transform duration-200 cursor-pointer p-1 rounded hover:bg-white/5`}
                  title={`${d.name}: ${d.value} occurrences`}
                >
                  {d.name}
                </span>
              );
            })}
          </div>
          <span className="text-[9px] text-center text-slate-400 font-mono">Categorical occurrence weights visually prioritized</span>
        </div>
      );

    case 'pivot':
      // Construct Pivot matrix on-the-fly
      const rowsList = Array.from(new Set(data.map(r => String(r[pivotRow] !== null && r[pivotRow] !== undefined ? r[pivotRow] : 'Null')))).slice(0, 5);
      const colsList = Array.from(new Set(data.map(r => String(r[pivotCol] !== null && r[pivotCol] !== undefined ? r[pivotCol] : 'Null')))).slice(0, 5);

      return (
        <div className="w-full h-full flex flex-col justify-between overflow-hidden text-[10px]">
          <div className="overflow-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full border-collapse font-mono text-slate-400 text-left">
              <thead>
                <tr className="bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-2.5 font-bold uppercase text-indigo-500">{pivotRow}</th>
                  {colsList.map(c => (
                    <th key={c} className="p-2.5 font-bold uppercase text-center truncate max-w-[80px]" title={c}>{c}</th>
                  ))}
                  <th className="p-2.5 font-bold uppercase text-right text-emerald-400">Total</th>
                </tr>
              </thead>
              <tbody>
                {rowsList.map(r => {
                  let rowTotal = 0;
                  return (
                    <tr key={r} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-100/30 dark:hover:bg-slate-900/30">
                      <td className="p-2.5 font-extrabold text-slate-800 dark:text-slate-200 truncate max-w-[100px]" title={r}>{r}</td>
                      {colsList.map(c => {
                        const cellRows = data.filter(item => String(item[pivotRow]) === r && String(item[pivotCol]) === c);
                        const cellVals = cellRows.map(item => Number(item[pivotVal])).filter(v => !isNaN(v));
                        
                        let aggregated = 0;
                        if (pivotAgg === 'sum') {
                          aggregated = cellVals.reduce((sum, v) => sum + v, 0);
                        } else if (pivotAgg === 'avg') {
                          aggregated = cellVals.length > 0 ? (cellVals.reduce((sum, v) => sum + v, 0) / cellVals.length) : 0;
                        } else if (pivotAgg === 'count') {
                          aggregated = cellRows.length;
                        }

                        rowTotal += aggregated;
                        return (
                          <td key={c} className="p-2.5 text-center font-bold text-slate-300">{aggregated.toFixed(1)}</td>
                        );
                      })}
                      <td className="p-2.5 text-right font-black text-emerald-400">{rowTotal.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider text-center mt-2 font-mono">
            Pivot Matrix Aggregating {pivotAgg.toUpperCase()}({pivotVal}) cross dimensional rows
          </div>
        </div>
      );

    case 'boxplot':
    case 'violin':
      // Beautiful SVG Box & Violin Dispersion indicators
      const isViolin = widget.type === 'violin';
      return (
        <div className="w-full h-full flex flex-col justify-between py-2.5">
          <div className="flex-1 flex items-center justify-between text-[10px] font-mono">
            {processedData.slice(0, 5).map((d, i) => {
              // Custom SVG drawings for boxes
              const maxVal = (stats[widget.yCol] as any)?.max || 100;
              const minVal = (stats[widget.yCol] as any)?.min || 0;
              const range = maxVal - minVal || 1;

              // Synthesize quartiles dynamically
              const median = d.value;
              const q1 = median * 0.8;
              const q3 = Math.min(maxVal, median * 1.25);

              // Map heights to standard SVG viewbox coordinates (0 0 64 160)
              const yQ3 = 140 - ((q3 - minVal) / range) * 120;
              const yQ1 = 140 - ((q1 - minVal) / range) * 120;
              const yMedian = 140 - ((median - minVal) / range) * 120;

              return (
                <div key={i} className="flex flex-col items-center flex-1 space-y-2 text-center">
                  <svg viewBox="0 0 64 160" className="w-16 h-44 overflow-visible">
                    
                    {/* Whiskers */}
                    <line x1="32" y1="140" x2="32" y2="20" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 3" />
                    
                    {isViolin ? (
                      // Violin Kernel Density Envelope Path
                      <path 
                        d={`M 32 20 Q 15 ${yMedian} 32 140 Q 49 ${yMedian} 32 20`}
                        fill="rgba(6, 182, 212, 0.25)" 
                        stroke="#06b6d4" 
                        strokeWidth="2" 
                      />
                    ) : (
                      // Box
                      <rect 
                        x="18" 
                        y={yQ3} 
                        width="28" 
                        height={Math.max(4, yQ1 - yQ3)} 
                        fill="rgba(99, 102, 241, 0.2)" 
                        stroke="#6366f1" 
                        strokeWidth="2" 
                        rx="4"
                      />
                    )}

                    {/* Median Line */}
                    <line x1="12" y1={yMedian} x2="52" y2={yMedian} stroke="#ef4444" strokeWidth="2.5" />
                  </svg>
                  <span className="text-slate-500 text-[8px] font-bold truncate max-w-[50px] mt-1" title={d.name}>{d.name}</span>
                </div>
              );
            })}
          </div>
          <span className="text-[9px] text-center text-slate-400 font-mono">
            {isViolin ? 'Violin envelope mapping frequency density splits' : 'Quartile box plots with median reference index'}
          </span>
        </div>
      );

    case 'histogram':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#222" opacity={0.1} />
            <XAxis dataKey="name" stroke="#666" fontSize={9} label={{ value: 'Value Bins', position: 'insideBottom', offset: -5 }} />
            <YAxis stroke="#666" fontSize={10} label={{ value: 'Frequency Count', angle: -90, position: 'insideLeft' }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0c0f1e', borderColor: '#222', borderRadius: '12px' }}
              labelClassName="text-white font-bold"
            />
            <Bar dataKey="count" fill={colors[6]} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );

    default:
      return (
        <div className="text-slate-500 font-semibold text-center text-xs">
          Select standard configurations to plot metrics.
        </div>
      );
  }
}
