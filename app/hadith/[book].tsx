import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Clipboard } from 'react-native';

import { LoadingState, Text } from '@/components/ui';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ResizableSheet } from '@/components/ui/Sheet';
import { getHadithByBook, type HadithBookRow, type HadithRow } from '@/db/queries';
import { getHadithBooks } from '@/db/queries';
import { isHadithBookmarked, toggleHadithBookmark } from '@/db/userdb';
import { toArabicDigits } from '@/lib/digits';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

export default function HadithBookScreen() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language.startsWith('ar');
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ book: string; hadith?: string }>();
  const [book, setBook] = useState<HadithBookRow | null>(null);
  const [hadiths, setHadiths] = useState<HadithRow[] | null>(null);
  const [active, setActive] = useState<HadithRow | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const listRef = useRef<FlatList<HadithRow>>(null);

  useEffect(() => {
    (async () => {
      const books = await getHadithBooks();
      setBook(books.find((b) => b.slug === params.book) ?? null);
      const rows = await getHadithByBook(params.book, 5000);
      setHadiths(rows);
      if (params.hadith) {
        const idx = rows.findIndex((r) => r.id === Number(params.hadith));
        if (idx >= 0) setTimeout(() => listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.3 }), 300);
      }
    })();
  }, [params.book, params.hadith]);

  const openHadith = async (h: HadithRow) => {
    setActive(h);
    setBookmarked(await isHadithBookmarked(h.book_slug, h.id));
  };

  const activeTitle = () => {
    const slug = active?.book_slug ?? '';
    if (!isArabic) return slug;
    return book?.title_arabic || arabicReference(slug) || slug;
  };

  const copy = async () => {
    if (!active) return;
    const meta = `[${activeTitle()}${active.number > 0 ? ` ${isArabic ? toArabicDigits(active.number) : active.number}` : ''}${
      active.grade ? ` · ${isArabic ? arabicTextPart(active.grade) || gradeInfo(active.grade)?.labelAr || '' : active.grade}` : ''
    }]`;
    await Clipboard.setString(isArabic ? `${active.arabic}\n${meta}` : `${active.arabic}\n\n${active.english}\n${meta}`);
  };

  const share = async () => {
    if (!active) return;
    await Share.share({
      message: isArabic
        ? `${active.arabic}\n— ${activeTitle()} ${active.number > 0 ? toArabicDigits(active.number) : ''}`
        : `${active.arabic}\n${active.english}\n— ${active.book_slug} ${active.number > 0 ? active.number : ''}`,
    });
  };

  const sections: { title: string; count: number }[] = [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScreenHeader
        title={isArabic ? (book?.title_arabic ?? book?.title ?? params.book) : (book?.title ?? params.book)}
        subtitle={t('hadith.by', { author: isArabic ? (book?.author_arabic ?? book?.author ?? '') : (book?.author ?? '') })}
        onBack={() => router.back()}
      />
      {!hadiths ? (
        <LoadingState />
      ) : (
        <FlatList showsVerticalScrollIndicator={false}
          ref={listRef}
          data={hadiths}
          keyExtractor={(h) => String(h.id)}
          initialNumToRender={14}
          maxToRenderPerBatch={12}
          windowSize={9}
          onScrollToIndexFailed={({ index }) => listRef.current?.scrollToOffset({ offset: index * 180 })}
          contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
          ListHeaderComponent={
            sections.length > 0 ? (
              <View style={styles.sections}>
                {sections.map((s) => (
                  <Text key={s.title} variant="caption" color="secondary">{s.title}</Text>
                ))}
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const gi = gradeInfo(item.grade);
            const rowTitle = item.chapter
              ? chapterLabel(item.chapter, isArabic)
              : isArabic
                ? (book?.title_arabic ?? item.book_slug)
                : item.book_slug;
            const gradeFallback = isArabic ? arabicTextPart(item.grade) : item.grade;
            return (
            <Pressable
              onPress={() => openHadith(item)}
              style={({ pressed }) => [styles.row, { borderBottomColor: colors.hairline }, pressed && { backgroundColor: colors.bgSunken }]}
            >
              <View style={styles.rowTop}>
                <Text variant="caption" font="uiBold" color="primary" style={isArabic ? styles.rtlTitle : undefined}>
                  {rowTitle} {item.number > 0 ? `· ${isArabic ? toArabicDigits(item.number) : item.number}` : ''}
                </Text>
                {gi ? (
                  <View style={[styles.gradeChip, { backgroundColor: gi.bg, borderColor: gi.color + '40' }]}>
                    <Ionicons name={gi.icon} size={11} color={gi.color} />
                    <Text variant="micro" font="uiBold" style={{ color: gi.color }}>{isArabic ? gi.labelAr : gi.label}</Text>
                  </View>
                ) : gradeFallback ? (
                  <Text variant="micro" color="tertiary" numberOfLines={1} style={{ maxWidth: '60%' }}>
                    {gradeFallback}
                  </Text>
                ) : null}
              </View>
              <Text variant="bodySmall" font="arabicBold" style={{ color: colors.quranText, textAlign: 'right', writingDirection: 'rtl', lineHeight: 32, marginTop: space[2] }}>
                {item.arabic}
              </Text>
              {!isArabic ? (
                <Text variant="bodySmall" color="secondary" numberOfLines={2} style={{ marginTop: space[2] }}>
                  {item.english}
                </Text>
              ) : null}
            </Pressable>
          );}}
        />
      )}

      <HadithSheet
        visible={active !== null}
        hadith={active}
        onClose={() => setActive(null)}
        bookmarked={bookmarked}
        onToggleBookmark={async () => {
          if (!active) return;
          setBookmarked(await toggleHadithBookmark(active.book_slug, active.id));
        }}
        onCopy={copy}
        onShare={share}
        isArabic={isArabic}
        bookTitleAr={book?.title_arabic ?? ''}
        t={t}
        colors={colors}
      />
    </View>
  );
}

function gradeInfo(grade: string): { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap; label: string; labelAr: string; descEn: string; descAr: string } | null {
  if (!grade) return null;
  const g = grade.toLowerCase();
  if (g.includes('sahih') || g.includes('authentic') || g.includes('صحيح'))
    return { color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle', label: 'Sahih', labelAr: 'صحيح', descEn: 'Authentic – chain of narrators is unbroken and reliable', descAr: 'صحيح – سند المتصل والثقة' };
  if (g.includes('hasan') || g.includes('حسن'))
    return { color: '#2563eb', bg: '#dbeafe', icon: 'shield-checkmark', label: 'Hasan', labelAr: 'حسن', descEn: 'Good – slight weakness in narration but still acceptable', descAr: 'حسن – ضعف خفيف في السند لكنه مقبول' };
  if (g.includes('da\'eef') || g.includes('weak') || g.includes('ضعيف'))
    return { color: '#d97706', bg: '#fef3c7', icon: 'warning', label: 'Da\'eef', labelAr: 'ضعيف', descEn: 'Weak – narrators have issues; use with caution', descAr: 'ضعيف – فيه ناقلون مشكلون؛ استخدم بحذر' };
  if (g.includes('mawdu') || g.includes('fabricat') || g.includes('munkar') || g.includes('موضوع') || g.includes('منكر'))
    return { color: '#dc2626', bg: '#fee2e2', icon: 'close-circle', label: 'Mawdu\'', labelAr: 'موضوع', descEn: 'Fabricated – not from the Prophet ﷺ; reject entirely', descAr: 'موضوع – ليس من النبي ﷺ؛ ارفضه تماماً' };
  if (g.includes('marfu') || g.includes('elevated') || g.includes('مرفوع'))
    return { color: '#7c3aed', bg: '#ede9fe', icon: 'arrow-up-circle', label: 'Marfu\'', labelAr: 'مرفوع', descEn: 'Elevated – reliably attributed to the Prophet ﷺ', descAr: 'مرفوع – مرفوع إلى النبي ﷺ بسند صحيح' };
  if (g.includes('mawquf') || g.includes('stopped') || g.includes('موقوف'))
    return { color: '#6b7280', bg: '#f3f6f4', icon: 'pause-circle', label: 'Mawquf', labelAr: 'موقوف', descEn: 'Stopped – attributed to a Companion, not directly to the Prophet ﷺ', descAr: 'موقوف – منسوب إلى صحابي وليس مباشرة للنبي ﷺ' };
  return null;
}

const AR_BOOKS: [RegExp, string][] = [
  [/sahih al-?bukhari|al-?bukhari|bukhari/i, 'صحيح البخاري'],
  [/sahih muslim|muslim/i, 'صحيح مسلم'],
  [/sunan abi dawud|sunan abu dawud|abu dawud/i, 'سنن أبي داود'],
  [/jami'? ?at-?tirmidhi|at-?tirmidhi|tirmidhi/i, 'جامع الترمذي'],
  [/sunan an-?nasa'?i|an-?nasa'?i|nasai/i, 'سنن النسائي'],
  [/sunan ibn majah|ibn majah/i, 'سنن ابن ماجه'],
  [/musnad ahmad|ahmad/i, 'مسند أحمد'],
  [/muwatta/i, 'موطأ مالك'],
  [/al-?darimi|darimi/i, 'سنن الدارمي'],
  [/bulugh/i, 'بلوغ المرام'],
  [/mishkat/i, 'مشكاة المصابيح'],
  [/riyad|riad/i, 'رياض الصالحين'],
  [/bayhaqi/i, 'السنن الكبرى'],
  [/ibn hibban/i, 'الثقات'],
  [/hakim|mustadrak/i, 'المستدرك على الصحيحين'],
];

/** First Arabic-script segment of a mixed string ('' when none). */
function arabicTextPart(s: string): string {
  const i = s.search(/[\u0600-\u06FF]/);
  return i >= 0 ? s.slice(i).trim() : '';
}

/** "1 Revelation كتاب بدء الوحى" → language-appropriate chapter label. */
function chapterLabel(chapter: string, isArabic: boolean): string {
  if (!chapter) return '';
  const arStart = chapter.search(/[\u0600-\u06FF]/);
  if (arStart < 0) return chapter.trim();
  const en = chapter.slice(0, arStart).trim();
  const ar = chapter.slice(arStart).trim();
  return isArabic ? ar || en : en || ar;
}

/** English reference string → Arabic book title + numbers (drops dataset noise). */
function arabicReference(ref: string): string {
  if (!ref) return '';
  const m = ref.match(/Reference\s*:\s*([^]*?)(?:\s+In-book\s+reference|$)/i);
  let core = (m?.[1] ?? ref).trim().replace(/\s+USC-MSA.*$/i, '').trim();
  for (const [re, ar] of AR_BOOKS) {
    if (re.test(core)) return toArabicDigits(core.replace(re, ar));
  }
  core = toArabicDigits(core);
  return arabicTextPart(core) || (/^[٠-٩\s·-]+$/.test(core) ? core : '');
}

function HadithSheet({
  visible, hadith, onClose, bookmarked, onToggleBookmark, onCopy, onShare, isArabic, bookTitleAr, t, colors,
}: {
  visible: boolean;
  hadith: HadithRow | null;
  onClose: () => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onCopy: () => void;
  onShare: () => void;
  isArabic: boolean;
  bookTitleAr: string;
  t: (k: string, o?: Record<string, unknown>) => string;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  const insets = useSafeAreaInsets();
  const gi = gradeInfo(hadith?.grade ?? '');
  const sheetTitle = isArabic
    ? (bookTitleAr || (hadith ? arabicReference(hadith.book_slug) || hadith.book_slug : ''))
    : (hadith?.book_slug ?? '');
  const gradeAr = hadith ? arabicTextPart(hadith.grade) : '';
  return (
    <ResizableSheet visible={visible} onClose={onClose}>
      {hadith && (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: insets.bottom + space[4] }} >
            <Text variant="caption" font="uiBold" color="primary" style={isArabic ? styles.rtlTitle : undefined}>
              {sheetTitle} {hadith.number > 0 ? `· ${isArabic ? toArabicDigits(hadith.number) : hadith.number}` : ''}
            </Text>
              <Text variant="body" font="arabicBold" style={{ color: colors.quranText, textAlign: 'right', writingDirection: 'rtl', lineHeight: 34, marginTop: space[3] }}>
                {hadith.arabic}
              </Text>
              {!isArabic ? (
                <Text variant="body" color="secondary" style={{ marginTop: space[3], lineHeight: 24 }}>
                  {hadith.english}
                </Text>
              ) : null}
              {gi ? (
                <View style={[styles.gradeCard, { backgroundColor: gi.bg, borderColor: gi.color + '40' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name={gi.icon} size={18} color={gi.color} />
                    <Text variant="bodySmall" font="uiBold" style={{ color: gi.color }}>
                      {isArabic
                        ? `${gi.labelAr}${gradeAr ? ` – ${gradeAr}` : ''}`
                        : `${gi.label} – ${hadith.grade}`}
                    </Text>
                  </View>
                  <Text variant="caption" style={{ color: gi.color + 'cc', marginTop: 4 }}>
                    {isArabic ? gi.descAr : gi.descEn}
                  </Text>
                </View>
              ) : hadith.grade && (isArabic ? gradeAr : hadith.grade) ? (
                <Text variant="caption" color="tertiary" style={{ marginTop: space[3] }}>
                  {t('hadith.grade')}: {isArabic ? gradeAr : hadith.grade}
                </Text>
              ) : null}
              {hadith.reference && (isArabic ? arabicReference(hadith.reference) : hadith.reference) ? (
                <Text variant="caption" color="tertiary" style={{ marginTop: 2 }}>
                  {t('hadith.reference')}: {isArabic ? arabicReference(hadith.reference) : hadith.reference}
                </Text>
              ) : null}
              <View style={[styles.actions, { borderTopColor: colors.hairline }]}>
                <ActionBtn icon={bookmarked ? 'bookmark' : 'bookmark-outline'} label={t('hadith.bookmarked')} onPress={onToggleBookmark} active={bookmarked} colors={colors} />
                <ActionBtn icon="copy-outline" label={t('hadith.copy')} onPress={onCopy} colors={colors} />
                <ActionBtn icon="share-outline" label={t('common.share')} onPress={onShare} colors={colors} />
              </View>
          </ScrollView>
        </>
      )}
    </ResizableSheet>
  );
}

function ActionBtn({ icon, label, onPress, active, colors }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={active ? colors.primary : colors.textSecondary} />
      <Text variant="micro" font="uiBold" color={active ? 'primary' : 'secondary'}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rtlTitle: { textAlign: 'right', direction: 'rtl' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  sections: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], padding: space[4] },
  row: { paddingHorizontal: space[4], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth * 2 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: space[5], paddingTop: space[4], borderTopWidth: StyleSheet.hairlineWidth * 2 },
  actionBtn: { alignItems: 'center', gap: 4 },
  gradeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  gradeCard: { marginTop: space[3], padding: space[3], borderRadius: 10, borderWidth: 1 },
});
