export type DrumInstrument = 'kick' | 'snare' | 'hihat' | 'synth';

export interface StepSequencerState {
  bpm: number;
  isPlaying: boolean;
  currentStep: number;
  tracks: {
    [key in DrumInstrument]: boolean[];
  };
}

export interface DeckState {
  id: 'A' | 'B';
  isPlaying: boolean;
  pitch: number; // Playback rate multiplier: 0.5 to 2.0
  volume: number; // 0.0 to 1.0
  eqLow: number;  // gain: -12 to +12 dB
  eqMid: number;  // gain: -12 to +12 dB
  eqHigh: number; // gain: -12 to +12 dB
  filterFreq: number; // -100 to +100 (negative is LPF cutoff, positive is HPF cutoff)
  scratchOffset: number; // temporary pitch drift due to mouse/touch scratching
  isScratching: boolean;
  selectedTrack: number; // index of track loop
  hotCues: number[]; // relative timestamp positions (0.0 to 1.0)
}

export interface SoundSample {
  id: string;
  name: string;
  category: 'drum' | 'bass' | 'fx' | 'vocal';
  color: string;
  triggerKey: string;
}

export type VisualizerMode = 'waves' | 'bars' | 'circular' | 'matrix';
