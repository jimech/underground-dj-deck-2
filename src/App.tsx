import { lazy, Suspense, useState, useEffect } from 'react';
import { audio } from './utils/audioEngine';
import Turntable from './components/Turntable';
import Mixer from './components/Mixer';
import StepSequencer from './components/StepSequencer';
import Sampler from './components/Sampler';
import TapeRecorder from './components/TapeRecorder';
import EffectsRack from './components/EffectsRack';
import AudioVisualizer from './components/AudioVisualizer';
import UserProfileAndSessionManager from './components/UserProfileAndSessionManager';
import AchievementsPanel from './components/AchievementsPanel';
import { Power, Radio, Disc, Terminal, Award, Zap, Shield, Headphones, HelpCircle, Palette, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OnboardingTour from './components/OnboardingTour';
import KeyboardShortcutsModal from './components/KeyboardShortcutsModal';
import { getPublicRouteFromLocation } from './lib/publicRoutes';

const PublicPage = lazy(() => import('./components/PublicPages').then((module) => ({ default: module.PublicPage })));
const SetPosterGenerator = lazy(() => import('./components/SetPosterGenerator'));

export default function App() {
  const publicRoute = getPublicRouteFromLocation(window.location.pathname);
  if (publicRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-zinc-950 text-zinc-500 font-mono uppercase tracking-widest flex items-center justify-center">Loading public signal...</div>}>
        <PublicPage route={publicRoute} />
      </Suspense>
    );
  }

  return <StudioApp />;
}

function StudioApp() {
  const [isPowerOn, setIsPowerOn] = useState(false);
  const [activeSyncHeartbeats, setActiveSyncHeartbeats] = useState(0);
  const [stickerText, setStickerText] = useState(audio.stickerText);
  const [posterData, setPosterData] = useState<{ isOpen: boolean; sessionName?: string; bpm?: number }>({ isOpen: false });
  const [mobileVisibleSection, setMobileVisibleSection] = useState<'all' | 'decks' | 'fx' | 'instruments' | 'profile'>('all');
  const [activeWorkspace, setActiveWorkspace] = useState<'studio' | 'account'>('studio');
  const [theme, setTheme] = useState<'normal' | 'light' | 'dark' | '90s'>('normal');
  const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
  const [transitioningTo, setTransitioningTo] = useState<'normal' | 'light' | 'dark' | '90s' | null>(null);

  // Load and apply initial theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('dj_theme') as 'normal' | 'light' | 'dark' | '90s';
    if (savedTheme && ['normal', 'light', 'dark', '90s'].includes(savedTheme)) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else {
      document.documentElement.setAttribute('data-theme', 'normal');
    }
  }, []);

  const handleThemeChange = (newTheme: 'normal' | 'light' | 'dark' | '90s') => {
    // Avoid double triggering if already transitioning
    if (newTheme === theme) return;
    
    setTransitioningTo(newTheme);
    setIsThemeTransitioning(true);

    if (audio.isPowerOn) {
      audio.triggerSample('crackle_echo');
    }

    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('dj_theme', newTheme);

    // Fade out / end transition after 800ms
    setTimeout(() => {
      setIsThemeTransitioning(false);
    }, 800);
  };

  // Poll for general clock synchronizations to animate auxiliary lights
  useEffect(() => {
    let timer: number;
    const tick = () => {
      if (audio.isPowerOn) {
        setActiveSyncHeartbeats(prev => prev + 1);
      }
      timer = window.setTimeout(tick, Math.max(100, 60000 / audio.bpm / 4)); // lock to current bpm steps
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleSessionLoaded = () => {
      setStickerText(audio.stickerText);
    };
    window.addEventListener('session-loaded', handleSessionLoaded);
    return () => window.removeEventListener('session-loaded', handleSessionLoaded);
  }, []);

  const handlePowerToggle = () => {
    const nextState = !isPowerOn;
    setIsPowerOn(nextState);
    audio.setPower(nextState);
    if (nextState) {
      // Trigger a subtle welcoming click/dust pop
      audio.triggerSample('crackle_echo');
    }
  };

  useEffect(() => {
    const handleToggleEvent = () => {
      handlePowerToggle();
    };
    window.addEventListener('toggle-master-power', handleToggleEvent);
    return () => window.removeEventListener('toggle-master-power', handleToggleEvent);
  }, [isPowerOn]);

  useEffect(() => {
    const handleOpenPoster = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail || {};
      setPosterData({
        isOpen: true,
        sessionName: detail.sessionName,
        bpm: detail.bpm
      });
    };
    window.addEventListener('open-poster-generator', handleOpenPoster);
    return () => window.removeEventListener('open-poster-generator', handleOpenPoster);
  }, []);

  return (
    <div 
      id="app-root-container" 
      className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col p-4 md:p-8 font-sans selection:bg-orange-500/30 selection:text-orange-200 transition-colors duration-300"
    >
      
      {/* Outer Industrial Background Grid Overlay & Grid Accents */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000003_1px,transparent_1px),linear-gradient(to_bottom,#000003_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none select-none z-0 opacity-10" />

      {/* Main Structural Frame */}
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 relative z-10 flex-1">
        
        {/* TOP STATION HEADER */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-850 pb-6">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono tracking-[0.25em] font-extrabold text-orange-500 bg-orange-950/20 px-2 py-0.5 rounded border border-orange-900/30">
                TOKYO-BERLIN DUPLEX LINK
              </span>
              <span className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase font-semibold">
                v2.66-OFFLINE
              </span>
            </div>
            
            <h1 className="text-xl md:text-2xl font-mono font-bold tracking-tight text-white uppercase flex items-center gap-2.5">
              <Disc className="animate-[spin_10s_linear_infinite] text-zinc-600 w-5 h-5" />
              Underground DJ Monolith
              <span className="text-xs text-zinc-500 font-normal lowercase tracking-normal">synth & drum rig</span>
            </h1>
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-wider font-semibold">
              Bespoke high-performance digital sound station / zero external request latency
            </p>
          </div>

          {/* MASTER POWER & AUX STATS */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl p-1.5 font-mono select-none">
              {(['studio', 'account'] as const).map((workspace) => {
                const active = activeWorkspace === workspace;
                return (
                  <button
                    key={workspace}
                    type="button"
                    onClick={() => setActiveWorkspace(workspace)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-extrabold uppercase tracking-widest transition ${
                      active
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                        : 'bg-zinc-900/40 border-zinc-850 text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {workspace === 'studio' ? <Disc size={11} /> : <User size={11} />}
                    <span>{workspace === 'studio' ? 'Studio' : 'Account'}</span>
                  </button>
                );
              })}
            </div>
            
            {/* System Status Info Table */}
            <div className="hidden xs:grid grid-cols-2 gap-x-4 gap-y-0.5 bg-zinc-950/40 border border-zinc-850/60 rounded-xl p-3 font-mono text-[10px] text-zinc-500 select-none">
              <div>CLOCK REF: <span className="text-zinc-400 font-bold">INTERNAL</span></div>
              <div>RATE: <span className="text-zinc-400 font-bold">44.1 kHz</span></div>
              <div>BUFF LATENCY: <span className="text-zinc-400 font-bold">&lt; 2.8ms</span></div>
              <div>ENGINE PATH: <span className="text-emerald-400 font-bold">WEBAUDIO</span></div>
            </div>

            {/* Professional Theme Selector Console */}
            <div className="flex flex-col gap-1.5 bg-zinc-950/40 border border-zinc-850/60 rounded-2xl p-2.5 font-mono select-none">
              <span className="text-[8px] font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                <Palette size={10} className="text-orange-500" /> DECK GRAPHICS / THEME:
              </span>
              <div className="flex gap-1">
                {(['normal', 'light', 'dark', '90s'] as const).map((t) => {
                  const active = theme === t;
                  const labels = {
                    normal: 'MONOLITH',
                    light: 'SILVER',
                    dark: 'OBSIDIAN',
                    '90s': '90S RAVE'
                  };
                  return (
                    <button
                      key={t}
                      onClick={() => handleThemeChange(t)}
                      className={`px-2 py-1 rounded text-[8px] font-extrabold tracking-widest cursor-pointer transition ${
                        active 
                          ? 'bg-orange-500/10 text-orange-400 border border-orange-500/40' 
                          : 'bg-zinc-900/40 text-zinc-500 hover:text-zinc-300 border border-zinc-850'
                      }`}
                    >
                      {labels[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Guide Tour Launcher Button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('trigger-onboarding-tour'))}
              className="flex items-center gap-2 px-4 py-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-900/40 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all font-mono text-xs uppercase font-extrabold tracking-widest cursor-pointer"
              title="Launch Guided Operational Tour"
            >
              <HelpCircle size={14} className="text-zinc-500 hover:text-orange-400 transition" />
              <span>GUIDED TOUR</span>
            </button>

            {/* Red Monolithic Master Switch */}
            <button
              id="master-power-btn"
              onClick={handlePowerToggle}
              className={`flex items-center gap-3.5 px-6 py-4 rounded-2xl border-2 transition-all duration-300 font-mono text-xs uppercase font-extrabold tracking-widest ${
                isPowerOn
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 hover:bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-rose-950/25 border-rose-900/40 text-rose-500 hover:bg-rose-950/40 shadow-[0_0_20px_rgba(239,68,68,0.02)] animate-pulse'
              }`}
            >
              <Power size={14} className={isPowerOn ? 'animate-none' : 'animate-spin-slow'} />
              <span>{isPowerOn ? 'SYSTEM ACTIVE' : 'POWER ON'}</span>
            </button>

          </div>
        </header>

        {/* MOCK ADHESIVE TAPE DUCT LABELS (AESTHETIC DECAL) */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
          {/* Handwritten-style scotch sticker */}
          <div className="transform -rotate-1 bg-amber-100 hover:rotate-0 transition duration-150 px-5 py-1.5 text-zinc-900 relative shadow-md text-xs font-mono font-bold border border-amber-200/80 rounded-sm">
            <div className="absolute top-0 bottom-0 -left-1 w-2 bg-[linear-gradient(to_bottom,transparent_4px,#ccc_4px,#ccc_8px,transparent_8px)] opacity-30"></div>
            {stickerText}
          </div>
          
          <div className="transform rotate-1 bg-zinc-900 border border-zinc-820 px-4 py-1 text-zinc-400 flex items-center gap-2 text-[10px] font-mono font-extrabold uppercase tracking-widest rounded-xl">
            <Headphones size={11} className="text-zinc-500" />
            <span>HEADPHONE SPLIT: CUE-MONITOR ACTIVE</span>
            <div className={`w-2 h-2 rounded-full ${isPowerOn ? 'bg-orange-500 animate-ping' : 'bg-zinc-800'}`} />
          </div>
        </div>

        {activeWorkspace === 'account' ? (
          <div className="mt-2">
            <UserProfileAndSessionManager mode="account" />
          </div>
        ) : (
          <>
            {/* STICKY MOBILE NAVIGATION CONTROLS (PIONEER-STYLE TACTILE PAGE SELECTOR) */}
            <div className="lg:hidden sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 p-2.5 -mx-4 mb-2 flex flex-col gap-1.5 shadow-[0_10px_20px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between px-1">
                <span className="text-[8px] font-mono text-zinc-500 font-extrabold uppercase tracking-widest">TACTILE RIG MONITOR</span>
                <span className="text-[8px] font-mono text-orange-500 font-extrabold uppercase tracking-widest animate-pulse">● CUE CHANNELS DIRECT</span>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none snap-x touch-pan-x">
                {(['all', 'decks', 'fx', 'instruments', 'profile'] as const).map((sec) => {
                  const active = mobileVisibleSection === sec;
                  const labels = {
                    all: 'ALL UNITS',
                    decks: 'DECKS & MIX',
                    fx: 'TAPE MASTER & FX',
                    instruments: 'BEATS & DRUMS',
                    profile: 'CABINET & RAVES',
                  };
                  return (
                    <button
                      key={sec}
                      onClick={() => setMobileVisibleSection(sec)}
                      className={`px-3.5 py-2.5 rounded-xl text-[9px] font-mono font-extrabold uppercase tracking-wider shrink-0 transition duration-150 border cursor-pointer snap-start ${
                        active
                          ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-black shadow-[0_0_8px_rgba(249,115,22,0.15)]'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {labels[sec]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* MAIN BENTO DECK GRID (TURNTABLES & MIXER) */}
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch ${
              mobileVisibleSection === 'all' || mobileVisibleSection === 'decks' ? 'block lg:grid' : 'hidden lg:grid'
            }`}>
              
              {/* DECK A PLATTEN */}
              <div className="lg:col-span-4 flex flex-col justify-between">
                <Turntable id="A" isActive={isPowerOn} onStateChange={() => setIsPowerOn(true)} />
              </div>

              {/* VISUAL MONITOR & EQUALIZER mixer */}
              <div className="lg:col-span-4 flex flex-col gap-6 justify-between">
                
                {/* Visualizer stays on top */}
                <AudioVisualizer />
                
                {/* Mixer is under the Visualizer */}
                <Mixer />

              </div>

              {/* DECK B PLATTEN */}
              <div className="lg:col-span-4 flex flex-col justify-between">
                <Turntable id="B" isActive={isPowerOn} onStateChange={() => setIsPowerOn(true)} />
              </div>

            </div>

            {/* TAPE MASTER RECORDER DECK UNIT & KAOSS EFFECTS RACK */}
            <div id="master-tape-and-fx-unit" className={`grid grid-cols-1 xl:grid-cols-12 gap-6 mt-1 items-stretch ${
              mobileVisibleSection === 'all' || mobileVisibleSection === 'fx' ? 'block lg:grid' : 'hidden lg:grid'
            }`}>
              <div className="xl:col-span-6 h-full">
                <TapeRecorder />
              </div>
              <div className="xl:col-span-6 h-full">
                <EffectsRack />
              </div>
            </div>

            {/* LOG SYSTEM, DIGITAL AUDIO CARTRIDGE CABINET, AND SESSION LOBBY */}
            <div className={`${mobileVisibleSection === 'all' || mobileVisibleSection === 'profile' ? 'block' : 'hidden lg:block'}`}>
              <UserProfileAndSessionManager />
              
              {/* LIVE RAVE REWARDS & CROWD LEVEL STATS */}
              <div className="mt-6">
                <AchievementsPanel />
              </div>
            </div>

            {/* BOTTOM SECTION RACKS (DRUM SEQUENCER & SOUND EFFECTS PADS) */}
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 mt-2 items-stretch ${
              mobileVisibleSection === 'all' || mobileVisibleSection === 'instruments' ? 'block lg:grid' : 'hidden lg:grid'
            }`}>
              
              {/* DRUM MACHINE */}
              <div className="lg:col-span-7 h-full">
                <StepSequencer />
              </div>

              {/* MPC PAD SAMPLER */}
              <div className="lg:col-span-5 h-full">
                <Sampler />
              </div>

            </div>
          </>
        )}

        {/* STATIC ANALOG WIRES & ACCENTS FOOTER */}
        <footer className="mt-8 border-t border-zinc-850 pt-6 pr-1 flex flex-col lg:flex-row items-center justify-between text-[11px] font-mono text-zinc-600 gap-4">
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
            <span className="flex items-center gap-1"><Terminal size={12} /> INTERACTIVE SIMULATOR</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Award size={12} /> CROWD SYNC APPROVED</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Shield size={12} /> OFFLINE HARDWARE ROUTING</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 bg-zinc-950/40 px-4 py-2 border border-zinc-850/60 rounded-2xl">
            <span className="text-[9px] uppercase tracking-widest text-zinc-500 font-extrabold">RESIDENT OPERATOR:</span>
            <a 
              href="mailto:jimemettr@gmail.com" 
              className="text-orange-400 hover:text-orange-300 font-bold tracking-wider hover:underline transition duration-155"
            >
              jimemettr@gmail.com
            </a>
            <span className="text-zinc-600">•</span>
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 bg-zinc-900/60 px-2 py-0.5 rounded-lg border border-zinc-850">
              SYSTEMS ARCHITECT
            </span>
          </div>
        </footer>

      </div>

      {/* AUTOPLAY AUDIO BLOCK DIALOG MODAL / COVER OVERLAY */}
      <AnimatePresence>
        {!isPowerOn && activeWorkspace === 'studio' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#070709]/95 backdrop-blur-md z-50 flex items-center justify-center p-6 text-center select-none"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="max-w-md w-full bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-8 flex flex-col items-center gap-6 shadow-[0_30px_60px_rgba(0,0,0,0.8)] relative overflow-hidden"
            >
              {/* Retro sticker decal */}
              <div className="absolute top-2 right-2 rotate-12 bg-amber-400 text-black text-[8px] font-mono font-extrabold px-1.5 py-0.5 rounded">
                STUDIO WORKSPACE
              </div>
              
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border-2 border-rose-500/40 text-rose-500 flex items-center justify-center animate-pulse">
                <Power size={28} />
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-xl font-mono font-bold text-white uppercase tracking-wider">CONSOLE STANDBY</h2>
                <p className="text-zinc-500 font-mono text-xs uppercase tracking-wider">Underground DJ Monolith</p>
                <p className="text-zinc-400 text-xs leading-relaxed mt-2">
                  An interactive Web Audio mixer, synthesizer, and performance deck. Click below to initialize the high-performance audio engine and start your live set.
                </p>
              </div>

              <button
                onClick={handlePowerToggle}
                className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-mono font-extrabold text-xs uppercase tracking-widest transition duration-150 shadow-[0_0_15px_rgba(249,115,22,0.4)]"
              >
                INITIALIZE MIXING DESK
              </button>

              <button
                type="button"
                onClick={() => setActiveWorkspace('account')}
                className="w-full py-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-400 hover:text-black text-cyan-300 font-mono font-extrabold text-[10px] uppercase tracking-widest transition duration-150 flex items-center justify-center gap-2"
              >
                <User size={13} />
                OPEN ACCOUNT / LIBRARY
              </button>

              <div className="text-[10px] font-mono text-zinc-650">
                HTML5 WEB AUDIO CONTEXT SECURED // HIGH-PERFORMANCE LOW LATENCY
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROFESSIONAL THEME TRANSITION GLITCH & SCANLINE OVERLAY */}
      <AnimatePresence>
        {isThemeTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="fixed inset-0 pointer-events-none z-[60] bg-zinc-950/25 backdrop-blur-[1px] flex flex-col justify-between overflow-hidden"
          >
            {/* Screen flicker flash layer */}
            <motion.div 
              initial={{ opacity: 0.75 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 bg-white/5 mix-blend-overlay"
            />

            {/* Sweep Laser Bar */}
            <div className={`absolute left-0 right-0 h-[4px] bg-gradient-to-r from-transparent via-current to-transparent opacity-90 blur-[1px] animate-scanswipe ${
              transitioningTo === 'light' ? 'text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.9)]' :
              transitioningTo === 'dark' ? 'text-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.9)]' :
              transitioningTo === '90s' ? 'text-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.9)]' :
              'text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.9)]'
            }`} />

            {/* Center HUD status panel */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950/90 border border-zinc-800/80 px-5 py-3.5 rounded-2xl flex items-center gap-3.5 shadow-[0_15px_40px_rgba(0,0,0,0.85)] backdrop-blur-md select-none">
              <div className={`w-2.5 h-2.5 rounded-full animate-ping ${
                transitioningTo === 'light' ? 'bg-blue-500' :
                transitioningTo === 'dark' ? 'bg-fuchsia-500' :
                transitioningTo === '90s' ? 'bg-rose-500' :
                'bg-orange-500'
              }`} />
              <div className="flex flex-col gap-0.5 font-mono text-[9px] tracking-widest font-black uppercase">
                <span className="text-zinc-500 text-[8px]">TACTILE STATE SWITCH</span>
                <span className={`text-xs ${
                  transitioningTo === 'light' ? 'text-blue-400' :
                  transitioningTo === 'dark' ? 'text-fuchsia-400' :
                  transitioningTo === '90s' ? 'text-yellow-400' :
                  'text-orange-400'
                }`}>
                  {transitioningTo === 'light' ? 'SILVER RIG LOADED' :
                   transitioningTo === 'dark' ? 'OBSIDIAN CORE LOADED' :
                   transitioningTo === '90s' ? 'TOKYO 90S ACTIVE' :
                   'MONOLITH SECURED'}
                </span>
              </div>
            </div>

            {/* Micro grid line pattern */}
            <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-[0.14]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Guided First-Run Tour and Assistance ProtocolOverlay */}
      <OnboardingTour />

      {/* Keyboard shortcuts diagnostic board overlay */}
      <KeyboardShortcutsModal />

      {/* High precision aesthetic set poster/flyer generator overlay */}
      {posterData.isOpen && (
        <Suspense fallback={null}>
          <SetPosterGenerator 
            defaultSessionName={posterData.sessionName}
            defaultBpm={posterData.bpm}
            onClose={() => setPosterData({ isOpen: false })}
          />
        </Suspense>
      )}

    </div>
  );
}
