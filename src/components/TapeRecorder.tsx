import { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/audioEngine';
import { Download, Square, Radio, HelpCircle, Activity, Settings, RefreshCw, Sparkles, Disc, FileImage } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TapeRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [tapeAngle, setTapeAngle] = useState(0);
  const [wowAmount, setWowAmount] = useState(25); // 25% starting wow
  const [flutterAmount, setFlutterAmount] = useState(15); // 15% starting flutter
  const [tapeLevel, setTapeLevel] = useState(0); // responsive indicator light

  const animFrameRef = useRef<number | null>(null);

  // Synchronize initial Wow & Flutter settings
  useEffect(() => {
    audio.setWowAmount(wowAmount / 100);
  }, [wowAmount]);

  useEffect(() => {
    audio.setFlutterAmount(flutterAmount / 100);
  }, [flutterAmount]);

  // Animate spinning cassette reels tied to engine performance
  useEffect(() => {
    let lastTime = performance.now();
    const animateTape = (time: number) => {
      const delta = time - lastTime;
      lastTime = time;

      const isEngineRunning = audio.isPowerOn;
      const spinSpeed = audio.isRecording ? 0.15 : isEngineRunning ? 0.03 : 0;

      if (spinSpeed > 0) {
        setTapeAngle(prev => (prev + spinSpeed * delta) % 360);
      }

      // Read decibels from real-time analyzer for the VU clip warning
      if (audio.analyzer && isEngineRunning) {
        const array = new Uint8Array(audio.analyzer.frequencyBinCount);
        audio.analyzer.getByteFrequencyData(array);
        let sum = 0;
        for (let i = 0; i < 16; i++) sum += array[i];
        setTapeLevel(sum / 16 / 255);
      } else {
        setTapeLevel(0);
      }

      animFrameRef.current = requestAnimationFrame(animateTape);
    };

    animFrameRef.current = requestAnimationFrame(animateTape);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [wavUrl, setWavUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Set up a visual timer for current recording state
  useEffect(() => {
    let timer: any = null;
    if (isRecording) {
      timer = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  useEffect(() => {
    const handleToggleEvent = () => {
      if (isRecording) {
        handleStopRec();
      } else {
        handleStartRec();
      }
    };
    window.addEventListener('toggle-tape-recording', handleToggleEvent);
    return () => window.removeEventListener('toggle-tape-recording', handleToggleEvent);
  }, [isRecording]);

  const handleStartRec = () => {
    if (!audio.isPowerOn) {
      audio.setPower(true);
    }
    setElapsedSeconds(0);
    audio.startRecording();
    setIsRecording(true);
    setRecordedUrl(null);
    setWavUrl(null);
    setExportError(null);
  };

  const handleStopRec = () => {
    audio.stopRecording();
    setIsRecording(false);
    
    // Increment Tape Wizard counter in localStorage to trigger unlocked achievements
    const currentCount = parseInt(localStorage.getItem('dj_tape_wizard_count') || '0');
    localStorage.setItem('dj_tape_wizard_count', (currentCount + 1).toString());

    // Tiny timeout to let the MediaRecorder flush its chunks to the Blob URL
    setTimeout(() => {
      if (audio.recordedUrl) {
        setRecordedUrl(audio.recordedUrl);
      }
    }, 250);
  };

  const handleExportWav = async () => {
    if (wavUrl) {
      const link = document.createElement('a');
      link.href = wavUrl;
      link.download = `monolith_mix_${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    setIsExportingWav(true);
    setExportError(null);
    try {
      const wavBlob = await audio.exportWav();
      const url = URL.createObjectURL(wavBlob);
      setWavUrl(url);

      const link = document.createElement('a');
      link.href = url;
      link.download = `monolith_mix_${Date.now()}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error(err);
      setExportError(err.message || 'PCM WAV conversion failed');
    } finally {
      setIsExportingWav(false);
    }
  };

  const handleResetTapeEffects = () => {
    setWowAmount(0);
    setFlutterAmount(0);
  };

  return (
    <div 
      id="tape-recorder-widget" 
      className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_15px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between h-full"
    >
      {/* Widget Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-850 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="text-orange-500 w-4 h-4 animate-pulse" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-300">MASTER REEL-TO-REEL CASSETTE DECK</span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* VISUAL TIMER DISPLAY */}
          <div className={`font-mono text-xs px-2 py-0.5 rounded-lg border font-bold flex items-center gap-1.5 ${
            isRecording 
              ? 'bg-rose-950/30 border-rose-500/40 text-rose-400 shadow-[0_0_8px_rgba(239,68,68,0.1)]' 
              : 'bg-zinc-950 border-zinc-850 text-zinc-500'
          }`}>
            <span className="text-[9px] opacity-70 tracking-wider">ELAPSED:</span>
            <span className={isRecording ? 'animate-pulse' : ''}>{formatTime(elapsedSeconds)}</span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border font-mono text-[9px] font-bold ${
            isRecording 
              ? 'bg-rose-950/40 border-rose-500 text-rose-400 animate-pulse'
              : 'bg-zinc-950 border-zinc-800 text-zinc-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-rose-500 animate-ping' : 'bg-zinc-700'}`} />
            <span>{isRecording ? 'CAPTURING STREAM' : 'TAPE DIRECT'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
        {/* Visual Cassette Core */}
        <div className="md:col-span-5 bg-gradient-to-b from-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-inner relative overflow-hidden group min-h-[155px]">
          {/* Aesthetic Cassette Body Grid line */}
          <div className="absolute inset-0 border border-dashed border-zinc-800/20 pointer-events-none" />
          
          {/* Real Spinning Reels Graphic */}
          <div className="flex items-center gap-7 relative z-10">
            {/* Left Reel Spindle */}
            <div 
              className="w-14 h-14 rounded-full border-4 border-zinc-800 bg-gradient-to-r from-zinc-950 to-zinc-900 flex items-center justify-center shadow-md relative"
              style={{ transform: `rotate(${tapeAngle}deg)` }}
            >
              {/* Spindle teeth details */}
              <div className="absolute w-2.5 h-2.5 bg-zinc-950 border border-zinc-800 rounded-full" />
              {[...Array(6)].map((_, idx) => (
                <div 
                  key={idx} 
                  className="absolute w-0.5 h-3.5 bg-zinc-700 rounded-xs"
                  style={{ transform: `rotate(${idx * 30}deg) translateY(-14px)` }}
                />
              ))}
              <div className="absolute inset-1.5 rounded-full border border-zinc-700/10" />
            </div>

            {/* Middle Tape Window bar */}
            <div className="w-8 h-4 bg-zinc-950/80 border border-zinc-805 rounded flex items-center justify-center text-[7px] font-mono text-zinc-650 tracking-widest font-bold">
              C-60
            </div>

            {/* Right Reel Spindle */}
            <div 
              className="w-14 h-14 rounded-full border-4 border-zinc-800 bg-gradient-to-r from-zinc-950 to-zinc-900 flex items-center justify-center shadow-md relative"
              style={{ transform: `rotate(${tapeAngle}deg)` }}
            >
              {/* Spindle teeth details */}
              <div className="absolute w-2.5 h-2.5 bg-zinc-950 border border-zinc-800 rounded-full" />
              {[...Array(6)].map((_, idx) => (
                <div 
                  key={idx} 
                  className="absolute w-0.5 h-3.5 bg-zinc-700 rounded-xs"
                  style={{ transform: `rotate(${idx * 30}deg) translateY(-14px)` }}
                />
              ))}
              <div className="absolute inset-1.5 rounded-full border border-zinc-700/10" />
            </div>
          </div>

          {/* Golden tape core path representation */}
          <div className="w-2/3 h-1 bg-gradient-to-r from-amber-950/60 via-amber-850 to-amber-950/60 rounded-full mt-3 opacity-80" />

          {/* VU tape saturation glow bar */}
          <div className="flex gap-0.5 w-16 mt-2 relative z-10 justify-center">
            {[...Array(5)].map((_, idx) => {
              const active = tapeLevel * 5 > idx;
              const isPeak = idx === 4;
              return (
                <div 
                  key={idx}
                  className={`w-1.5 h-1 rounded-sm transition-colors duration-75 ${
                    active 
                      ? isPeak ? 'bg-rose-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'bg-amber-500' 
                      : 'bg-zinc-800'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Wear Control Sliders & Export Actions */}
        <div className="md:col-span-7 flex flex-col gap-4">
          <div className="bg-zinc-950/40 p-4 rounded-xl border border-zinc-850 flex flex-col gap-3">
            <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500 font-extrabold tracking-widest uppercase">
              <span>PHYSICAL BLANK TAPE DEGRADATION</span>
              <button 
                onClick={handleResetTapeEffects}
                className="hover:text-zinc-300 font-bold bg-zinc-800 px-1 py-0.5 rounded text-[8px] flex items-center gap-1 uppercase transition duration-150 border border-zinc-700"
              >
                <RefreshCw size={8} /> Pristine
              </button>
            </div>

            {/* Wow Amount Slider */}
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center font-mono text-[9px] text-zinc-400 font-bold">
                <span>WOW (SLOW MOTOR PITCH DRIFT):</span>
                <span className="text-orange-400">{wowAmount}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={wowAmount}
                onChange={e => setWowAmount(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg accent-orange-500 cursor-pointer appearance-none border border-zinc-950"
              />
            </div>

            {/* Flutter Amount Slider */}
            <div className="flex flex-col gap-1 border-t border-zinc-850/50 pt-2">
              <div className="flex justify-between items-center font-mono text-[9px] text-zinc-400 font-bold">
                <span>FLUTTER (HIGH-FREQ TAPE FRICTION):</span>
                <span className="text-orange-405 text-cyan-400">{flutterAmount}%</span>
              </div>
              <input 
                type="range" min="0" max="100" value={flutterAmount}
                onChange={e => setFlutterAmount(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-800 rounded-lg accent-cyan-500 cursor-pointer appearance-none border border-zinc-950"
              />
            </div>
          </div>

          {/* Record Control triggers list */}
          <div className="flex flex-wrap xs:flex-nowrap gap-3 items-stretch">
            {isRecording ? (
              <button
                onClick={handleStopRec}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-500 hover:bg-rose-600 text-black font-mono font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition duration-200 active:scale-95 shadow-md shadow-rose-950/20"
              >
                <Square size={12} fill="currentColor" />
                <span>STOP TAPE & FLUSH</span>
              </button>
            ) : (
              <button
                onClick={handleStartRec}
                className="flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-mono font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition duration-200 active:scale-95 shadow-md shadow-orange-950/20"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-rose-700 animate-ping" />
                <span>REC LIVE PERFORMANCE</span>
              </button>
            )}

            {/* Download session cassette triggers */}
            <AnimatePresence mode="wait">
              {recordedUrl ? (
                <div key="actions" className="flex flex-col xs:flex-row gap-2 w-full xs:w-auto">
                  {/* WebM standard */}
                  <motion.a
                    href={recordedUrl}
                    download="underground_monolith_session.webm"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="py-3 px-3 border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 hover:bg-zinc-900/60 text-zinc-300 font-mono font-extrabold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition duration-150 rounded-xl"
                    title="Download captured audio as WebM stream"
                  >
                    <Download size={11} />
                    <span>WEBM</span>
                  </motion.a>

                  {/* lossless HQ WAV */}
                  <motion.button
                    onClick={handleExportWav}
                    disabled={isExportingWav}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-zinc-800 text-black font-mono font-extrabold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition duration-200 shadow-md shadow-emerald-950/20 cursor-pointer disabled:cursor-not-allowed"
                    title="Formulate/Compile CD-fidelity 16-bit PCM WAV File"
                  >
                    {isExportingWav ? (
                      <RefreshCw size={12} className="animate-spin text-black" />
                    ) : (
                      <Download size={12} strokeWidth={3} />
                    )}
                    <span>{isExportingWav ? 'DECODING...' : 'EXPORT WAV'}</span>
                  </motion.button>

                  {/* flyer maker */}
                  <motion.button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('open-poster-generator', {
                        detail: { sessionName: 'Tape Recorded Session', bpm: audio.bpm }
                      }));
                    }}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="py-3 px-3 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-950/60 hover:bg-zinc-900/60 text-orange-400 hover:text-orange-300 font-mono font-extrabold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 transition duration-150 cursor-pointer"
                    title="Generate custom promo poster for this live tape stream"
                  >
                    <FileImage size={11} />
                    <span>FLYER</span>
                  </motion.button>
                </div>
              ) : (
                <div className="hidden xs:flex items-center justify-center px-4 bg-zinc-950/50 border border-zinc-850 rounded-xl font-mono text-[9px] text-zinc-650 font-bold select-none text-center">
                  NO CAPTURE ON SPOOL
                </div>
              )}
            </AnimatePresence>
          </div>
          {exportError && (
            <span className="text-[8px] font-mono font-bold text-rose-500 mt-1 uppercase text-center block">
              {exportError}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
