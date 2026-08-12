import { useState, useMemo } from 'react';
import { Schema } from '../types';
import { DataEngine } from '../utils/dataEngine';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Sparkles, Calendar, TrendingUp, Cpu, Table, Info } from 'lucide-react';

interface TabPredictionsProps {
  dataset: Record<string, any>[];
  schema: Schema;
}

export default function TabPredictions({ dataset, schema }: TabPredictionsProps) {
  const allCols = Object.keys(schema);
  const numericCols = allCols.filter(col => schema[col].type === 'numeric');

  // Input states
  const [xCol, setXCol] = useState<string>(allCols[0] || '');
  const [yCol, setYCol] = useState<string>(numericCols[0] || '');
  const [forecastSteps, setForecastSteps] = useState<number>(5);

  // Compute Linear Regression Modeling
  const regression = useMemo(() => {
    if (!xCol || !yCol) return null;
    return DataEngine.fitLinearRegression(dataset, xCol, yCol, forecastSteps);
  }, [dataset, xCol, yCol, forecastSteps]);

  // Combine actual and forecasted results for Recharts Line Rendering
  const combinedChartData = useMemo(() => {
    if (!regression) return [];

    const fitted = regression.fittedPoints.map(p => ({
      name: String(p.x || ''),
      Actual: p.actual,
      'Fitted Trend': p.predicted
    }));

    const forecast = regression.forecastPoints.map(p => ({
      name: String(p.x || ''),
      Actual: null,
      'Forecast Prediction': p.predicted,
      'Fitted Trend': p.predicted
    }));

    return [...fitted, ...forecast];
  }, [regression]);

  return (
    <div className="space-y-6">
      {/* Parameter inputs */}
      <div className="glass-panel p-5 grid grid-cols-1 md:grid-cols-3 gap-5 border-slate-800">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" /> Time Axis (Independent X)
          </label>
          <select
            value={xCol}
            onChange={(e) => setXCol(e.target.value)}
            className="glass-input px-3 py-2.5 text-sm"
          >
            {allCols.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-purple-400" /> Target Variable (Dependent Y)
          </label>
          <select
            value={yCol}
            onChange={(e) => setYCol(e.target.value)}
            className="glass-input px-3 py-2.5 text-sm"
          >
            {numericCols.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" /> Future Horizon (Periods)
            </label>
            <span className="text-xs font-bold text-cyan-400">{forecastSteps} steps</span>
          </div>
          <input
            type="range"
            min="1"
            max="15"
            value={forecastSteps}
            onChange={(e) => setForecastSteps(parseInt(e.target.value))}
            className="w-full accent-cyan-400 bg-slate-900 rounded-lg cursor-pointer h-2 mt-2.5"
          />
        </div>
      </div>

      {/* Modeling Coefficients Cards */}
      {regression ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="glass-panel p-5 border-slate-800">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Directional Trend</span>
            <h4 className={`text-2xl font-extrabold font-header mt-1 ${regression.slope > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {regression.slope > 0 ? '↗ Upward Growth' : '↘ Downward Decay'}
            </h4>
            <p className="text-[10px] text-slate-500 mt-1">Slope value: {regression.slope}</p>
          </div>

          <div className="glass-panel p-5 border-slate-800">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Slope Ratio (m)</span>
            <h4 className="text-2xl font-extrabold font-header mt-1 text-slate-100">
              {regression.slope} / period
            </h4>
            <p className="text-[10px] text-slate-500 mt-1">Mathematical delta coefficient</p>
          </div>

          <div className="glass-panel p-5 border-slate-800">
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Accuracy (R² Score)</span>
            <h4 className="text-2xl font-extrabold font-header mt-1 text-slate-100">
              {(regression.r2 * 100).toFixed(1)}%
            </h4>
            <p className="text-[10px] text-slate-500 mt-1">Goodness-of-fit coefficient</p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-red-500/10 border border-red-500/10 text-red-400 text-xs rounded-xl flex items-center gap-2">
          Insufficient data values available to fit linear regression models.
        </div>
      )}

      {/* Trend forecast charting */}
      {regression && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Chart (8 cols) */}
          <div className="lg:col-span-8 glass-panel p-6 border-slate-800 flex flex-col justify-between">
            <h3 className="text-lg font-bold font-header text-slate-100 flex items-center gap-2 mb-6">
              <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" /> Fit Linear Regression Predictions
            </h3>

            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combinedChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={11} tickLine={false} />
                  <YAxis stroke="#6b7280" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0d0f20', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {/* Actual Values */}
                  <Line 
                    type="monotone" 
                    dataKey="Actual" 
                    stroke="#a855f7" 
                    strokeWidth={0}
                    dot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }}
                    legendType="circle"
                  />
                  {/* Fitted Trend */}
                  <Line 
                    type="monotone" 
                    dataKey="Fitted Trend" 
                    stroke="#06b6d4" 
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                  {/* Forecast Line */}
                  <Line 
                    type="monotone" 
                    dataKey="Forecast Prediction" 
                    stroke="#f43f5e" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Table (4 cols) */}
          <div className="lg:col-span-4 glass-panel p-6 border-slate-800 flex flex-col justify-between">
            <div>
              <h3 className="text-lg font-bold font-header text-slate-100 flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <Table className="w-5 h-5 text-rose-400" /> Forecast Data Table
              </h3>

              <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/25 max-h-80 scrollbar-custom">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                      <th className="p-3">Period</th>
                      <th className="p-3">Predicted {yCol}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {regression.forecastPoints.map((p, i) => (
                      <tr key={i} className="border-b border-slate-900 hover:bg-slate-900/10">
                        <td className="p-3 font-semibold text-slate-400">{p.x}</td>
                        <td className="p-3 font-bold text-slate-200">
                          {DataEngine.formatNumber(p.predicted)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 mt-4 text-[10px] text-slate-400 flex gap-1.5 leading-relaxed">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Predictions are mapped through ordinary least squares (OLS) linear regressions, displaying a projected growth/decay trend line.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
