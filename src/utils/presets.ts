import { DrumInstrument, VisualizerMode } from '../types';

export interface MoodPreset {
  id: string;
  name: string;
  description: string;
  stickerText: string;
  genre: string;
  visualizerMode: VisualizerMode;
  data: {
    bpm: number;
    crossfaderValue: number;
    deckAValues: {
      vol: number;
      low: number;
      mid: number;
      high: number;
      filter: number;
    };
    deckBValues: {
      vol: number;
      low: number;
      mid: number;
      high: number;
      filter: number;
    };
    swingAmountValue: number;
    flangerValue: number;
    deckSelectedTracks: {
      A: number;
      B: number;
    };
    deckPlayStates: {
      A: boolean;
      B: boolean;
    };
    deckReversed: {
      A: boolean;
      B: boolean;
    };
    effectsVinylCrackleActive: boolean;
    effectsVinylCrackleVolume: number;
    effectsVinylCrackleFreq: number;
    effectsVinylCrackleQ: number;
    ambientMode: 'none' | 'subway' | 'rain' | 'crowd' | 'drone';
    sequencerTracks: {
      [key in DrumInstrument]: boolean[];
    };
  };
}

export const MOOD_PRESETS: MoodPreset[] = [
  {
    id: "mood_berlin_warehouse",
    name: "Berlin Warehouse",
    description: "Cold industrial high-voltage minimal pounding sub-bass and heavy distortion.",
    stickerText: "BERLIN WAREHOUSE // DETONATION STATE ACTIVE",
    genre: "Saturating Techno",
    visualizerMode: "bars",
    data: {
      bpm: 136,
      crossfaderValue: -0.2,
      deckAValues: { vol: 0.85, low: 5, mid: -1, high: 2, filter: -10 },
      deckBValues: { vol: 0.8, low: -12, mid: 4, high: 5, filter: 30 },
      swingAmountValue: 0.05,
      flangerValue: 0.4,
      deckSelectedTracks: { A: 0, B: 1 },
      deckPlayStates: { A: true, B: true },
      deckReversed: { A: false, B: true },
      effectsVinylCrackleActive: true,
      effectsVinylCrackleVolume: 0.3,
      effectsVinylCrackleFreq: 1200,
      effectsVinylCrackleQ: 2.0,
      ambientMode: "crowd",
      sequencerTracks: {
        kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hihat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, true],
        synth: [true, false, true, true, false, true, false, false, true, true, false, false, true, false, true, false]
      }
    }
  },
  {
    id: "mood_tokyo_basement",
    name: "Tokyo Basement",
    description: "Lively micro-house with high syncopated swing rates and subway hums.",
    stickerText: "TOKYO BASEMENT // SHIBUYA DUPLEX SYSTEM",
    genre: "Micro House",
    visualizerMode: "circular",
    data: {
      bpm: 128,
      crossfaderValue: 0.1,
      deckAValues: { vol: 0.75, low: 2, mid: 3, high: 1, filter: 0 },
      deckBValues: { vol: 0.85, low: 4, mid: -2, high: 4, filter: -15 },
      swingAmountValue: 0.45,
      flangerValue: 0.2,
      deckSelectedTracks: { A: 1, B: 2 },
      deckPlayStates: { A: true, B: true },
      deckReversed: { A: false, B: false },
      effectsVinylCrackleActive: true,
      effectsVinylCrackleVolume: 0.15,
      effectsVinylCrackleFreq: 2200,
      effectsVinylCrackleQ: 1.2,
      ambientMode: "subway",
      sequencerTracks: {
        kick: [true, false, false, false, false, false, true, false, true, false, false, false, false, true, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, true, false, true, false, false, false],
        hihat: [true, false, true, false, true, false, true, true, true, false, true, false, true, false, true, false],
        synth: [false, false, true, false, false, true, false, false, false, false, true, false, false, true, false, false]
      }
    }
  },
  {
    id: "mood_acid_tunnel",
    name: "Acid Tunnel",
    description: "Fast-paced analog silver box sweeps inside concrete ventilation columns.",
    stickerText: "ACID TUNNEL // LEVEL B3 REACTOR",
    genre: "Analog Acid",
    visualizerMode: "waves",
    data: {
      bpm: 140,
      crossfaderValue: -0.4,
      deckAValues: { vol: 0.9, low: 6, mid: -4, high: 5, filter: 15 },
      deckBValues: { vol: 0.5, low: 0, mid: 0, high: 0, filter: -55 },
      swingAmountValue: 0.1,
      flangerValue: 0.65,
      deckSelectedTracks: { A: 0, B: 0 },
      deckPlayStates: { A: true, B: false },
      deckReversed: { A: false, B: false },
      effectsVinylCrackleActive: false,
      effectsVinylCrackleVolume: 0.0,
      effectsVinylCrackleFreq: 1000,
      effectsVinylCrackleQ: 1.0,
      ambientMode: "drone",
      sequencerTracks: {
        kick: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false],
        hihat: [false, true, false, true, false, true, false, true, false, true, false, true, false, true, false, true],
        synth: [true, true, false, true, true, false, true, true, false, true, true, false, true, true, true, false]
      }
    }
  },
  {
    id: "mood_rainy_afterhours",
    name: "Rainy Afterhours",
    description: "Deep, dusty records dripping in ambient rainfall, crackles, and low passes.",
    stickerText: "RAINY AFTERHOURS // ROOF WATER LEVEL RECEPTOR ON",
    genre: "Ambient Dub",
    visualizerMode: "waves",
    data: {
      bpm: 110,
      crossfaderValue: 0.35,
      deckAValues: { vol: 0.6, low: 3, mid: 4, high: -6, filter: -50 },
      deckBValues: { vol: 0.7, low: 2, mid: 5, high: -2, filter: -35 },
      swingAmountValue: 0.5,
      flangerValue: 0.1,
      deckSelectedTracks: { A: 2, B: 1 },
      deckPlayStates: { A: true, B: true },
      deckReversed: { A: false, B: false },
      effectsVinylCrackleActive: true,
      effectsVinylCrackleVolume: 0.75,
      effectsVinylCrackleFreq: 450,
      effectsVinylCrackleQ: 0.7,
      ambientMode: "rain",
      sequencerTracks: {
        kick: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
        snare: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        hihat: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false],
        synth: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]
      }
    }
  },
  {
    id: "mood_industrial_rave",
    name: "Industrial Rave",
    description: "Full peak distortion, heavy crowd chatter, and high-frequency metallic flanges.",
    stickerText: "INDUSTRIAL RAVE // HARDCORE CO-OPERATING GATE 0",
    genre: "Industrial Hardcore",
    visualizerMode: "bars",
    data: {
      bpm: 144,
      crossfaderValue: 0.0,
      deckAValues: { vol: 0.95, low: 8, mid: 2, high: 4, filter: 0 },
      deckBValues: { vol: 0.9, low: 6, mid: 3, high: 6, filter: 25 },
      swingAmountValue: 0.15,
      flangerValue: 0.75,
      deckSelectedTracks: { A: 0, B: 2 },
      deckPlayStates: { A: true, B: true },
      deckReversed: { A: false, B: false },
      effectsVinylCrackleActive: true,
      effectsVinylCrackleVolume: 0.4,
      effectsVinylCrackleFreq: 1800,
      effectsVinylCrackleQ: 3.5,
      ambientMode: "crowd",
      sequencerTracks: {
        kick: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, true],
        snare: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, true, false],
        hihat: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true],
        synth: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false]
      }
    }
  },
  {
    id: "mood_minimal_hypnosis",
    name: "Minimal Hypnosis",
    description: "Sparse mechanical cycles drawing focus into a deeply repetitive drone.",
    stickerText: "MINIMAL HYPNOSIS // NEURAL LOCK PROTOCOL ACTIVE",
    genre: "Hypnotic Minimal",
    visualizerMode: "circular",
    data: {
      bpm: 124,
      crossfaderValue: -0.5,
      deckAValues: { vol: 0.7, low: 3, mid: 1, high: -2, filter: -15 },
      deckBValues: { vol: 0.7, low: 1, mid: 4, high: 2, filter: -5 },
      swingAmountValue: 0.0,
      flangerValue: 0.3,
      deckSelectedTracks: { A: 2, B: 2 },
      deckPlayStates: { A: true, B: false },
      deckReversed: { A: false, B: false },
      effectsVinylCrackleActive: true,
      effectsVinylCrackleVolume: 0.25,
      effectsVinylCrackleFreq: 800,
      effectsVinylCrackleQ: 1.0,
      ambientMode: "drone",
      sequencerTracks: {
        kick: [true, false, false, false, false, false, false, false, true, false, false, false, false, false, false, false],
        snare: [false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
        hihat: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
        synth: [true, false, false, true, false, false, true, false, false, true, false, false, true, false, false, true]
      }
    }
  }
];
