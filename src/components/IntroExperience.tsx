import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  ChevronRight, 
  Database, 
  Layers, 
  Cpu, 
  LineChart, 
  Zap 
} from 'lucide-react';

interface IntroExperienceProps {
  onComplete: () => void;
}

export default function IntroExperience({ onComplete }: IntroExperienceProps) {
  const [loadingText, setLoadingText] = useState('BOOTING SYSTEM CORE...');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [phase, setPhase] = useState<'initialize' | 'synthesize' | 'visualize' | 'reveal'>('initialize');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Phase times
  // Total duration: ~7.5 seconds
  // Phase 1 (initialize): 0s - 1.8s
  // Phase 2 (synthesize): 1.8s - 3.8s
  // Phase 3 (visualize): 3.8s - 5.5s
  // Phase 4 (reveal): 5.5s - 7.5s

  useEffect(() => {
    // 1. Progress Simulation
    const progressInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        // Speed up progression over time
        const increment = Math.max(1, Math.floor(Math.random() * 4) + 1);
        return Math.min(100, prev + increment);
      });
    }, 60);

    // 2. Timeline States
    const tInitialize = setTimeout(() => {
      setLoadingText('MAPPING NEURAL DATA STREAM...');
      setPhase('initialize');
    }, 0);

    const tSynthesize = setTimeout(() => {
      setLoadingText('SYNTHESIZING PREDICTIVE ALGORITHMS...');
      setPhase('synthesize');
    }, 1800);

    const tVisualize = setTimeout(() => {
      setLoadingText('COMPILING GRAPHICAL INTERACTIVE CHANNELS...');
      setPhase('visualize');
    }, 3800);

    const tReveal = setTimeout(() => {
      setLoadingText('DATAAI SYSTEM DEPLOYED ONLINE.');
      setPhase('reveal');
    }, 5500);

    const tComplete = setTimeout(() => {
      handleSkip();
    }, 7800);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(tInitialize);
      clearTimeout(tSynthesize);
      clearTimeout(tVisualize);
      clearTimeout(tReveal);
      clearTimeout(tComplete);
    };
  }, []);

  // 3. Canvas Simulation (60 FPS particles, neural networks, and live charting)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Handle resizing
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate nodes for the neural network phase
    const nodeCount = 55;
    const nodes: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      pulse: number;
      pulseSpeed: number;
    }[] = [];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        radius: Math.random() * 2.5 + 1.5,
        color: Math.random() > 0.4 ? '#6366f1' : '#06b6d4',
        pulse: Math.random() * Math.PI,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      });
    }

    // Generate static digital chart nodes
    const chartBars: { x: number; targetH: number; currH: number; w: number; color: string }[] = [];
    const barCount = 20;
    const barSpacing = Math.min(30, width / barCount);
    for (let i = 0; i < barCount; i++) {
      chartBars.push({
        x: width / 2 - (barCount * barSpacing) / 2 + i * barSpacing,
        targetH: 40 + Math.random() * 120,
        currH: 0,
        w: 12,
        color: i % 2 === 0 ? 'rgba(99, 102, 241, 0.4)' : 'rgba(6, 182, 212, 0.4)',
      });
    }

    // Floating data packets
    const dataPackets: { x: number; y: number; val: string; speed: number; opacity: number }[] = [];
    const packetStrings = ['AI_COGNITION: active', 'DATA_INDEX_99%', 'REGRESSION_WEIGHT: 0.941', 'GEMINI_MODELS: ok', 'PREDICTIONS: 99.4%', 'FORECAST_STEP_5', 'UTC_SYNC', 'MATRIX_STABLE'];
    
    // Fill initial packets
    for (let i = 0; i < 6; i++) {
      dataPackets.push({
        x: Math.random() * width,
        y: height - 100 - Math.random() * 150,
        val: packetStrings[Math.floor(Math.random() * packetStrings.length)],
        speed: 0.5 + Math.random() * 0.8,
        opacity: Math.random() * 0.7 + 0.3,
      });
    }

    let sineOffset = 0;

    // Animation Loop
    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Deep dark futuristic background gradient
      const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width);
      bgGrad.addColorStop(0, '#040713');
      bgGrad.addColorStop(0.5, '#02040a');
      bgGrad.addColorStop(1, '#010204');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Atmospheric glowing core blurs
      // Deep Indigo
      const gradCore1 = ctx.createRadialGradient(width * 0.3, height * 0.4, 0, width * 0.3, height * 0.4, width * 0.35);
      gradCore1.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
      gradCore1.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradCore1;
      ctx.fillRect(0, 0, width, height);

      // Deep Cyan
      const gradCore2 = ctx.createRadialGradient(width * 0.7, height * 0.6, 0, width * 0.7, height * 0.6, width * 0.35);
      gradCore2.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      gradCore2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradCore2;
      ctx.fillRect(0, 0, width, height);

      // Current Phase logic
      // Phase 1: Initialize (Neural Network and code lines)
      // Phase 2: Synthesize (Connective neural nets flashing brightly)
      // Phase 3: Visualize (Charts and matrices pulsing)
      // Phase 4: Reveal (Clean atmospheric stars drifting)

      if (phase === 'initialize' || phase === 'synthesize') {
        // Draw Neural Network Nodes & Links
        nodes.forEach((node, idx) => {
          // Update physics
          node.x += node.vx;
          node.y += node.vy;

          // Bounce boundaries
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;

          node.pulse += node.pulseSpeed;
          const currentRadius = node.radius + Math.sin(node.pulse) * 0.6;

          // Draw node glow
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius * 3, 0, Math.PI * 2);
          ctx.fillStyle = node.color === '#6366f1' ? 'rgba(99, 102, 241, 0.08)' : 'rgba(6, 182, 212, 0.08)';
          ctx.fill();

          // Draw node solid center
          ctx.beginPath();
          ctx.arc(node.x, node.y, currentRadius, 0, Math.PI * 2);
          ctx.fillStyle = node.color;
          ctx.fill();

          // Draw links
          for (let j = idx + 1; j < nodes.length; j++) {
            const node2 = nodes[j];
            const dist = Math.hypot(node.x - node2.x, node.y - node2.y);
            const maxDist = 130;

            if (dist < maxDist) {
              const alpha = (1 - dist / maxDist) * (phase === 'synthesize' ? 0.35 : 0.18);
              ctx.beginPath();
              ctx.moveTo(node.x, node.y);
              ctx.lineTo(node2.x, node2.y);
              
              const linkGrad = ctx.createLinearGradient(node.x, node.y, node2.x, node2.y);
              linkGrad.addColorStop(0, node.color === '#6366f1' ? `rgba(99, 102, 241, ${alpha})` : `rgba(6, 182, 212, ${alpha})`);
              linkGrad.addColorStop(1, node2.color === '#6366f1' ? `rgba(99, 102, 241, ${alpha})` : `rgba(6, 182, 212, ${alpha})`);
              
              ctx.strokeStyle = linkGrad;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        });
      }

      if (phase === 'synthesize' || phase === 'visualize') {
        // Draw rotating digital telemetry ring in the background
        ctx.save();
        ctx.translate(width / 2, height / 2);
        sineOffset += 0.005;
        ctx.rotate(sineOffset * 0.5);

        // Circular dash rings
        ctx.beginPath();
        ctx.arc(0, 0, 180, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.06)';
        ctx.setLineDash([20, 15]);
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, 240, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
        ctx.setLineDash([10, 30, 40, 15]);
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      }

      if (phase === 'visualize') {
        // Render glowing interactive database charts and neural sine waves
        // 1. Neon Sine-Wave (Dynamic Forecast Trendline)
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 10;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
        ctx.setLineDash([]);
        
        sineOffset += 0.06;
        for (let x = 0; x < width; x += 5) {
          const y = height / 2 + Math.sin(x * 0.004 + sineOffset) * 60 + Math.cos(x * 0.002) * 20;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow

        // 2. Animated Histogram Blocks rising from the floor
        chartBars.forEach((bar) => {
          // Slowly interpolate current height to target height
          bar.currH += (bar.targetH - bar.currH) * 0.06;
          
          // Draw bar glow
          ctx.fillStyle = bar.color;
          ctx.fillRect(bar.x, height / 2 - bar.currH / 2, bar.w, bar.currH);

          // Top node of each bar
          ctx.beginPath();
          ctx.arc(bar.x + bar.w / 2, height / 2 - bar.currH / 2, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#6366f1';
          ctx.fill();
        });

        // 3. Floating live telemetry metrics
        dataPackets.forEach((p) => {
          p.y -= p.speed;
          if (p.y < height / 2 - 200) {
            p.y = height - 100 - Math.random() * 100;
            p.x = Math.random() * width;
            p.val = packetStrings[Math.floor(Math.random() * packetStrings.length)];
          }

          ctx.fillStyle = `rgba(165, 180, 252, ${p.opacity * 0.5})`;
          ctx.font = '10px monospace';
          ctx.fillText(p.val, p.x, p.y);

          // Subtle coordinate line pointing down
          ctx.beginPath();
          ctx.moveTo(p.x, p.y + 6);
          ctx.lineTo(p.x, p.y + 25);
          ctx.strokeStyle = `rgba(99, 102, 241, ${p.opacity * 0.25})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        });
      }

      if (phase === 'reveal') {
        // Drift simple, high-contrast star coordinates (representing final static database nodes)
        nodes.slice(0, 25).forEach((node) => {
          node.x += node.vx * 0.3;
          node.y += node.vy * 0.3;

          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius * 0.6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.fill();
        });
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [phase]);

  const handleSkip = () => {
    // Record that the user has viewed the intro, preventing it in the future
    localStorage.setItem('dataai_intro_seen', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#02040a] text-white flex flex-col justify-between p-8 select-none font-sans">
      
      {/* Background Live Canvas Simulation */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Cybernetic HUD Grid Lines */}
      <div className="absolute inset-0 bg-cyber-grid opacity-10 pointer-events-none" />

      {/* Header telemetry info */}
      <div className="relative z-10 w-full flex justify-between items-start">
        <div className="flex items-center gap-2.5 font-mono text-[9px] tracking-widest text-slate-500">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping" />
          <span>SYS_BOOT: SYSTEM_ONLINE</span>
          <span className="text-slate-700">|</span>
          <span>LOCATION: ASIA-SEOUL-GCP</span>
        </div>

        {/* Cinematic Skip button */}
        <motion.button
          whileHover={{ scale: 1.05, borderColor: 'rgba(99, 102, 241, 0.4)' }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSkip}
          className="px-4 py-2 font-mono text-xs font-bold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-black/40 backdrop-blur-md"
        >
          <span>SKIP OVERVIEW</span>
          <ChevronRight className="w-4 h-4 text-cyan-400" />
        </motion.button>
      </div>

      {/* Center Cinematic Display */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center max-w-4xl mx-auto w-full px-4">
        <AnimatePresence mode="wait">
          
          {/* Phase 1 & 2: System Calibration / Deep Learning Synthesis */}
          {(phase === 'initialize' || phase === 'synthesize') && (
            <motion.div
              key="initialize"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-mono tracking-widest uppercase">
                <Cpu className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                <span>AI Neural Cognitive Kernel Initiated</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-black font-space tracking-tight text-white leading-tight">
                Synthesizing High-Speed <br />
                <span className="text-gradient-purple-cyan">Predictive Algorithms</span>
              </h2>

              <p className="text-slate-400 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
                Interrogating historic datasets, calculating multidimensional regression slopes, and parsing narrative summaries automatically.
              </p>
            </motion.div>
          )}

          {/* Phase 3: Interactive Dashboard Compilation */}
          {phase === 'visualize' && (
            <motion.div
              key="visualize"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full text-[10px] font-mono tracking-widest uppercase">
                <LineChart className="w-3.5 h-3.5 text-cyan-400" />
                <span>Interactive Chart Builder Compiling</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-black font-space tracking-tight text-white leading-tight">
                Visualizing Sliced <br />
                <span className="text-gradient-cyan-purple">Relational Dimensions</span>
              </h2>

              <p className="text-slate-400 text-xs md:text-sm max-w-lg mx-auto leading-relaxed">
                Deploying interactive scatter coordinates, box plot dispersion matrices, pivot grids, and forecasting vectors.
              </p>
            </motion.div>
          )}

          {/* Phase 4: Big Logo Reveal */}
          {phase === 'reveal' && (
            <motion.div
              key="reveal"
              initial={{ opacity: 0, scale: 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="space-y-6 flex flex-col items-center"
            >
              {/* Massive Glowing Logo Badge */}
              <motion.div
                initial={{ rotate: -20, scale: 0.8, opacity: 0 }}
                animate={{ rotate: 0, scale: 1, opacity: 1 }}
                transition={{ type: 'spring', damping: 15, delay: 0.1 }}
                className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 border border-white/20 relative"
              >
                {/* Outward pulsing circles */}
                <span className="absolute inset-0 rounded-3xl bg-indigo-500/20 animate-ping pointer-events-none" />
                <Database className="w-12 h-12 text-white" />
              </motion.div>

              <div className="space-y-2">
                <motion.h1
                  initial={{ letterSpacing: '0.1em', opacity: 0 }}
                  animate={{ letterSpacing: '0.2em', opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="text-4xl md:text-6xl font-black tracking-widest font-header text-gradient-purple-cyan uppercase"
                >
                  DataAI
                </motion.h1>
                
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  className="text-indigo-300 dark:text-cyan-300 font-bold uppercase tracking-widest text-[11px] font-mono"
                >
                  Transform Your Data into Intelligent Insights
                </motion.p>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="text-slate-400 text-xs max-w-sm leading-relaxed"
              >
                Connecting you securely to SSO portals. Prepare to manipulate charts, build executive matrices, and query AI.
              </motion.p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer Progress telemetry */}
      <div className="relative z-10 w-full max-w-2xl mx-auto space-y-4">
        
        {/* Progress percent display and text */}
        <div className="flex justify-between items-end font-mono text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-indigo-400 animate-bounce" />
            <span className="font-semibold text-slate-300 uppercase">{loadingText}</span>
          </div>
          <span className="font-black text-cyan-400">{loadingProgress}%</span>
        </div>

        {/* Progress Bar Container */}
        <div className="h-1.5 w-full bg-white/5 border border-white/10 rounded-full overflow-hidden p-0.5 backdrop-blur-md">
          <motion.div
            layout
            className="h-full bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-400 rounded-full shadow-lg shadow-indigo-500/50"
            animate={{ width: `${loadingProgress}%` }}
            transition={{ ease: 'easeOut', duration: 0.2 }}
          />
        </div>


      </div>

    </div>
  );
}
