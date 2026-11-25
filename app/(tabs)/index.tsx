import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { Text, Toggle } from '@/components/ui';
import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { DOCK_SPACE } from '@/components/ui/FloatingDock';
import { ResizableSheet } from '@/components/ui/Sheet';
import { getSurah } from '@/db/queries';
import { toArabicDigits } from '@/lib/digits';
import { formatTime, getTimesForDate, hijriDate } from '@/services/prayer';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const h = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(h);
  }, [intervalMs]);
  return now;
}

const PRAYER_ORDER = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

const PRAYER_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  fajr: 'moon-outline',
  sunrise: 'sunny-outline',
  dhuhr: 'sunny',
  asr: 'partly-sunny-outline',
  maghrib: 'moon',
  isha: 'moon-outline',
};

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prayer, lastRead, dailyWird, homeTiles, setHomeTiles } = useSettings();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const setPrayer = useSettings((s) => s.setPrayer);
  const [surahName, setSurahName] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (prayer.coords || locating) return;
    (async () => {
      setLocating(true);
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const loc = await Location.getCurrentPositionAsync({});
          setPrayer({ coords: { lat: loc.coords.latitude, lng: loc.coords.longitude } });
        }
      } catch {
        // Fall back to the default city/timezone below.
      }
      setLocating(false);
    })();
  }, [prayer.coords, locating, setPrayer]);

  const rtl = i18n.dir() === 'rtl';
  const arDigits = (s: string) => (rtl ? toArabicDigits(s) : s);

  const coords = prayer.coords ?? { lat: 21.4225, lng: 39.8262 };
  const now = useNow(1000);
  const result = useMemo(
    () => getTimesForDate(prayer.method, coords.lat, coords.lng, new Date(now)),
    [prayer.method, coords.lat, coords.lng, now],
  );
  const hijri = useMemo(() => hijriDate(new Date(now), i18n.language), [i18n.language, now]);

  const locationLabel = useMemo(() => {
    if (prayer.city) return prayer.city;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      const city = tz.split('/').pop()?.replace(/_/g, ' ');
      if (city) return city;
    } catch {
      /* noop */
    }
    return t('home.timezone', { tz: '' }).replace(/:\s*$/, '');
  }, [prayer.city, t]);

  const gregorian = useMemo(
    () =>
      new Date(now).toLocaleDateString(rtl ? 'ar' : i18n.language, {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      }),
    [now, rtl, i18n.language],
  );

  useEffect(() => {
    if (!lastRead) return;
    getSurah(lastRead.surah).then((s) =>
      setSurahName(s ? (rtl ? s.name.replace(/^سُ?ورَ?ةُ?\s+/u, '') : s.english_name) : null),
    );
  }, [lastRead, rtl]);

  const nextName = result.next ? t(`prayer.${result.next.name}`) : '';
  const nextTime = result.next ? formatTime(result.next.date) : '';

  const explore: { icon: keyof typeof Ionicons.glyphMap; title: string; hint: string; route: string }[] = [
    { icon: 'sparkles', title: t('tools.names99'), hint: t('tools.names99Hint'), route: '/tools/names99' },
    { icon: 'chatbubbles', title: t('hadith.title'), hint: t('home.hadithHint'), route: '/hadith' },
    { icon: 'flower', title: t('tools.dhikr'), hint: t('tools.dhikrHint'), route: '/tools/dhikr' },
    { icon: 'school-outline', title: t('memorize.title'), hint: t('home.memorizeHint'), route: '/more/memorize' },
    { icon: 'repeat', title: t('tools.tasbih'), hint: t('tools.tasbihHint'), route: '/tools/tasbih' },
    { icon: 'calendar-outline', title: t('tools.calendar'), hint: t('tools.calendarHint'), route: '/tools/calendar' },
    {
      icon: 'bookmark',
      title: t('home.continueReading'),
      hint: lastRead && surahName ? `${t('home.surah', { surah: surahName })} · ${arDigits(String(dailyWird.completed))}/${arDigits(String(dailyWird.target))}` : t('home.noProgress'),
      route: '/tools/wird',
    },
  ];

  const tileByRoute = new Map(explore.map((t) => [t.route, t]));
  const orderedExplore = [
    ...homeTiles.order.map((r) => tileByRoute.get(r)).filter((t): t is (typeof explore)[number] => !!t),
    ...explore.filter((t) => !homeTiles.order.includes(t.route)),
  ];
  const visibleExplore = orderedExplore.filter((t) => !homeTiles.hidden.includes(t.route));

  const moveTile = (route: string, dir: -1 | 1) => {
    const routes = orderedExplore.map((t) => t.route);
    const i = routes.indexOf(route);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= routes.length) return;
    [routes[i], routes[j]] = [routes[j], routes[i]];
    setHomeTiles({ order: routes });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + space[3],
          paddingBottom: insets.bottom + DOCK_SPACE,
          paddingHorizontal: space[5],
        }}
      >
        {/* header: mark + location */}
        <Animated.View entering={FadeIn.duration(360)} style={styles.topRow}>
          <Ionicons name="moon" size={15} color={colors.textSecondary} />
          <Pressable
            onPress={() => router.push('/more/settings')}
            style={({ pressed }) => [styles.locationLink, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={locationLabel}
          >
            <Ionicons name="navigate" size={12} color={colors.textSecondary} />
            <Text variant="caption" font="uiBold" numberOfLines={1} style={{ color: colors.textSecondary }}>
              {locationLabel}
            </Text>
          </Pressable>
        </Animated.View>

        {/* next prayer hero */}
        <Animated.View entering={FadeInDown.duration(420).delay(60).springify().damping(20)}>
          <Text variant="display" font="uiBold" style={styles.hero} numberOfLines={2}>
            {result.next ? t('home.prayerAt', { prayer: nextName, time: arDigits(nextTime) }) : t('home.nextPrayer')}
          </Text>
          <Text variant="body" color="secondary" style={{ marginTop: 2 }}>
            {hijri.full}
          </Text>
        </Animated.View>

        {/* date + location selector */}
        <Animated.View entering={FadeInDown.duration(420).delay(110).springify().damping(20)} style={styles.selector}>
          <AnimatedPressable
            onPress={() => router.push('/tools/calendar')}
            style={[styles.selectorItem, styles.dateItem, { backgroundColor: colors.bgElevated }]}
          >
            <Text variant="bodySmall" font="uiBold" numberOfLines={1} style={{ color: colors.text }}>
              {gregorian}
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => router.push('/more/settings')}
            style={[styles.selectorItem, styles.locationItem, { backgroundColor: colors.card }]}
          >
            <Ionicons name="navigate" size={11} color={colors.textSecondary} />
            <Text variant="bodySmall" font="uiBold" numberOfLines={1} style={{ color: colors.text }}>
              {locationLabel}
            </Text>
          </AnimatedPressable>
        </Animated.View>

        {/* prayer times card */}
        <Animated.View
          entering={FadeInDown.duration(440).delay(160).springify().damping(20)}
          style={[styles.prayerCard, { backgroundColor: mode === 'light' ? colors.card : '#121316' }]}>
          {PRAYER_ORDER.map((name, idx) => {
            const active = result.next?.name === name;
            return (
              <View
                key={name}
                style={[
                  styles.prayerRow,
                  idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.hairline },
                  active && { backgroundColor: mode === 'light' ? 'rgba(14,15,17,0.045)' : '#1A1C1F' },
                ]}
              >
                <View style={[styles.prayerIcon, { backgroundColor: mode === 'light' ? 'rgba(14,15,17,0.05)' : 'rgba(255,255,255,0.05)' }]}>
                  <Ionicons name={PRAYER_ICON[name]} size={15} color={active ? colors.text : colors.textSecondary} />
                </View>
                <Text variant="body" font={active ? 'uiBold' : 'ui'} style={{ flex: 1, color: active ? colors.text : colors.text }}>
                  {t(`prayer.${name}`)}
                </Text>
                <Text variant="body" font={active ? 'uiBold' : 'ui'} style={{ color: active ? colors.text : colors.textSecondary, fontVariant: ['tabular-nums'] }}>
                  {arDigits(formatTime(result.times[name]))}
                </Text>
              </View>
            );
          })}
        </Animated.View>

        {/* explore */}
        <Animated.View
          entering={FadeInDown.duration(420).delay(210)}
          style={[styles.exploreHead, { marginTop: space[7], marginBottom: space[3] }]}
        >
          <Text variant="subheading" font="uiBold">
            {t('home.explore')}
          </Text>
          <Pressable
            onPress={() => setCustomizeOpen(true)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={t('home.customize')}
            style={({ pressed }) => [styles.tuneBtn, { borderColor: colors.hairline }, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="options-outline" size={14} color={colors.textSecondary} />
          </Pressable>
        </Animated.View>
        <View style={styles.grid}>
          {visibleExplore.map((item, index) => (
            <Animated.View
              key={item.route}
              entering={FadeInDown.duration(380).delay(240 + index * 45)}
              style={styles.tileWrap}
            >
            <AnimatedPressable
              haptic
              onPress={() => router.push(item.route as never)}
              style={[styles.tile, { backgroundColor: colors.card }]}
            >
              <View style={[styles.tileIcon, { backgroundColor: mode === 'light' ? 'rgba(14,15,17,0.05)' : 'rgba(255,255,255,0.06)' }]}>
                <Ionicons name={item.icon} size={18} color={colors.text} />
              </View>
              <Text variant="bodySmall" font="uiBold" style={{ marginTop: space[4] }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text variant="caption" color="tertiary" numberOfLines={1} style={{ marginTop: 1 }}>
                {item.hint}
              </Text>
            </AnimatedPressable>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <ResizableSheet visible={customizeOpen} onClose={() => setCustomizeOpen(false)}>
        <View style={{ paddingHorizontal: space[5], paddingBottom: space[5] }}>
          <Text variant="subheading" font="uiBold" style={{ textAlign: 'center' }}>
            {t('home.customize')}
          </Text>
          <Text variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: 4, marginBottom: space[4] }}>
            {t('home.customizeHint')}
          </Text>
          {orderedExplore.map((tile, i) => {
            const shown = !homeTiles.hidden.includes(tile.route);
            const onlyOne = visibleExplore.length === 1 && shown;
            return (
              <View key={tile.route} style={[styles.customRow, { borderColor: colors.hairline }]}>
                <Ionicons name={tile.icon as keyof typeof Ionicons.glyphMap} size={17} color={colors.textSecondary} />
                <Text variant="bodySmall" style={{ flex: 1 }} numberOfLines={1}>
                  {tile.title}
                </Text>
                <Pressable onPress={() => moveTile(tile.route, -1)} hitSlop={6} disabled={i === 0} style={{ opacity: i === 0 ? 0.25 : 0.8, padding: 4 }}>
                  <Ionicons name="chevron-up" size={16} color={colors.text} />
                </Pressable>
                <Pressable onPress={() => moveTile(tile.route, 1)} hitSlop={6} disabled={i === orderedExplore.length - 1} style={{ opacity: i === orderedExplore.length - 1 ? 0.25 : 0.8, padding: 4 }}>
                  <Ionicons name="chevron-down" size={16} color={colors.text} />
                </Pressable>
                <View style={{ marginLeft: 4, opacity: onlyOne ? 0.4 : 1 }}>
                  <Toggle
                    value={shown}
                    onValueChange={(v) => {
                      if (!v && onlyOne) return;
                      const hidden = v
                        ? homeTiles.hidden.filter((r) => r !== tile.route)
                        : [...homeTiles.hidden, tile.route];
                      setHomeTiles({ hidden });
                    }}
                  />
                </View>
              </View>
            );
          })}
          <Pressable
            onPress={() => setHomeTiles({ order: [], hidden: [] })}
            style={({ pressed }) => [styles.resetBtn, { borderColor: colors.hairline }, pressed && { opacity: 0.7 }]}
          >
            <Text variant="bodySmall" font="uiBold" color="secondary">{t('home.resetLayout')}</Text>
          </Pressable>
        </View>
      </ResizableSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space[4] },
  tileWrap: { width: '48.3%', flexGrow: 1 },
  exploreHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tuneBtn: { width: 30, height: 30, borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingVertical: space[3], borderBottomWidth: StyleSheet.hairlineWidth },
  resetBtn: { alignItems: 'center', paddingVertical: space[3], borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth, marginTop: space[4] },
  locationLink: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '70%' },
  hero: { fontSize: 33, lineHeight: 39, letterSpacing: -0.8 },
  selector: { flexDirection: 'row', gap: space[3], marginTop: space[4] },
  selectorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space[4],
    paddingVertical: 13,
    borderRadius: radius.md,
  },
  prayerCardBg: { backgroundColor: 'transparent' },
  dateItem: { flex: 1 },
  locationItem: { flex: 1.18 },
  prayerCard: {
    marginTop: space[4],
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
  },
  prayerIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    marginTop: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  continueIcon: { width: 34, height: 34, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  tile: {
    width: '100%',
    padding: space[4],
    borderRadius: radius.lg,
    minHeight: 118,
  },
  tileIcon: { width: 34, height: 34, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
});
