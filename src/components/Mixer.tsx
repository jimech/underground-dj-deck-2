import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/audioEngine';
import { Sliders, Shuffle, Percent, Radio, Zap } from 'lucide-react';

export default function Mixer() {
  const [crossfader, setCrossfader] = useState(0); // -1 to +1
  
  // Deck control states
  const [deckA, setDeckA] = useState({ vol: 0.7, low: 0, mid: 0, high: 0, filter: 0 });
  const [deckB, setDeckB] = useState({ vol: 0.7, low: 0, mid: 0, high: 0, filter: 0 });

  // Master console effects and groove configurations
  const [swing, setSwing] = useState(0);
  const [flanger, setFlanger] = useState(0);
  const [ambient, setAmbient] = useState<'none' | 'subway' | 'rain' | 'crowd' | 'drone'>('none');

  // VU Meter state variables for animated flickering
  const [vuA, setVuA] = useState(0);
  const [vuB, setVuB] = useState(0);

  const handleSwingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSwing(val);
    audio.setSwingAmount(val);
  };

  const handleFlangerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setFlanger(val);
    audio.setMasterFlangerSweep(val);
  };

  const handleAmbientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as 'none' | 'subway' | 'rain' | 'crowd' | 'drone';
    setAmbient(val);
    audio.setAmbientMode(val);
  };

  // Poll analyser data to trigger real LED column jumps
  useEffect(() => {
    let active = true;
    const bufferLength = 16;
    const dataArray = new Uint8Array(bufferLength);

    const updateVUMeters = () => {
      if (!active) return;
      
      if (audio.ctx && audio.analyzer) {
        audio.analyzer.getByteFrequencyData(dataArray);
        // Get average amplitude
        let total = 0;
        for (let i = 0; i < bufferLength; i++) {
          total += dataArray[i];
        }
        const average = total / bufferLength; // 0 to 255
        const normalized = average / 255;

        // Route normalized power split by crossfader
        const factorA = audio.deckPlayStates.A ? (1 - (crossfader + 1) / 2) * deckA.vol : 0;
        const factorB = audio.deckPlayStates.B ? ((crossfader + 1) / 2) * deckB.vol : 0;

        // Add subtle randomized flicker for analogue authentic simulation
        const randomWarmth = () => (Math.random() * 0.12);

        if (audio.deckPlayStates.A) {
          setVuA(Math.min(1, normalized * factorA * 2 + (Math.random() * 0.1)));
        } else {
          setVuA(randomWarmth() * 0.2);
        }

        if (audio.deckPlayStates.B) {
          setVuB(Math.min(1, normalized * factorB * 2 + (Math.random() * 0.1)));
        } else {
          setVuB(randomWarmth() * 0.2);
        }
      } else {
        // Fallback subtle flicker
        setVuA(0.04);
        setVuB(0.04);
      }

      requestAnimationFrame(updateVUMeters);
    };

    requestAnimationFrame(updateVUMeters);
    return () => {
      active = false;
    };
  }, [crossfader, deckA.vol, deckB.vol]);

  // Listen for session loads to synchronize mixer controls
  useEffect(() => {
    const handleSessionLoaded = () => {
      setCrossfader(audio.crossfaderValue);
      setDeckA({ ...audio.deckAValues });
      setDeckB({ ...audio.deckBValues });
      setSwing(audio.swingAmountValue);
      setFlanger(audio.flangerValue);
      setAmbient(audio.ambientMode);
    };
    window.addEventListener('session-loaded', handleSessionLoaded);
    return () => window.removeEventListener('session-loaded', handleSessionLoaded);
  }, []);

  // Hook up changes to audioEngine singleton
  const handleVolumeChange = (deck: 'A' | 'B', val: number) => {
    if (deck === 'A') {
      setDeckA(prev => ({ ...prev, vol: val }));
      audio.setVolume('A', val);
    } else {
      setDeckB(prev => ({ ...prev, vol: val }));
      audio.setVolume('B', val);
    }
  };

  const handleEQChange = (deck: 'A' | 'B', band: 'low' | 'mid' | 'high', val: number) => {
    if (deck === 'A') {
      setDeckA(prev => ({ ...prev, [band]: val }));
      audio.setEQ('A', band, val);
    } else {
      setDeckB(prev => ({ ...prev, [band]: val }));
      audio.setEQ('B', band, val);
    }
  };

  const handleFilterChange = (deck: 'A' | 'B', val: number) => {
    if (deck === 'A') {
      setDeckA(prev => ({ ...prev, filter: val }));
      audio.setFilter('A', val);
    } else {
      setDeckB(prev => ({ ...prev, filter: val }));
      audio.setFilter('B', val);
    }
  };

  const handleCrossfaderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCrossfader(val);
    audio.setCrossfader(val);
  };

  // Convert volume range to LED lights (12 stage meters)
  const renderLedColumn = (intensity: number) => {
    const totalBars = 12;
    const litBars = Math.floor(intensity * totalBars);

    return (
      <div className="flex flex-col-reverse gap-0.5 bg-black/80 p-1.5 rounded-md h-[180px] w-4 border border-zinc-850 justify-between items-center shadow-inner">
        {Array.from({ length: totalBars }).map((_, idx) => {
          const isLit = idx < litBars;
          let colorClass = 'bg-zinc-800';
          if (isLit) {
            if (idx >= 10) colorClass = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'; // Overload Red
            else if (idx >= 7) colorClass = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]'; // Sweet spot Yellow
            else colorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'; // Ground Green
          }

          return (
            <div 
              key={idx} 
              className={`w-1.5 h-2 rounded-xs transition-all duration-75 ${colorClass}`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div 
      id="mixer-unit" 
      className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 flex flex-col justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_15px_30px_rgba(0,0,0,0.5)] h-full min-h-[500px]"
    >
      {/* Control Header */}
      <div className="flex items-center justify-between border-b border-zinc-850 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Sliders className="text-zinc-500 w-4 h-4" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-300">UTILITY MIXER BLOCK</span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800">
          <Zap size={10} className="text-amber-500 animate-pulse" />
          <span className="text-[9px] font-mono font-bold text-zinc-400">ANALOG BIQUAD-EQ</span>
        </div>
      </div>

      {/* Dual Channel Equalizers & Gain Slots */}
      {/* Desktop View (md and above) */}
      <div className="hidden md:grid grid-cols-7 gap-1 flex-1">
        
        {/* DECK A PARAMETER RAMP */}
        <div className="col-span-3 flex flex-col items-center gap-4 border-r border-dashed border-zinc-800/60 pr-2">
          <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase select-none tracking-widest bg-zinc-950 px-2 py-0.5 rounded">DECK A</span>
          
          {/* HIGH EQ */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-[8px] font-mono text-zinc-500 font-bold tracking-wider">HI (10k)</span>
            <input
              type="range" min="-12" max="12" step="1" value={deckA.high}
              onChange={(e) => handleEQChange('A', 'high', parseInt(e.target.value))}
              className="w-16 h-1 bg-zinc-950 rounded-lg accent-zinc-500 appearance-none cursor-pointer rotate-270 my-4"
            />
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums font-bold">
              {deckA.high > 0 ? `+${deckA.high}` : deckA.high}dB
            </span>
          </div>

          {/* MID EQ */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-[8px] font-mono text-zinc-500 font-bold tracking-wider">MID (1k)</span>
            <input
              type="range" min="-12" max="12" step="1" value={deckA.mid}
              onChange={(e) => handleEQChange('A', 'mid', parseInt(e.target.value))}
              className="w-16 h-1 bg-zinc-950 rounded-lg accent-zinc-500 appearance-none cursor-pointer rotate-270 my-4"
            />
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums font-bold">
              {deckA.mid > 0 ? `+${deckA.mid}` : deckA.mid}dB
            </span>
          </div>

          {/* LOW EQ */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-[8px] font-mono text-zinc-500 font-bold tracking-wider">LOW (100h)</span>
            <input
              type="range" min="-12" max="12" step="1" value={deckA.low}
              onChange={(e) => handleEQChange('A', 'low', parseInt(e.target.value))}
              className="w-16 h-1 bg-zinc-950 rounded-lg accent-zinc-500 appearance-none cursor-pointer rotate-270 my-4"
            />
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums font-bold">
              {deckA.low > 0 ? `+${deckA.low}` : deckA.low}dB
            </span>
          </div>

          {/* RE-RESONATOR COEFF (COMBINED LOWPASS/HIGHPASS FILTER) */}
          <div className="flex flex-col items-center gap-1 w-full mt-2 bg-zinc-950/40 p-2 rounded-xl border border-zinc-850">
            <span className="text-[8px] font-mono text-orange-400 font-extrabold tracking-widest uppercase">FILTER SHIFT</span>
            <input
              type="range" min="-100" max="100" step="2" value={deckA.filter}
              onChange={(e) => handleFilterChange('A', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-850 rounded-lg accent-orange-500 appearance-none cursor-pointer"
            />
            <span className="text-[9px] font-mono font-bold text-zinc-400">
              {deckA.filter === 0 ? 'BYPASS' : deckA.filter < 0 ? `LPF ${Math.abs(deckA.filter)}%` : `HPF ${deckA.filter}%`}
            </span>
          </div>
        </div>

        {/* MIDDLE LED VU COLUMN METERS */}
        <div className="col-span-1 flex flex-row gap-1 justify-center items-center h-full">
          {renderLedColumn(vuA)}
          {renderLedColumn(vuB)}
        </div>

        {/* DECK B PARAMETER RAMP */}
        <div className="col-span-3 flex flex-col items-center gap-4 border-l border-dashed border-zinc-800/60 pl-2">
          <span className="text-[10px] text-zinc-400 font-mono font-bold uppercase select-none tracking-widest bg-zinc-950 px-2 py-0.5 rounded">DECK B</span>
          
          {/* HIGH EQ */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-[8px] font-mono text-zinc-500 font-bold tracking-wider">HI (10k)</span>
            <input
              type="range" min="-12" max="12" step="1" value={deckB.high}
              onChange={(e) => handleEQChange('B', 'high', parseInt(e.target.value))}
              className="w-16 h-1 bg-zinc-950 rounded-lg accent-zinc-500 appearance-none cursor-pointer rotate-270 my-4"
            />
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums font-bold">
              {deckB.high > 0 ? `+${deckB.high}` : deckB.high}dB
            </span>
          </div>

          {/* MID EQ */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-[8px] font-mono text-zinc-500 font-bold tracking-wider">MID (1k)</span>
            <input
              type="range" min="-12" max="12" step="1" value={deckB.mid}
              onChange={(e) => handleEQChange('B', 'mid', parseInt(e.target.value))}
              className="w-16 h-1 bg-zinc-950 rounded-lg accent-zinc-500 appearance-none cursor-pointer rotate-270 my-4"
            />
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums font-bold">
              {deckB.mid > 0 ? `+${deckB.mid}` : deckB.mid}dB
            </span>
          </div>

          {/* LOW EQ */}
          <div className="flex flex-col items-center gap-1 w-full">
            <span className="text-[8px] font-mono text-zinc-500 font-bold tracking-wider">LOW (100h)</span>
            <input
              type="range" min="-12" max="12" step="1" value={deckB.low}
              onChange={(e) => handleEQChange('B', 'low', parseInt(e.target.value))}
              className="w-16 h-1 bg-zinc-950 rounded-lg accent-zinc-500 appearance-none cursor-pointer rotate-270 my-4"
            />
            <span className="text-[10px] font-mono text-zinc-400 tabular-nums font-bold">
              {deckB.low > 0 ? `+${deckB.low}` : deckB.low}dB
            </span>
          </div>

          {/* RE-RESONATOR COEFF (COMBINED LOWPASS/HIGHPASS FILTER) */}
          <div className="flex flex-col items-center gap-1 w-full mt-2 bg-zinc-950/40 p-2 rounded-xl border border-zinc-850">
            <span className="text-[8px] font-mono text-cyan-400 font-extrabold tracking-widest uppercase">FILTER SHIFT</span>
            <input
              type="range" min="-100" max="100" step="2" value={deckB.filter}
              onChange={(e) => handleFilterChange('B', parseInt(e.target.value))}
              className="w-full h-1 bg-zinc-850 rounded-lg accent-cyan-500 appearance-none cursor-pointer"
            />
            <span className="text-[9px] font-mono font-bold text-zinc-400">
              {deckB.filter === 0 ? 'BYPASS' : deckB.filter < 0 ? `LPF ${Math.abs(deckB.filter)}%` : `HPF ${deckB.filter}%`}
            </span>
          </div>
        </div>

      </div>

      {/* Mobile view (below md, touch-friendly, horizontal, compact) */}
      <div className="grid md:hidden grid-cols-2 gap-3 flex-1 select-none">
        
        {/* DECK A PARAMETERS */}
        <div className="flex flex-col gap-3.5 bg-zinc-950/20 p-2.5 rounded-2xl border border-zinc-850">
          <span className="text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-widest bg-zinc-950 px-2 py-0.5 rounded text-center block">DECK A</span>
          
          {/* VOL A */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
              <span>VOL</span>
              <span className="text-orange-400 font-bold">{Math.round(deckA.vol * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05" value={deckA.vol}
              onChange={(e) => handleVolumeChange('A', parseFloat(e.target.value))}
              className="w-full accent-orange-500 bg-zinc-900 h-2 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* FILTER A */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
              <span>FILTER</span>
              <span className="text-orange-400 font-extrabold text-[7px]">
                {deckA.filter === 0 ? 'BYPASS' : deckA.filter < 0 ? `LPF` : `HPF`}
              </span>
            </div>
            <input
              type="range" min="-100" max="100" step="2" value={deckA.filter}
              onChange={(e) => handleFilterChange('A', parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-900 rounded-lg accent-orange-500 appearance-none cursor-pointer"
            />
          </div>

          <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-850/40 flex flex-col gap-2.5">
            {/* HI */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[7px] font-mono text-zinc-500 font-bold uppercase">
                <span>HI</span>
                <span className="text-zinc-400 font-bold">{deckA.high}dB</span>
              </div>
              <input
                type="range" min="-12" max="12" step="1" value={deckA.high}
                onChange={(e) => handleEQChange('A', 'high', parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-900 rounded-lg accent-zinc-500 appearance-none cursor-pointer"
              />
            </div>
            {/* MID */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[7px] font-mono text-zinc-500 font-bold uppercase">
                <span>MID</span>
                <span className="text-zinc-400 font-bold">{deckA.mid}dB</span>
              </div>
              <input
                type="range" min="-12" max="12" step="1" value={deckA.mid}
                onChange={(e) => handleEQChange('A', 'mid', parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-900 rounded-lg accent-zinc-500 appearance-none cursor-pointer"
              />
            </div>
            {/* LOW */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[7px] font-mono text-zinc-500 font-bold uppercase">
                <span>LOW</span>
                <span className="text-zinc-400 font-bold">{deckA.low}dB</span>
              </div>
              <input
                type="range" min="-12" max="12" step="1" value={deckA.low}
                onChange={(e) => handleEQChange('A', 'low', parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-900 rounded-lg accent-zinc-500 appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* DECK B PARAMETERS */}
        <div className="flex flex-col gap-3.5 bg-zinc-950/20 p-2.5 rounded-2xl border border-zinc-850">
          <span className="text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-widest bg-zinc-950 px-2 py-0.5 rounded text-center block">DECK B</span>
          
          {/* VOL B */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
              <span>VOL</span>
              <span className="text-cyan-400 font-bold">{Math.round(deckB.vol * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05" value={deckB.vol}
              onChange={(e) => handleVolumeChange('B', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-zinc-900 h-2 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* FILTER B */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[8px] font-mono text-zinc-500 font-bold uppercase">
              <span>FILTER</span>
              <span className="text-cyan-400 font-extrabold text-[7px]">
                {deckB.filter === 0 ? 'BYPASS' : deckB.filter < 0 ? `LPF` : `HPF`}
              </span>
            </div>
            <input
              type="range" min="-100" max="100" step="2" value={deckB.filter}
              onChange={(e) => handleFilterChange('B', parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-900 rounded-lg accent-cyan-500 appearance-none cursor-pointer"
            />
          </div>

          <div className="bg-zinc-950/60 p-2 rounded-xl border border-zinc-850/40 flex flex-col gap-2.5">
            {/* HI */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[7px] font-mono text-zinc-500 font-bold uppercase">
                <span>HI</span>
                <span className="text-zinc-400 font-bold">{deckB.high}dB</span>
              </div>
              <input
                type="range" min="-12" max="12" step="1" value={deckB.high}
                onChange={(e) => handleEQChange('B', 'high', parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-900 rounded-lg accent-zinc-500 appearance-none cursor-pointer"
              />
            </div>
            {/* MID */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[7px] font-mono text-zinc-500 font-bold uppercase">
                <span>MID</span>
                <span className="text-zinc-400 font-bold">{deckB.mid}dB</span>
              </div>
              <input
                type="range" min="-12" max="12" step="1" value={deckB.mid}
                onChange={(e) => handleEQChange('B', 'mid', parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-900 rounded-lg accent-zinc-500 appearance-none cursor-pointer"
              />
            </div>
            {/* LOW */}
            <div className="flex flex-col gap-0.5">
              <div className="flex justify-between text-[7px] font-mono text-zinc-500 font-bold uppercase">
                <span>LOW</span>
                <span className="text-zinc-400 font-bold">{deckB.low}dB</span>
              </div>
              <input
                type="range" min="-12" max="12" step="1" value={deckB.low}
                onChange={(e) => handleEQChange('B', 'low', parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-900 rounded-lg accent-zinc-500 appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>

      </div>

      {/* Dual Channel Vertical Volume Faders */}
      <div className="hidden md:grid grid-cols-2 gap-4 mt-6 border-t border-zinc-850 pt-4 bg-zinc-950/20 p-3 rounded-2xl">
        <div className="flex flex-col items-center gap-2">
          <input
            type="range" min="0" max="1" step="0.05" value={deckA.vol}
            onChange={(e) => handleVolumeChange('A', parseFloat(e.target.value))}
            className="h-28 accent-orange-500 bg-zinc-950 rounded-lg appearance-none cursor-pointer rotate-270 my-2"
          />
          <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">VOL A ({Math.round(deckA.vol * 100)}%)</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <input
            type="range" min="0" max="1" step="0.05" value={deckB.vol}
            onChange={(e) => handleVolumeChange('B', parseFloat(e.target.value))}
            className="h-28 accent-cyan-500 bg-zinc-950 rounded-lg appearance-none cursor-pointer rotate-270 my-2"
          />
          <span className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-widest">VOL B ({Math.round(deckB.vol * 100)}%)</span>
        </div>
      </div>

      {/* Horizontal Crossfader Rail Area */}
      <div className="flex flex-col gap-2 mt-4 px-2">
        <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 font-bold tracking-wider">
          <span>LEFT DECK A</span>
          <span className="flex items-center gap-1 text-zinc-400 font-semibold uppercase"><Shuffle size={10} /> CROSSFADER RAIL</span>
          <span>RIGHT DECK B</span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min="-1"
            max="1"
            step="0.02"
            value={crossfader}
            onChange={handleCrossfaderChange}
            className="w-full accent-zinc-100 h-2.5 bg-zinc-950 rounded-full cursor-pointer border border-zinc-855"
          />
        </div>
        <div className="flex justify-between text-[8px] font-mono text-zinc-650 font-bold justify-items-center">
          <span>100:0</span>
          <span>50:50 SPLIT</span>
          <span>0:100</span>
        </div>
      </div>

      {/* Master Board: Room Feeds, Flanger Sweep, and Groove Swing */}
      <div className="mt-4 border-t border-zinc-500/10 pt-3 flex flex-col gap-3 bg-black/40 p-3 rounded-2xl">
        <div className="flex items-center gap-1.5 justify-center">
          <Radio className="text-zinc-500 w-3 h-3" />
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-400">MASTER FX & GROOVE</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* 1. Swing Groove Slider */}
          <div className="flex flex-col gap-1 bg-zinc-950/60 p-2 rounded-xl border border-zinc-850">
            <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-500 tracking-wider">
              <span>SWING</span>
              <span className="text-zinc-400 tabular-nums font-bold">{Math.round((swing / 0.70) * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="0.70" step="0.05" value={swing}
              onChange={handleSwingChange}
              className="w-full h-1 bg-zinc-800 rounded-lg accent-zinc-200 cursor-pointer appearance-none"
            />
            <div className="flex justify-between text-[7px] font-mono text-zinc-650 font-bold">
              <span>STRAIGHT</span>
              <span>SWING</span>
            </div>
          </div>

          {/* 2. Tape Flanger Sweep */}
          <div className="flex flex-col gap-1 bg-zinc-950/60 p-2 rounded-xl border border-zinc-850">
            <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-500 tracking-wider">
              <span>TAPE SWEEP</span>
              <span className="text-zinc-400 tabular-nums font-bold">{Math.round(flanger * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05" value={flanger}
              onChange={handleFlangerChange}
              className="w-full h-1 bg-zinc-800 rounded-lg accent-orange-500 cursor-pointer appearance-none"
            />
            <div className="flex justify-between text-[7px] font-mono text-zinc-650 font-bold">
              <span>BYPASS</span>
              <span>SWEPT</span>
            </div>
          </div>
        </div>

        {/* 3. Ambient Room Feed Selector */}
        <div className="flex flex-col gap-1 bg-zinc-950/60 p-2 rounded-xl border border-zinc-850">
          <div className="flex justify-between items-center text-[9px] font-mono font-bold text-zinc-500 tracking-wider">
            <span>UNDERGROUND ROOM OVERLAY</span>
            <span className="text-orange-400 font-extrabold text-[8px] uppercase tracking-widest">{ambient}</span>
          </div>
          <select
            value={ambient}
            onChange={handleAmbientChange}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] font-mono text-zinc-300 focus:outline-none focus:border-orange-500 cursor-pointer"
          >
            <option value="none">MUTED (PRISTINE ISOLATION)</option>
            <option value="rain">RAIN ON WAREHOUSE ROOF</option>
            <option value="subway">SUBWAY SYSTEM RUMBLE</option>
            <option value="crowd">UNDERGROUND CLUB CHATTER</option>
            <option value="drone">55HZ COZY MODULAR DRONE</option>
          </select>
        </div>
      </div>

    </div>
  );
}
