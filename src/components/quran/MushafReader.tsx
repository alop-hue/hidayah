import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  View,
  type LayoutChangeEvent,
  type ViewToken,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import type { HighlightColor } from '@/db/userdb';
import { HIGHLIGHT_WASH } from '@/features/quran/highlights';
import Animated, { FadeIn } from 'react-native-reanimated';

import { colorizeWords, splitWords } from '@/features/quran/tajweed';
import { toArabicDigits } from '@/lib/digits';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

export interface MushafVerse {
  ayah: number;
  arabic: string;
  page: number;
  sajda?: number;
  /** Present in page-mode (cross-surah); used for inline surah banners. */
  surah?: number;
  surahName?: string;
}

interface Props {
  surahId: number;
  surahName: string;
  verses: MushafVerse[];
  showBismillah: boolean;
  activeAyah: number | null;
  /** Permanently saved highlights for this surah. */
  highlights?: Record<number, HighlightColor>;
  /** Verse the user tapped (temporary selection, cleared on sheet close). */
  selectedAyah?: number | null;
  focusAyah?: number;
  memorizeMode?: boolean;
  tajweed: boolean;
  wordByWord?: boolean;
  onPressAyah: (ayah: number) => void;
  onPressWord?: (ayah: number, word: number) => void;
  onLongPressAyah?: (ayah: number) => void;
  hiddenAyahs?: Set<number>;
  onToggleHidden?: (ayah: number) => void;
  onPageChange: (ayah: number) => void;
  onNextSurah?: () => void;
  activeWord?: number | null;
  activeWordAyah?: number | null;
}

const FONT_SIZE = 27;
const LINE_HEIGHT = 50;
const PAGE_BG = '#0A1A14';
const PAGE_TEXT = '#F5EDDA';
const MARKER_COLOR = '#C9A227';
const PAGE_FRAME = '#1A3D2E';

interface Paper {
  bg: string;
  text: string;
  frame: string;
  frameInner: string;
  headerBg: string;
  headerText: string;
  marker: string;
  markerBg: string;
  tajweed: { madd: string; qalqalah: string; ghunnah: string; ikhfa: string; hamzat: string };
  sajda: string;
  muted: string;
  hairline: string;
  underline: string;
  chipBorder: string;
  chipBg: string;
}

const PAPER_LIGHT: Paper = {
  bg: '#FAF6EB',
  text: '#2B2114',
  frame: '#2F5D49',
  frameInner: '#C2A56B',
  headerBg: '#1E5B45',
  headerText: '#F2E8CF',
  marker: '#9A7B1F',
  markerBg: 'rgba(154,123,31,0.10)',
  tajweed: { madd: '#C0392B', qalqalah: '#1F618D', ghunnah: '#1E8449', ikhfa: '#7D6608', hamzat: '#8E44AD' },
  sajda: '#7A6212',
  muted: 'rgba(43,33,20,0.55)',
  hairline: 'rgba(43,33,20,0.30)',
  underline: 'rgba(43,33,20,0.35)',
  chipBorder: 'rgba(43,33,20,0.22)',
  chipBg: 'rgba(43,33,20,0.06)',
};

const PAPER_DARK: Paper = {
  bg: PAGE_BG,
  text: PAGE_TEXT,
  frame: PAGE_FRAME,
  frameInner: '#3E6B55',
  headerBg: '#122A1F',
  headerText: '#E8DCC0',
  marker: MARKER_COLOR,
  markerBg: 'rgba(201,162,39,0.12)',
  tajweed: { madd: '#E07B6E', qalqalah: '#7FB3D5', ghunnah: '#82D4A4', ikhfa: '#D8BE6E', hamzat: '#C39BD3' },
  sajda: '#D4AF37',
  muted: 'rgba(245,237,218,0.55)',
  hairline: 'rgba(242,235,216,0.35)',
  underline: 'rgba(242,235,216,0.40)',
  chipBorder: 'rgba(242,235,216,0.22)',
  chipBg: 'rgba(255,255,255,0.06)',
};

const PAPER_AMOLED: Paper = {
  ...PAPER_DARK,
  bg: '#000000',
  frame: '#20342A',
  frameInner: '#2C4A3A',
  headerBg: '#0B1712',
};

export function MushafReader({
  surahId,
  surahName,
  verses,
  showBismillah,
  activeAyah,
  highlights,
  selectedAyah,
  focusAyah,
  memorizeMode,
  tajweed,
  wordByWord,
  onPressAyah,
  onPressWord,
  onLongPressAyah,
  hiddenAyahs,
  onToggleHidden,
  onPageChange,
  onNextSurah,
  activeWord,
  activeWordAyah,
}: Props) {
  const { colors } = useTheme();
  // The page now uses the same palette as the rest of the app: neutral sheet,
  // ink text, sage/gold accents. No separate green parchment theme.
  const paper = useMemo<Paper>(
    () => ({
      bg: colors.card,
      text: colors.text,
      frame: colors.hairline,
      frameInner: colors.hairlineStrong,
      headerBg: colors.bgSunken,
      headerText: colors.accent,
      marker: colors.accent,
      markerBg: 'transparent',
      tajweed: colors.tajweed,
      sajda: colors.accent,
      muted: colors.textSecondary,
      hairline: colors.hairline,
      underline: colors.hairline,
      chipBorder: colors.hairline,
      chipBg: colors.bgSunken,
    }),
    [colors],
  );
  const { t, i18n } = useTranslation();
  const listRef = useRef<FlatList>(null);
  const [pageW, setPageW] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const lastPageRef = useRef(-1);
  const rtl = i18n.dir() === 'rtl';

  const onLayout = (e: LayoutChangeEvent) => {
    setPageW(e.nativeEvent.layout.width);
  };

  // Group by the real 604-page mushaf number so app page N == Quran page N.
  const pages = useMemo(() => {
    if (!verses.length) return [] as { page: number; verses: MushafVerse[] }[];
    const byPage = new Map<number, MushafVerse[]>();
    for (const v of verses) {
      const p = v.page || 1;
      const list = byPage.get(p);
      if (list) list.push(v);
      else byPage.set(p, [v]);
    }
    return [...byPage.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([page, list]) => ({ page, verses: list }));
  }, [verses]);

  const pagesRef = useRef(pages);
  pagesRef.current = pages;
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;
  const lastVisibleRef = useRef(-1);

  const scrollToPage = useCallback(
    (i: number, animated = true) => {
      if (!pages) return;
      const idx = Math.min(Math.max(0, i), pages.length - 1);
      listRef.current?.scrollToIndex({ index: idx, animated });
    },
    [pages],
  );

  useEffect(() => {
    if (!pages) return;
    const target = activeAyah ?? focusAyah;
    if (!target) return;
    const idx = pages.findIndex((p) => p.verses.some((v) => v.ayah === target));
    if (idx >= 0 && idx !== lastPageRef.current) {
      lastPageRef.current = idx;
      scrollToPage(idx, false);
    }
  }, [pages, activeAyah, focusAyah, scrollToPage]);

  useEffect(() => {
    lastPageRef.current = -1;
    lastVisibleRef.current = -1;
    setPageIndex(0);
  }, [surahId]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const first = viewableItems[0]?.index as number | null | undefined;
    const currentPages = pagesRef.current;
    if (typeof first === 'number' && currentPages && currentPages[first]) {
      setPageIndex(first);
      onPageChangeRef.current(currentPages[first].verses[0].ayah);
      if (first !== lastVisibleRef.current) {
        lastVisibleRef.current = first;
        Haptics.selectionAsync().catch(() => {});
      }
    }
  }).current;

  const renderVerse = (v: MushafVerse) => {
    const isActive = activeAyah === v.ayah;
    const isSelected = selectedAyah === v.ayah;
    const saved = highlights?.[v.ayah];
    const isFocus = memorizeMode && focusAyah === v.ayah;
    const isHidden = hiddenAyahs?.has(v.ayah) ?? false;
    const isWordActive = activeWordAyah === v.ayah && activeWord != null;
    const bg = isActive
      ? 'rgba(201,162,39,0.28)'
      : isSelected
        ? 'rgba(169,203,184,0.22)'
        : saved
          ? HIGHLIGHT_WASH[saved]
          : isFocus
            ? 'rgba(201,162,39,0.16)'
            : 'transparent';
    const words = splitWords(v.arabic);
    const spans = tajweed ? colorizeWords(words) : null;
    const verseNumber = toArabicDigits(v.ayah);
    // Inline, text-flow marker (ornate parentheses) so verses wrap mid-verse.
    const marker = (onPress?: () => void) => (
      <RNText onPress={onPress} style={[styles.inlineMarker, { color: paper.marker }]}>
        {` \uFD3F${verseNumber}\uFD3E `}
      </RNText>
    );
    const base = [
      styles.ayahSpan,
      {
        backgroundColor: bg,
        color: paper.text,
      },
    ];
    const pressProps = {
      onPress: () => onPressAyah(v.ayah),
      onLongPress: onLongPressAyah ? () => onLongPressAyah(v.ayah) : undefined,
      delayLongPress: 400,
    };
    if (isHidden && onToggleHidden) {
      return (
        <RNText
          key={`h${v.ayah}`}
          onPress={() => onToggleHidden(v.ayah)}
          style={[styles.inlineMarker, { color: paper.muted }]}
        >
          {` ${t('quran.hiddenAyah')} ﴿${verseNumber}﴾ `}
        </RNText>
      );
    }
    if (wordByWord && onPressWord) {
      const wordSpans = spans ?? words.map((w) => [{ text: w, color: 'default' as const }]);
      return (
        <RNText key={v.ayah} style={base} {...pressProps}>
          {wordSpans.map((wordParts, i) => {
            const isHighlighted = isWordActive && i === activeWord;
            return (
              <RNText
                key={`w${i}`}
                style={[styles.wordTap, { color: paper.text, borderBottomColor: paper.underline }]}
                onPress={() => onPressWord(v.ayah, i + 1)}
              >
                {wordParts.map((span, j) => (
                  <RNText
                    key={j}
                    style={{
                      color: span.color === 'default' ? paper.text : paper.tajweed[span.color],
                      backgroundColor: isHighlighted ? 'rgba(201,162,39,0.4)' : 'transparent',
                      borderRadius: 3,
                    }}
                  >
                    {span.text}
                  </RNText>
                ))}
                {' '}
              </RNText>
            );
          })}
          {v.sajda === 1 ? <RNText style={{ color: paper.sajda }}> ۩ </RNText> : null}
          {marker(() => onPressAyah(v.ayah))}
        </RNText>
      );
    }
    if (spans) {
      return (
        <RNText key={v.ayah} style={base} {...pressProps}>
          {spans.map((word, i) => {
            const isHighlighted = isWordActive && i === activeWord;
            return word.map((span, j) => (
              <RNText
                key={`${i}-${j}`}
                style={{
                  color: span.color === 'default' ? paper.text : paper.tajweed[span.color],
                  backgroundColor: isHighlighted ? 'rgba(201,162,39,0.4)' : 'transparent',
                  borderRadius: 3,
                  paddingHorizontal: isHighlighted ? 1 : 0,
                }}
              >
                {span.text}{' '}
              </RNText>
            ));
          })}
          {v.sajda === 1 ? <RNText style={{ color: paper.sajda }}> ۩ </RNText> : null}
          {marker(() => onPressAyah(v.ayah))}
        </RNText>
      );
    }
    return (
      <RNText key={v.ayah} style={base} {...pressProps}>
        <RNText style={{ color: paper.text }}>{v.arabic}</RNText>
        {v.sajda === 1 ? <RNText style={{ color: paper.sajda }}> ۩ </RNText> : null}
        {marker()}
      </RNText>
    );
  };

  const renderBismillah = (key: string) => (
    <RNText key={key} style={[styles.bismillah, { color: paper.text }]}>
      {'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ'}
    </RNText>
  );

  // Render a page's verses, inserting a decorative surah banner (and the
  // bismillah) exactly where a surah begins (ayah 1). Works for both
  // surah-mode (banner on the surah's opening page only) and page-mode (a
  // real page that may contain one or more surah openings).
  const renderPageContent = (pageVerses: MushafVerse[]): ReactNode[] => {
    const out: ReactNode[] = [];
    let paragraph: ReactNode[] = [];
    let pIndex = 0;

    const flush = () => {
      if (!paragraph.length) return;
      out.push(
        <RNText
          key={`para${pIndex++}`}
          style={[styles.paragraph, { color: paper.text, fontFamily: 'Amiri_400Regular' }]}
        >
          {paragraph}
        </RNText>,
      );
      paragraph = [];
    };

    pageVerses.forEach((v, idx) => {
      if (v.ayah === 1) {
        flush();
        const s = v.surah ?? surahId;
        if (showBismillah && s !== 1 && s !== 9) {
          out.push(renderBismillah(`bi${s}_${idx}`));
        }
      }
      paragraph.push(renderVerse(v));
      paragraph.push(' ');
    });
    flush();
    return out;
  };

  if (!pages || !pageW) {
    return (
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="caption" color="tertiary">…</Text>
        </View>
      </View>
    );
  }

  const lastPage = pages.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: paper.bg }} onLayout={onLayout}>
      <FlatList
        showsVerticalScrollIndicator={false}
        ref={listRef}
        data={pages}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, index) => ({ length: pageW, offset: pageW * index, index })}
        initialScrollIndex={0}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        renderItem={({ item }) => (
          <Animated.View entering={FadeIn.duration(220)} style={[styles.page, { width: pageW }]}>
            <View style={[styles.sheet, { backgroundColor: paper.bg, borderColor: paper.frameInner }]}>
              {/* surah name cartouche, the only ornament on the page */}
              <View style={[styles.pageHeader, { backgroundColor: paper.headerBg, borderColor: paper.frameInner }]}>
                <RNText style={[styles.pageHeaderText, { color: paper.headerText }]}>{
                  item.verses[0]?.surahName ?? surahName
                }</RNText>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.pageBody}
                contentContainerStyle={{ paddingBottom: 16 }}
              >
                {renderPageContent(item.verses)}
              </ScrollView>
              <View style={[styles.pageFooter, { borderTopColor: paper.hairline }]}>
                <View style={[styles.pageMedallion, { borderColor: paper.marker, backgroundColor: paper.markerBg }]}>
                  <RNText style={[styles.pageNumber, { color: paper.marker }]}>{toArabicDigits(item.page)}</RNText>
                </View>
              </View>
            </View>
          </Animated.View>
        )}
        onScrollToIndexFailed={({ index }) =>
          listRef.current?.scrollToOffset({ offset: index * pageW, animated: false })
        }
      />
      <View style={[styles.footer, { borderTopColor: paper.hairline }]}>
        <Pressable onPress={() => scrollToPage(pageIndex - 1)} hitSlop={10} style={styles.footerBtn} accessibilityLabel={t('quran.prevPage')}>
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={20} color={paper.muted} />
        </Pressable>
        {pageIndex === lastPage && onNextSurah ? (
          <Pressable onPress={onNextSurah} style={[styles.nextBtn, { borderColor: paper.chipBorder, backgroundColor: paper.chipBg }]}>
            <Text variant="bodySmall" font="arabicBold" color="primary">
              {t('quran.nextSurah')} {rtl ? '‹' : '›'}
            </Text>
          </Pressable>
        ) : (
          <Text variant="caption" font="uiBold" style={{ color: paper.muted }}>
            {toArabicDigits(pages[pageIndex]?.page ?? pages[0]?.page ?? 1)} / {toArabicDigits(pages[pages.length - 1]?.page ?? 1)}
          </Text>
        )}
        <Pressable onPress={() => scrollToPage(pageIndex + 1)} hitSlop={10} style={styles.footerBtn} accessibilityLabel={t('quran.nextPage')}>
          <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} size={20} color={paper.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  sheet: {
    flex: 1,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
  },
  pageHeader: {
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageHeaderText: {
    fontFamily: 'Amiri_700Bold',
    fontSize: 17,
    lineHeight: 26,
    writingDirection: 'rtl',
    textAlign: 'center',
  },

  // Decorative surah banner box (classic header at the start of a surah).
  surahBanner: {
    borderWidth: 1.5,
    borderRadius: 6,
    padding: 2,
    marginTop: 6,
    marginBottom: 6,
    marginHorizontal: 4,
    alignSelf: 'stretch',
  },
  surahBannerInner: {
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  surahBannerText: { fontSize: 22, lineHeight: 36, fontFamily: 'Amiri_700Bold', textAlign: 'center' },
  bismillah: { fontSize: 24, lineHeight: 42, fontFamily: 'Amiri_700Bold', textAlign: 'center', marginBottom: 6 },
  pageBody: { flex: 1, paddingHorizontal: 10, paddingTop: 4 },
  pageFooter: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  pageMedallion: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNumber: {
    fontSize: 14,
    lineHeight: 16,
    textAlign: 'center',
    includeFontPadding: false,
    fontFamily: 'Amiri_400Regular',
  },
  ayahSpan: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    fontFamily: 'Amiri_700Bold',
    color: PAGE_TEXT,
    textAlign: 'justify',
    direction: 'rtl',
    borderRadius: 4,
    paddingHorizontal: 1,
    marginBottom: 4,
  },
  verseMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: MARKER_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    alignSelf: 'center',
    backgroundColor: 'rgba(201,162,39,0.08)',
  },
  marker: { fontSize: 15, color: MARKER_COLOR, fontFamily: 'Amiri_700Bold', textAlign: 'center' },
  paragraph: {
    fontSize: FONT_SIZE,
    lineHeight: LINE_HEIGHT,
    textAlign: 'justify',
    writingDirection: 'rtl',
  },
  inlineMarker: { fontSize: FONT_SIZE - 2, lineHeight: LINE_HEIGHT, fontFamily: 'Amiri_700Bold' },
  inlineMarkerCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 3,
  },
  inlineMarkerText: {
    fontSize: 13,
    lineHeight: 15,
    includeFontPadding: false,
    fontFamily: 'Amiri_700Bold',
  },
  wordTap: { borderBottomWidth: 1, borderBottomColor: 'rgba(242,235,216,0.4)', paddingHorizontal: 1, color: PAGE_TEXT },
  hiddenBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    direction: 'rtl',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 6,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    marginBottom: 4,
    minHeight: LINE_HEIGHT,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(128,128,128,0.12)' },
  nextBtn: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
  },
});
