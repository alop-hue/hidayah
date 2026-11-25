import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui';
import { ResizableSheet } from '@/components/ui/Sheet';
import { getSurah } from '@/db/queries';
import { arabicSurahName } from '@/features/quran/surahNames';
import { toArabicDigits } from '@/lib/digits';
import { RECITERS, seekTo, setRate, setSleepTimer, subscribeToPlayer, togglePlayPause, type PlayerStatus } from '@/services/audio';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

const EMPTY: PlayerStatus = {
  playing: false,
  isLoaded: false,
  currentTime: 0,
  duration: 0,
  didJustFinish: false,
  surah: null,
  memorize: null,
  startAyah: null,
};

function clock(seconds: number, rtl: boolean): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const rest = String(s % 60).padStart(2, '0');
  const text = `${m}:${rest}`;
  return rtl ? toArabicDigits(text) : text;
}

export function MiniPlayer() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const { audio, setAudio } = useSettings();
  const [status, setStatus] = useState<PlayerStatus>(EMPTY);
  const [surahName, setSurahName] = useState('');
  const [open, setOpen] = useState(false);
  const [sleepMins, setSleepMins] = useState<number | null>(null);
  const rtl = i18n.language.startsWith('ar');

  useEffect(() => subscribeToPlayer(setStatus), []);
  useEffect(() => {
    if (status.surah && status.surah !== 0) {
      getSurah(status.surah).then((s) => setSurahName(i18n.language.startsWith('ar') ? (s?.name ?? '') : (s?.english_name ?? '')));
    }
  }, [status.surah, i18n.language]);

  if (!status.isLoaded || !status.surah) return null;

  const progress = status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0;
  const remaining = Math.max(0, status.duration - status.currentTime);
  const reciter = RECITERS.find((r) => r.id === audio.reciterId);
  const reciterName = (rtl ? reciter?.ar : reciter?.name) ?? reciter?.name ?? '';

  const RING = 232;
  const stroke = 3;
  const r = (RING - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('audio.nowPlaying')}
        style={[styles.bar, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}
      >
        <View style={[styles.progress, { backgroundColor: colors.primary, width: `${progress * 100}%` }]} />
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="musical-notes" size={15} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginHorizontal: space[3] }}>
            <Text variant="bodySmall" font="uiBold" numberOfLines={1}>
              {surahName}
            </Text>
            <Text variant="micro" color="tertiary" numberOfLines={1}>
              {reciterName}
            </Text>
          </View>
          <Pressable onPress={togglePlayPause} hitSlop={10} style={[styles.smallPlay, { backgroundColor: colors.primary }]}>
            <Ionicons name={status.playing ? 'pause' : 'play'} size={17} color={colors.textOnEmphasis} />
          </Pressable>
        </View>
      </Pressable>

      <ResizableSheet visible={open} onClose={() => setOpen(false)}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: space[7] }}>
          <Text variant="caption" font="uiBold" color="tertiary" style={{ textAlign: 'center', letterSpacing: 1.4 }}>
            {t('audio.nowPlaying')}
          </Text>

          {/* artwork = progress ring around the surah name */}
          <View style={styles.artWrap}>
            <Svg width={RING} height={RING}>
              <Circle cx={RING / 2} cy={RING / 2} r={r} stroke={colors.hairline} strokeWidth={stroke} fill="none" />
              <Circle
                cx={RING / 2}
                cy={RING / 2}
                r={r}
                stroke={colors.accent}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={circumference * (1 - progress)}
                transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
              />
            </Svg>
            <View style={styles.artCenter}>
              <Text variant="title" font="arabicBold" numberOfLines={1} style={{ fontSize: 26, textAlign: 'center' }}>
                {arabicSurahName(status.surah) || surahName}
              </Text>
              <Text variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: 4 }}>
                {surahName} · {reciterName}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] }}>
            <Text variant="micro" color="secondary">{clock(status.currentTime, rtl)}</Text>
            <Text variant="micro" color="tertiary">{t('audio.remaining', { time: clock(remaining, rtl) })}</Text>
          </View>

          <View style={styles.controls}>
            <Pressable
              onPress={() => void seekTo(Math.max(0, status.currentTime - 10))}
              style={[styles.ctrl, { backgroundColor: colors.card, borderColor: colors.hairline }]}
              accessibilityLabel={t('audio.back10')}
            >
              <Ionicons name="play-back" size={20} color={colors.text} />
            </Pressable>
            <Pressable onPress={togglePlayPause} style={[styles.ctrl, styles.ctrlBig, { backgroundColor: colors.primary }]}>
              <Ionicons name={status.playing ? 'pause' : 'play'} size={30} color={colors.textOnEmphasis} />
            </Pressable>
            <Pressable
              onPress={() => void seekTo(Math.min(status.duration, status.currentTime + 10))}
              style={[styles.ctrl, { backgroundColor: colors.card, borderColor: colors.hairline }]}
              accessibilityLabel={t('audio.forward10')}
            >
              <Ionicons name="play-forward" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text variant="caption" font="uiBold" color="tertiary" style={styles.label}>{t('audio.speed')}</Text>
            <View style={styles.chips}>
              {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                <Chip
                  key={rate}
                  label={`${rate}×`}
                  active={audio.speed === rate}
                  onPress={() => {
                    setRate(rate);
                    setAudio({ speed: rate });
                  }}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="caption" font="uiBold" color="tertiary" style={styles.label}>{t('audio.sleepTimer')}</Text>
            <View style={styles.chips}>
              {[null, 5, 10, 15, 30, 60].map((m) => (
                <Chip
                  key={String(m)}
                  label={m === null ? t('audio.sleepOff') : t('audio.sleepMinutes', { n: m })}
                  active={sleepMins === m}
                  onPress={() => {
                    setSleepTimer(m);
                    setSleepMins(m);
                  }}
                />
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="caption" font="uiBold" color="tertiary" style={styles.label}>{t('audio.repeatRange')}</Text>
            <View style={styles.chips}>
              {(['off', 'surah', 'verse'] as const).map((rep) => (
                <Chip
                  key={rep}
                  label={t(`audio.repeat${rep === 'off' ? 'Off' : rep === 'surah' ? 'Surah' : 'Verse'}`)}
                  active={audio.repeat === rep}
                  onPress={() => setAudio({ repeat: rep })}
                />
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => {
              const target = status.surah;
              setOpen(false);
              if (target) router.push({ pathname: '/quran/[surah]', params: { surah: String(target) } });
            }}
            style={({ pressed }) => [
              styles.openBtn,
              { borderColor: colors.hairline, backgroundColor: colors.card },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="book-outline" size={16} color={colors.primary} />
            <Text variant="bodySmall" font="uiBold" color="primary">{t('audio.openSurah')}</Text>
          </Pressable>
        </ScrollView>
      </ResizableSheet>
    </>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? colors.primary : colors.hairline,
          backgroundColor: active ? colors.primarySoft : colors.card,
        },
      ]}
    >
      <Text variant="micro" font="uiBold" color={active ? 'primary' : 'secondary'}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    marginBottom: space[2],
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  progress: { position: 'absolute', bottom: 0, left: 0, height: 2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3], paddingVertical: space[3] },
  dot: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  smallPlay: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  artWrap: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: space[4] },
  artCenter: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[8] },
  controls: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: space[6], marginTop: space[4] },
  ctrl: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctrlBig: { width: 74, height: 74, borderRadius: 37, borderWidth: 0 },
  section: { marginTop: space[5] },
  label: { textTransform: 'uppercase', letterSpacing: 1, marginBottom: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  chip: { paddingHorizontal: space[3], paddingVertical: space[2], borderRadius: radius.pill, borderWidth: 1 },
  openBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: space[6],
    paddingVertical: space[3],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
});
