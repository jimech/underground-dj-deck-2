import { DrumInstrument } from '../types';

export interface VersionedSession {
  version: number;
  name: string;
  timestamp: number;
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
    deckReversed?: {
      A: boolean;
      B: boolean;
    };
    effectsVinylCrackleActive: boolean;
    effectsVinylCrackleVolume: number;
    effectsVinylCrackleFreq: number;
    effectsVinylCrackleQ: number;
    ambientMode?: 'none' | 'subway' | 'rain' | 'crowd' | 'drone';
    visualizerMode?: string;
    stickerText?: string;
    sequencerTracks: {
      [key in DrumInstrument]: boolean[];
    };
  };
}

/**
 * Checks if a parsed session matches the core structure expected by the Audio Rig.
 */
export function validateSessionSchema(parsed: any): boolean {
  if (!parsed || typeof parsed !== 'object') return false;
  if (!parsed.data || typeof parsed.data !== 'object') return false;
  
  const d = parsed.data;
  if (typeof d.bpm !== 'number' || typeof d.crossfaderValue !== 'number') return false;
  if (!d.deckAValues || !d.deckBValues || !d.sequencerTracks) return false;
  
  return true;
}

/**
 * Serializes a full session object into a compact Base64 share code.
 */
export function serializeSession(session: any): string {
  try {
    // Inject current format version
    const versioned = {
      version: session.version || 1,
      name: session.name || "Live Mix Preset",
      timestamp: session.timestamp || Date.now(),
      data: session.data
    };
    const jsonStr = JSON.stringify(versioned);
    const bytes = new TextEncoder().encode(jsonStr);
    const binString = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binString);
  } catch (err) {
    throw new Error('Failed to serialize performance session data');
  }
}

/**
 * Deserializes a Base64 share code back into a verified VersionedSession.
 */
export function deserializeSession(code: string): VersionedSession {
  try {
    const cleanCode = code.trim().replace(/^#/, '');
    const binString = atob(cleanCode);
    const bytes = Uint8Array.from(binString, (char) => char.charCodeAt(0));
    const jsonStr = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(jsonStr);
    
    if (!validateSessionSchema(parsed)) {
      throw new Error('Mismatched performance properties mapping');
    }

    return {
      version: parsed.version || 1,
      name: parsed.name || 'Shared Live Mix',
      timestamp: parsed.timestamp || Date.now(),
      data: parsed.data
    };
  } catch (err) {
    throw new Error('Corrupted or version-incompatible session share code');
  }
}
