import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/audioEngine';
import { 
  X, Check, ChevronRight, ChevronLeft, Power, Sparkles, LayoutGrid, 
  Disc, Sliders, Music, Save, Play, Headphones, HelpCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TourStep {
  title: string;
  targetId: string;
  description: string;
  badge: string;
  icon: React.ReactNode;
  hint: string;
}

export default function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const resizeRef = useRef<number | null>(null);

  const steps: TourStep[] = [
    {
      title: "Power The Desk",
      targetId: "master-power-btn",
      description: "Start here before playback. The Studio waits for a user gesture before it can run browser audio.",
      badge: "STEP 1 OF 6",
      icon: <Power className="w-5 h-5 text-rose-500 animate-pulse" />,
      hint: "Press the main power control first."
    },
    {
      title: "Save And Share Mixes",
      targetId: "dj-custom-station-center",
      description: "This cabinet is where mixes become real assets. Save locally for offline work, save to cloud for your account, or create an offline share snapshot.",
      badge: "STEP 2 OF 6",
      icon: <Sparkles className="w-5 h-5 text-amber-500" />,
      hint: "Use Save Local, Save Cloud, or Offline Share."
    },
    {
      title: "Build A Rhythm",
      targetId: "sequencer-widget",
      description: "The sequencer drives the beat grid. Pick a preset, adjust the steps, and start playback when the pattern feels right.",
      badge: "STEP 3 OF 6",
      icon: <LayoutGrid className="w-5 h-5 text-orange-500" />,
      hint: "Use presets for a fast start, then tune BPM."
    },
    {
      title: "Cue The Decks",
      targetId: "deck-A",
      description: "Deck A and Deck B hold the playable tracks. Start a deck, pick cassette slots, and blend both sides from the mixer.",
      badge: "STEP 4 OF 6",
      icon: <Disc className="w-5 h-5 text-cyan-500" />,
      hint: "Use the mixer crossfader to blend decks."
    },
    {
      title: "Shape Effects",
      targetId: "kaoss-effects-rack",
      description: "Use the performance effects for movement: filters, echo, roll, texture, and sampler hits live beside the deck controls.",
      badge: "STEP 5 OF 6",
      icon: <Sliders className="w-5 h-5 text-zinc-400" />,
      hint: "Drag the pad and trigger sampler buttons."
    },
    {
      title: "Record The Set",
      targetId: "tape-recorder-widget",
      description: "Capture the final pass when the mix is ready. Stop the recorder, export the audio, and keep the saved session for the setup state.",
      badge: "STEP 6 OF 6",
      icon: <Save className="w-5 h-5 text-emerald-500 font-extrabold" />,
      hint: "Record audio, then export the finished take."
    }
  ];

  // 1. Initial State Check
  useEffect(() => {
    const hasSeenTour = localStorage.getItem('monolith_onboarding_completed');
    if (!hasSeenTour) {
      // Small timeout to allow interface loading
      const timer = setTimeout(() => {
        setActive(true);
        setCurrentStep(0);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for custom trigger-tour events to start/restart
  useEffect(() => {
    const handleStartTour = () => {
      setActive(true);
      setCurrentStep(0);
      // Small trigger sound click if power is already on
      if (audio.isPowerOn) {
        audio.triggerSample('synth');
      }
    };
    window.addEventListener('trigger-onboarding-tour', handleStartTour);
    return () => window.removeEventListener('trigger-onboarding-tour', handleStartTour);
  }, []);

  // 2. Track element boundaries dynamically
  useEffect(() => {
    if (!active) {
      setTargetRect(null);
      return;
    }

    const updateBoundingBox = () => {
      const step = steps[currentStep];
      if (!step) return;

      const element = document.getElementById(step.targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        
        // Skip scroll if it's already nicely visible, otherwise scroll centered
        const viewportHeight = window.innerHeight;
        const inViewport = rect.top >= 50 && rect.bottom <= viewportHeight - 150;
        
        if (!inViewport) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        setTargetRect({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height
        });
      } else {
        // Element might not be loaded yet, hide highlighting but keep modal centered
        setTargetRect(null);
      }

      resizeRef.current = requestAnimationFrame(updateBoundingBox);
    };

    updateBoundingBox();

    return () => {
      if (resizeRef.current) {
        cancelAnimationFrame(resizeRef.current);
      }
    };
  }, [active, currentStep]);

  // Make a sample beep on step change
  useEffect(() => {
    if (active && audio.isPowerOn) {
      audio.triggerSample('synth');
    }
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = () => {
    localStorage.setItem('monolith_onboarding_completed', 'true');
    setActive(false);
    if (audio.isPowerOn) {
      audio.triggerSample('crackle_echo');
    }
  };

  if (!active) return null;

  const currentStepData = steps[currentStep];

  // Quick helper to determine where we place the floating modal card layout
  // (We use a centered responsive docking card below or above to avoid viewport clipping inside iframes)
  return (
    <div id="monolith-onboarding-portal" className="fixed inset-0 z-40 overflow-y-auto pointer-events-none select-none">
      
      {/* 1. Viewport Punchout Dark Overlay */}
      <div className="fixed inset-0 bg-[#070709]/75 backdrop-blur-[1px] pointer-events-auto transition-opacity duration-300" />

      {/* 2. Direct Target Focus Ring Glow Layer */}
      {targetRect && (
        <div 
          style={{
            position: 'absolute',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
          className="rounded-3xl border-2 border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.45)] pointer-events-none animate-[pulse_2s_infinite] transition-all duration-300 z-40 bg-orange-500/[0.03]"
        />
      )}

      {/* 3. Floating Interactive Guide Control Panel (Docked gracefully at bottom or center depending on selector) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-lg w-full px-4 z-50 pointer-events-auto">
        <motion.div 
          initial={{ y: 20, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          className="bg-zinc-900 border-2 border-orange-500/40 rounded-3xl p-5 shadow-[0_25px_50px_rgba(0,0,0,0.85)] flex flex-col gap-4 relative overflow-hidden"
        >
          {/* Accent wire circuit corner decor */}
          <div className="absolute top-0 right-0 w-32 h-1 bg-gradient-to-l from-orange-500 to-transparent" />
          <div className="absolute top-0 right-0 w-1 h-32 bg-gradient-to-b from-orange-500 to-transparent" />

          {/* Card Title & Navigation Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-orange-400 stroke-[2.5]" />
              <span className="text-[9px] font-mono tracking-widest text-zinc-500 uppercase font-extrabold">
                SYSTEM RECON TOUR PROTOCOL
              </span>
            </div>
            
            <button 
              onClick={handleSkip}
              className="text-zinc-500 hover:text-rose-400 transition p-1 hover:bg-zinc-800 rounded-lg group"
              title="Skip guided instructions"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active step payload info */}
          <div className="flex gap-4 items-start py-1">
            <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800 shrink-0">
              {currentStepData.icon}
            </div>

            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-white font-mono font-bold text-sm uppercase tracking-wide">
                  {currentStepData.title}
                </span>
                <span className="text-[9px] font-mono font-extrabold text-orange-400 bg-orange-950/20 px-2 py-0.5 border border-orange-900/40 rounded-md">
                  {currentStepData.badge}
                </span>
              </div>

              <p className="text-zinc-400 text-xs leading-relaxed font-sans font-medium mt-1">
                {currentStepData.description}
              </p>

              <div className="mt-2.5 px-3 py-1.5 bg-zinc-950 rounded-xl border border-zinc-850/60 font-mono text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span className="truncate">ACTION: {currentStepData.hint}</span>
              </div>
            </div>
          </div>

          {/* Footer controls: Back, Next/Complete, Skip */}
          <div className="flex items-center justify-between border-t border-zinc-800 pt-3.5 mt-1 select-none">
            {/* Steps tracker dots */}
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep 
                      ? 'bg-orange-500 w-3.5' 
                      : i < currentStep 
                      ? 'bg-orange-400/40' 
                      : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            {/* Triggers */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="py-1.5 px-3 text-[10px] font-mono font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 duration-150 border border-zinc-800 rounded-lg flex items-center gap-1"
                >
                  <ChevronLeft className="w-3 h-3" /> PREV
                </button>
              )}

              <button
                onClick={handleSkip}
                className="py-1.5 px-3.5 text-[10px] font-mono font-bold text-zinc-500 hover:text-zinc-300 duration-150"
              >
                SKIP
              </button>

              <button
                onClick={handleNext}
                className="py-1.5 px-4 bg-orange-500 hover:bg-orange-600 text-black font-mono font-extrabold text-[10px] tracking-widest uppercase rounded-xl flex items-center gap-1.5 transition select-none cursor-pointer shadow-md shadow-orange-950/20"
              >
                <span>{currentStep === steps.length - 1 ? 'LAUNCH RIG' : 'NEXT STEP'}</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            </div>
          </div>

        </motion.div>
      </div>

    </div>
  );
}
