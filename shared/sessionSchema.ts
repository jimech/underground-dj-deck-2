export type DrumInstrument = 'kick' | 'snare' | 'hihat' | 'synth';

export type AmbientMode = 'none' | 'subway' | 'rain' | 'crowd' | 'drone';

export interface DeckControlValues {
  vol: number;
  low: number;
  mid: number;
  high: number;
  filter: number;
}

export interface VersionedSession {
  version: number;
  name: string;
  timestamp: number;
  data: {
    bpm: number;
    crossfaderValue: number;
    deckAValues: DeckControlValues;
    deckBValues: DeckControlValues;
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
    deckReversed?: {
      A: boolean;
      B: boolean;
    };
    effectsVinylCrackleActive: boolean;
    effectsVinylCrackleVolume: number;
    effectsVinylCrackleFreq: number;
    effectsVinylCrackleQ: number;
    ambientMode?: AmbientMode;
    visualizerMode?: string;
    stickerText?: string;
    sequencerTracks: Record<DrumInstrument, boolean[]>;
  };
}

const drumInstruments: DrumInstrument[] = ['kick', 'snare', 'hihat', 'synth'];
const ambientModes: AmbientMode[] = ['none', 'subway', 'rain', 'crowd', 'drone'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isDeckControlValues(value: unknown): value is DeckControlValues {
  if (!isObject(value)) return false;

  return (
    isNumber(value.vol) &&
    isNumber(value.low) &&
    isNumber(value.mid) &&
    isNumber(value.high) &&
    isNumber(value.filter)
  );
}

function isDeckNumberPair(value: unknown): value is { A: number; B: number } {
  return isObject(value) && isNumber(value.A) && isNumber(value.B);
}

function isDeckBooleanPair(value: unknown): value is { A: boolean; B: boolean } {
  return isObject(value) && typeof value.A === 'boolean' && typeof value.B === 'boolean';
}

function isSequencerTracks(value: unknown): value is Record<DrumInstrument, boolean[]> {
  if (!isObject(value)) return false;

  return drumInstruments.every((instrument) => {
    const track = value[instrument];
    return Array.isArray(track) && track.every((step) => typeof step === 'boolean');
  });
}

export function getSessionValidationError(value: unknown): string | null {
  if (!isObject(value)) return 'Session payload must be an object.';
  if (!isObject(value.data)) return 'Session payload is missing a data object.';

  const data = value.data;

  if (!isNumber(value.version)) return 'Session version must be a number.';
  if (typeof value.name !== 'string') return 'Session name must be a string.';
  if (!isNumber(value.timestamp)) return 'Session timestamp must be a number.';
  if (!isNumber(data.bpm)) return 'Session BPM must be a number.';
  if (!isNumber(data.crossfaderValue)) return 'Session crossfader value must be a number.';
  if (!isDeckControlValues(data.deckAValues)) return 'Deck A values are missing or invalid.';
  if (!isDeckControlValues(data.deckBValues)) return 'Deck B values are missing or invalid.';
  if (!isNumber(data.swingAmountValue)) return 'Session swing amount must be a number.';
  if (!isNumber(data.flangerValue)) return 'Session flanger value must be a number.';
  if (!isDeckNumberPair(data.deckSelectedTracks)) return 'Selected deck tracks are missing or invalid.';
  if (!isDeckBooleanPair(data.deckPlayStates)) return 'Deck play states are missing or invalid.';
  if (data.deckReversed !== undefined && !isDeckBooleanPair(data.deckReversed)) {
    return 'Deck reverse states are invalid.';
  }
  if (typeof data.effectsVinylCrackleActive !== 'boolean') {
    return 'Vinyl crackle active flag must be a boolean.';
  }
  if (!isNumber(data.effectsVinylCrackleVolume)) return 'Vinyl crackle volume must be a number.';
  if (!isNumber(data.effectsVinylCrackleFreq)) return 'Vinyl crackle frequency must be a number.';
  if (!isNumber(data.effectsVinylCrackleQ)) return 'Vinyl crackle Q must be a number.';
  if (data.ambientMode !== undefined && !ambientModes.includes(data.ambientMode as AmbientMode)) {
    return 'Ambient mode is not supported.';
  }
  if (data.visualizerMode !== undefined && typeof data.visualizerMode !== 'string') {
    return 'Visualizer mode must be a string.';
  }
  if (data.stickerText !== undefined && typeof data.stickerText !== 'string') {
    return 'Sticker text must be a string.';
  }
  if (!isSequencerTracks(data.sequencerTracks)) {
    return 'Sequencer tracks are missing or invalid.';
  }

  return null;
}

export function validateSessionSchema(value: unknown): value is VersionedSession {
  return getSessionValidationError(value) === null;
}
