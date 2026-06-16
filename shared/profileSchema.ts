export interface DjProfile {
  id: string;
  djName: string;
  djCrew: string;
  soundStyle: string;
  avatarIndex: number;
  timeMixed: number;
  vinylSpins: number;
}

export type DjProfileInput = Omit<DjProfile, 'id'>;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function getProfileValidationError(value: unknown): string | null {
  if (!isObject(value)) return 'Profile payload must be an object.';
  if (!isNonEmptyString(value.djName)) return 'DJ name is required.';
  if (!isNonEmptyString(value.djCrew)) return 'DJ crew is required.';
  if (!isNonEmptyString(value.soundStyle)) return 'Sound style is required.';
  if (typeof value.avatarIndex !== 'number' || !Number.isInteger(value.avatarIndex) || value.avatarIndex < 0) {
    return 'Avatar index must be a non-negative integer.';
  }
  if (!isNonNegativeFiniteNumber(value.timeMixed)) return 'Time mixed must be a non-negative number.';
  if (!isNonNegativeFiniteNumber(value.vinylSpins)) return 'Vinyl spins must be a non-negative number.';

  return null;
}

export function validateProfileInput(value: unknown): value is DjProfileInput {
  return getProfileValidationError(value) === null;
}
