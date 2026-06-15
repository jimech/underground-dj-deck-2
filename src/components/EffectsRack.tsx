import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/audioEngine';
import { Move, Play, RefreshCw, Sparkles, Lock, Unlock, Zap, HelpCircle, Disc } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function EffectsRack() {
  const [padActive, setPadActive] = useState(false);
  const [xyCoord, setXyCoord] = useState({ x: 0.5, y: 0.0 }); // Normalized 0 to 1
  const [holdFilter, setHoldFilter] = useState(false);
  
  // Delay states
  const [delayTimeMode, setDelayTimeMode] = useState<'1/16' | '1/8' | '1/8D' | '1/4' | '1/2' | 'manual'>('1/8D');
  const [delayFeedback, setDelayFeedback] = useState(40); // 40%
  const [delayWet, setDelayWet] = useState(40); // 40%
  const [manualDelayTime, setManualDelayTime] = useState(0.33); // seconds

  // Momentary Stutter states
  const [activeStutter, setActiveStutter] = useState<number | null>(null); // rate divisor

  // Vinyl Crackle states
  const [isVinylActive, setIsVinylActive] = useState(audio.effectsVinylCrackleActive);
  const [vinylVolume, setVinylVolume] = useState(audio.effectsVinylCrackleVolume * 100);
  const [vinylFreq, setVinylFreq] = useState(audio.effectsVinylCrackleFreq);
  const [vinylQ, setVinylQ] = useState(audio.effectsVinylCrackleQ);

  // Listen for loaded sessions to update Vinyl Crackle states
  useEffect(() => {
    const handleSessionLoaded = () => {
      setIsVinylActive(audio.effectsVinylCrackleActive);
      setVinylVolume(audio.effectsVinylCrackleVolume * 100);
      setVinylFreq(audio.effectsVinylCrackleFreq);
      setVinylQ(audio.effectsVinylCrackleQ);
    };
    window.addEventListener('session-loaded', handleSessionLoaded);
    return () => window.removeEventListener('session-loaded', handleSessionLoaded);
  }, []);

  // Sync state changes with the audio engine
  useEffect(() => {
    audio.toggleEffectsVinylCrackle(isVinylActive);
  }, [isVinylActive]);

  useEffect(() => {
    audio.setEffectsVinylCrackleVolume(vinylVolume / 100);
  }, [vinylVolume]);

  useEffect(() => {
    audio.setEffectsVinylCrackleFilter(vinylFreq, vinylQ);
  }, [vinylFreq, vinylQ]);

  const padRef = useRef<HTMLDivElement>(null);

  // Sync Delay properties to audio engine on BPM or mode changes
  useEffect(() => {
    let seconds = 0.33;
    const bpm = audio.bpm || 125;
    const quarterNote = 60 / bpm;

    switch (delayTimeMode) {
      case '1/16':
        seconds = quarterNote / 4;
        break;
      case '1/8':
        seconds = quarterNote / 2;
        break;
      case '1/8D':
        seconds = (quarterNote / 2) * 1.5; // dotted 8th
        break;
      case '1/4':
        seconds = quarterNote;
        break;
      case '1/2':
        seconds = quarterNote * 2;
        break;
      case 'manual':
        seconds = manualDelayTime;
        break;
    }

    audio.setDelayTime(seconds);
  }, [delayTimeMode, manualDelayTime, audio.bpm]);

  useEffect(() => {
    audio.setDelayFeedback(delayFeedback / 100);
  }, [delayFeedback]);

  useEffect(() => {
    audio.setDelayWet(delayWet / 100);
  }, [delayWet]);

  // Handle XY Pad coordinate calculation
  const handleXyMove = (clientX: number, clientY: number) => {
    if (!padRef.current) return;
    const rect = padRef.current.getBoundingClientRect();
    
    // Normalize coordinates (clamped 0 to 1)
    const rawX = (clientX - rect.left) / rect.width;
    const rawY = (clientY - rect.top) / rect.height;
    
    const xVal = Math.max(0, Math.min(1, rawX));
    const yVal = Math.max(0, Math.min(1, rawY));

    // set coords
    setXyCoord({ x: xVal, y: yVal });
    
    // Invert Y coordinate so dragging up corresponds to higher resonance parameter
    const invertedY = 1.0 - yVal;
    audio.setMasterFilterXY(xVal, invertedY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!audio.isPowerOn) {
      audio.setPower(true);
    }
    setPadActive(true);
    handleXyMove(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!padActive) return;
    handleXyMove(e.clientX, e.clientY);
  };

  const handleMouseUpOrLeave = () => {
    if (!padActive) return;
    setPadActive(false);
    if (!holdFilter) {
      audio.resetMasterFilter();
      setXyCoord({ x: 0.5, y: 0.0 });
    }
  };

  // Touch screen support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 0) return;
    if (!audio.isPowerOn) {
      audio.setPower(true);
    }
    setPadActive(true);
    handleXyMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!padActive || e.touches.length === 0) return;
    handleXyMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleHoldToggle = () => {
    const nextHold = !holdFilter;
    setHoldFilter(nextHold);
    if (!nextHold && !padActive) {
      audio.resetMasterFilter();
      setXyCoord({ x: 0.5, y: 0.0 });
    }
  };

  // Momentary Stutter Roll activation methods
  const triggerStutterStart = (rate: number) => {
    if (!audio.isPowerOn) {
      audio.setPower(true);
    }
    setActiveStutter(rate);
    audio.setStutter(true, rate);
  };

  const triggerStutterRelease = () => {
    setActiveStutter(null);
    audio.setStutter(false, 4);
  };

  // Human-readable labels for active filter sweeps
  const getFilterOverlayText = () => {
    if (padActive || holdFilter) {
      const qVal = (0.5 + (1.0 - xyCoord.y) * 18.0).toFixed(1);
      if (xyCoord.x < 0.47) {
        const pct = Math.round((xyCoord.x / 0.47) * 100);
        return `LOW-PASS: ${pct}% Swept | Feedback Q: ${qVal}`;
      } else if (xyCoord.x > 0.53) {
        const pct = Math.round(((xyCoord.x - 0.53) / 0.47) * 100);
        return `HIGH-PASS: ${pct}% Swept | Feedback Q: ${qVal}`;
      } else {
        return `BYPASS STANDARD GATE | Q: ${qVal}`;
      }
    }
    return 'DRAG TO SWEEP HPF / LPF FILTERS';
  };

  return (
    <div 
      id="kaoss-effects-rack" 
      className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_15px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-855 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Zap className="text-cyan-400 w-4 h-4 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-300">KAOSS-PAD FX & BEAT ROLLS</span>
        </div>
        <button 
          onClick={handleHoldToggle}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[9px] font-bold border transition duration-150 uppercase ${
            holdFilter 
              ? 'bg-orange-500 border-orange-600 text-black shadow-[0_0_8px_rgba(249,115,22,0.3)]'
              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
          title="Hold/Lock current filter coordinate position"
        >
          {holdFilter ? <Lock size={8} /> : <Unlock size={8} />}
          <span>{holdFilter ? 'FILTER LOCKED' : 'TEMPORARY SWEEP'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-stretch">
        
        {/* XY Touch Canvas Area (Left) */}
        <div className="md:col-span-6 flex flex-col gap-2">
          <div 
            ref={padRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
            className={`relative h-[155px] bg-gradient-to-b from-zinc-950 to-zinc-90 w border rounded-2xl cursor-crosshair overflow-hidden touch-none select-none transition duration-150 shadow-inner ${
              padActive 
                ? 'border-cyan-500/50 shadow-[rgba(6,182,212,0.04)_0_0_15px_inset]' 
                : holdFilter 
                  ? 'border-orange-500/50' 
                  : 'border-zinc-800'
            }`}
          >
            {/* Background 2D Radar Reticle Crosshair Grid lines */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
              <div className="w-full h-0.5 bg-zinc-200" />
              <div className="h-full w-0.5 bg-zinc-200 absolute" />
              <div className="w-2/3 h-2/3 border-2 border-dashed border-zinc-300 rounded-full" />
              <div className="w-1/3 h-1/3 border-2 border-dashed border-zinc-300 rounded-full" />
            </div>

            {/* Glowing sweep cursor spot */}
            <motion.div 
              className={`absolute w-4 h-4 -mt-2 -ml-2 rounded-full pointer-events-none flex items-center justify-center ${
                padActive
                  ? 'bg-cyan-400 shadow-[0_0_14px_6px_rgba(34,211,238,0.5)]'
                  : holdFilter 
                    ? 'bg-orange-500 shadow-[0_0_14px_6px_rgba(249,115,22,0.5)]'
                    : 'bg-zinc-600'
              }`}
              style={{ 
                left: `${xyCoord.x * 100}%`, 
                top: `${xyCoord.y * 100}%` 
              }}
              animate={{ scale: padActive ? 1.25 : 1 }}
              transition={{ type: 'spring', damping: 15 }}
            >
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
            </motion.div>

            {/* Overlay visual sweep indicators */}
            <div className="absolute bottom-2 left-2 text-[8px] font-mono text-zinc-650 font-bold tracking-widest pointer-events-none">
              &larr; MASTER LPF
            </div>
            <div className="absolute bottom-2 right-2 text-[8px] font-mono text-zinc-650 font-bold tracking-widest pointer-events-none">
              MASTER HPF &rarr;
            </div>
            <div className="absolute top-2 left-2 text-[8px] font-mono text-zinc-650 font-bold tracking-widest pointer-events-none">
              &uarr; HIGH FILTER RESONANCE (Q)
            </div>
          </div>

          {/* Active stats printout */}
          <div className="bg-zinc-950/60 leading-normal border border-zinc-850 px-2.5 py-1.5 rounded-xl font-mono text-[9px] text-center select-none truncate">
            <span className={`font-bold ${
              padActive ? 'text-cyan-400' : holdFilter ? 'text-orange-400' : 'text-zinc-500'
            }`}>
              {getFilterOverlayText()}
            </span>
          </div>

          {/* Vinyl Crackle Texture Panel */}
          <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-850 flex flex-col gap-2 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono font-bold text-zinc-550 uppercase tracking-widest">
                VINYL SURFACE CRACKLE (BANDPASS NOISE)
              </span>
              <button
                onClick={() => setIsVinylActive(!isVinylActive)}
                className={`px-2 py-0.5 text-[8px] font-mono font-bold rounded-lg border transition duration-150 uppercase flex items-center gap-1 ${
                  isVinylActive
                    ? 'bg-amber-500 text-black border-amber-500 font-extrabold shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Disc size={9} className={`${isVinylActive ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
                <span>{isVinylActive ? 'ACTIVE' : 'BYPASS'}</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 items-center">
              {/* Volume Slider */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[8px] font-mono font-bold text-zinc-400">
                  <span>LEVEL:</span>
                  <span className={isVinylActive ? 'text-amber-400' : 'text-zinc-600'}>{vinylVolume.toFixed(0)}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={vinylVolume}
                  onChange={e => setVinylVolume(parseInt(e.target.value))}
                  disabled={!isVinylActive}
                  className="w-full h-1 bg-zinc-850 rounded accent-amber-500 cursor-pointer appearance-none border border-zinc-950 disabled:opacity-40"
                />
              </div>

              {/* Bandpass Frequency Slider */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[8px] font-mono font-bold text-zinc-400">
                  <span>FREQ:</span>
                  <span className={isVinylActive ? 'text-amber-400' : 'text-zinc-600'}>{vinylFreq}Hz</span>
                </div>
                <input
                  type="range" min="200" max="4000" step="50" value={vinylFreq}
                  onChange={e => setVinylFreq(parseInt(e.target.value))}
                  disabled={!isVinylActive}
                  className="w-full h-1 bg-zinc-850 rounded accent-amber-500 cursor-pointer appearance-none border border-zinc-950 disabled:opacity-40"
                />
              </div>

              {/* Bandpass Q resonance Slider */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between text-[8px] font-mono font-bold text-zinc-400">
                  <span>RESO Q:</span>
                  <span className={isVinylActive ? 'text-amber-400' : 'text-zinc-600'}>{vinylQ.toFixed(1)}</span>
                </div>
                <input
                  type="range" min="0.3" max="5.0" step="0.1" value={vinylQ}
                  onChange={e => setVinylQ(parseFloat(e.target.value))}
                  disabled={!isVinylActive}
                  className="w-full h-1 bg-zinc-850 rounded accent-amber-500 cursor-pointer appearance-none border border-zinc-950 disabled:opacity-40"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Delay Control Controls & Stutter Pads (Right) */}
        <div className="md:col-span-6 flex flex-col justify-between gap-3">
          
          {/* Echo Delay settings */}
          <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-850 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[9px] font-mono text-zinc-500 font-extrabold tracking-widest uppercase">
              <span>MASTER SYNCHRONIZED TAPE ECHO</span>
            </div>

            {/* Target Echo Time selections */}
            <div className="flex gap-1 justify-between select-none">
              {(['1/16', '1/8', '1/8D', '1/4', 'manual'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDelayTimeMode(mode)}
                  className={`flex-1 py-1 text-[8px] font-mono font-bold rounded border transition duration-150 uppercase ${
                    delayTimeMode === mode 
                      ? 'bg-cyan-500 text-black border-cyan-500 font-extrabold shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                      : 'bg-zinc-900 text-zinc-400 border-zinc-950 hover:text-zinc-200 hover:bg-zinc-850'
                  }`}
                >
                  {mode === '1/8D' ? '1/8d' : mode}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-0.5">
              {/* Feedback */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[8px] font-mono font-bold text-zinc-500">
                  <span>FEEDBACK:</span>
                  <span className="text-zinc-400 font-bold">{delayFeedback}%</span>
                </div>
                <input
                  type="range" min="0" max="95" value={delayFeedback}
                  onChange={e => setDelayFeedback(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-850 rounded accent-zinc-400 cursor-pointer appearance-none border border-zinc-950"
                />
              </div>

              {/* Wetmix level */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-center text-[8px] font-mono font-bold text-zinc-500">
                  <span>ECHO MIX:</span>
                  <span className="text-zinc-400 font-bold">{delayWet}%</span>
                </div>
                <input
                  type="range" min="0" max="100" value={delayWet}
                  onChange={e => setDelayWet(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-850 rounded accent-zinc-400 cursor-pointer appearance-none border border-zinc-950"
                />
              </div>
            </div>

            {/* Manual custom delay slide */}
            {delayTimeMode === 'manual' && (
              <div className="flex flex-col gap-0.5 pt-1.5 border-t border-zinc-850/50 mt-0.5 animate-normal">
                <div className="flex justify-between items-center text-[8px] font-mono font-bold text-zinc-500">
                  <span>CONTINUOUS DELAY DELAYTIME:</span>
                  <span className="text-orange-400 font-bold">{(manualDelayTime * 1000).toFixed(0)}ms</span>
                </div>
                <input
                  type="range" min="0.05" max="1.50" step="0.02" value={manualDelayTime}
                  onChange={e => setManualDelayTime(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-850 rounded accent-orange-500 cursor-pointer appearance-none border border-zinc-950"
                />
              </div>
            )}
          </div>

          {/* Momentary Beat Roll Stutter Pads */}
          <div className="flex flex-col gap-1.5">
            <div className="text-[9px] text-zinc-500 font-mono tracking-widest pl-0.5 uppercase font-bold">
              BEAT ROLL ROLLS (HOLD DOWN TRIGGERS)
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: '1/4 ROLL', rate: 1, c: 'hover:bg-amber-500' },
                { label: '1/8 ROLL', rate: 2, c: 'hover:bg-orange-500' },
                { label: '1/16 ROLL', rate: 4, c: 'hover:bg-rose-500' },
                { label: 'ROLL-32', rate: 8, c: 'hover:bg-purple-500 hover:text-white' },
              ].map(({ label, rate, c }) => (
                <button
                  key={rate}
                  onMouseDown={() => triggerStutterStart(rate)}
                  onMouseUp={triggerStutterRelease}
                  onMouseLeave={triggerStutterRelease}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    triggerStutterStart(rate);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    triggerStutterRelease();
                  }}
                  className={`py-2 border font-mono text-[9px] font-bold tracking-wider rounded-xl transition duration-150 flex flex-col items-center justify-center select-none cursor-pointer duration-75 active:scale-90 ${
                    activeStutter === rate
                      ? 'bg-rose-500 text-black border-rose-600 font-extrabold shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-850 hover:text-black'
                  } ${c}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mb-1 ${
                    activeStutter === rate ? 'bg-black animate-ping' : 'bg-zinc-800'
                  }`} />
                  <span className="text-[8px] font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
