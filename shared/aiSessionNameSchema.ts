export interface SessionNameRequest {
  bpm: number;
  soundStyle: string;
  ambientMode: string;
  sequencerDensity: number;
}

export interface SessionNameResponse {
  names: string[];
  description: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function getSessionNameRequestError(value: unknown): string | null {
  if (!isObject(value)) return 'Request payload must be an object.';
  if (typeof value.bpm !== 'number' || !Number.isFinite(value.bpm)) return 'BPM must be a number.';
  if (typeof value.soundStyle !== 'string' || value.soundStyle.trim().length === 0) return 'Sound style is required.';
  if (typeof value.ambientMode !== 'string' || value.ambientMode.trim().length === 0) return 'Ambient mode is required.';
  if (
    typeof value.sequencerDensity !== 'number' ||
    !Number.isFinite(value.sequencerDensity) ||
    value.sequencerDensity < 0 ||
    value.sequencerDensity > 1
  ) {
    return 'Sequencer density must be a number between 0 and 1.';
  }

  return null;
}

export function validateSessionNameRequest(value: unknown): value is SessionNameRequest {
  return getSessionNameRequestError(value) === null;
}
