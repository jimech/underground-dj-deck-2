import React, { useState, useEffect, useRef } from 'react';
import { drawSetPoster, PosterMetadata } from '../utils/posterRenderer';
import { audio } from '../utils/audioEngine';
import { 
  X, Download, RefreshCw, Image as ImageIcon, Sparkles, 
  User, Music, Type, Flame, Heart, FileImage, Layers
} from 'lucide-react';
import { generateFlyerCopy } from '../lib/apiClient';

interface SetPosterGeneratorProps {
  onClose: () => void;
  defaultSessionName?: string;
  defaultBpm?: number;
}

export default function SetPosterGenerator({ onClose, defaultSessionName, defaultBpm }: SetPosterGeneratorProps) {
  // Read initial fields from localStorage or fallbacks
  const [djName, setDjName] = useState('DJ Monolith');
  const [djCrew, setDjCrew] = useState('BUNKER COLLECTIVE');
  const [soundStyle, setSoundStyle] = useState('INDUSTRIAL TECHNO');
  const [sessionName, setSessionName] = useState(defaultSessionName || 'LIVE SETUP IMPR0V');
  const [bpm, setBpm] = useState(defaultBpm || audio.bpm || 130);
  const [ambientMode, setAmbientMode] = useState('none');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '9:16'>('1:1');
  const [isRendering, setIsRendering] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const [socialCaption, setSocialCaption] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync state values on initial load
  useEffect(() => {
    const savedName = localStorage.getItem('dj_profile_name');
    if (savedName) setDjName(savedName);

    const savedCrew = localStorage.getItem('dj_profile_crew');
    if (savedCrew) setDjCrew(savedCrew);

    const savedStyle = localStorage.getItem('dj_profile_style');
    if (savedStyle) setSoundStyle(savedStyle);

    setAmbientMode(audio.ambientMode || 'none');
  }, []);

  // Format today's date in a highly aesthetic, clean rave format: "15.06.2026"
  const getFormattedDate = () => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const drawAndCachePoster = async () => {
    if (!canvasRef.current) return;
    setIsRendering(true);

    try {
      const meta: PosterMetadata = {
        djName: djName.trim() || 'DJ MONOLITH',
        djCrew: djCrew.trim() || 'BUNKER COLLECTIVE',
        soundStyle: soundStyle.trim() || 'WARPED TECHNO',
        sessionName: sessionName.trim() || 'SYS_ACTIVE_IMPROV',
        bpm: Number(bpm) || 130,
        dateStr: getFormattedDate(),
        ambientMode: ambientMode || 'none',
        aspectRatio,
      };

      await drawSetPoster(canvasRef.current, meta);
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setPosterUrl(dataUrl);
    } catch (err) {
      console.error('Failed drawing high fidelity poster', err);
    } finally {
      setIsRendering(false);
    }
  };

  // Redraw when fields alter
  useEffect(() => {
    // Debounce redraw slightly for rapid keystrokes
    const timer = setTimeout(() => {
      drawAndCachePoster();
    }, 250);

    return () => clearTimeout(timer);
  }, [djName, djCrew, soundStyle, sessionName, bpm, ambientMode, aspectRatio]);

  const handleDownload = () => {
    if (!posterUrl) return;
    const downloadLink = document.createElement('a');
    downloadLink.href = posterUrl;
    downloadLink.download = `rave_flyer_${aspectRatio.replace(':', '_')}_${Date.now()}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleGenerateCopy = async () => {
    if (isGeneratingCopy) return;

    setIsGeneratingCopy(true);
    try {
      const result = await generateFlyerCopy({
        djName,
        djCrew,
        soundStyle,
        sessionName,
        bpm: Number(bpm) || 130,
        ambientMode,
        aspectRatio,
      });

      if (result.ok === false) {
        setSocialCaption('AI copy unavailable. Poster fields remain editable and export-ready.');
        return;
      }

      setSessionName(result.data.eventTitle);
      setSoundStyle(result.data.soundSignature);
      setDjCrew(result.data.tagline);
      setSocialCaption(result.data.socialCaption);
    } catch {
      setSocialCaption('AI copy unavailable. Poster fields remain editable and export-ready.');
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        id="set-poster-generator-container"
        className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] flex flex-col max-h-[92vh] md:flex-row"
      >
        {/* Left column: Controls Panel */}
        <div className="w-full md:w-1/2 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-zinc-850 max-h-[45vh] md:max-h-[92vh] overflow-y-auto">
          <div className="flex flex-col gap-4">
            {/* Title banner */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] font-extrabold tracking-widest text-orange-500 font-mono uppercase bg-orange-950/30 px-2.5 py-1 rounded inline-block border border-orange-900/30">
                  RAVE SOCIAL SHARE
                </span>
                <h2 className="text-lg md:text-xl font-mono font-bold text-white mt-1 uppercase">Flyer Generator</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-500 hover:text-white transition duration-150 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-zinc-400 font-mono leading-relaxed">
              Export high-fidelity, customized club flyers of your session. Perfect for sharing the underground vibe across social networks.
            </p>

            <button
              type="button"
              onClick={handleGenerateCopy}
              disabled={isGeneratingCopy}
              className="w-full py-2.5 bg-cyan-500/10 hover:bg-cyan-400 hover:text-black text-cyan-300 border border-cyan-500/30 font-semibold rounded-2xl text-[10px] font-mono uppercase tracking-widest transition duration-150 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
              title="Generate poster title, sound signature, tagline, and social caption"
            >
              <Sparkles size={14} className={isGeneratingCopy ? 'animate-pulse' : ''} />
              <span>{isGeneratingCopy ? 'Generating Copy...' : 'Generate AI Flyer Copy'}</span>
            </button>

            {socialCaption && (
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-3 flex flex-col gap-2">
                <span className="text-[8px] font-mono text-zinc-500 uppercase tracking-widest font-extrabold">
                  Social Caption
                </span>
                <p className="text-[10px] text-zinc-300 font-mono leading-relaxed">
                  {socialCaption}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(socialCaption);
                  }}
                  className="self-start px-2.5 py-1.5 rounded-lg border border-zinc-800 text-[8px] font-mono uppercase font-extrabold text-zinc-400 hover:text-cyan-300 hover:border-cyan-700/70 transition"
                >
                  Copy Caption
                </button>
              </div>
            )}

            {/* Fields Config Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2 font-mono text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500 text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <User size={10} className="text-orange-500" /> Live DJ Name:
                </label>
                <input
                  type="text"
                  value={djName}
                  onChange={(e) => setDjName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 text-zinc-200 rounded-xl px-3 py-2 outline-none uppercase font-semibold text-[11px]"
                  placeholder="DJ MONOLITH"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500 text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <Layers size={10} className="text-orange-500" /> Crew / Collective:
                </label>
                <input
                  type="text"
                  value={djCrew}
                  onChange={(e) => setDjCrew(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 text-zinc-200 rounded-xl px-3 py-2 outline-none uppercase font-semibold text-[11px]"
                  placeholder="BUNKER COLLECTIVE"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500 text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <Music size={10} className="text-orange-500" /> Sound Signature:
                </label>
                <input
                  type="text"
                  value={soundStyle}
                  onChange={(e) => setSoundStyle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 text-zinc-200 rounded-xl px-3 py-2 outline-none uppercase font-semibold text-[11px]"
                  placeholder="INDUSTRIAL TECHNO"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500 text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <Type size={10} className="text-orange-500" /> Rig Patch Title:
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 text-zinc-200 rounded-xl px-3 py-2 outline-none uppercase font-semibold text-[11px]"
                  placeholder="LIVE SETUP IMPROV"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500 text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <Flame size={10} className="text-orange-500" /> Set Speed (BPM):
                </label>
                <input
                  type="number"
                  value={bpm}
                  onChange={(e) => setBpm(Math.max(40, Math.min(260, Number(e.target.value))))}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 text-zinc-200 rounded-xl px-3 py-2 outline-none font-semibold text-[11px]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-zinc-500 text-[10px] font-extrabold uppercase flex items-center gap-1">
                  <Sparkles size={10} className="text-orange-500" /> Background Mode:
                </label>
                <select
                  value={ambientMode}
                  onChange={(e) => setAmbientMode(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-orange-500 text-zinc-200 rounded-xl px-3 py-2 outline-none uppercase font-semibold text-[11px] cursor-pointer"
                >
                  <option value="none">PURE SIGNAL ONLY</option>
                  <option value="subway">SUBWAY SYSTEM TUNNEL</option>
                  <option value="rain">RAINY WAREHOUSE ROOF</option>
                  <option value="crowd">CONCRETE MAINROOM CROWD</option>
                  <option value="drone">SUBTERRANEAN ANCHOR DRONE</option>
                </select>
              </div>
            </div>

            {/* Format Selection Choice */}
            <div className="flex flex-col gap-2 pt-4 border-t border-zinc-850 mt-2 font-mono">
              <span className="text-[10px] font-extrabold text-zinc-500 uppercase flex items-center gap-1">
                <ImageIcon size={10} className="text-orange-500" /> Format & Dimension Mode:
              </span>
              <div className="grid grid-cols-2 gap-3 mt-1 text-xs">
                <button
                  type="button"
                  onClick={() => setAspectRatio('1:1')}
                  className={`py-2 px-3 rounded-2xl border transition duration-150 flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    aspectRatio === '1:1'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                      : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <span className="font-extrabold text-[11px]">SQUARE MODEL (1:1)</span>
                  <span className="text-[8px] opacity-70 uppercase font-medium">Instagram Post / Feed card</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAspectRatio('9:16')}
                  className={`py-2 px-3 rounded-2xl border transition duration-150 flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                    aspectRatio === '9:16'
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400'
                      : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700 hover:text-white'
                  }`}
                >
                  <span className="font-extrabold text-[11px]">STAND ARRANGE (9:16)</span>
                  <span className="text-[8px] opacity-70 uppercase font-medium">TikTok, Stories or Reels</span>
                </button>
              </div>
            </div>
          </div>

          {/* Action Trigger in left bottom */}
          <div className="pt-6 border-t border-zinc-850 mt-4">
            <button
              onClick={handleDownload}
              disabled={!posterUrl || isRendering}
              className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-black font-semibold rounded-2xl text-[11px] font-mono uppercase tracking-widest transition duration-150 flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={15} />
              <span>{isRendering ? 'Rendering Raster...' : 'Export Flyer Image'}</span>
            </button>
          </div>
        </div>

        {/* Right column: Image Live Preview Panel */}
        <div className="w-full md:w-1/2 p-6 bg-zinc-950/50 flex flex-col items-center justify-center relative min-h-[350px] max-h-[45vh] md:max-h-[92vh] overflow-y-auto">
          {/* Real Canvas element drawn in background (hidden/sized to dpr format output) */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Live Preview Display Box */}
          {posterUrl ? (
            <div className="relative flex items-center justify-center max-h-[330px] md:max-h-[72vh] rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-[0_15px_30px_rgba(0,0,0,0.5)] bg-zinc-950/80 p-0.5">
              <img 
                src={posterUrl} 
                alt="Rave Poster Live Preview" 
                className={`object-contain block max-w-full rounded-xl w-auto ${
                  aspectRatio === '1:1' ? 'max-h-[290px] md:max-h-[66vh]' : 'max-h-[310px] md:max-h-[70vh]'
                }`}
              />
              <span className="absolute top-3.5 left-3.5 text-[7px] font-mono uppercase px-2 py-0.5 bg-black/80 rounded border border-zinc-800 text-orange-500 font-extrabold select-none">
                PREVIEWING COMPRESSED TEXTURE
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-zinc-600 font-mono text-xs">
              <RefreshCw className="animate-spin text-orange-500" size={20} />
              <span>CREATING INDUSTRIAL SECTIONS...</span>
            </div>
          )}

          {/* Dimension Tag Info */}
          <div className="mt-4 font-mono text-[8px] text-zinc-500 uppercase tracking-wider select-none text-center">
            {aspectRatio === '1:1' ? '2160 × 2160 pixels // 1:1 format output size' : '2160 × 3840 pixels // 9:16 format output size'}
          </div>
        </div>
      </div>
    </div>
  );
}
