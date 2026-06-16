import {
  getSessionValidationError,
  validateSessionSchema,
  type VersionedSession,
} from '../../shared/sessionSchema';

export { getSessionValidationError, validateSessionSchema };
export type { VersionedSession };

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
    
    const validationError = getSessionValidationError(parsed);
    if (validationError) {
      throw new Error(validationError);
    }

    return {
      version: parsed.version || 1,
      name: parsed.name || 'Shared Live Mix',
      timestamp: parsed.timestamp || Date.now(),
      data: parsed.data
    };
  } catch (err) {
    const detail = err instanceof Error ? `: ${err.message}` : '';
    throw new Error(`Corrupted or version-incompatible session share code${detail}`);
  }
}
