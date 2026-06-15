import React, { useState, useEffect } from 'react';
import { 
  X, HelpCircle, Power, Disc, Activity, Sparkles, 
  Layers, Volume2, ShieldAlert, MonitorCheck, PlaySquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function KeyboardShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  // 1. Setup keyboard capture logic
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Gracefully ignore triggers when keyboard focus lies on any active text editable blocks
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement || 
        target instanceof HTMLTextAreaElement || 
        target.isContentEditable
      ) {
        return;
      }

      // Check special trigger key pairings
      const requestedHelpTrigger = e.key === '?' || (e.key === '/' && e.shiftKey);
      
      if (requestedHelpTrigger) {
        e.preventDefault();
        setIsOpen(prev => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
        return;
      }

      // 2. Main interactive shortcuts (only if not typed in inputs. They trigger custom events)
      switch (e.key.toLowerCase()) {
        case ' ': // Spacebar
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('toggle-master-power'));
          break;
        case 'a':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('toggle-deck-A'));
          break;
        case 'b':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('toggle-deck-B'));
          break;
        case 'r':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('toggle-tape-recording'));
          break;
        case 'v':
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('cycle-visualizer-mode'));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  // Clean event receptor to trigger modal via help click buttons elsewhere
  useEffect(() => {
    const handleTrigger = () => {
      setIsOpen(true);
    };
    window.addEventListener('trigger-shortcuts-help', handleTrigger);
    return () => window.removeEventListener('trigger-shortcuts-help', handleTrigger);
  }, []);

  const handleClose = () => setIsOpen(false);

  const shortcutGroups = [
    {
      title: "🎛️ CORE RENDER DECK SYSTEM",
      items: [
        { key: "SPACEBAR", desc: "Toggle master circuitry power on/off & sequencer scheduler state", icon: <Power className="w-3.5 h-3.5 text-rose-500" /> },
        { key: "A", desc: "Instantly play or suspend Vinyl spindle reels on Deck A", icon: <Disc className="w-3.5 h-3.5 text-orange-400" /> },
        { key: "B", desc: "Instantly play or suspend Vinyl spindle reels on Deck B", icon: <Disc className="w-3.5 h-3.5 text-cyan-400" /> },
      ]
    },
    {
      title: "📼 STREAM RECORDING & COMPILATION",
      items: [
        { key: "R", desc: "Toggle Master Cassette spool capturing live sets", icon: <Activity className="w-3.5 h-3.5 text-emerald-400" /> },
        { key: "V", desc: "Cycle real-time audio visualizer graphic representation mode", icon: <Layers className="w-3.5 h-3.5 text-amber-500" /> },
      ]
    },
    {
      title: "🎹 INDUSTRIAL INST Hits (PADS)",
      items: [
        { key: "1 - 8", desc: "Instantly fire corresponding sound sampler triggers keys 1 to 8", icon: <Volume2 className="w-3.5 h-3.5 text-orange-500" /> },
        { key: "?", desc: "Mount/Unmount this interactive system shortcut controller panel", icon: <HelpCircle className="w-3.5 h-3.5 text-cyan-500" /> },
      ]
    }
  ];

  return (
    <>
      {/* 1. Master Keyboard Help Click trigger floating inside header margins */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-30 p-3 rounded-full bg-zinc-900 hover:bg-zinc-805 text-zinc-400 hover:text-orange-400 border border-zinc-800 hover:border-orange-500/25 transition-all duration-150 cursor-pointer shadow-lg shadow-black/80 flex items-center justify-center gap-2 group max-w-[42px] hover:max-w-[150px] overflow-hidden"
        title="Show Keyboard Hotkeys Guidance (Press ?)"
      >
        <HelpCircle size={15} className="shrink-0" />
        <span className="text-[10px] font-mono tracking-wider font-extrabold uppercase truncate max-w-0 group-hover:max-w-[120px] transition-all duration-300">
          SHORTCUTS (?)
        </span>
      </button>

      {/* 2. Modal Overlay Portal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Backdrop cover and blur overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-[#060608]/85 backdrop-blur-[1px] cursor-pointer"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl w-full max-w-lg p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] relative overflow-hidden select-none"
            >
              {/* Circuit top aesthetic orange line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500/10 via-orange-500 to-orange-500/10" />

              {/* Close Button Trigger */}
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-zinc-500 hover:text-rose-400 duration-150 p-1 bg-zinc-950/40 hover:bg-zinc-950 border border-zinc-850 hover:border-rose-900/30 rounded-xl"
                title="Exit shortcuts (or ESC)"
              >
                <X size={14} />
              </button>

              {/* Header Title */}
              <div className="flex items-center gap-2.5 pb-3.5 border-b border-zinc-850">
                <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-850 text-orange-400">
                  <PlaySquare size={16} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold tracking-wider text-white uppercase">
                    UNDERGROUND SHORTCUT PROTOCOL
                  </h3>
                  <p className="text-[10px] font-mono font-semibold text-zinc-500 uppercase tracking-widest mt-0.5">
                    Rig Interface hotkey operational diagnostics
                  </p>
                </div>
              </div>

              {/* Shortcuts content tables columns list */}
              <div className="py-4 flex flex-col gap-5 overflow-y-auto max-h-[60vh] pr-1">
                {shortcutGroups.map((group, gIdx) => (
                  <div key={gIdx} className="flex flex-col gap-2">
                    <span className="text-[9px] font-mono tracking-widest text-zinc-500/90 uppercase font-extrabold">
                      {group.title}
                    </span>
                    
                    <div className="flex flex-col bg-zinc-950/40 rounded-2xl border border-zinc-850 p-2 divide-y divide-zinc-900/40">
                      {group.items.map((item, iIdx) => (
                        <div key={iIdx} className="flex items-center justify-between gap-4 py-2.5 px-2">
                          
                          {/* Left Description icon pair */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="shrink-0 p-1 bg-zinc-950 rounded border border-zinc-900/80">
                              {item.icon}
                            </span>
                            <span className="text-zinc-400 text-[11px] leading-tight font-sans font-medium">
                              {item.desc}
                            </span>
                          </div>

                          {/* Right Key Indicator Button */}
                          <div className="font-mono text-[9px] font-extrabold text-orange-400 bg-orange-950/20 px-2.5 py-1 border border-orange-950 rounded-md shadow-inner shrink-0 tracking-widest">
                            {item.key}
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Lower Informational Banner */}
              <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-850/60 flex items-center gap-2.5 mt-2">
                <MonitorCheck size={14} className="text-emerald-500 shrink-0" />
                <span className="text-[9px] font-mono text-zinc-500 font-extrabold uppercase leading-normal tracking-wider">
                  ⌨️ INPUT PROTECTION SECURED: SHORTCUTS STAGE AUTOMATICALLY BYPASSES ON ANY PERFORMANCE PROFILE TEXT BOX FIELDS!
                </span>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
