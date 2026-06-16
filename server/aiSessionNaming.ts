import { GoogleGenAI } from '@google/genai';
import type { SessionNameRequest, SessionNameResponse } from '../shared/aiSessionNameSchema';

const FALLBACK_NAMES = ['Bunker Signal', 'Concrete Pulse', 'Low Ceiling Ritual'];
const FALLBACK_DESCRIPTION = 'A stripped-down underground set with industrial pressure, locked groove energy, and a late-night warehouse mood.';

function getFallbackSessionNameResponse(): SessionNameResponse {
  return {
    names: FALLBACK_NAMES,
    description: FALLBACK_DESCRIPTION,
  };
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function normalizeSessionNameResponse(value: unknown): SessionNameResponse | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const names = Array.isArray(record.names)
    ? record.names
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        .map((name) => name.trim().slice(0, 36))
        .slice(0, 5)
    : [];
  const description = typeof record.description === 'string' ? record.description.trim().slice(0, 240) : '';

  if (names.length === 0 || !description) return null;

  return {
    names,
    description,
  };
}

export async function generateSessionNames(input: SessionNameRequest): Promise<SessionNameResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return getFallbackSessionNameResponse();
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            text: [
              'Generate names for an underground DJ web-audio session.',
              'Return only compact JSON in this exact shape: {"names":["Name One","Name Two","Name Three"],"description":"One short sentence."}',
              `BPM: ${input.bpm}`,
              `Sound style: ${input.soundStyle}`,
              `Ambient mode: ${input.ambientMode}`,
              `Sequencer density from 0 to 1: ${input.sequencerDensity.toFixed(2)}`,
              'Keep names short, club-poster-ready, and avoid copyrighted artist names.',
            ].join('\n'),
          },
        ],
      },
    ],
  });

  const text = response.text || '';
  const jsonText = extractJsonObject(text);
  if (!jsonText) return getFallbackSessionNameResponse();

  try {
    return normalizeSessionNameResponse(JSON.parse(jsonText)) || getFallbackSessionNameResponse();
  } catch {
    return getFallbackSessionNameResponse();
  }
}
