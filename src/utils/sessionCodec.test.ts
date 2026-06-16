import { describe, expect, it } from 'vitest';
import {
  deserializeSession,
  getSessionValidationError,
  serializeSession,
  validateSessionSchema,
  type VersionedSession,
} from './sessionCodec';

function createSession(overrides: Partial<VersionedSession> = {}): VersionedSession {
  const session: VersionedSession = {
    version: 1,
    name: 'Warehouse Smoke Test',
    timestamp: 1781568000000,
    data: {
      bpm: 130,
      crossfaderValue: 0,
      deckAValues: { vol: 0.7, low: 0, mid: 0, high: 0, filter: 0 },
      deckBValues: { vol: 0.7, low: 0, mid: 0, high: 0, filter: 0 },
      swingAmountValue: 0,
      flangerValue: 0,
      deckSelectedTracks: { A: 0, B: 1 },
      deckPlayStates: { A: false, B: false },
      deckReversed: { A: false, B: false },
      effectsVinylCrackleActive: false,
      effectsVinylCrackleVolume: 0.25,
      effectsVinylCrackleFreq: 1000,
      effectsVinylCrackleQ: 1,
      ambientMode: 'subway',
      visualizerMode: 'bars',
      stickerText: 'TEST RIG',
      sequencerTracks: {
        kick: [true, false, false, false],
        snare: [false, false, true, false],
        hihat: [false, true, false, true],
        synth: [false, false, false, false],
      },
    },
  };

  return {
    ...session,
    ...overrides,
  };
}

describe('sessionCodec', () => {
  it('serializes and deserializes a valid session', () => {
    const session = createSession();
    const code = serializeSession(session);
    const decoded = deserializeSession(code);

    expect(decoded).toEqual(session);
    expect(validateSessionSchema(decoded)).toBe(true);
  });

  it('accepts share codes prefixed with #', () => {
    const session = createSession({ name: 'Hash Link Session' });
    const code = serializeSession(session);

    expect(deserializeSession(`#${code}`).name).toBe('Hash Link Session');
  });

  it('adds default metadata when serializing partial session objects', () => {
    const code = serializeSession({
      data: createSession().data,
    });
    const decoded = deserializeSession(code);

    expect(decoded.version).toBe(1);
    expect(decoded.name).toBe('Live Mix Preset');
    expect(typeof decoded.timestamp).toBe('number');
  });

  it('rejects corrupted share codes', () => {
    expect(() => deserializeSession('not-valid-base64-json')).toThrow(
      /Corrupted or version-incompatible session share code/,
    );
  });

  it('reports invalid schema payloads', () => {
    const error = getSessionValidationError({
      version: 1,
      name: 'Broken',
      timestamp: Date.now(),
      data: {
        bpm: 'fast',
      },
    });

    expect(error).toBe('Session BPM must be a number.');
  });

  it('rejects unsupported ambient modes', () => {
    const session = createSession({
      data: {
        ...createSession().data,
        ambientMode: 'space-station' as any,
      },
    });

    expect(validateSessionSchema(session)).toBe(false);
    expect(getSessionValidationError(session)).toBe('Ambient mode is not supported.');
  });
});
