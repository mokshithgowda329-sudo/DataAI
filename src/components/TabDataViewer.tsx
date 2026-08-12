import { useState, useMemo } from 'react';
import { Schema } from '../types';
import { DataEngine } from '../utils/dataEngine';
import { Search, Download, ChevronLeft, ChevronRight, Grid, HelpCircle } from 'lucide-react';

interface TabDataViewerProps {
  dataset: Record<string, any>[];
  schema: Schema;
}

export default function TabDataViewer({ dataset, schema }: TabDataViewerProps) {
  const columns = Object.keys(schema);

  // Search, Pagination, Sort states
  const [searchVal, setSearchVal] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'ASC' | 'DESC'>('ASC');

  const rowsPerPage = 12;

  // Process Search & Sorting
  const processedData = useMemo(() => {
    let data = [...dataset];

    // Filter
    if (searchVal.trim() !== '') {
      const q = searchVal.toLowerCase();
      data = data.filter(row => {
        return Object.values(row).some(val => 
          String(val || '').toLowerCase().includes(q)
        );
      });
    }

    // Sort
    if (sortCol) {
      data.sort((a, b) => {
        let valA = a[sortCol];
        let valB = b[sortCol];

        if (valA === undefined) valA = null;
        if (valB === undefined) valB = null;

        if (valA === valB) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;

        let res = 0;
        if (typeof valA === 'number' && typeof valB === 'number') {
          res = valA - valB;
        } else {
          res = String(valA).localeCompare(String(valB));
        }

        return sortDir === 'ASC' ? res : -res;
      });
    }

    return data;
  }, [dataset, searchVal, sortCol, sortDir]);

  // Page slice
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return processedData.slice(startIdx, startIdx + rowsPerPage);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / rowsPerPage) || 1;

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortCol(col);
      setSortDir('ASC');
    }
    setCurrentPage(1);
  };

  const handleExportCSV = () => {
    const cols = Object.keys(schema);
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Header
    csvContent += cols.map(c => `"${c}"`).join(",") + "\r\n";

    // Rows
    processedData.forEach(row => {
      const line = cols.map(col => {
        let val = row[col];
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(",");
      csvContent += line + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `dataai_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Search input */}
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchVal}
            onChange={(e) => { setSearchVal(e.target.value); setCurrentPage(1); }}
            placeholder="Search records across all attributes..."
            className="w-full glass-input pl-10 pr-4 py-2.5 text-sm"
          />
        </div>

        {/* CSV export */}
        <button
          onClick={handleExportCSV}
          disabled={dataset.length === 0}
          className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 disabled:opacity-30 border border-slate-700 shadow-md text-slate-100 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-cyan-400" /> Export Filtered CSV
        </button>
      </div>

      {/* Grid Data representation table */}
      <div className="glass-panel p-6 border-slate-800 shadow-lg flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold font-header text-slate-100 flex items-center gap-2.5 mb-5 border-b border-slate-800 pb-3">
            <Grid className="w-5 h-5 text-cyan-400 animate-pulse" /> Compiled Dataset Viewer
          </h3>

          <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/25">
            <table className="w-full text-left text-xs border-collapse font-sans">
              <thead>
                <tr className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
                  {columns.map(col => {
                    const isSorted = sortCol === col;
                    const arrow = isSorted ? (sortDir === 'ASC' ? ' ▴' : ' ▾') : '';
                    return (
                      <th
                        key={col}
                        onClick={() => handleSort(col)}
                        className="p-3 whitespace-nowrap cursor-pointer hover:bg-slate-900/40 select-none font-semibold transition-all"
                      >
                        {col}{arrow}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedData.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="p-8 text-center text-slate-500 text-xs italic">
                      No matching records found. Refine your query.
                    </td>
                  </tr>
                ) : (
                  paginatedData.map((row, i) => (
                    <tr key={i} className="border-b border-slate-900/30 hover:bg-slate-900/15 transition-all text-slate-300">
                      {columns.map(col => {
                        const val = row[col];
                        return (
                          <td key={col} className="p-3">
                            {val === null || val === undefined ? (
                              <span className="text-slate-600 italic font-medium">NULL</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamic Pagination Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4 pt-4 border-t border-slate-900">
          <button
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 border border-slate-700/60 hover:bg-slate-750 disabled:opacity-20 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          
          <span className="text-xs text-slate-400 font-medium">
            Page <strong className="text-slate-100">{currentPage}</strong> of <strong className="text-slate-100">{totalPages}</strong> ({processedData.length} matches)
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="w-full sm:w-auto px-4 py-2 bg-slate-800 border border-slate-700/60 hover:bg-slate-750 disabled:opacity-20 text-slate-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
