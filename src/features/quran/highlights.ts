import type { HighlightColor } from '@/db/userdb';

/** Ordered palette used by the verse action sheet and the reader wash. */
export const HIGHLIGHT_ORDER: HighlightColor[] = ['sage', 'gold', 'sky', 'rose', 'lilac'];

export const HIGHLIGHT_SWATCH: Record<HighlightColor, string> = {
  sage: '#7FA890',
  gold: '#D9BC67',
  sky: '#7FB3D5',
  rose: '#D98C8C',
  lilac: '#B49BD9',
};

export const HIGHLIGHT_WASH: Record<HighlightColor, string> = {
  sage: 'rgba(127,168,144,0.26)',
  gold: 'rgba(217,188,103,0.26)',
  sky: 'rgba(127,179,213,0.24)',
  rose: 'rgba(217,140,140,0.24)',
  lilac: 'rgba(180,155,217,0.24)',
};

export const HIGHLIGHT_LABEL_KEY: Record<HighlightColor, string> = {
  sage: 'quran.highlightSage',
  gold: 'quran.highlightGold',
  sky: 'quran.highlightSky',
  rose: 'quran.highlightRose',
  lilac: 'quran.highlightLilac',
};
