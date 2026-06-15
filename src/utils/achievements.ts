import { DrumInstrument } from '../types';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  stickerText: string;
  iconName: string; // Name of Lucide icon to display (e.g. 'Power', 'Disc', 'Clock', 'Zap', 'Award', 'Shield', 'Headphones')
  hint: string;
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    id: 'first_boot',
    name: 'First Boot',
    description: 'Awakened the ancient link circuitry and initialized master power.',
    stickerText: 'SYSTEM REBO0T APPROVED // LINE SIGNALS ONLINE',
    iconName: 'Power',
    hint: 'Toggle the master red power button to wake the synth & deck rig.'
  },
  {
    id: 'first_recording',
    name: 'First Recording',
    description: 'Began capturing the live sound stream to the master magnet tape reel.',
    stickerText: 'TAPE REEL ARCHIVE #1 // CAPTURE COMMENCED',
    iconName: 'Disc',
    hint: 'Press record on the tape master deck to lay down tape master rows.'
  },
  {
    id: 'ten_minute_set',
    name: '10-Minute Set',
    description: 'Logged over 10 minutes of active cumulative performance time.',
    stickerText: 'LIVE RIG RUNTIME EXCEEDED 10 MINS // ENDURANT LEVEL 1',
    iconName: 'Clock',
    hint: 'Keep the turntables, ambient tracks, or step sequencers running for 10 cumulative minutes.'
  },
  {
    id: 'acid_operator',
    name: 'Acid Operator',
    description: 'Locked high-frequency 303 synthesizer sweeps with tempo >= 135 BPM.',
    stickerText: 'ACID TUNNEL RE-ACTIVATED // Silver Box 303 Engaged',
    iconName: 'Zap',
    hint: 'Drive system tempo to 135+ BPM with active step sequencers running.'
  },
  {
    id: 'tape_wizard',
    name: 'Tape Wizard',
    description: 'Downloaded or recorded a completed high-fidelity performance mix tape.',
    stickerText: 'ANALOG MASTER ARCHIVIST APPROVED // GOLD GRADE REEL',
    iconName: 'Award',
    hint: 'Record or download a successful tape-recorded track.'
  },
  {
    id: 'berlin_approved',
    name: 'Berlin Approved',
    description: 'Sustained peak crowd pressure with high BPM and warehouse crowd noise active.',
    stickerText: 'BERLIN APPROVED // CO-OPERATION COLD INDUSTRIAL PULSE ACTIVE',
    iconName: 'Shield',
    hint: 'Run tempo at 130+ BPM with "Rain on Warehouse Roof" or "Crowd" noise active and decks running.'
  },
  {
    id: 'no_sleep_mode',
    name: 'No Sleep Mode',
    description: 'Logged over 1,500 total vinyl spins on the high-fidelity turntables.',
    stickerText: 'NO SLEEP IN DETROIT-BERLIN TRANSIT // OVERCLOCK DECK SENSORS',
    iconName: 'Headphones',
    hint: 'Sustain heavy vinyl playback to accumulate over 1,500 total spins.'
  }
];

export interface PerformanceMetrics {
  isPlaying: boolean;
  bothDecksPlaying: boolean;
  bpm: number;
  activeSequencerStepsCount: number;
  fxActive: boolean;
  isRecording: boolean;
  samplerClicks: number;
  ambientMode: string;
}

/**
 * Dynamically computes a live Crowd-Sync Score (5% to 100%) metric.
 * Represents real-time synchrony, energy density, and performance coordination.
 */
export function calculateCrowdSyncScore(m: PerformanceMetrics): number {
  if (!m.isPlaying) {
    return 5; // Ambient baseline floor energy
  }

  let score = 20; // Playback active floor

  // Decks blending coordination
  if (m.bothDecksPlaying) {
    score += 20; // Dual active channels = perfect warehouse coordination
  } else {
    score += 8; // Mono playback line
  }

  // Dancefloor tempo sweet spot coordination (122 to 145 BPM is gold grade)
  if (m.bpm >= 122 && m.bpm <= 145) {
    score += 15;
  } else if (m.bpm > 145) {
    score += 10; // Raw high-speed hardcore rave
  } else {
    score += 5; // Slow ambient, hip house, micro dub
  }

  // Step sequencer configuration step density
  const seqStepRatio = Math.min(1, m.activeSequencerStepsCount / 32);
  score += Math.floor(seqStepRatio * 20);

  // Sound effects & Filters
  if (m.fxActive) {
    score += 10;
  }

  // Ambient environments background layer
  if (m.ambientMode && m.ambientMode !== 'none') {
    score += 10;
  }

  // Active performance pad drumming
  const padBonus = Math.min(10, m.samplerClicks); 
  score += padBonus;

  // Studio stream recording boost
  if (m.isRecording) {
    score += 7;
  }

  return Math.min(100, Math.max(5, score));
}

/**
 * Loads unlocked achievements list from localStorage.
 */
export function getUnlockedAchievements(): string[] {
  try {
    const listJson = localStorage.getItem('underground_dj_unlocked_achievements');
    if (listJson) {
      return JSON.parse(listJson);
    }
  } catch (err) {
    console.error('Failed to parse unlocked achievements list', err);
  }
  return [];
}

/**
 * Checks and persists newly unlocked achievements in localStorage.
 * Dispatches a custom event 'achievements-updated' for reactive interface components.
 * Returns the newly unlocked achievement definitions (if any).
 */
export function checkForNewAchievements(stats: {
  timeMixedSeconds: number;
  vinylSpins: number;
  tapeWizardCount: number; // incremented whenever tape downloads or exceeds 40s
}, runtime: {
  isRecording: boolean;
  ambientMode: string;
  bpm: number;
  isSequencerPlaying: boolean;
  activeSynthSteps: number;
  isDeckPlaying: boolean;
}): AchievementDef[] {
  const currentUnlocked = new Set(getUnlockedAchievements());
  const newlyUnlocked: AchievementDef[] = [];

  // 1. First Boot (already resolved when power turns on)
  if (!currentUnlocked.has('first_boot')) {
    // If sequencer is playing or time mixed > 0 or deck is active, first boot is unlocked
    if (runtime.isDeckPlaying || runtime.isSequencerPlaying || stats.timeMixedSeconds > 0) {
      newlyUnlocked.push(ACHIEVEMENT_DEFS.find(a => a.id === 'first_boot')!);
    }
  }

  // 2. First Recording
  if (!currentUnlocked.has('first_recording') && runtime.isRecording) {
    newlyUnlocked.push(ACHIEVEMENT_DEFS.find(a => a.id === 'first_recording')!);
  }

  // 3. 10-Minute Set
  if (!currentUnlocked.has('ten_minute_set') && stats.timeMixedSeconds >= 600) {
    newlyUnlocked.push(ACHIEVEMENT_DEFS.find(a => a.id === 'ten_minute_set')!);
  }

  // 4. Acid Operator
  if (!currentUnlocked.has('acid_operator')) {
    if (runtime.bpm >= 135 && runtime.isSequencerPlaying && runtime.activeSynthSteps > 0) {
      newlyUnlocked.push(ACHIEVEMENT_DEFS.find(a => a.id === 'acid_operator')!);
    }
  }

  // 5. Tape Wizard
  if (!currentUnlocked.has('tape_wizard') && stats.tapeWizardCount > 0) {
    newlyUnlocked.push(ACHIEVEMENT_DEFS.find(a => a.id === 'tape_wizard')!);
  }

  // 6. Berlin Approved
  if (!currentUnlocked.has('berlin_approved')) {
    const isHeavyGritAmbient = runtime.ambientMode === 'crowd' || runtime.ambientMode === 'rain';
    if (runtime.bpm >= 130 && isHeavyGritAmbient && runtime.isDeckPlaying) {
      newlyUnlocked.push(ACHIEVEMENT_DEFS.find(a => a.id === 'berlin_approved')!);
    }
  }

  // 7. No Sleep Mode
  if (!currentUnlocked.has('no_sleep_mode') && stats.vinylSpins >= 1500) {
    newlyUnlocked.push(ACHIEVEMENT_DEFS.find(a => a.id === 'no_sleep_mode')!);
  }

  if (newlyUnlocked.length > 0) {
    newlyUnlocked.forEach(def => currentUnlocked.add(def.id));
    localStorage.setItem('underground_dj_unlocked_achievements', JSON.stringify(Array.from(currentUnlocked)));
    
    // Dispatch custom event to notify achievements lists & pop toasts
    window.dispatchEvent(new CustomEvent('achievements-updated', { detail: { newlyUnlocked } }));
  }

  return newlyUnlocked;
}
