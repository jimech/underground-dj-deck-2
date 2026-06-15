import { useState, useEffect } from 'react';
import { audio } from '../utils/audioEngine';
import { DrumInstrument } from '../types';
import { Play, Square, RefreshCcw, LayoutGrid, Disc, Scale, HelpCircle } from 'lucide-react';

export default function StepSequencer() {
  const [isPlaying, setIsPlaying] = useState(audio.isPowerOn);
  const [bpm, setBpm] = useState(audio.bpm);
  const [currentStep, setCurrentStep] = useState(0);
  const [grid, setGrid] = useState<{ [key in DrumInstrument]: boolean[] }>(() => {
    // deep clone initial states
    const copy: any = {};
    Object.keys(audio.sequencerTracks).forEach((key) => {
      copy[key] = [...audio.sequencerTracks[key as DrumInstrument]];
    });
    return copy;
  });

  // Track the synchronized audio scheduler step positions
  useEffect(() => {
    audio.onStepChange = (step) => {
      setCurrentStep(step);
    };
    return () => {
      audio.onStepChange = null;
    };
  }, []);

  // Listen for loaded sessions to update the sequencer tempo and grid triggers
  useEffect(() => {
    const handleSessionLoaded = () => {
      setIsPlaying(audio.isPowerOn);
      setBpm(audio.bpm);
      
      const copy: any = {};
      Object.keys(audio.sequencerTracks).forEach((key) => {
        copy[key] = [...audio.sequencerTracks[key as DrumInstrument]];
      });
      setGrid(copy);
    };
    window.addEventListener('session-loaded', handleSessionLoaded);
    return () => window.removeEventListener('session-loaded', handleSessionLoaded);
  }, []);

  // Update speed values
  const handleBpmChange = (newVal: number) => {
    const clamped = Math.max(60, Math.min(220, newVal));
    setBpm(clamped);
    audio.setBpm(clamped);
  };

  // Toggle single beat slot trigger
  const handleToggleStep = (instrument: DrumInstrument, stepIndex: number) => {
    const updated = [...grid[instrument]];
    updated[stepIndex] = !updated[stepIndex];
    
    setGrid(prev => ({
      ...prev,
      [instrument]: updated
    }));

    audio.sequencerTracks[instrument][stepIndex] = updated[stepIndex];
  };

  // Preset loaders for fast, engaging underground patterns
  const handleLoadPreset = (presetName: 'minimal' | 'industrial' | 'acid' | 'ambient' | 'clear') => {
    const newGrid: { [key in DrumInstrument]: boolean[] } = {
      kick: Array(16).fill(false),
      snare: Array(16).fill(false),
      hihat: Array(16).fill(false),
      synth: Array(16).fill(false),
    };

    if (presetName === 'minimal') {
      newGrid.kick[0] = true;
      newGrid.kick[4] = true;
      newGrid.kick[8] = true;
      newGrid.kick[12] = true;
      newGrid.hihat[2] = true;
      newGrid.hihat[6] = true;
      newGrid.hihat[10] = true;
      newGrid.hihat[14] = true;
      newGrid.snare[4] = true;
      newGrid.snare[12] = true;
      newGrid.synth[3] = true;
      newGrid.synth[9] = true;
      newGrid.synth[11] = true;
      handleBpmChange(124);
    } else if (presetName === 'industrial') {
      // heavy kick loops on almost all beats, high bpm
      newGrid.kick.fill(true);
      // clean snare accents
      newGrid.snare[4] = true;
      newGrid.snare[12] = true;
      for (let i = 0; i < 16; i++) {
        if (i % 2 === 1) newGrid.hihat[i] = true;
        if (i % 3 === 0) newGrid.synth[i] = true;
      }
      handleBpmChange(138);
    } else if (presetName === 'acid') {
      newGrid.kick[0] = true;
      newGrid.kick[8] = true;
      newGrid.snare[4] = true;
      newGrid.snare[12] = true;
      newGrid.hihat[2] = true;
      newGrid.hihat[6] = true;
      newGrid.hihat[10] = true;
      newGrid.hihat[14] = true;
      // acid synth arpeggio notes
      newGrid.synth[0] = true;
      newGrid.synth[3] = true;
      newGrid.synth[6] = true;
      newGrid.synth[8] = true;
      newGrid.synth[11] = true;
      newGrid.synth[14] = true;
      handleBpmChange(128);
    } else if (presetName === 'ambient') {
      newGrid.kick[0] = true;
      newGrid.kick[12] = true;
      newGrid.hihat[4] = true;
      newGrid.hihat[12] = true;
      newGrid.synth[0] = true;
      newGrid.synth[4] = true;
      newGrid.synth[8] = true;
      handleBpmChange(95);
    } // 'clear' leaves them all empty

    setGrid(newGrid);

    // Copy to live audio engine
    Object.keys(newGrid).forEach((inst) => {
      audio.sequencerTracks[inst as DrumInstrument] = [...newGrid[inst as DrumInstrument]];
    });
  };

  const clearAll = () => handleLoadPreset('clear');

  const labelColors: { [key in DrumInstrument]: string } = {
    kick: 'text-rose-500 border-rose-950/40 bg-rose-950/20',
    snare: 'text-amber-500 border-amber-950/40 bg-amber-950/20',
    hihat: 'text-cyan-500 border-cyan-950/40 bg-cyan-950/20',
    synth: 'text-emerald-500 border-emerald-950/40 bg-emerald-950/20',
  };

  const ledColors: { [key in DrumInstrument]: string } = {
    kick: 'bg-rose-500 shadow-rose-500/80',
    snare: 'bg-amber-400 shadow-amber-400/80',
    hihat: 'bg-cyan-500 shadow-cyan-500/80',
    synth: 'bg-emerald-500 shadow-emerald-500/80',
  };

  return (
    <div 
      id="sequencer-widget" 
      className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_15px_30px_rgba(0,0,0,0.5)]"
    >
      {/* Sequencer Header Controls */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between border-b border-zinc-850 pb-4 mb-5">
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-zinc-950 rounded-xl border border-zinc-850">
            <LayoutGrid className="text-zinc-400 w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block font-mono">STEP SEQUENCER STATION</span>
            <span className="text-zinc-200 text-xs font-mono font-bold tracking-wider">UNDERGROUND RHYTHM GRID - 16 BEATS</span>
          </div>
        </div>

        {/* BPM and Speed Board */}
        <div className="flex flex-wrap items-center gap-4 bg-zinc-950/50 p-3 rounded-2xl border border-zinc-850">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 font-mono font-bold tracking-wider uppercase">MASTER BPM:</span>
            <input
              type="range"
              min="70"
              max="160"
              value={bpm}
              onChange={(e) => handleBpmChange(parseInt(e.target.value))}
              className="w-24 md:w-36 accent-zinc-200 h-1 cursor-pointer bg-zinc-800 rounded-lg appearance-none"
            />
            <span className="text-sm font-mono text-zinc-300 font-extrabold tabular-nums w-10 text-right">{bpm}</span>
          </div>

          {/* Quick preset BPM clicks */}
          <div className="flex gap-1.5 border-l border-zinc-800 pl-4">
            <button 
              onClick={() => handleLoadPreset('minimal')} 
              className="text-[9px] font-mono font-bold px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg hover:text-zinc-200 border border-zinc-800 transition"
            >
              MINIMAL
            </button>
            <button 
              onClick={() => handleLoadPreset('acid')} 
              className="text-[9px] font-mono font-bold px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg hover:text-zinc-200 border border-zinc-800 transition"
            >
              ACID
            </button>
            <button 
              onClick={() => handleLoadPreset('industrial')} 
              className="text-[9px] font-mono font-bold px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg hover:text-zinc-200 border border-zinc-800 transition"
            >
              INDUSTRIAL
            </button>
            <button 
              onClick={() => handleLoadPreset('ambient')} 
              className="text-[9px] font-mono font-bold px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 rounded-lg hover:text-zinc-200 border border-zinc-800 transition"
            >
              AMBIENT
            </button>
            <button 
              onClick={clearAll} 
              className="text-[9px] font-mono font-bold px-2.5 py-1 bg-rose-950/20 text-rose-400 hover:bg-rose-900/20 rounded-lg border border-rose-950/30 transition"
            >
              CLEAR
            </button>
          </div>
        </div>

      </div>

      {/* Grid Steps Container */}
      <div className="flex flex-col gap-3 overflow-x-auto pb-2 touch-pan-x scrollbar-thin scrollbar-track-zinc-900 scrollbar-thumb-zinc-800">
        {/* Step Numbers Indicators Header */}
        <div className="flex items-center gap-1 min-w-[680px]">
          <div className="w-20 pr-3 text-right">
            <span className="text-[8px] text-zinc-600 font-mono font-extrabold tracking-widest uppercase">STEPS</span>
          </div>
          <div className="flex-1 grid grid-cols-16 gap-1">
            {Array.from({ length: 16 }).map((_, stepIdx) => (
              <div 
                key={stepIdx} 
                className={`flex flex-col items-center justify-center p-1 rounded font-mono text-[9px] font-bold ${
                  currentStep === stepIdx
                    ? 'text-zinc-100 bg-zinc-800 border border-zinc-700'
                    : 'text-zinc-600'
                }`}
              >
                <span>{(stepIdx + 1).toString().padStart(2, '0')}</span>
                {/* Micro tick light beneath */}
                <div 
                  className={`w-1 h-1 rounded-full transition-all duration-75 mt-0.5 ${
                    currentStep === stepIdx 
                      ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,1)] scale-125' 
                      : (stepIdx % 4 === 0) ? 'bg-zinc-800' : 'bg-zinc-950'
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Channels Rows */}
        {(Object.keys(grid) as DrumInstrument[]).map((inst) => (
          <div key={inst} className="flex items-center gap-1 min-w-[680px]">
            {/* Instrument Identifier Tag */}
            <div className={`w-20 pr-3 text-right font-mono text-[10px] font-extrabold uppercase tracking-widest border-r-2 ${labelColors[inst]}`}>
              {inst}
            </div>
            
            {/* 16 Step Inputs */}
            <div className="flex-1 grid grid-cols-16 gap-1">
              {grid[inst].map((isActive, stepIdx) => {
                const isMeasureStart = stepIdx % 4 === 0;
                let bgBorderClasses = '';

                if (isActive) {
                  bgBorderClasses = `${ledColors[inst]} text-black shadow-[0_0_12px_rgba(255,255,255,0.15)] scale-[1.03] border-white/15`;
                } else {
                  bgBorderClasses = isMeasureStart
                    ? 'bg-zinc-950 hover:bg-zinc-800/40 border-zinc-800 text-zinc-700'
                    : 'bg-zinc-950/40 hover:bg-zinc-800/40 border-zinc-900 text-zinc-800';
                }

                return (
                  <button
                    key={stepIdx}
                    onClick={() => handleToggleStep(inst, stepIdx)}
                    className={`aspect-square rounded-lg border flex items-center justify-center font-mono text-[8px] font-bold transition duration-100 relative ${bgBorderClasses}`}
                    title={`Toggle ${inst} step ${stepIdx + 1}`}
                  >
                    {/* Active Play cursor overlay visual hint */}
                    {currentStep === stepIdx && (
                      <div className="absolute inset-0 border border-amber-400/50 rounded-lg pointer-events-none animate-pulse"></div>
                    )}
                    
                    {/* Inner minimal ledger dot or step tag */}
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-white/90 shadow' : 'bg-transparent'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Manual Explanatory Sticker */}
      <div className="flex items-center gap-2 mt-4 bg-zinc-950/40 p-3 rounded-2xl border border-zinc-850/80">
        <HelpCircle size={14} className="text-zinc-500 shrink-0" />
        <span className="text-[10px] font-mono text-zinc-500 leading-relaxed font-bold uppercase tracking-wider">
          💡 UNDERGROUND GRID TIP: SELECT <span className="text-zinc-400">MINIMAL</span> OR <span className="text-zinc-400">ACID</span> PRESETS ABOVE TO INSTANTLY INITIALIZE SYNTH TRACKS WITH MASSIVE SUB-BEATS.
        </span>
      </div>

    </div>
  );
}
