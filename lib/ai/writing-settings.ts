/** Shared defaults: changing these and deploying updates the public generator.
 * Admin-screen changes are experiments, not a global publish operation. */
export const DEFAULT_WRITING_SETTINGS = {
  targetCharacters: 2000,
  voice: 'third' as 'first' | 'third',
  tone: 'warm' as 'warm' | 'plain',
  opening: 'episode' as 'episode' | 'chronological',
  emphasis: 'balanced' as 'balanced' | 'family' | 'work',
  personality: 'woven' as 'woven' | 'section' | 'omit',
  quotations: 'selective' as 'selective' | 'none',
  temperature: 0.35,
};
export type WritingSettings = typeof DEFAULT_WRITING_SETTINGS;
export const WRITING_SETTINGS_KEY = 'jibunshi-writing-settings-v1';
export const STORY_MAX_OUTPUT_TOKENS = 9000;

export function normalizeWritingSettings(raw: unknown): WritingSettings {
  const data = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const choice = <T extends string>(key: string, values: readonly T[], fallback: T): T => values.includes(data[key] as T) ? data[key] as T : fallback;
  const numeric = (key: string, fallback: number, min: number, max: number) => typeof data[key] === 'number' && Number.isFinite(data[key]) ? Math.min(max, Math.max(min, data[key])) : fallback;
  return {
    targetCharacters: Math.round(numeric('targetCharacters', DEFAULT_WRITING_SETTINGS.targetCharacters, 800, 5000)),
    voice: choice('voice', ['first', 'third'], DEFAULT_WRITING_SETTINGS.voice),
    tone: choice('tone', ['warm', 'plain'], DEFAULT_WRITING_SETTINGS.tone),
    opening: choice('opening', ['episode', 'chronological'], DEFAULT_WRITING_SETTINGS.opening),
    emphasis: choice('emphasis', ['balanced', 'family', 'work'], DEFAULT_WRITING_SETTINGS.emphasis),
    personality: choice('personality', ['woven', 'section', 'omit'], DEFAULT_WRITING_SETTINGS.personality),
    quotations: choice('quotations', ['selective', 'none'], DEFAULT_WRITING_SETTINGS.quotations),
    temperature: Math.round(numeric('temperature', DEFAULT_WRITING_SETTINGS.temperature, 0, 0.7) * 100) / 100,
  };
}
