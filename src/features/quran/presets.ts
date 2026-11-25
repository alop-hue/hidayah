/**
 * Reading typography presets. Each one only changes size and leading of the
 * page text — the Quran script itself is never modified.
 */
export type ReadingPreset = 'mushaf' | 'comfort' | 'large' | 'compact' | 'contrast';

export const READING_PRESETS: Record<ReadingPreset, { size: number; line: number }> = {
  mushaf: { size: 25, line: 56 },
  comfort: { size: 27, line: 60 },
  large: { size: 33, line: 72 },
  compact: { size: 23, line: 50 },
  contrast: { size: 29, line: 64 },
};

export const PRESET_ORDER: ReadingPreset[] = ['mushaf', 'comfort', 'large', 'compact', 'contrast'];
