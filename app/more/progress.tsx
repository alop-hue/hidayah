import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LoadingState, Text } from '@/components/ui';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { getActivity, localDayKey, type ActivityDay } from '@/db/userdb';
import { toArabicDigits } from '@/lib/digits';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

function fmt(value: number, rtl: boolean): string {
  return rtl ? toArabicDigits(Math.round(value).toLocaleString('en-US')) : Math.round(value).toLocaleString();
}

export default function ProgressScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dailyWird = useSettings((s) => s.dailyWird);
  const rtl = i18n.language.startsWith('ar');
  const [rows, setRows] = useState<ActivityDay[] | null>(null);

  useEffect(() => {
    getActivity(7).then(setRows).catch(() => setRows([]));
  }, []);

  const today = useMemo(
    () => rows?.find((r) => r.day === localDayKey()) ?? null,
    [rows],
  );

  const maxBar = useMemo(() => {
    if (!rows) return 1;
    return Math.max(1, ...rows.map((r) => r.pages + r.verses / 10));
  }, [rows]);

  const goal = Math.max(1, dailyWird.target);
  const goalDone = Math.min(goal, (today?.pages ?? 0) + (today?.verses ?? 0) / 15);
  const goalPct = Math.min(1, goalDone / goal);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScreenHeader title={t('activity.title')} onBack={() => router.back()} />
      {!rows ? (
        <LoadingState />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[8] }}
        >
          <Text variant="caption" color="tertiary" style={{ marginTop: space[2], marginBottom: space[4] }}>
            {t('activity.private')}
          </Text>

          {/* today's rings */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="tertiary">{t('activity.today')}</Text>
                <Text variant="display" font="uiBold" style={{ marginTop: 2 }}>
                  {fmt(today?.pages ?? 0, rtl)}
                </Text>
                <Text variant="bodySmall" color="secondary">{t('activity.pages')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="caption" color="tertiary">{t('activity.readingGoal')}</Text>
                <Text variant="display" font="uiBold" style={{ marginTop: 2 }}>
                  {fmt(Math.floor(goalPct * 100), rtl)}%
                </Text>
                <View style={[styles.track, { backgroundColor: colors.hairline }]}>
                  <View style={[styles.fill, { width: `${goalPct * 100}%`, backgroundColor: colors.accent }]} />
                </View>
              </View>
            </View>
          </View>

          {/* stat grid */}
          <View style={styles.grid}>
            {[
              { icon: 'book-outline', label: t('activity.verses'), value: fmt(today?.verses ?? 0, rtl) },
              { icon: 'time-outline', label: t('activity.minutes'), value: fmt((today?.read_ms ?? 0) / 60000, rtl) },
              { icon: 'flower-outline', label: t('activity.dhikr'), value: fmt(today?.dhikr ?? 0, rtl) },
              { icon: 'ellipse-outline', label: t('activity.tasbih'), value: fmt(today?.tasbih ?? 0, rtl) },
              { icon: 'school-outline', label: t('activity.memorize'), value: fmt(today?.memorize ?? 0, rtl) },
            ].map((s) => (
              <View key={s.label} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
                <Ionicons name={s.icon as keyof typeof Ionicons.glyphMap} size={17} color={colors.primary} />
                <Text variant="subheading" font="uiBold" style={{ marginTop: space[2] }}>{s.value}</Text>
                <Text variant="micro" color="tertiary" numberOfLines={1}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* week chart */}
          <Text variant="subheading" font="uiBold" style={{ marginTop: space[6], marginBottom: space[3] }}>
            {t('activity.week')}
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
            <View style={styles.chart}>
              {rows.map((r) => {
                const h = Math.max(4, ((r.pages + r.verses / 10) / maxBar) * 96);
                const isToday = r.day === localDayKey();
                return (
                  <View key={r.day} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        { height: h, backgroundColor: isToday ? colors.accent : colors.primarySoft },
                      ]}
                    />
                    <Text variant="micro" color={isToday ? 'primary' : 'tertiary'} style={{ marginTop: 6 }}>
                      {new Date(`${r.day}T12:00:00`).toLocaleDateString(rtl ? 'ar' : i18n.language, { weekday: 'short' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <Text variant="micro" color="tertiary" style={{ marginTop: space[4], textAlign: 'center' }}>
            {t('activity.noComparison')}
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: space[4] },
  heroRow: { flexDirection: 'row', gap: space[5] },
  track: { height: 4, borderRadius: 2, marginTop: space[3], overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginTop: space[3] },
  stat: {
    width: '48%',
    flexGrow: 1,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    padding: space[3],
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 130 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '52%', borderRadius: 6 },
});
