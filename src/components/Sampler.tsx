import { useEffect, useState } from 'react';
import { audio } from '../utils/audioEngine';
import { SoundSample } from '../types';
import { Radio, Percent, Zap, HelpCircle } from 'lucide-react';

const SAMPLES: SoundSample[] = [
  { id: 'sub_drop', name: 'SUB DROP DROP', category: 'bass', color: 'border-rose-500 hover:bg-rose-500/10 text-rose-400', triggerKey: '1' },
  { id: 'lofi_horn', name: 'LO-FI BRASS Fm6', category: 'vocal', color: 'border-orange-500 hover:bg-orange-500/10 text-orange-400', triggerKey: '2' },
  { id: 'laser', name: 'LASER SLIDE ZAP', category: 'fx', color: 'border-amber-400 hover:bg-amber-400/10 text-amber-300', triggerKey: '3' },
  { id: 'crackle_echo', name: 'VINYL CRACKLE', category: 'fx', color: 'border-emerald-500 hover:bg-emerald-500/10 text-emerald-400', triggerKey: '4' },
  { id: 'siren', name: 'DUB SIREN BEAM', category: 'fx', color: 'border-teal-500 hover:bg-teal-500/10 text-teal-400', triggerKey: '5' },
  { id: 'minor_stab', name: 'DETROIT CHORD Dm9', category: 'bass', color: 'border-cyan-500 hover:bg-cyan-500/10 text-cyan-400', triggerKey: '6' },
  { id: 'acid_chirp', name: '303 RESON CHIRP', category: 'bass', color: 'border-blue-500 hover:bg-blue-500/10 text-blue-400', triggerKey: '7' },
  { id: 'reverb_snare', name: 'WAREHOUSE CLAP', category: 'drum', color: 'border-fuchsia-500 hover:bg-fuchsia-500/10 text-fuchsia-400', triggerKey: '8' },
];

export default function Sampler() {
  const [activePad, setActivePad] = useState<string | null>(null);
  
  // Real-time tape delay state parameters
  const [delayTime, setDelayTime] = useState(0.33); // ~0.33 seconds
  const [delayFeedback, setDelayFeedback] = useState(0.4); // 40% feedback

  // Key press listeners for keyboard jamming
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement || 
        target instanceof HTMLTextAreaElement || 
        target.isContentEditable
      ) {
        return;
      }

      const targetSample = SAMPLES.find(s => s.triggerKey === e.key);
      if (targetSample) {
        triggerPad(targetSample.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Update real-time delay parameters in audioEngine
  useEffect(() => {
    if (audio.delayNode && audio.delayFeedback) {
      audio.delayNode.delayTime.value = delayTime;
    }
  }, [delayTime]);

  useEffect(() => {
    if (audio.delayFeedback) {
      audio.delayFeedback.gain.value = delayFeedback;
    }
  }, [delayFeedback]);

  const triggerPad = (id: string) => {
    if (!audio.isPowerOn) {
      // Prompt engine power-up
      audio.setPower(true);
    }
    audio.triggerSample(id);
    setActivePad(id);
    
    // Dispatch event to increment sampler interaction score/achievement metrics
    window.dispatchEvent(new CustomEvent('sampler-triggered'));

    // Visual flash timeout
    setTimeout(() => {
      setActivePad(prev => prev === id ? null : prev);
    }, 150);
  };

  return (
    <div 
      id="sampler-widget" 
      className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_15px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between"
    >
      {/* Widget Header */}
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Radio className="text-zinc-500 w-4 h-4" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-300">MPC LAUNCH PAD SAMPLER</span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
          <Zap size={10} className="text-emerald-400 rotate-12" />
          <span className="text-[9px] font-mono font-bold text-zinc-400">DELAY ROUTE ON</span>
        </div>
      </div>

      {/* Grid of MPC-style Drum Pads */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-2">
        {SAMPLES.map((sample) => {
          const isActive = activePad === sample.id;
          return (
            <button
              key={sample.id}
              onClick={() => triggerPad(sample.id)}
              className={`flex flex-col items-center justify-between p-4 rounded-2xl min-h-[92px] text-center border-2 bg-zinc-950/40 relative active:scale-95 transition-all duration-100 ${
                isActive 
                  ? 'bg-zinc-100/10 scale-95 shadow-inner' 
                  : 'hover:bg-zinc-850/60 shadow-lg'
              } ${sample.color}`}
            >
              <div className="flex justify-between items-center w-full">
                <span className="text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 select-none">
                  KEY: {sample.triggerKey}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-current animate-ping' : 'bg-zinc-800'}`} />
              </div>
              
              <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider block mt-3 select-none leading-tight py-1 truncate w-full">
                {sample.name}
              </span>
              
              <div className="w-full h-0.5 bg-zinc-900 mt-2 rounded bg-opacity-20 overflow-hidden">
                <div className={`h-full bg-current ${isActive ? 'w-full transition-all duration-150' : 'w-0'}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Tape Analog Delay Controls Panel */}
      <div className="mt-5 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-850">
        <div className="text-[10px] font-mono text-zinc-500 font-extrabold tracking-widest uppercase mb-3 flex items-center justify-between">
          <span>TAPE DELAY ECHO MACHINE</span>
          <span className="text-zinc-400 bg-zinc-900/50 px-2 py-0.5 rounded border border-zinc-850">feedback loop</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Delay Time Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center font-mono text-[9px] text-zinc-400">
              <span className="font-bold">ECHO TIME:</span>
              <span className="tabular-nums text-zinc-300 font-semibold">{delayTime.toFixed(2)}s</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.20"
              step="0.05"
              value={delayTime}
              onChange={(e) => setDelayTime(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1 bg-zinc-850 rounded-lg appearance-none"
            />
            <div className="flex justify-between font-mono text-[8px] text-zinc-650">
              <span>RAPID CHOP (0.05s)</span>
              <span>WAREHOUSE (1.2s)</span>
            </div>
          </div>

          {/* Delay Feedback Slider */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center font-mono text-[9px] text-zinc-400">
              <span className="font-bold">ECHO DECAY (FEEDBACK):</span>
              <span className="tabular-nums text-zinc-300 font-semibold">{Math.round(delayFeedback * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.85"
              step="0.05"
              value={delayFeedback}
              onChange={(e) => setDelayFeedback(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer h-1 bg-zinc-850 rounded-lg appearance-none"
            />
            <div className="flex justify-between font-mono text-[8px] text-zinc-650">
              <span>SLAPBACK (0%)</span>
              <span> INFINITE (85%)</span>
            </div>
          </div>

        </div>
      </div>

      <div className="flex items-center gap-2 mt-4 pl-1">
        <HelpCircle size={12} className="text-zinc-600 shrink-0" />
        <span className="text-[8px] font-mono text-zinc-500 font-bold uppercase tracking-wider leading-relaxed">
          🎹 JAM OPTION: USE LAPTOP NUMBER KEYBOARD <span className="text-zinc-400">[1]</span> TO <span className="text-zinc-400">[8]</span> TO TRIGGER SAMPLES INSTANTLY DURING THE SET.
        </span>
      </div>

    </div>
  );
}
