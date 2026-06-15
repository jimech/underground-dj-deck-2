import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/audioEngine';
import { Play, Pause, RefreshCw, Disc, Eye, Radio, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface TurntableProps {
  id: 'A' | 'B';
  isActive: boolean;
  onStateChange: () => void;
}

export default function Turntable({ id, isActive, onStateChange }: TurntableProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [pitch, setPitch] = useState(100); // 100% (50% to 150%)
  const [rpm, setRpm] = useState<33 | 45 | 78>(33);
  const [isReversed, setIsReversed] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [hotCues, setHotCues] = useState<number[]>([1, 5, 9]); // step cues
  const [vinylAngle, setVinylAngle] = useState(0);
  const [isScratching, setIsScratching] = useState(false);
  const [vinylWear, setVinylWear] = useState(35); // 35% starting dust level
  
  const vinylRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const lastAngleRef = useRef<number>(0);
  const scratchVelocityRef = useRef<number>(0);

  const standardTrackLabels = id === 'A' 
    ? ['Warehouse Sub Bass', 'Hypnotic Bell Echo', 'Static Drone Swoosh']
    : ['303 Acid Generator', 'Industrial Metal Hit', 'Deep Ambient Space'];

  const [uploadedTracksList, setUploadedTracksList] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    const handleUploaded = () => {
      setUploadedTracksList([...audio.uploadedTracks]);
    };
    window.addEventListener('custom-track-uploaded', handleUploaded);
    handleUploaded();
    return () => window.removeEventListener('custom-track-uploaded', handleUploaded);
  }, []);

  const trackLabels = [...standardTrackLabels, ...uploadedTracksList.map(t => t.name)];

  const rpmMultiplier = rpm === 45 ? 1.35 : rpm === 78 ? 2.35 : 1.0;

  // React to loaded session events globally
  useEffect(() => {
    const handleSessionLoaded = () => {
      setSelectedTrack(audio.deckSelectedTracks[id]);
      setIsPlaying(audio.deckPlayStates[id]);
      // Re-read pitch multiplier safely
      const rawPitch = audio.deckPitches[id];
      const parsedPitch = Math.round((rawPitch / rpmMultiplier) * 100);
      setPitch(isNaN(parsedPitch) ? 100 : Math.max(50, Math.min(150, parsedPitch)));
      setVinylWear(Math.round(audio.dustCrackleLevels[id] * 100));
      setIsReversed(audio.deckReversed[id]);
    };
    window.addEventListener('session-loaded', handleSessionLoaded);
    return () => window.removeEventListener('session-loaded', handleSessionLoaded);
  }, [id, rpmMultiplier]);

  useEffect(() => {
    const handleToggleEvent = () => {
      handlePlayToggle();
    };
    window.addEventListener(`toggle-deck-${id}`, handleToggleEvent);
    return () => window.removeEventListener(`toggle-deck-${id}`, handleToggleEvent);
  }, [id, isPlaying, onStateChange]);

  // Keep audio state in sync with pitch, RPM speed, and vinyl wear
  useEffect(() => {
    audio.deckPitches[id] = (pitch / 100) * rpmMultiplier;
  }, [pitch, rpmMultiplier, id]);

  useEffect(() => {
    audio.deckReversed[id] = isReversed;
  }, [isReversed, id]);

  useEffect(() => {
    audio.setDustCrackleLevel(id, vinylWear / 100);
  }, [vinylWear, id]);

  // Handle continuous rotation tied to active physics decel glide
  useEffect(() => {
    let lastTime = performance.now();
    
    const animateRotation = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      // Spin speed is bound to the actual analog tape glide deceleration!
      const glideRate = audio.deckGlideRates[id];
      if (glideRate > 0.01 && !isScratching) {
        const rate = (pitch / 100) * rpmMultiplier * glideRate;
        // Spin backwards if isReversed is active!
        const direction = isReversed ? -1 : 1;
        setVinylAngle(prev => (prev + direction * (rate * delta * 0.12) + 360) % 360);
      }
      requestRef.current = requestAnimationFrame(animateRotation);
    };

    requestRef.current = requestAnimationFrame(animateRotation);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [id, pitch, rpmMultiplier, isReversed, isScratching]);

  // Sync isPlaying with parent power & internal deck play states
  const handlePlayToggle = () => {
    if (!audio.isPowerOn) {
      // Trigger global play system
      audio.setPower(true);
      onStateChange();
    }
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    audio.deckPlayStates[id] = nextState;
  };

  const handleTrackSelect = (idx: number) => {
    setSelectedTrack(idx);
    audio.deckSelectedTracks[id] = idx;
  };

  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPitch(value);
  };

  const handleWearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setVinylWear(value);
  };

  const resetPitch = () => {
    setPitch(100);
  };

  // Drag-to-scratch mechanics
  const handleScratchStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (!vinylRef.current) return;
    setIsScratching(true);
    audio.deckPlayStates[id] = false; // mute track playback during scratch

    const rect = vinylRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    lastAngleRef.current = angle;
    scratchVelocityRef.current = 0;
  };

  const handleScratchMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (e.cancelable) {
      e.preventDefault();
    }
    if (!isScratching || !vinylRef.current) return;

    const rect = vinylRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const angle = Math.atan2(clientY - centerY, clientX - centerX);
    let diff = angle - lastAngleRef.current;

    // Handle crossing -PI to PI boundaries
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;

    const degDiff = diff * (180 / Math.PI);
    setVinylAngle(prev => (prev + degDiff + 360) % 360);

    const absVelocity = Math.abs(degDiff);
    scratchVelocityRef.current = absVelocity;

    // Output raw scratching sound based on cursor angular velocity!
    if (absVelocity > 1) {
      audio.triggerScratchSound(id, absVelocity / 15);
    }

    lastAngleRef.current = angle;
  };

  const handleScratchEnd = () => {
    if (!isScratching) return;
    setIsScratching(false);
    // Resume loop playback if deck was already standard playing
    audio.deckPlayStates[id] = isPlaying;
  };

  // Jump to Step Cues
  const triggerHotCue = (cueStep: number) => {
    if (!audio.isPowerOn) return;
    audio.currentStep = cueStep;
    // Visually play a click drop
    audio.triggerSample('crackle_echo');
  };

  const currentBpm = (audio.bpm * (pitch / 100)).toFixed(1);

  return (
    <div 
      id={`deck-${id}`} 
      className="flex flex-col bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_15px_30px_rgba(0,0,0,0.5)] select-none overflow-hidden relative"
    >
      {/* Top Deck Indicators */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm tracking-wide ${
            id === 'A' ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.4)]' : 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]'
          }`}>
            {id}
          </div>
          <div className="flex flex-col">
            <span className="text-zinc-500 text-[10px] uppercase tracking-widest font-semibold font-mono">CHANNEL UNIT</span>
            <span className="text-zinc-200 text-xs font-bold font-mono tracking-wider truncate max-w-[140px]">
              {isPlaying ? '● LIVE SYNCED' : '■ OUT OF MIX'}
            </span>
          </div>
        </div>

        {/* Beats / Stats HUD */}
        <div className="bg-black/40 border border-zinc-800 rounded-lg px-3 py-1 font-mono text-right min-w-[90px]">
          <div className="text-[10px] text-zinc-500 leading-none font-bold uppercase tracking-widest">TEMPO SPEED</div>
          <div className={`text-sm font-semibold tabular-nums ${id === 'A' ? 'text-orange-400' : 'text-cyan-400'}`}>{currentBpm} <span className="text-[10px]">BPM</span></div>
        </div>
      </div>

      {/* Main Platter and Control Section */}
      <div className="flex flex-col xl:flex-row gap-6 items-center justify-center my-2">
        
        {/* Turntable Vinyl Record Wrapper */}
        <div className="relative">
          {/* Heavy metal platter outer rim */}
          <div className="w-[230px] h-[230px] rounded-full bg-gradient-to-tr from-zinc-950 via-zinc-800 to-zinc-950 flex items-center justify-center p-2 shadow-2xl relative border-4 border-zinc-900">
            {/* Fine stroboscopic speed markings */}
            <div className="absolute inset-0 rounded-full border border-dashed border-zinc-700/20 opacity-80 animate-[spin_40s_linear_infinite]"></div>
            
            {/* Tone arm mechanism visual layer */}
            <div className="absolute top-1 right-1 w-16 h-28 pointer-events-none z-20 origin-top-right scale-75 transform opacity-60">
              <svg viewBox="0 0 100 200" fill="none" className="w-full h-full">
                <path d="M90 20 L40 120 L50 160" stroke="#71717a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                <rect x="42" y="155" width="16" height="30" rx="3" fill="#3f3f46" stroke="#52525b" strokeWidth="2"/>
                <circle cx="90" cy="20" r="12" fill="#52525b"/>
                <circle cx="90" cy="20" r="4" fill="#a1a1aa"/>
              </svg>
            </div>

            {/* Micro Vinyl Grooves and Platter Scratch Disc */}
            <div
              ref={vinylRef}
              onMouseDown={handleScratchStart}
              onMouseMove={handleScratchMove}
              onMouseUp={handleScratchEnd}
              onMouseLeave={handleScratchEnd}
              onTouchStart={handleScratchStart}
              onTouchMove={handleScratchMove}
              onTouchEnd={handleScratchEnd}
              className={`w-[214px] h-[214px] rounded-full bg-zinc-950 cursor-grab active:cursor-grabbing border-2 border-black relative flex items-center justify-center shadow-inner overflow-hidden shadow-black/80 touch-none`}
              style={{
                transform: `rotate(${vinylAngle}deg)`,
                cursor: isScratching ? 'grabbing' : 'grab',
              }}
            >
              {/* Radial Vinyl Grooves */}
              <div className="absolute inset-2 rounded-full border border-zinc-900/30"></div>
              <div className="absolute inset-6 rounded-full border border-zinc-900/40"></div>
              <div className="absolute inset-10 rounded-full border border-zinc-900/50"></div>
              <div className="absolute inset-14 rounded-full border border-zinc-900/50"></div>
              <div className="absolute inset-18 rounded-full border border-zinc-900/50"></div>
              <div className="absolute inset-24 rounded-full border border-zinc-950"></div>

              {/* Shimmer overlay highlighting vinyl texture reflection */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 select-none pointer-events-none"></div>

              {/* Inner Label Sticker */}
              <div className={`w-[74px] h-[74px] rounded-full bg-zinc-800 border-2 border-zinc-900 flex flex-col items-center justify-center text-center p-1 relative z-10 shadow-md ${
                id === 'A' ? 'shadow-orange-950/20' : 'shadow-cyan-950/20'
              }`}>
                {/* Vinyl Label Graphic */}
                <div className={`absolute inset-1 rounded-full border border-dashed ${
                  id === 'A' ? 'border-orange-500/30' : 'border-cyan-500/30'
                }`}></div>
                <Disc className={`w-6 h-6 mb-1 ${id === 'A' ? 'text-orange-500 animate-[spin_5s_linear_infinite]' : 'text-cyan-500 animate-[spin_5s_linear_infinite]'}`} />
                <span className="text-[7px] text-zinc-400 font-bold font-mono tracking-wider select-none truncate max-w-[64px]">
                  {id === 'A' ? 'BERLIN WARE' : 'ACID DETROIT'}
                </span>
                <span className={`text-[6px] font-semibold font-mono select-none uppercase ${
                  isReversed ? 'text-rose-400' : 'text-zinc-500'
                }`}>{isReversed ? 'REV' : 'FWD'} {rpm} RPM</span>
                
                {/* Spindle hole */}
                <div className="w-2 h-2 rounded-full bg-zinc-950 border border-zinc-700 absolute"></div>
              </div>
            </div>
          </div>

          {/* Active vinyl scratch wave alert */}
          {isScratching && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full border pointer-events-none ${
                id === 'A' ? 'border-orange-500/10 bg-orange-500/5' : 'border-cyan-500/10 bg-cyan-500/5'
              }`}
            />
          )}
        </div>

        {/* Pitch Slider, Track Selector & Play Controllers */}
        <div className="flex flex-col gap-4 w-full max-w-[200px]">
          
          {/* Pitch & Vinyl Wear Control Board */}
          <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3 shadow-inner">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 font-bold tracking-widest">
                <span>PITCH DISPLACEMENT</span>
                <button 
                  onClick={resetPitch} 
                  className={`hover:text-zinc-300 transition duration-150 py-0.5 px-1 bg-zinc-800 rounded flex gap-1 items-center uppercase text-[8px] ${
                    pitch === 100 ? 'text-zinc-600' : 'text-zinc-400'
                  }`}
                  title="Reset Pitch to 0%"
                >
                  <RefreshCw size={8} /> 0%
                </button>
              </div>

              {/* Pitch fader slider */}
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="50"
                  max="150"
                  value={pitch}
                  onChange={handlePitchChange}
                  className="w-full accent-zinc-200 cursor-pointer h-1 bg-zinc-800 rounded-lg appearance-none border border-zinc-900"
                />
                <span className="text-zinc-400 font-mono text-[10px] tabular-nums w-8 text-right font-bold">
                  {pitch > 100 ? `+${pitch - 100}` : pitch - 100}%
                </span>
              </div>
            </div>

            {/* Vinyl Dust & Wear Slider */}
            <div className="flex flex-col gap-1 border-t border-zinc-500/10 pt-2">
              <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 font-bold tracking-widest">
                <span>VINYL WEAR & RUMBLE</span>
                <span className={`text-[10px] font-mono font-bold ${id === 'A' ? 'text-orange-400' : 'text-cyan-400'}`}>
                  {vinylWear}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vinylWear}
                  onChange={handleWearChange}
                  className={`w-full cursor-pointer h-1 rounded-lg appearance-none border border-zinc-900 ${
                    id === 'A' ? 'accent-orange-500 bg-zinc-800' : 'accent-cyan-500 bg-zinc-800'
                  }`}
                />
              </div>
              <div className="flex justify-between font-mono text-[7px] text-zinc-600 font-bold px-0.5 select-none uppercase">
                <span>Clean</span>
                <span>Heavy Wear</span>
              </div>
            </div>
          </div>

          {/* RPM Speed & Direction Controls */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="bg-zinc-950/40 border border-zinc-850 p-1.5 rounded-xl flex flex-col gap-1 items-stretch">
              <span className="text-[8px] font-mono font-bold text-zinc-500 uppercase tracking-widest text-center px-1">MOTOR RPM</span>
              <div className="flex gap-1 justify-between">
                {([33, 45, 78] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRpm(r)}
                    className={`flex-1 py-1 text-[8px] font-mono font-bold rounded transition duration-150 ${
                      rpm === r
                        ? id === 'A' ? 'bg-orange-500 text-black font-extrabold shadow-[0_0_8px_rgba(249,115,22,0.4)]' : 'bg-cyan-500 text-black font-extrabold shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                        : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setIsReversed(!isReversed)}
              className={`py-1.5 px-3 rounded-xl font-mono text-[9px] font-bold uppercase tracking-wider flex flex-col items-center justify-center gap-1 border duration-150 ${
                isReversed
                  ? 'bg-rose-500/10 border-rose-500 text-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.1)] animate-pulse'
                  : 'bg-zinc-950/40 border-zinc-850 hover:bg-zinc-800/40 text-zinc-400 hover:text-white'
              }`}
            >
              <RefreshCw size={10} className={`transform transition duration-500 ${isReversed ? 'rotate-180 text-rose-400' : 'text-zinc-500'}`} />
              <span>{isReversed ? 'REV PLAYBACK' : 'FWD PLAYBACK'}</span>
            </button>
          </div>

          {/* Selector Tracks Buttons */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[9px] text-zinc-500 font-mono tracking-widest uppercase font-bold pl-1">VIRTUAL CASSETTE SELECTOR</span>
            {trackLabels.map((label, index) => (
              <button
                key={index}
                onClick={() => handleTrackSelect(index)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-left transition duration-150 relative ${
                  selectedTrack === index
                    ? id === 'A' 
                      ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30' 
                      : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'bg-zinc-950/40 hover:bg-zinc-800/40 text-zinc-400 hover:text-zinc-200 border border-zinc-850'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${
                  selectedTrack === index
                    ? id === 'A' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                    : 'bg-zinc-700'
                }`} />
                <span className="text-[10px] tracking-wide font-medium truncate flex-1">{label}</span>
                {selectedTrack === index && (
                  <Activity size={10} className={`${id === 'A' ? 'text-orange-400' : 'text-cyan-400'} animate-pulse`} />
                )}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Cue Markers / Play deck triggers */}
      <div className="grid grid-cols-2 gap-4 mt-2">
        {/* Play Pause and Cue Launchers */}
        <button
          onClick={handlePlayToggle}
          className={`flex items-center justify-center gap-3 py-3.5 px-4 rounded-2xl border transition-all duration-300 font-mono text-xs uppercase font-extrabold tracking-widest shadow-lg ${
            isPlaying
              ? id === 'A'
                ? 'bg-orange-500/15 border-orange-500 text-orange-400 shadow-orange-500/5 hover:bg-orange-500/25'
                : 'bg-cyan-500/15 border-cyan-500 text-cyan-400 shadow-cyan-500/5 hover:bg-cyan-500/25'
              : 'bg-zinc-950 hover:bg-zinc-805 border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {isPlaying ? (
            <>
              <Pause size={14} fill="currentColor" /> MUTE DECK
            </>
          ) : (
            <>
              <Play size={14} fill="currentColor" /> SLAM PLAY
            </>
          )}
        </button>

        {/* Hot Cue Points */}
        <div className="flex gap-2 bg-zinc-950/60 border border-zinc-850 p-1.5 rounded-2xl items-center justify-around">
          <span className="text-[9px] text-zinc-500 font-mono tracking-wider font-extrabold rotate-[-92deg] hidden xs:inline">CUES</span>
          {hotCues.map((step, idx) => (
            <button
              key={idx}
              onClick={() => triggerHotCue(step)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-mono font-bold border transition duration-150 ${
                id === 'A'
                  ? 'hover:bg-orange-500/20 active:bg-orange-500 text-orange-300 hover:text-orange-200 border-zinc-800 hover:border-orange-500/40 shadow-xs'
                  : 'hover:bg-cyan-500/20 active:bg-cyan-500 text-cyan-300 hover:text-cyan-200 border-zinc-800 hover:border-cyan-500/40 shadow-xs'
              }`}
              title={`Jump to step beat ${step + 1}`}
            >
              C{idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
