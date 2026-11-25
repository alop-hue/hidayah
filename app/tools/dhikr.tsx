import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { LoadingState, Text } from '@/components/ui';
import { getAdhkarByCategory, getAdhkarCategories, type AdhkarRow } from '@/db/queries';
import { bumpActivity } from '@/db/userdb';
import { toArabicDigits } from '@/lib/digits';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

const ADH_KAR_BOOKS: [RegExp, string][] = [
  [/^Bukhari\b/i, 'صحيح البخاري'],
  [/^Muslim\b/i, 'صحيح مسلم'],
  [/^Abu Dawud\b/i, 'سنن أبي داود'],
  [/^Tirmidhi\b/i, 'جامع الترمذي'],
  [/^Nasai\b/i, 'سنن النسائي'],
  [/^Ibn Majah\b/i, 'سنن ابن ماجه'],
  [/^Ahmad\b/i, 'مسند أحمد'],
  [/^Hakim\b/i, 'المستدرك على الصحيحين'],
  [/^Quran\b/i, 'القرآن'],
  [/^Darimi\b/i, 'سنن الدارمي'],
  [/^Malik\b/i, 'موطأ مالك'],
  [/^Ibn Hibban\b/i, 'الثقات'],
  [/^Bayhaqi\b/i, 'السنن الكبرى'],
  [/^Tabarani\b/i, 'المعجم الأوسط'],
  [/^Darqutni\b/i, 'سنن الدارقطني'],
];

/** English citation ("Muslim 2723", "Hakim, sahih") → Arabic for Arabic mode. */
function arabicSource(src: string): string {
  let out = src;
  for (const [re, ar] of ADH_KAR_BOOKS) out = out.replace(re, ar);
  out = out.replace(/,\s*sahih\b/gi, ' (صحيح)').replace(/\bsahih\b/gi, 'صحيح');
  return out;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  morning: 'sunny-outline',
  evening: 'moon-outline',
  'after-prayer': 'time-outline',
  sleep: 'bed-outline',
  travel: 'airplane-outline',
  general: 'sparkles-outline',
};

export default function DhikrScreen({ inTab = false }: { inTab?: boolean } = {}) {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [items, setItems] = useState<AdhkarRow[] | null>(null);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const isArabic = i18n.language.startsWith('ar');
  const rtl = i18n.dir() === 'rtl';

  useEffect(() => {
    getAdhkarCategories().then(async (cats) => {
      setCategories(cats);
      if (cats.length > 0) {
        setActive(cats[0]);
        setItems(await getAdhkarByCategory(cats[0]));
      }
    });
  }, []);

  const select = async (cat: string) => {
    setActive(cat);
    setItems(null);
    setItems(await getAdhkarByCategory(cat));
    setCounts({});
    void Haptics.selectionAsync();
  };

  const bump = (id: number, count: number) => {
    if ((counts[id] ?? 0) < count) void bumpActivity({ dhikr: 1 }).catch(() => {});
    setCounts((c) => {
      const cur = c[id] ?? 0;
      if (cur >= count) return c;
      return { ...c, [id]: cur + 1 };
    });
    const cur = counts[id] ?? 0;
    const completed = cur + 1 >= count && cur < count;
    void Haptics.impactAsync(completed ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const resetAll = () => setCounts({});

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={[styles.header, { flexDirection: 'row' }]}>
        {inTab ? (
          <View style={{ width: 38 }} />
        ) : (
          <AnimatedPressable
            onPress={() => router.back()}
            accessibilityLabel={t('common.back')}
            style={[styles.iconBtn, { backgroundColor: colors.card }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </AnimatedPressable>
        )}
        <View style={{ flex: 1, alignItems: rtl ? 'flex-end' : 'flex-start' }}>
          <Text variant="title" font="uiBold" numberOfLines={1}>{t('tools.dhikr')}</Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {active ? t(`dhikr.categories.${active}`) : t('tools.dhikrHint')}
          </Text>
        </View>
        <AnimatedPressable
          onPress={resetAll}
          accessibilityLabel={t('dhikr.reset')}
          style={[styles.iconBtn, { backgroundColor: colors.card }]}
        >
          <Ionicons name="refresh" size={18} color={colors.textSecondary} />
        </AnimatedPressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: space[5], gap: space[2], paddingVertical: space[3] }}
        style={{ flexGrow: 0 }}
      >
        {categories.map((c) => {
          const selected = active === c;
          const icon = CATEGORY_ICONS[c] ?? 'leaf-outline';
          return (
            <AnimatedPressable
              key={c}
              haptic
              onPress={() => void select(c)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.text : colors.card,
                  borderColor: selected ? colors.text : colors.hairline,
                },
              ]}
            >
              <Ionicons name={icon} size={14} color={selected ? colors.bg : colors.textSecondary} />
              <Text
                variant="caption"
                font="uiBold"
                numberOfLines={1}
                style={{ color: selected ? colors.bg : colors.textSecondary, fontSize: 12, lineHeight: 18, flexShrink: 0 }}
              >
                {t(`dhikr.categories.${c}`)}
              </Text>
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      {!items ? (
        <LoadingState />
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={items}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + (inTab ? 132 : space[8]), paddingHorizontal: space[5], paddingTop: space[2] }}
          renderItem={({ item }) => {
            const done = (counts[item.id] ?? 0) >= item.count;
            const progress = Math.min(1, (counts[item.id] ?? 0) / Math.max(1, item.count));
            return (
              <AnimatedPressable
                onPress={() => bump(item.id, item.count)}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: done ? colors.primary : colors.hairline,
                  },
                ]}
              >
                <View style={{ direction: 'rtl' }}>
                  <Text
                    variant="body"
                    font="arabicBold"
                    style={{ color: colors.quranText, textAlign: 'right', writingDirection: 'rtl', fontSize: 23, lineHeight: 40 }}
                  >
                    {item.arabic}
                  </Text>
                </View>
                {!isArabic && item.transliteration ? (
                  <Text variant="bodySmall" color="secondary" style={{ marginTop: space[2], fontStyle: 'italic' }}>
                    {item.transliteration}
                  </Text>
                ) : null}
                {!isArabic && item.translation ? (
                  <Text variant="bodySmall" color="secondary" style={{ marginTop: 2 }}>
                    {item.translation}
                  </Text>
                ) : null}

                <View style={[styles.progressTrack, { backgroundColor: mode === 'light' ? 'rgba(14,15,17,0.06)' : 'rgba(255,255,255,0.07)' }]}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
                </View>

                <View style={styles.cardFooter}>
                  <Text variant="caption" color="tertiary" numberOfLines={1} style={{ flex: 1 }}>
                    {t('dhikr.count', { n: isArabic ? toArabicDigits(item.count) : item.count })} ·{' '}
                    {isArabic ? toArabicDigits(arabicSource(item.source)) : item.source}
                  </Text>
                  <View
                    style={[
                      styles.countPill,
                      {
                        borderColor: done ? colors.primary : colors.hairline,
                        backgroundColor: done ? colors.primarySoft : 'transparent',
                      },
                    ]}
                  >
                    <Text variant="caption" font="uiBold" color={done ? 'primary' : 'secondary'}>
                      {done
                        ? t('dhikr.done')
                        : isArabic
                          ? toArabicDigits(`${counts[item.id] ?? 0}/${item.count}`)
                          : `${counts[item.id] ?? 0}/${item.count}`}
                    </Text>
                  </View>
                </View>
              </AnimatedPressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[1],
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space[4],
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: 20,
    padding: space[4],
    marginBottom: space[3],
  },
  progressTrack: { height: 3, borderRadius: 2, marginTop: space[4], overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[3], gap: space[3] },
  countPill: { paddingHorizontal: space[3], paddingVertical: 5, borderRadius: 14, borderWidth: 1 },
});
