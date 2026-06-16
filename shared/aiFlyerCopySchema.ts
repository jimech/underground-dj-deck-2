export interface FlyerCopyRequest {
  djName: string;
  djCrew: string;
  soundStyle: string;
  sessionName: string;
  bpm: number;
  ambientMode: string;
  aspectRatio: '1:1' | '9:16';
}

export interface FlyerCopyResponse {
  eventTitle: string;
  tagline: string;
  soundSignature: string;
  socialCaption: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRequiredString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function getFlyerCopyRequestError(value: unknown): string | null {
  if (!isObject(value)) return 'Request payload must be an object.';
  if (!isRequiredString(value.djName)) return 'DJ name is required.';
  if (!isRequiredString(value.djCrew)) return 'DJ crew is required.';
  if (!isRequiredString(value.soundStyle)) return 'Sound style is required.';
  if (!isRequiredString(value.sessionName)) return 'Session name is required.';
  if (typeof value.bpm !== 'number' || !Number.isFinite(value.bpm)) return 'BPM must be a number.';
  if (!isRequiredString(value.ambientMode)) return 'Ambient mode is required.';
  if (value.aspectRatio !== '1:1' && value.aspectRatio !== '9:16') return 'Aspect ratio must be 1:1 or 9:16.';

  return null;
}

export function validateFlyerCopyRequest(value: unknown): value is FlyerCopyRequest {
  return getFlyerCopyRequestError(value) === null;
}
