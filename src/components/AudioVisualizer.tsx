import { useEffect, useRef, useState } from 'react';
import { audio } from '../utils/audioEngine';
import { Activity, BarChart2, CircleDot, RefreshCw, Terminal } from 'lucide-react';

type VisMode = 'waves' | 'bars' | 'circular' | 'matrix';

export default function AudioVisualizer() {
  const [mode, setMode] = useState<VisMode>('bars');
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const matrixColumnsRef = useRef<number[]>([]);

  useEffect(() => {
    const handleCycleVisualizer = () => {
      setMode(prev => {
        const next = prev === 'bars' ? 'waves' : prev === 'waves' ? 'circular' : prev === 'circular' ? 'matrix' : 'bars';
        audio.visualizerMode = next;
        return next;
      });
    };

    const handleSessionLoaded = () => {
      if (audio.visualizerMode === 'waves' || audio.visualizerMode === 'bars' || audio.visualizerMode === 'circular' || audio.visualizerMode === 'matrix') {
        setMode(audio.visualizerMode);
      }
    };

    window.addEventListener('cycle-visualizer-mode', handleCycleVisualizer);
    window.addEventListener('session-loaded', handleSessionLoaded);
    return () => {
      window.removeEventListener('cycle-visualizer-mode', handleCycleVisualizer);
      window.removeEventListener('session-loaded', handleSessionLoaded);
    };
  }, []);

  // Resize canvas to match its visible container elegantly
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    
    const handleResize = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      // Account for high DPI displays beautifully
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    const observer = new ResizeObserver(() => handleResize());
    observer.observe(containerRef.current);
    
    // Initial resize trigger
    handleResize();

    return () => {
      observer.disconnect();
    };
  }, []);

  // Main high-frame render loop driving canvas pixel states
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);

      // Clean canvas with a subtle black tracer alpha tail for smooth motion trails
      ctx.fillStyle = mode === 'matrix' ? 'rgba(8, 8, 10, 0.22)' : 'rgba(10, 10, 10, 0.18)';
      ctx.fillRect(0, 0, w, h);

      if (mode !== 'matrix') {
        // Draw horizontal reference retro grid lines only for geometric visualizers
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.02)';
        ctx.lineWidth = 1;
        for (let i = 0; i < h; i += 20) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(w, i);
          ctx.stroke();
        }
        for (let j = 0; j < w; j += 40) {
          ctx.beginPath();
          ctx.moveTo(j, 0);
          ctx.lineTo(j, h);
          ctx.stroke();
        }
      }

      if (audio.ctx && audio.analyzer) {
        const bufferLength = audio.analyzer.frequencyBinCount;
        const binCount = Math.min(bufferLength, 128); // Keep processing light
        const dataArray = new Uint8Array(bufferLength);

        if (mode === 'waves') {
          // --- TIME DOMAIN (OSCILLOSCOPE WAVES) ---
          audio.analyzer.getByteTimeDomainData(dataArray);

          ctx.strokeStyle = '#f97316'; // Neon orange
          ctx.shadowColor = 'rgba(249, 115, 22, 0.5)';
          ctx.shadowBlur = 12;
          ctx.lineWidth = 2.5;
          ctx.beginPath();

          const sliceWidth = w / binCount;
          let x = 0;

          for (let i = 0; i < binCount; i++) {
            // value scale normalized around center of height
            const v = dataArray[i] / 128.0;
            const y = (v * h) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }

            x += sliceWidth;
          }

          ctx.lineTo(w, h / 2);
          ctx.stroke();
          ctx.shadowBlur = 0; // Reset shadows

        } else if (mode === 'bars') {
          // --- FREQUENCY BARS ---
          audio.analyzer.getByteFrequencyData(dataArray);

          const barWidth = (w / binCount) * 1.1;
          let x = 0;

          // Multi-color spectrum matching deck themes
          for (let i = 0; i < binCount; i++) {
            const barHeight = (dataArray[i] / 255) * h * 0.85;

            // Gradient selection matching neon green, orange and cyan
            const percent = i / binCount;
            let color = 'rgba(6, 182, 212, 0.85)'; // Cyan
            if (percent > 0.6) {
              color = 'rgba(249, 115, 22, 0.85)'; // Orange
            } else if (percent > 0.3) {
              color = 'rgba(16, 185, 129, 0.85)'; // Green
            }

            ctx.fillStyle = color;
            ctx.fillRect(x, h - barHeight, barWidth - 1.5, barHeight);

            x += barWidth;
          }

        } else if (mode === 'circular') {
          // --- CONCENTRIC PULSE SPINDLE ---
          audio.analyzer.getByteFrequencyData(dataArray);

          // Get primary bass frequency average to drive raw diameter scale
          let bassAvg = 0;
          for (let i = 0; i < 8; i++) {
            bassAvg += dataArray[i];
          }
          bassAvg = bassAvg / 8 / 255.0; // 0.0 -> 1.0

          const centerX = w / 2;
          const centerY = h / 2;
          const baseRadius = Math.min(w, h) * 0.15;
          const extraRadius = bassAvg * baseRadius * 1.5;
          const finalRadius = baseRadius + extraRadius;

          // Draw neon pulsing rings with subtle shadow offsets
          ctx.shadowColor = 'rgba(6, 182, 212, 0.4)';
          ctx.shadowBlur = 10;
          
          ctx.strokeStyle = 'rgba(6, 182, 212, 0.7)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(centerX, centerY, finalRadius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.strokeStyle = 'rgba(249, 115, 22, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(centerX, centerY, finalRadius * 1.35, 0, Math.PI * 2);
          ctx.stroke();

          // Outer orbiting laser dots
          const activeSec = performance.now() / 1000;
          ctx.fillStyle = '#10b981'; // Green dot
          ctx.beginPath();
          ctx.arc(
            centerX + Math.cos(activeSec * 2) * finalRadius * 1.5,
            centerY + Math.sin(activeSec * 2) * finalRadius * 1.5,
            4, 0, Math.PI * 2
          );
          ctx.fill();

          ctx.fillStyle = '#f59e0b'; // Amber dot
          ctx.beginPath();
          ctx.arc(
            centerX + Math.cos(-activeSec * 3) * finalRadius * 1.2,
            centerY + Math.sin(-activeSec * 3) * finalRadius * 1.2,
            3, 0, Math.PI * 2
          );
          ctx.fill();

          ctx.shadowBlur = 0; // Reset shadows
        } else if (mode === 'matrix') {
          // --- HIGH FREQUENCY CO-REACTIVE MATRIX TERMINAL RAIN ---
          audio.analyzer.getByteFrequencyData(dataArray);

          const fontSize = 11;
          const columnsCount = Math.floor(w / fontSize);
          if (matrixColumnsRef.current.length !== columnsCount) {
            matrixColumnsRef.current = Array(columnsCount).fill(0).map(() => Math.floor(Math.random() * -60));
          }

          ctx.font = '10px monospace';
          const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZﾊﾐﾋｰｳｼﾅﾓﾆﾀｰ";

          for (let i = 0; i < columnsCount; i++) {
            const binIndex = Math.floor((i / columnsCount) * binCount);
            const freqVal = (dataArray[binIndex] || 0) / 255;

            // Select a random terminal letter
            const char = chars[Math.floor(Math.random() * chars.length)];
            const x = i * fontSize;
            const y = matrixColumnsRef.current[i] * fontSize;

            if (y > 0 && y < h) {
              // High frequency beats produce bright illuminated highlights or random green droplets
              if (Math.random() > 0.98) {
                ctx.fillStyle = '#ffffff'; // occasional bright electrical spikes
              } else if (freqVal > 0.6) {
                ctx.fillStyle = '#34d399'; // reactive neon emerald green
              } else {
                ctx.fillStyle = '#059669'; // terminal baseline minimal matrix green
              }
              ctx.fillText(char, x, y);
            }

            // Fall speed modulated gracefully by the frequency density mapping parameter
            const fallSpeed = 1.0 + freqVal * 3.5;
            matrixColumnsRef.current[i] += fallSpeed * 0.16;

            // Reset columns staggered correctly
            if (matrixColumnsRef.current[i] * fontSize > h) {
              if (Math.random() > 0.95 - (freqVal * 0.12)) {
                matrixColumnsRef.current[i] = Math.floor(Math.random() * -10);
              }
            }
          }
        }

      } else {
        // Flat line or slow passive background rain during standby / power off
        if (mode === 'matrix') {
          const fontSize = 11;
          const columnsCount = Math.floor(w / fontSize);
          if (matrixColumnsRef.current.length !== columnsCount) {
            matrixColumnsRef.current = Array(columnsCount).fill(0).map(() => Math.floor(Math.random() * -60));
          }

          ctx.font = '10px monospace';
          const chars = "10";

          for (let i = 0; i < columnsCount; i++) {
            const char = chars[Math.floor(Math.random() * chars.length)];
            const x = i * fontSize;
            const y = matrixColumnsRef.current[i] * fontSize;

            if (y > 0 && y < h) {
              ctx.fillStyle = 'rgba(16, 185, 129, 0.18)'; // transparent faint binary drops
              ctx.fillText(char, x, y);
            }

            matrixColumnsRef.current[i] += 0.08; // extremely passive drifting matrix drops

            if (matrixColumnsRef.current[i] * fontSize > h) {
              if (Math.random() > 0.98) {
                matrixColumnsRef.current[i] = Math.floor(Math.random() * -10);
              }
            }
          }
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          
          const segmentCount = 20;
          const segmentWidth = w / segmentCount;
          for (let i = 0; i <= segmentCount; i++) {
            const x = i * segmentWidth;
            // Add micro flat rumbles
            const y = h / 2 + Math.sin(i + performance.now() * 0.005) * 2;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [mode]);

  return (
    <div 
      ref={containerRef} 
      className="bg-black border-2 border-zinc-850 rounded-2xl p-0.5 h-[140px] md:h-[180px] w-full relative overflow-hidden group shadow-inner shadow-black"
    >
      {/* Real-time canvas backdrop */}
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Controller Buttons top layout */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/60 border border-zinc-800/80 p-1 rounded-xl backdrop-blur-xs select-none">
        
        <button
          onClick={() => setMode('bars')}
          className={`p-1.5 rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer ${
            mode === 'bars' ? 'bg-zinc-800 text-cyan-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Spectrum Bars"
        >
          <BarChart2 size={12} className="shrink-0" />
          <span className="text-[9px] font-mono font-bold uppercase hidden md:inline">Spectrum</span>
        </button>

        <button
          onClick={() => setMode('waves')}
          className={`p-1.5 rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer ${
            mode === 'waves' ? 'bg-zinc-800 text-orange-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Oscilloscope Waves"
        >
          <Activity size={12} className="shrink-0" />
          <span className="text-[9px] font-mono font-bold uppercase hidden md:inline">Oscillo</span>
        </button>

        <button
          onClick={() => setMode('circular')}
          className={`p-1.5 rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer ${
            mode === 'circular' ? 'bg-zinc-800 text-emerald-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
          title="Circular Pulse Spindle"
        >
          <CircleDot size={12} className="shrink-0" />
          <span className="text-[9px] font-mono font-bold uppercase hidden md:inline">Spindle</span>
        </button>

        <button
          onClick={() => setMode('matrix')}
          className={`p-1.5 rounded-lg transition duration-150 flex items-center gap-1 cursor-pointer ${
            mode === 'matrix' ? 'bg-zinc-800 text-green-400 font-bold' : 'text-zinc-500 hover:text-zinc-305'
          }`}
          title="Matrix Rain Digital Terminal"
        >
          <Terminal size={12} className="shrink-0" />
          <span className="text-[9px] font-mono font-bold uppercase hidden md:inline">Matrix</span>
        </button>

      </div>

      {/* Floating Mode identifier tag bottom left */}
      <div className="absolute bottom-2.5 left-3.5 flex items-center gap-1.5 pointer-events-none select-none font-mono">
        <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${audio.isPowerOn ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-zinc-700'}`} />
        <span className="text-[9px] font-bold text-zinc-500 tracking-widest uppercase">
          {audio.isPowerOn ? `DECK MONITOR: ${mode}` : 'MONITOR IDLE / STANDBY'}
        </span>
      </div>
    </div>
  );
}
