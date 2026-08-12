import { useState } from 'react';
import { Schema } from '../types';
import { DataEngine } from '../utils/dataEngine';
import { Play, Terminal, HelpCircle, Columns, CheckCircle, AlertCircle, Database } from 'lucide-react';

interface TabSQLProps {
  dataset: Record<string, any>[];
  schema: Schema;
  onLogActivity: (action: string, details: string) => void;
}

export default function TabSQL({ dataset, schema, onLogActivity }: TabSQLProps) {
  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM dataset LIMIT 10');
  const [results, setResults] = useState<Record<string, any>[]>([]);
  
  // Console logs state
  const [logMessage, setLogMessage] = useState<string>('Console idle. Enter standard SQL SELECT query to compile.');
  const [logType, setLogType] = useState<'info' | 'success' | 'error'>('info');

  const handleRunSQL = () => {
    try {
      setLogType('info');
      setLogMessage('Compiling query execution plan...');

      const start = performance.now();
      const output = DataEngine.executeSQLQuery(sqlQuery, dataset);
      const end = performance.now();

      setResults(output);
      setLogType('success');
      setLogMessage(`Query executed successfully in ${(end - start).toFixed(2)}ms. Returned ${output.length} rows.`);
      
      // Log auditable event
      onLogActivity('SQL_EXECUTE', `User executed SQL query: "${sqlQuery}" and received ${output.length} rows.`);
    } catch (err: any) {
      setLogType('error');
      setLogMessage(`SQL Parse Error: ${err.message}`);
      setResults([]);
    }
  };

  const getLogClasses = () => {
    switch (logType) {
      case 'success': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'error': return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      default: return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400';
    }
  };

  const renderResultsTable = () => {
    if (results.length === 0) {
      return (
        <div className="p-8 text-center text-slate-500 text-xs italic">
          No records or empty table returned. Run a valid SELECT query.
        </div>
      );
    }

    const columns = Object.keys(results[0]);

    return (
      <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/25 max-h-96 scrollbar-custom">
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
              {columns.map(col => (
                <th key={col} className="p-3 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row, i) => (
              <tr key={i} className="border-b border-slate-900/40 hover:bg-slate-900/10 transition-all">
                {columns.map(col => {
                  const val = row[col];
                  return (
                    <td key={col} className="p-3 text-slate-300">
                      {val === null || val === undefined ? (
                        <span className="text-slate-600 italic">NULL</span>
                      ) : (
                        String(val)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* SQL Workspace Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Schema Column side map (4 cols) */}
        <div className="lg:col-span-4 glass-panel p-5 border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold font-header flex items-center gap-2 text-slate-100 mb-4 border-b border-slate-800 pb-2.5">
              <Database className="w-4 h-4 text-purple-400" /> Active Schema Map
            </h3>

            <div className="overflow-y-auto max-h-80 scrollbar-custom space-y-2 pr-1">
              {Object.entries(schema).map(([col, meta]) => (
                <div key={col} className="flex justify-between items-center p-2 bg-slate-950/40 rounded-lg border border-slate-900/80">
                  <span className="text-xs font-mono font-bold text-slate-300">{col}</span>
                  <span className={`px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded border ${
                    meta.type === 'numeric' ? 'bg-cyan-500/10 border-cyan-500/15 text-cyan-400' :
                    meta.type === 'temporal' ? 'bg-purple-500/10 border-purple-500/15 text-purple-400' :
                    meta.type === 'categorical' ? 'bg-emerald-500/10 border-emerald-500/15 text-emerald-400' :
                    'bg-slate-500/10 border-slate-500/15 text-slate-400'
                  }`}>
                    {meta.type}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl mt-4 text-[10px] text-slate-400 leading-relaxed flex gap-1.5">
            <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Support: SUM(col), AVG(col), COUNT(*), GROUP BY, WHERE [=, !=, LIKE %, &gt;, &lt;], ORDER BY, LIMIT.</span>
          </div>
        </div>

        {/* Console Text Editor (8 cols) */}
        <div className="lg:col-span-8 glass-panel p-5 border-slate-800 flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold font-header flex items-center gap-2 text-slate-100">
                <Terminal className="w-4 h-4 text-cyan-400 animate-pulse" /> SQL Query Compiler Console
              </h3>
              <button
                onClick={handleRunSQL}
                className="px-4 py-1.5 bg-gradient-to-r from-purple-600 to-cyan-500 hover:shadow-cyan-500/10 active:scale-95 text-xs font-semibold rounded-lg flex items-center gap-1.5 text-white transition-all shadow-md"
              >
                <Play className="w-3 h-3 fill-white" /> Execute Plan
              </button>
            </div>

            <textarea
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full h-40 bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono text-sm text-cyan-400 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20 resize-none shadow-inner"
              placeholder="SELECT * FROM dataset"
            />
          </div>

          {/* Console logger */}
          <div className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 font-mono ${getLogClasses()}`}>
            {logType === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : logType === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0" />
            ) : (
              <Terminal className="w-4 h-4 shrink-0 animate-pulse" />
            )}
            <span className="break-all">{logMessage}</span>
          </div>
        </div>
      </div>

      {/* SQL Results Set Card */}
      <div className="glass-panel p-6 border-slate-800 shadow-md">
        <h3 className="text-lg font-bold font-header text-slate-100 mb-4 flex items-center gap-2">
          <Columns className="w-5 h-5 text-purple-400" /> Compiled Results Set ({results.length} rows)
        </h3>
        {renderResultsTable()}
      </div>
    </div>
  );
}
