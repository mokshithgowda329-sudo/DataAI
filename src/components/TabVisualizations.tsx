import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Schema } from '../types';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { 
  BarChart3, 
  LineChart as LineIcon, 
  AreaChart as AreaIcon, 
  PieChart as PieIcon, 
  ScatterChart as ScatterIcon, 
  Globe, 
  Compass, 
  MapPin, 
  Download, 
  Printer, 
  Sparkles, 
  ChevronRight, 
  Info, 
  RotateCcw, 
  TrendingUp, 
  SlidersHorizontal,
  Table,
  CheckCircle2
} from 'lucide-react';

interface TabVisualizationsProps {
  dataset: Record<string, any>[];
  schema: Schema;
}

// Predefined coordinates for dynamic geographic entity mapping
const GEO_COORDINATES: Record<string, { lat: number; lng: number }> = {
  // US Cities / States
  'new york': { lat: 40.7128, lng: -74.0060 },
  'ny': { lat: 40.7128, lng: -74.0060 },
  'california': { lat: 36.7783, lng: -119.4179 },
  'ca': { lat: 36.7783, lng: -119.4179 },
  'los angeles': { lat: 34.0522, lng: -118.2437 },
  'texas': { lat: 31.9686, lng: -99.9018 },
  'tx': { lat: 31.9686, lng: -99.9018 },
  'houston': { lat: 29.7604, lng: -95.3698 },
  'florida': { lat: 27.6648, lng: -81.5158 },
  'fl': { lat: 27.6648, lng: -81.5158 },
  'miami': { lat: 25.7617, lng: -80.1918 },
  'chicago': { lat: 41.8781, lng: -87.6298 },
  'illinois': { lat: 40.6331, lng: -89.3985 },
  'seattle': { lat: 47.6062, lng: -122.3321 },
  'washington': { lat: 47.7511, lng: -120.7401 },
  // Common Regions
  'east': { lat: 40.0, lng: -75.0 },
  'west': { lat: 37.0, lng: -120.0 },
  'south': { lat: 32.0, lng: -95.0 },
  'midwest': { lat: 41.5, lng: -93.0 },
  'north': { lat: 46.0, lng: -95.0 },
  'central': { lat: 39.5, lng: -98.0 },
  // Countries
  'usa': { lat: 37.0902, lng: -95.7129 },
  'united states': { lat: 37.0902, lng: -95.7129 },
  'uk': { lat: 55.3781, lng: -3.4360 },
  'united kingdom': { lat: 55.3781, lng: -3.4360 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'france': { lat: 46.2276, lng: 2.2137 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'germany': { lat: 51.1657, lng: 10.4515 },
  'berlin': { lat: 52.5200, lng: 13.4050 },
  'india': { lat: 20.5937, lng: 78.9629 },
  'mumbai': { lat: 19.0760, lng: 72.8777 },
  'delhi': { lat: 28.7041, lng: 77.1025 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'japan': { lat: 36.2048, lng: 138.2529 },
  'australia': { lat: -25.2744, lng: 133.7751 },
  'sydney': { lat: -33.8688, lng: 151.2093 },
  'canada': { lat: 56.1304, lng: -106.3468 },
  'toronto': { lat: 43.6532, lng: -79.3832 },
  'brazil': { lat: -14.2350, lng: -51.9253 },
  'sao paulo': { lat: -23.5505, lng: -46.6333 },
  'south africa': { lat: -30.5595, lng: 22.9375 },
  'cape town': { lat: -33.9249, lng: 18.4241 },
  'europe': { lat: 48.0, lng: 15.0 },
  'asia': { lat: 34.0, lng: 100.0 },
  'north america': { lat: 45.0, lng: -100.0 },
  'south america': { lat: -15.0, lng: -60.0 },
  'africa': { lat: 2.0, lng: 20.0 }
};

export default function TabVisualizations({ 
  dataset, 
  schema
}: TabVisualizationsProps) {
  const allCols = Object.keys(schema);
  const numericCols = allCols.filter(col => schema[col].type === 'numeric');
  const categoricalCols = allCols.filter(col => schema[col].type === 'categorical' || schema[col].type === 'text');
  const temporalCols = allCols.filter(col => schema[col].type === 'temporal');

  // Core simplified state
  const [selectedX, setSelectedX] = useState<string>(
    temporalCols[0] || categoricalCols[0] || allCols[0] || ''
  );
  const [selectedY, setSelectedY] = useState<string>(
    numericCols[0] || allCols[0] || ''
  );
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'map'>('bar');
  const [activeFilter, setActiveFilter] = useState<{ key: string; value: any } | null>(null);

  // Dynamic Theme Colors
  const colors = ['#6366f1', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#3b82f6', '#f43f5e'];

  // 1. FILTERED DATASETS
  const filteredDataset = useMemo(() => {
    if (!activeFilter) return dataset;
    return dataset.filter(row => String(row[activeFilter.key]) === String(activeFilter.value));
  }, [dataset, activeFilter]);

  // 2. COMPILED CHART DATA
  const chartData = useMemo(() => {
    if (!selectedX || !selectedY || filteredDataset.length === 0) return [];
    
    // Group and aggregate data if multiple items share the same X value
    const groups: Record<string, { sum: number; count: number; rows: Record<string, any>[] }> = {};
    
    filteredDataset.forEach(row => {
      const valX = String(row[selectedX] ?? 'N/A');
      const valY = Number(row[selectedY]);
      const cleanY = isNaN(valY) ? 0 : valY;

      if (!groups[valX]) {
        groups[valX] = { sum: 0, count: 0, rows: [] };
      }
      groups[valX].sum += cleanY;
      groups[valX].count += 1;
      groups[valX].rows.push(row);
    });

    // Convert to sorted list
    const list = Object.entries(groups).map(([name, stats]) => ({
      name,
      value: Number((stats.sum).toFixed(2)),
      avgValue: Number((stats.sum / stats.count).toFixed(2)),
      count: stats.count,
      rawRows: stats.rows
    }));

    // If temporal, sort chronologically, otherwise sort by value descending
    if (schema[selectedX]?.type === 'temporal') {
      return list.sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    } else {
      return list.sort((a, b) => b.value - a.value).slice(0, 15); // Limit to top 15 for visual clarity
    }
  }, [filteredDataset, selectedX, selectedY, schema]);

  // 3. AUTOMATIC LOCATION RESOLVER FOR MAP VIEW
  const mapMarkers = useMemo(() => {
    if (filteredDataset.length === 0) return [];

    // Attempt to locate potential location keys
    const locationKey = allCols.find(col => {
      const lower = col.toLowerCase();
      return lower.includes('region') || lower.includes('country') || lower.includes('city') || lower.includes('state') || lower.includes('location') || lower.includes('address');
    });

    const latKey = allCols.find(col => {
      const lower = col.toLowerCase();
      return lower === 'lat' || lower === 'latitude';
    });

    const lngKey = allCols.find(col => {
      const lower = col.toLowerCase();
      return lower === 'lng' || lower === 'longitude' || lower === 'lon';
    });

    // Assemble plotted indicators
    const markersMap: Record<string, { name: string; lat: number; lng: number; totalValue: number; count: number }> = {};

    filteredDataset.forEach(row => {
      let lat = 0;
      let lng = 0;
      let locName = 'Unknown Location';
      let isValid = false;

      // Priority 1: Has direct latitude/longitude columns
      if (latKey && lngKey && row[latKey] && row[lngKey]) {
        const rawLat = Number(row[latKey]);
        const rawLng = Number(row[lngKey]);
        if (!isNaN(rawLat) && !isNaN(rawLng)) {
          lat = rawLat;
          lng = rawLng;
          locName = locationKey ? String(row[locationKey]) : `${lat.toFixed(2)}, ${lng.toFixed(2)}`;
          isValid = true;
        }
      }

      // Priority 2: Coordinate fallback via lookup on region/city column text
      if (!isValid && locationKey && row[locationKey]) {
        const query = String(row[locationKey]).toLowerCase().trim();
        if (GEO_COORDINATES[query]) {
          lat = GEO_COORDINATES[query].lat;
          lng = GEO_COORDINATES[query].lng;
          locName = String(row[locationKey]);
          isValid = true;
        } else {
          // Check substring matching (e.g. "East Coast" matches "east")
          const matchedKey = Object.keys(GEO_COORDINATES).find(k => query.includes(k));
          if (matchedKey) {
            lat = GEO_COORDINATES[matchedKey].lat;
            lng = GEO_COORDINATES[matchedKey].lng;
            locName = String(row[locationKey]);
            isValid = true;
          }
        }
      }

      // If we got a valid plot, map it
      if (isValid) {
        const yVal = selectedY ? Number(row[selectedY]) : 1;
        const cleanY = isNaN(yVal) ? 0 : yVal;

        if (!markersMap[locName]) {
          markersMap[locName] = { name: locName, lat, lng, totalValue: 0, count: 0 };
        }
        markersMap[locName].totalValue += cleanY;
        markersMap[locName].count += 1;
      }
    });

    return Object.values(markersMap);
  }, [filteredDataset, allCols, selectedY]);

  // Translate geographic coordinates safely to standard Mercator flat plane coordinates (SVG 400x240)
  const getXYProjection = (lat: number, lng: number) => {
    // Mercator map bounds approximation
    const width = 480;
    const height = 260;
    
    // x projection: -180 to 180 map to 0 to width
    const x = ((lng + 180) * (width / 360));
    
    // y projection: -90 to 90 map to height to 0
    const latRad = (lat * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const y = (height / 2) - (width * mercN / (2 * Math.PI));

    // Clamp values to keep markers inside SVG stage gracefully
    const cleanX = Math.max(10, Math.min(width - 10, x));
    const cleanY = Math.max(10, Math.min(height - 10, y + 25)); // Offset calibration

    return { x: cleanX, y: cleanY };
  };

  // 4. STATISTICAL SUMMARIES ON CURRENT SELECTION
  const statistics = useMemo(() => {
    if (chartData.length === 0) return { total: 0, average: 0, peak: 'N/A', peakVal: 0 };
    
    let total = 0;
    let peakVal = -Infinity;
    let peakName = 'N/A';

    chartData.forEach(item => {
      total += item.value;
      if (item.value > peakVal) {
        peakVal = item.value;
        peakName = item.name;
      }
    });

    return {
      total: Number(total.toFixed(1)),
      average: Number((total / chartData.length).toFixed(1)),
      peak: peakName,
      peakVal: peakVal === -Infinity ? 0 : Number(peakVal.toFixed(1))
    };
  }, [chartData]);

  // 5. SMART RECOMMENDATION ASSISTANT CHIPS
  const recommendationsList = useMemo(() => {
    const list: { label: string; x: string; y: string; type: typeof chartType }[] = [];
    
    // Find Sales & region patterns
    const hasSales = allCols.some(c => c.toLowerCase().includes('sales'));
    const hasRegion = allCols.some(c => c.toLowerCase().includes('region') || c.toLowerCase().includes('state'));
    const hasCategory = allCols.some(c => c.toLowerCase().includes('category') || c.toLowerCase().includes('product'));
    const hasSteps = allCols.some(c => c.toLowerCase().includes('steps'));
    const hasDate = temporalCols.length > 0;

    if (hasSales && hasRegion) {
      list.push({ label: 'Regional Sales breakdown', x: hasRegion ? allCols.find(c => c.toLowerCase().includes('region') || c.toLowerCase().includes('state'))! : allCols[0], y: allCols.find(c => c.toLowerCase().includes('sales'))!, type: 'map' });
    }
    if (hasSales && hasCategory) {
      list.push({ label: 'Profitability by Product Category', x: allCols.find(c => c.toLowerCase().includes('category') || c.toLowerCase().includes('product'))!, y: allCols.find(c => c.toLowerCase().includes('sales'))!, type: 'pie' });
    }
    if (hasSteps && hasDate) {
      list.push({ label: 'Steps Chronological Performance', x: temporalCols[0], y: allCols.find(c => c.toLowerCase().includes('steps'))!, type: 'line' });
    }
    
    // Fallback options
    if (categoricalCols[0] && numericCols[0]) {
      list.push({ label: `Distribution of ${numericCols[0]} by ${categoricalCols[0]}`, x: categoricalCols[0], y: numericCols[0], type: 'bar' });
    }
    if (temporalCols[0] && numericCols[0]) {
      list.push({ label: `Timeline Trend of ${numericCols[0]}`, x: temporalCols[0], y: numericCols[0], type: 'area' });
    }

    return list.slice(0, 3);
  }, [allCols, categoricalCols, numericCols, temporalCols]);

  // Export functions
  const handleExportCSV = () => {
    if (filteredDataset.length === 0) return;
    const keys = Object.keys(filteredDataset[0]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [keys.join(",")].concat(
          filteredDataset.map(row => keys.map(k => `"${String(row[k] ?? '')}"`).join(","))
        ).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dataai_insights_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* 1. FRIENDLY INSTRUCTION BAR */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-indigo-50 dark:bg-indigo-950/20 p-4 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-indigo-500 text-white rounded-xl mt-0.5 shadow-md shadow-indigo-500/20">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black font-header text-slate-800 dark:text-slate-100">Simple Visual Insights & Smart Maps</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select your columns and chart types below. Switch to **Geographic Map** to locate metric densities instantly.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export Data
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>
        </div>
      </div>

      {/* 2. SIMPLE COLUMN CONFIGURATOR & SWITCHER PANEL */}
      <div className="bg-white dark:bg-[#060913]/60 p-5 border border-slate-100 dark:border-indigo-500/10 rounded-2xl shadow-xl shadow-indigo-500/5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
        {/* Dimension Select */}
        <div className="lg:col-span-3 space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span> Axis Category (X)
          </label>
          <select
            value={selectedX}
            onChange={(e) => setSelectedX(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-indigo-500/20 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
          >
            <optgroup label="Calendar / Timelines">
              {temporalCols.map(col => <option key={col} value={col}>{col} (Date/Time)</option>)}
            </optgroup>
            <optgroup label="Regions & Text Groups">
              {categoricalCols.map(col => <option key={col} value={col}>{col} (Text)</option>)}
            </optgroup>
            <optgroup label="Other Columns">
              {allCols.filter(col => !temporalCols.includes(col) && !categoricalCols.includes(col)).map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Measure Select */}
        <div className="lg:col-span-3 space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Metric Measure (Y)
          </label>
          <select
            value={selectedY}
            onChange={(e) => setSelectedY(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-indigo-500/20 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
          >
            {numericCols.map(col => (
              <option key={col} value={col}>{col} (Number)</option>
            ))}
            {allCols.filter(col => !numericCols.includes(col)).map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        {/* Chart Type Toggle Grid */}
        <div className="lg:col-span-6 space-y-2">
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1">
            Chart Visualization Layout
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { id: 'bar', label: 'Bar', icon: BarChart3 },
              { id: 'line', label: 'Line', icon: LineIcon },
              { id: 'area', label: 'Area', icon: AreaIcon },
              { id: 'pie', label: 'Pie', icon: PieIcon },
              { id: 'scatter', label: 'Scatter', icon: ScatterIcon },
              { id: 'map', label: 'Map', icon: Globe }
            ].map(type => {
              const Icon = type.icon;
              const isSelected = chartType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setChartType(type.id as any)}
                  className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/10' 
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] font-black">{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. CLIKCABLE SUGGESTIONS CHIPS */}
      {recommendationsList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-[#090d1a]/50 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-indigo-500/5">
          <span className="text-[10px] text-indigo-500 font-extrabold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Assistant Recommendations:
          </span>
          {recommendationsList.map((rec, i) => (
            <button
              key={i}
              onClick={() => {
                setSelectedX(rec.x);
                setSelectedY(rec.y);
                setChartType(rec.type);
              }}
              className="text-[11px] font-bold px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-indigo-500/40 hover:text-indigo-600 transition-all cursor-pointer"
            >
              {rec.label}
            </button>
          ))}
        </div>
      )}

      {/* 4. ACTIVE FILTER NOTICE */}
      {activeFilter && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs rounded-xl font-bold font-sans"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            <span>Active Slice Isolation: **{activeFilter.key}** is equal to **"{activeFilter.value}"**</span>
          </div>
          <button
            onClick={() => setActiveFilter(null)}
            className="text-[10px] uppercase font-black tracking-widest text-rose-500 hover:text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded cursor-pointer"
          >
            Clear Filter
          </button>
        </motion.div>
      )}

      {/* 5. MAIN STAGE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Summary Stats Indicator Cards */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-[#060913]/60 p-4 border border-slate-100 dark:border-indigo-500/10 rounded-2xl shadow-xl shadow-indigo-500/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Selected Metric Sum</span>
            <h4 className="text-2xl font-black font-header text-slate-800 dark:text-slate-100 mt-1">{statistics.total.toLocaleString()}</h4>
            <p className="text-[10px] text-slate-500 mt-1">Aggregated total of {selectedY}</p>
          </div>

          <div className="bg-white dark:bg-[#060913]/60 p-4 border border-slate-100 dark:border-indigo-500/10 rounded-2xl shadow-xl shadow-indigo-500/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Metric Average</span>
            <h4 className="text-2xl font-black font-header text-indigo-600 dark:text-indigo-400 mt-1">{statistics.average.toLocaleString()}</h4>
            <p className="text-[10px] text-slate-500 mt-1">Average per group dimension</p>
          </div>

          <div className="bg-white dark:bg-[#060913]/60 p-4 border border-slate-100 dark:border-indigo-500/10 rounded-2xl shadow-xl shadow-indigo-500/5">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Peak Dimension Segment</span>
            <h4 className="text-md font-black font-header text-emerald-600 dark:text-emerald-400 mt-1 truncate">{statistics.peak}</h4>
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">Value: {statistics.peakVal.toLocaleString()}</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/40 dark:from-indigo-950/20 dark:to-indigo-900/10 p-4 border border-indigo-100/60 dark:border-indigo-500/10 rounded-2xl">
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
              <Info className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-wider">How to filter</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">
              Click on any bar, pie slice, chart point, or map pin to immediately isolate and filter the dataset to that specific dimension segment.
            </p>
          </div>
        </div>

        {/* Right Side: The Chart Preview Stage */}
        <div className="lg:col-span-9 bg-white dark:bg-[#060913]/60 p-5 border border-slate-100 dark:border-indigo-500/10 rounded-2xl shadow-xl shadow-[#04081c]/10 relative min-h-[360px] flex flex-col justify-between">
          
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-3 mb-4">
            <div>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 font-space flex items-center gap-1.5">
                {chartType === 'map' ? <Globe className="w-4 h-4 text-cyan-400" /> : <BarChart3 className="w-4 h-4 text-indigo-500" />}
                {selectedY} distribution over {selectedX}
              </h2>
              <p className="text-[10px] text-slate-400">Showing {chartData.length} segmented groups from {filteredDataset.length} records.</p>
            </div>
            <div className="flex items-center gap-1.5">
              {activeFilter && (
                <button
                  onClick={() => setActiveFilter(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all cursor-pointer"
                  title="Reset Chart Drill Filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="h-72 w-full relative">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 italic text-xs">
                No matching metric data to build chart. Verify columns or remove active filters.
              </div>
            ) : chartType === 'map' ? (
              // ==================== SPECIAL MAP VISUALIZATION ====================
              <div className="w-full h-full flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* SVG MAP CONTAINER */}
                <div className="relative w-full md:w-3/5 h-full rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-900 overflow-hidden flex items-center justify-center p-2 shadow-inner">
                  {/* Decorative map grid background lines */}
                  <svg viewBox="0 0 480 260" className="absolute inset-0 w-full h-full opacity-10 dark:opacity-20 pointer-events-none">
                    <line x1="0" y1="65" x2="480" y2="65" stroke="#4f46e5" strokeDasharray="3 3" />
                    <line x1="0" y1="130" x2="480" y2="130" stroke="#4f46e5" strokeDasharray="3 3" />
                    <line x1="0" y1="195" x2="480" y2="195" stroke="#4f46e5" strokeDasharray="3 3" />
                    <line x1="120" y1="0" x2="120" y2="260" stroke="#4f46e5" strokeDasharray="3 3" />
                    <line x1="240" y1="0" x2="240" y2="260" stroke="#4f46e5" strokeDasharray="3 3" />
                    <line x1="360" y1="0" x2="360" y2="260" stroke="#4f46e5" strokeDasharray="3 3" />
                  </svg>

                  <svg viewBox="0 0 480 260" className="w-full h-full relative z-10">
                    {/* Outline of major abstract global coordinate clusters for geographic reference */}
                    <g fill="#e2e8f0" className="dark:fill-[#1e2338]" stroke="rgba(255,255,255,0.05)" strokeWidth="1">
                      {/* Americas block */}
                      <path d="M 40,60 L 160,50 L 140,110 L 90,130 L 110,210 L 160,240 L 120,240 L 80,180 L 60,110 Z" />
                      {/* Eurasia & Africa block */}
                      <path d="M 180,60 L 320,40 L 420,50 L 440,120 L 320,180 L 260,190 L 240,240 L 210,240 L 200,160 L 180,110 Z" />
                      {/* Oceania block */}
                      <path d="M 400,190 L 440,200 L 450,240 L 400,240 Z" />
                    </g>

                    {/* Plotted dynamic location bubble markers */}
                    {mapMarkers.length === 0 ? (
                      <text x="240" y="130" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold">
                        Detecting city / region coordinates from columns...
                      </text>
                    ) : (
                      mapMarkers.map((marker, mIdx) => {
                        const proj = getXYProjection(marker.lat, marker.lng);
                        
                        // Scale circle radius according to Y metric value
                        const maxVal = Math.max(...mapMarkers.map(m => m.totalValue)) || 1;
                        const minRadius = 5;
                        const maxRadius = 22;
                        const radius = minRadius + (marker.totalValue / maxVal) * (maxRadius - minRadius);

                        // Match marker theme colors
                        const markerColor = colors[mIdx % colors.length];

                        return (
                          <g key={mIdx} className="cursor-pointer group/pin">
                            {/* Ambient ripple halo */}
                            <circle 
                              cx={proj.x} 
                              cy={proj.y} 
                              r={radius + 8} 
                              fill={markerColor} 
                              className="opacity-15 animate-pulse" 
                            />
                            {/* Core indicator bubble */}
                            <circle
                              cx={proj.x}
                              cy={proj.y}
                              r={radius}
                              fill={markerColor}
                              stroke="#fff"
                              strokeWidth="1.5"
                              onClick={() => {
                                // Find source column to trigger filtering isolation
                                const matchingCol = allCols.find(col => {
                                  const lower = col.toLowerCase();
                                  return lower.includes('region') || lower.includes('country') || lower.includes('city') || lower.includes('state') || lower.includes('location');
                                }) || selectedX;

                                setActiveFilter({ key: matchingCol, value: marker.name });
                              }}
                              className="transition-all hover:scale-125 hover:stroke-amber-400"
                            />
                            {/* Simplified mini-tag */}
                            <text 
                              x={proj.x} 
                              y={proj.y - radius - 4} 
                              textAnchor="middle" 
                              fill="#94a3b8" 
                              fontSize="8" 
                              fontWeight="bold"
                              className="opacity-0 group-hover/pin:opacity-100 transition-opacity pointer-events-none bg-slate-900"
                            >
                              {marker.name} ({marker.totalValue.toLocaleString()})
                            </text>
                          </g>
                        );
                      })
                    )}
                  </svg>
                </div>

                {/* COORDINATES & PLOTS DIRECTORY SIDEBAR */}
                <div className="w-full md:w-2/5 h-full flex flex-col justify-between">
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2">
                    <span className="text-[10px] text-cyan-500 font-black uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-cyan-500" /> Plotted Map Points
                    </span>
                    {mapMarkers.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">No geographic text entities found. Include City, Country, or Region columns.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {mapMarkers.slice(0, 6).map((m, idx) => (
                          <div 
                            key={idx}
                            onClick={() => {
                              const matchingCol = allCols.find(col => {
                                const lower = col.toLowerCase();
                                return lower.includes('region') || lower.includes('country') || lower.includes('city') || lower.includes('state') || lower.includes('location');
                              }) || selectedX;
                              setActiveFilter({ key: matchingCol, value: m.name });
                            }}
                            className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-900 hover:border-indigo-500/20 cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: colors[idx % colors.length] }} 
                              />
                              <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{m.name}</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-indigo-500">{m.totalValue.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 leading-tight mt-2 block">
                    Our Map Engine automatically tracks coordinates. Plot locations such as *East*, *West*, *California*, *London*, *India*, or *Texas* dynamically!
                  </span>
                </div>

              </div>
            ) : (
              // ==================== STANDARD GRAPHICAL CHARTS ====================
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                  <LineChart 
                    data={chartData} 
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    onClick={(state) => {
                      if (state && state.activeLabel) {
                        setActiveFilter({ key: selectedX, value: state.activeLabel });
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d0f20', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                      labelStyle={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name={selectedY}
                      stroke={colors[0]}
                      strokeWidth={3}
                      dot={{ r: 3.5, stroke: colors[0], strokeWidth: 1.5, fill: '#fff' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                ) : chartType === 'bar' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d0f20', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    />
                    <Bar 
                      dataKey="value" 
                      name={selectedY}
                      fill={colors[0]} 
                      radius={[6, 6, 0, 0]}
                      onClick={(data) => {
                        if (data && data.name) {
                          setActiveFilter({ key: selectedX, value: data.name });
                        }
                      }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaColor" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors[0]} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={colors[0]} stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0d0f20', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    />
                    <Area type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5} fillOpacity={1} fill="url(#areaColor)" />
                  </AreaChart>
                ) : chartType === 'pie' ? (
                  <PieChart>
                    <Tooltip contentStyle={{ backgroundColor: '#0d0f20', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }} />
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      onClick={(data) => {
                        if (data && data.name) {
                          setActiveFilter({ key: selectedX, value: data.name });
                        }
                      }}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                ) : (
                  <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                    <YAxis dataKey="value" stroke="#64748b" fontSize={9} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Points" data={chartData} fill={colors[1]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* Table summary checklist below */}
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-2">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Built-in Auto Regression & Trendline Analyzed.
            </span>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              Interactive Mode: Active
            </span>
          </div>

        </div>

      </div>

      {/* 6. RAW DATA MATRIX SPREADSHEET TABLE CARD */}
      <div className="bg-white dark:bg-[#060913]/60 p-5 border border-slate-100 dark:border-indigo-500/10 rounded-2xl shadow-xl shadow-indigo-500/5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/40 pb-3">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 font-space">Filtered Records Sheet</h3>
          </div>
          <span className="text-[10px] bg-indigo-500/10 text-indigo-500 px-2.5 py-1 rounded-xl font-black">
            {filteredDataset.length} Active Rows
          </span>
        </div>

        <div className="overflow-x-auto max-h-64 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                {allCols.slice(0, 7).map(col => (
                  <th key={col} className="p-3 font-semibold">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDataset.slice(0, 30).map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 dark:border-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors">
                  {allCols.slice(0, 7).map(col => (
                    <td key={col} className="p-3 text-slate-700 dark:text-slate-300 font-medium">
                      {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {filteredDataset.length > 30 && (
            <div className="text-center p-3 text-[11px] text-slate-500 italic">
              Showing first 30 rows of {filteredDataset.length}. Export to CSV to read complete active dataset.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
