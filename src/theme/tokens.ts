/**
 * Hidayah design tokens.
 * Liquid-glass system: OLED black canvas, layered translucent surfaces,
 * one restrained sage accent, generous radii. Light theme mirrors the same
 * hierarchy on warm paper.
 */

export const palette = {
  sage: {
    950: '#0E1A15',
    900: '#15261F',
    800: '#1E352B',
    700: '#2C4C3E',
    600: '#3D6654',
    500: '#55836C',
    400: '#7FA890',
    300: '#A5C6B2',
    200: '#C7DED1',
    100: '#E2EEE7',
    50: '#F1F7F3',
  },
  sand: {
    500: '#C9A227',
    400: '#D9BC67',
    300: '#E6D29A',
    200: '#EFE2BC',
    100: '#F4ECD8',
    50: '#FAF6EC',
  },
  neutral: {
    950: '#08090A',
    900: '#101113',
    800: '#17191C',
    700: '#212428',
    600: '#2E3237',
    500: '#4A5057',
    400: '#6E757D',
    300: '#9AA1A9',
    200: '#C4C9CE',
    100: '#E4E7EA',
    50: '#F4F5F6',
  },
  paper: '#F6F5F1',
  ink: '#0E0F11',
  night: '#050607',
  black: '#000000',
  white: '#FFFFFF',
  danger: '#D9695D',
  warning: '#D9B45C',
};

export type ThemeMode = 'light' | 'dark' | 'amoled';

export interface ThemeColors {
  mode: ThemeMode;
  bg: string;
  bgElevated: string;
  bgSunken: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textOnEmphasis: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  hairline: string;
  hairlineStrong: string;
  placeholder: string;
  danger: string;
  warning: string;
  success: string;
  overlay: string;
  /** Floating nav / control surface (translucent where blur is available). */
  glass: string;
  glassBorder: string;
  /** Selected verse / active playback wash. */
  activeWash: string;
  quranText: string;
  tajweed: {
    madd: string;
    qalqalah: string;
    ghunnah: string;
    ikhfa: string;
    hamzat: string;
  };
  scrim: string;
}

const light: ThemeColors = {
  mode: 'light',
  bg: palette.paper,
  bgElevated: '#FFFFFF',
  bgSunken: '#ECEBE6',
  card: '#FFFFFF',
  text: palette.ink,
  textSecondary: '#5D6469',
  textTertiary: '#8E969C',
  textOnEmphasis: '#FFFFFF',
  primary: '#22493A',
  primarySoft: 'rgba(34,73,58,0.07)',
  accent: palette.sand[500],
  accentSoft: 'rgba(201,162,39,0.12)',
  hairline: 'rgba(14,15,17,0.08)',
  hairlineStrong: 'rgba(14,15,17,0.18)',
  placeholder: '#B3B8BC',
  danger: '#B3453A',
  warning: '#A67C14',
  success: '#2F6B52',
  overlay: 'rgba(255,255,255,0.92)',
  glass: 'rgba(255,255,255,0.72)',
  glassBorder: 'rgba(14,15,17,0.07)',
  activeWash: 'rgba(34,73,58,0.07)',
  quranText: '#201B10',
  tajweed: {
    madd: '#C0392B',
    qalqalah: '#1F618D',
    ghunnah: '#1E8449',
    ikhfa: '#7D6608',
    hamzat: '#8E44AD',
  },
  scrim: 'rgba(16,20,19,0.4)',
};

const dark: ThemeColors = {
  mode: 'dark',
  bg: '#050607',
  bgElevated: '#111214',
  bgSunken: '#0A0B0C',
  card: '#121316',
  text: '#F3F4F5',
  textSecondary: '#9AA1A8',
  textTertiary: '#646B72',
  textOnEmphasis: '#0B0C0D',
  primary: '#A9CBB8',
  primarySoft: 'rgba(169,203,184,0.12)',
  accent: palette.sand[400],
  accentSoft: 'rgba(217,188,103,0.12)',
  hairline: 'rgba(255,255,255,0.08)',
  hairlineStrong: 'rgba(255,255,255,0.20)',
  placeholder: '#4A5057',
  danger: '#D96A5E',
  warning: '#D9B45C',
  success: '#8FC4A8',
  overlay: 'rgba(5,6,7,0.92)',
  glass: 'rgba(24,26,29,0.72)',
  glassBorder: 'rgba(255,255,255,0.09)',
  activeWash: 'rgba(169,203,184,0.10)',
  quranText: '#F2EBD8',
  tajweed: {
    madd: '#E07B6E',
    qalqalah: '#7FB3D5',
    ghunnah: '#82D4A4',
    ikhfa: '#D8BE6E',
    hamzat: '#C39BD3',
  },
  scrim: 'rgba(0,0,0,0.6)',
};

const amoled: ThemeColors = {
  ...dark,
  mode: 'amoled',
  bg: '#000000',
  bgElevated: '#0C0C0E',
  bgSunken: '#000000',
  card: '#0E0F11',
  overlay: 'rgba(0,0,0,0.94)',
  glass: 'rgba(18,19,22,0.74)',
};

export const themes: Record<ThemeMode, ThemeColors> = { light, dark, amoled };

/* ------------------------------ type scale ------------------------------ */

export const type = {
  display: { fontSize: 34, lineHeight: 42 },
  title: { fontSize: 28, lineHeight: 36 },
  heading: { fontSize: 22, lineHeight: 30 },
  subheading: { fontSize: 18, lineHeight: 26 },
  body: { fontSize: 15, lineHeight: 23 },
  bodySmall: { fontSize: 13, lineHeight: 20 },
  caption: { fontSize: 12, lineHeight: 17 },
  micro: { fontSize: 10, lineHeight: 14 },
  quran: { fontSize: 30, lineHeight: 46 },
  quranCompact: { fontSize: 25, lineHeight: 36 },
  quranWord: { fontSize: 21, lineHeight: 29 },
} as const;

export type TypeKey = keyof typeof type;

/* -------------------------------- spacing ------------------------------- */

export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 48, 10: 64,
} as const;

/* -------------------------------- radius -------------------------------- */

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  sheet: 28,
  pill: 999,
} as const;

/* ------------------------------- motion -------------------------------- */

export const motion = {
  fast: 150,
  base: 220,
  slow: 320,
} as const;

export const fontStack = {
  ui: 'Inter',
  uiBold: 'Inter_700Bold',
  arabic: 'ScheherazadeNew_400Regular',
  arabicBold: 'ScheherazadeNew_700Bold',
  arabicAlt: 'ScheherazadeNew_400Regular',
  arabicAltBold: 'ScheherazadeNew_700Bold',
} as const;
