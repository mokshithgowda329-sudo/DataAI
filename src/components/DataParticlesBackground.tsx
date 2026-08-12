import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

interface DataCell {
  id: number;
  type: 'binary' | 'metric' | 'node' | 'sparkline' | 'operator';
  text?: string;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
}

export default function DataParticlesBackground() {
  const [cells, setCells] = useState<DataCell[]>([]);

  useEffect(() => {
    // Generate randomized data particles for background ambiance
    const types: DataCell['type'][] = ['binary', 'metric', 'node', 'sparkline', 'operator'];
    const binaryValues = ['01', '10', '1101', '0x2F', 'DATA', 'AI', 'MATRIX', 'SQL', 'DB'];
    const metricLabels = ['AVG', 'SUM', 'MAX', 'STD', 'VAR', 'CORR', 'DEV', 'ACC: 99.4%'];
    const operators = ['∑', 'σ', 'μ', 'Δ', '∫', '≈', '≠', 'λ'];

    const newCells: DataCell[] = Array.from({ length: 30 }).map((_, i) => {
      const type = types[i % types.length];
      let text = '';
      if (type === 'binary') {
        text = binaryValues[Math.floor(Math.random() * binaryValues.length)];
      } else if (type === 'metric') {
        text = metricLabels[Math.floor(Math.random() * metricLabels.length)];
      } else if (type === 'operator') {
        text = operators[Math.floor(Math.random() * operators.length)];
      }

      return {
        id: i,
        type,
        text,
        x: Math.random() * 100, // percentage x
        y: Math.random() * 100, // percentage y
        size: Math.random() * (type === 'sparkline' ? 40 : 16) + 8,
        duration: Math.random() * 25 + 15, // seconds
        delay: Math.random() * -20 // negative delay for immediate starts
      };
    });

    setCells(newCells);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* Mesh grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" 
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(99, 102, 241) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(99, 102, 241) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      {/* Floating data elements */}
      {cells.map((cell) => {
        return (
          <motion.div
            key={cell.id}
            initial={{ 
              x: `${cell.x}vw`, 
              y: `${cell.y}vh`, 
              opacity: 0,
              scale: 0.8
            }}
            animate={{
              y: [`${cell.y}vh`, `${(cell.y + 15) % 100}vh`, `${cell.y}vh`],
              x: [`${cell.x}vw`, `${(cell.x + 10) % 100}vw`, `${cell.x}vw`],
              opacity: [0.1, 0.45, 0.1],
              scale: [0.9, 1.1, 0.9]
            }}
            transition={{
              duration: cell.duration,
              delay: cell.delay,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              position: 'absolute',
              fontFamily: 'monospace',
              fontSize: `${cell.size}px`,
            }}
            className="text-slate-400/35 dark:text-slate-500/25 flex items-center gap-1.5"
          >
            {cell.type === 'binary' && (
              <span className="font-mono bg-indigo-500/5 dark:bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/5 text-cyan-500/30 dark:text-cyan-400/25 font-bold tracking-wider">
                {cell.text}
              </span>
            )}

            {cell.type === 'metric' && (
              <span className="font-mono text-[10px] tracking-widest text-purple-500/30 dark:text-purple-400/25 font-semibold bg-purple-500/5 dark:bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/5">
                {cell.text}
              </span>
            )}

            {cell.type === 'operator' && (
              <span className="font-serif text-lg text-emerald-500/30 dark:text-emerald-400/25 font-extrabold animate-pulse">
                {cell.text}
              </span>
            )}

            {cell.type === 'node' && (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/30 dark:bg-cyan-400/20 animate-ping" />
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/40 dark:bg-cyan-500/25" />
              </div>
            )}

            {cell.type === 'sparkline' && (
              <svg className="w-12 h-6 text-indigo-500/30 dark:text-indigo-400/25 opacity-70" viewBox="0 0 40 20" fill="none">
                <motion.path
                  d="M0 15 L8 5 L16 12 L24 3 L32 17 L40 8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              </svg>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
