import React, { useState, useEffect, useRef } from 'react';
import { audio } from '../utils/audioEngine';
import { DrumInstrument } from '../types';
import { 
  ACHIEVEMENT_DEFS, 
  getUnlockedAchievements, 
  checkForNewAchievements, 
  calculateCrowdSyncScore, 
  PerformanceMetrics,
  AchievementDef
} from '../utils/achievements';
import { 
  Power, Disc, Clock, Zap, Award, Shield, Headphones, 
  Lock, Flame, Sparkles, CheckSquare, RefreshCw, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const IconMap: { [key: string]: React.ComponentType<any> } = {
  Power,
  Disc,
  Clock,
  Zap,
  Award,
  Shield,
  Headphones
};

export default function AchievementsPanel() {
  const [unlockedIds, setUnlockedIds] = useState<string[]>([]);
  const [crowdScore, setCrowdScore] = useState(5);
  const [samplerClicks, setSamplerClicks] = useState(0);
  const [timeMixed, setTimeMixed] = useState(0);
  const [vinylSpins, setVinylSpins] = useState(0);
  const [toastNotification, setToastNotification] = useState<AchievementDef | null>(null);

  const samplerClicksRef = useRef(0);

  // Poll local storage values for profile stats and manage live crowd score
  useEffect(() => {
    // 1. Load initial unlocked achievements
    setUnlockedIds(getUnlockedAchievements());

    // 2. Setup sampler trigger tracking
    const handleSamplerTriggered = () => {
      samplerClicksRef.current += 1;
      setSamplerClicks(samplerClicksRef.current);
    };
    window.addEventListener('sampler-triggered', handleSamplerTriggered);

    // 3. Listener for newly unlocked achievements to display custom notification toaster
    const handleAchievementsUpdated = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newlyUnlocked: AchievementDef[] = customEvent.detail?.newlyUnlocked || [];
      if (newlyUnlocked.length > 0) {
        setUnlockedIds(getUnlockedAchievements());
        // Toast the latest one
        setToastNotification(newlyUnlocked[newlyUnlocked.length - 1]);
        // Trigger a nice physical audio chirp of success
        try {
          audio.triggerSample('laser');
        } catch (_) {}
      }
    };
    window.addEventListener('achievements-updated', handleAchievementsUpdated);

    // 4. Heavy-duty 1-second evaluator loop
    const checkerInterval = setInterval(() => {
      // 4a. Decelerate sampler clicks slightly over time for a rolling dynamic heat look
      if (samplerClicksRef.current > 0) {
        samplerClicksRef.current = Math.max(0, samplerClicksRef.current - 1);
        setSamplerClicks(samplerClicksRef.current);
      }

      // 4b. Grab real persistence stats
      const localTime = localStorage.getItem('dj_profile_time_mixed');
      const timeSec = localTime ? parseInt(localTime) : 0;
      setTimeMixed(timeSec);

      const localSpins = localStorage.getItem('dj_profile_spins');
      const spins = localSpins ? parseInt(localSpins) : 0;
      setVinylSpins(spins);

      // Track Tape wizard tape count
      const localTapeWizardCount = localStorage.getItem('dj_tape_wizard_count');
      const tapeWizardCount = localTapeWizardCount ? parseInt(localTapeWizardCount) : 0;

      // 4c. Grab real-time engine states safely
      const isPowerOn = audio.isPowerOn;
      const bpm = audio.bpm;
      const ambientMode = audio.ambientMode || 'none';
      const isRecording = audio.isRecording;
      
      const isDeckAPlaying = audio.deckPlayStates.A;
      const isDeckBPlaying = audio.deckPlayStates.B;
      const bothDecksPlaying = isDeckAPlaying && isDeckBPlaying;
      const isDeckPlaying = isDeckAPlaying || isDeckBPlaying;

      const isSequencerPlaying = audio.isPowerOn; // system sequencer runs sync with power

      // Calculate total sequencer steps active cross-track
      let activeSequencerStepsCount = 0;
      let activeSynthSteps = 0;
      if (audio.sequencerTracks) {
        Object.keys(audio.sequencerTracks).forEach(inst => {
          const track = audio.sequencerTracks[inst as DrumInstrument];
          if (track) {
            const activeCount = track.filter(Boolean).length;
            activeSequencerStepsCount += activeCount;
            if (inst === 'synth') {
              activeSynthSteps = activeCount;
            }
          }
        });
      }

      // Assess FX parameters
      const fxActive = audio.effectsVinylCrackleActive || (audio.flangerValue && audio.flangerValue > 0.05);

      // Calculate new crowd score dynamically
      const metrics: PerformanceMetrics = {
        isPlaying: isPowerOn && (isDeckPlaying || activeSequencerStepsCount > 0),
        bothDecksPlaying,
        bpm,
        activeSequencerStepsCount,
        fxActive: !!fxActive,
        isRecording,
        samplerClicks: samplerClicksRef.current,
        ambientMode
      };
      
      const score = calculateCrowdSyncScore(metrics);
      setCrowdScore(score);

      // Check achievement unlocks
      checkForNewAchievements(
        { timeMixedSeconds: timeSec, vinylSpins: spins, tapeWizardCount },
        {
          isRecording,
          ambientMode,
          bpm,
          isSequencerPlaying,
          activeSynthSteps,
          isDeckPlaying
        }
      );
    }, 1000);

    return () => {
      window.removeEventListener('sampler-triggered', handleSamplerTriggered);
      window.removeEventListener('achievements-updated', handleAchievementsUpdated);
      clearInterval(checkerInterval);
    };
  }, []);

  // Clear toast after custom timeframe
  useEffect(() => {
    if (toastNotification) {
      const timer = setTimeout(() => {
        setToastNotification(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [toastNotification]);

  // Unlock test button helper for quick UX verification
  const handleSimulateVinylClicks = () => {
    // Inject extra spins for fun test
    const nextSpins = vinylSpins + 300;
    localStorage.setItem('dj_profile_spins', nextSpins.toString());
    setVinylSpins(nextSpins);

    // Increment sampler triggers directly
    samplerClicksRef.current += 4;
    setSamplerClicks(samplerClicksRef.current);
    window.dispatchEvent(new CustomEvent('sampler-triggered'));
  };

  // Determine elegant text indicator based on crowd-sync density
  const getCrowdStatusText = (score: number) => {
    if (!audio.isPowerOn) return 'MONOLITH STANDBY DRONE';
    if (score < 20) return 'FLOOR SENSING CARTRIDGES';
    if (score < 45) return 'SUB-SONIC SIMMERING FLOW';
    if (score < 70) return 'CONCRETE HALL CO-ORDINATED';
    if (score < 90) return 'PEAK STATE WAREHOUSE PULSE';
    return 'ABSOLUTE TRANSMISSION COMPLETED';
  };

  const getPercentageColor = (score: number) => {
    if (score < 25) return 'bg-zinc-700';
    if (score < 55) return 'bg-teal-500';
    if (score < 85) return 'bg-orange-500';
    return 'bg-emerald-500 animate-pulse';
  };

  const getPercentageTextColor = (score: number) => {
    if (score < 25) return 'text-zinc-500';
    if (score < 55) return 'text-teal-400';
    if (score < 85) return 'text-orange-400';
    return 'text-emerald-400';
  };

  return (
    <div 
      id="achievements-operator-bento" 
      className="bg-zinc-900 border-2 border-zinc-800 rounded-3xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),_0_15px_30px_rgba(0,0,0,0.5)] flex flex-col gap-6"
    >
      {/* Toast Notification for Real-Time Unlock Popups */}
      <AnimatePresence>
        {toastNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 bg-[#0c0c10] border-2 border-emerald-500 rounded-2xl p-4 shadow-[0_20px_40px_rgba(0,0,0,0.8)] z-50 max-w-sm flex items-start gap-3"
          >
            <div className="p-2.5 bg-emerald-500/15 rounded-xl text-emerald-400 flex-shrink-0 border border-emerald-500/20">
              <Trophy size={18} className="animate-bounce" />
            </div>
            <div className="flex-1 min-w-0 font-mono">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider block">UNLOCKED RAVE BADGE</span>
              <h4 className="text-xs font-bold text-white uppercase mt-0.5">{toastNotification.name}</h4>
              <p className="text-[9px] text-zinc-400 mt-1 leading-relaxed">{toastNotification.description}</p>
              <div className="mt-2 text-[7.5px] text-amber-500 uppercase bg-amber-950/20 px-2 py-0.5 rounded inline-block font-extrabold border border-amber-900/30">
                {toastNotification.stickerText}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Layout Container (Left side Crowd Sync Gauge / Right side achievements collection) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        
        {/* Dynamic Crowd Sync Coordinator Gauge Column */}
        <div className="md:col-span-4 bg-zinc-950/45 border border-zinc-850 p-5 rounded-2xl flex flex-col justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px] font-extrabold uppercase tracking-widest">
              <Flame size={12} className="text-orange-500 animate-pulse" />
              <span>LIVE CROWD SYNC PROTOCOL</span>
            </div>
            <h3 className="text-sm font-mono font-bold text-white uppercase">Floor Density Analytics</h3>
          </div>

          {/* Central score numeric display */}
          <div className="flex flex-col items-center justify-center py-4 bg-zinc-950/60 rounded-xl relative overflow-hidden border border-zinc-900">
            <span className={`text-4xl md:text-5xl font-mono font-extrabold tracking-tighter ${getPercentageTextColor(crowdScore)}`}>
              {crowdScore}%
            </span>
            <span className="text-[7.5px] font-mono font-extrabold tracking-widest text-zinc-500 uppercase mt-2 text-center px-2 truncate w-full">
              {getCrowdStatusText(crowdScore)}
            </span>
            
            {/* Visual bottom pulse bar indicating intensity */}
            <div className={`absolute bottom-0 left-0 h-1 transition-all duration-300 ${getPercentageColor(crowdScore)}`} style={{ width: `${crowdScore}%` }} />
          </div>

          {/* Factors Dashboard panel */}
          <div className="flex flex-col gap-2 font-mono text-[8px] text-zinc-500 border-t border-zinc-900 pt-3">
            <div className="flex justify-between items-center">
              <span>ACTIVE DECK MIX:</span>
              <span className={audio.deckPlayStates.A || audio.deckPlayStates.B ? 'text-emerald-400' : 'text-zinc-600'}>
                {audio.deckPlayStates.A && audio.deckPlayStates.B ? 'DUAL DUAL (PEAK)' : (audio.deckPlayStates.A || audio.deckPlayStates.B ? 'MONO ACTIVE' : 'MUTED STANDBY')}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>TEMPO COORDINATION:</span>
              <span className={(audio.bpm >= 122 && audio.bpm <= 145) ? 'text-emerald-400' : 'text-zinc-600'}>
                {audio.bpm} BPM ({ (audio.bpm >= 122 && audio.bpm <= 145) ? 'MATCHED' : 'DRIFT' })
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>SAMPLER INTEGRITY:</span>
              <span className={samplerClicks > 0 ? 'text-orange-400 font-bold' : 'text-zinc-600'}>
                {samplerClicks} HITS / ROLL
              </span>
            </div>
            
            {/* Quick interactive calibration trigger */}
            <button
              onClick={handleSimulateVinylClicks}
              className="mt-2.5 py-1 px-1.5 text-[7px] bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded transition select-none flex items-center justify-center gap-1 cursor-pointer"
              title="Test triggers and manually accelerate vinyl spin speeds"
            >
              <RefreshCw size={8} className="animate-spin-slow text-orange-500" />
              <span>SPINS & SAMPLER TRIGGER CALIBRATION</span>
            </button>
          </div>
        </div>

        {/* Badges Collection Grid Column (8 of 12) */}
        <div className="md:col-span-8 flex flex-col justify-between gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-zinc-400" />
              <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wide">RAVE OPERATOR CREDENTIALS</h3>
            </div>
            <span className="text-[9px] font-mono font-extrabold text-orange-500 bg-orange-950/20 px-2 py-0.5 rounded border border-orange-900/30">
              {unlockedIds.length} OF {ACHIEVEMENT_DEFS.length} UNLOCKED
            </span>
          </div>

          {/* Scrolling card catalog */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[195px] overflow-y-auto pr-1">
            {ACHIEVEMENT_DEFS.map((def) => {
              const unlocked = unlockedIds.includes(def.id);
              const SpecificIcon = IconMap[def.iconName] || Trophy;

              return (
                <div 
                  key={def.id}
                  className={`border font-mono p-3 rounded-xl transition duration-150 flex items-start gap-2.5 relative select-none ${
                    unlocked 
                      ? 'bg-zinc-950/50 border-emerald-500/25 text-zinc-100 hover:border-emerald-500/40' 
                      : 'bg-zinc-950/15 border-zinc-850 text-zinc-600 opacity-60 hover:opacity-75'
                  }`}
                  title={!unlocked ? `LOCKED: ${def.hint}` : `UNLOCKED!`}
                >
                  {/* Indicator Icon box */}
                  <div className={`p-1.5 rounded-lg border flex-shrink-0 flex items-center justify-center ${
                    unlocked 
                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                      : 'bg-zinc-950 border-zinc-900 text-zinc-700'
                  }`}>
                    {unlocked ? <SpecificIcon size={14} /> : <Lock size={12} />}
                  </div>

                  {/* Context Block */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between gap-1 w-full">
                        <span className={`text-[10px] font-extrabold uppercase truncate ${unlocked ? 'text-zinc-100' : 'text-zinc-500'}`}>
                          {def.name}
                        </span>
                        {unlocked && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </div>
                      <p className="text-[7.5px] mt-0.5 leading-relaxed text-zinc-500">
                        {unlocked ? def.description : `Unlock: ${def.hint}`}
                      </p>
                    </div>

                    {unlocked && (
                      <div className="mt-1.5 text-[6.5px] text-amber-500 uppercase font-extrabold truncate max-w-full">
                        {def.stickerText}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
