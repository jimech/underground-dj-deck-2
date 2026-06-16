import { GoogleGenAI } from '@google/genai';
import type { FlyerCopyRequest, FlyerCopyResponse } from '../shared/aiFlyerCopySchema';

const fallbackCopy: FlyerCopyResponse = {
  eventTitle: 'LIVE SETUP IMPROV',
  tagline: 'SUB-LEVEL PRESSURE FOR LOW-LIGHT ROOMS',
  soundSignature: 'INDUSTRIAL TECHNO',
  socialCaption: 'Tonight: raw machines, concrete reverb, and locked-in warehouse pressure.',
};

function getFallbackFlyerCopy(input: FlyerCopyRequest): FlyerCopyResponse {
  return {
    ...fallbackCopy,
    eventTitle: input.sessionName || fallbackCopy.eventTitle,
    soundSignature: input.soundStyle || fallbackCopy.soundSignature,
  };
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function normalizeFlyerCopy(value: unknown): FlyerCopyResponse | null {
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  const eventTitle = typeof record.eventTitle === 'string' ? record.eventTitle.trim().slice(0, 32) : '';
  const tagline = typeof record.tagline === 'string' ? record.tagline.trim().slice(0, 80) : '';
  const soundSignature = typeof record.soundSignature === 'string' ? record.soundSignature.trim().slice(0, 32) : '';
  const socialCaption = typeof record.socialCaption === 'string' ? record.socialCaption.trim().slice(0, 220) : '';

  if (!eventTitle || !tagline || !soundSignature || !socialCaption) return null;

  return {
    eventTitle,
    tagline,
    soundSignature,
    socialCaption,
  };
}

export async function generateFlyerCopy(input: FlyerCopyRequest): Promise<FlyerCopyResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return getFallbackFlyerCopy(input);
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
              'Generate copy for an underground DJ set poster.',
              'Return only compact JSON in this exact shape:',
              '{"eventTitle":"SHORT TITLE","tagline":"SHORT TAGLINE","soundSignature":"GENRE LABEL","socialCaption":"One concise social caption."}',
              `DJ name: ${input.djName}`,
              `Crew: ${input.djCrew}`,
              `Current session title: ${input.sessionName}`,
              `Sound style: ${input.soundStyle}`,
              `BPM: ${input.bpm}`,
              `Ambient mode: ${input.ambientMode}`,
              `Poster format: ${input.aspectRatio}`,
              'Keep the copy original, club-poster-ready, gritty, concise, and free of copyrighted artist or venue names.',
            ].join('\n'),
          },
        ],
      },
    ],
  });

  const text = response.text || '';
  const jsonText = extractJsonObject(text);
  if (!jsonText) return getFallbackFlyerCopy(input);

  try {
    return normalizeFlyerCopy(JSON.parse(jsonText)) || getFallbackFlyerCopy(input);
  } catch {
    return getFallbackFlyerCopy(input);
  }
}
