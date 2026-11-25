import { Inter_400Regular, Inter_700Bold } from '@expo-google-fonts/inter';
import { Amiri_400Regular, Amiri_700Bold } from '@expo-google-fonts/amiri';
import { ScheherazadeNew_400Regular, ScheherazadeNew_700Bold } from '@expo-google-fonts/scheherazade-new';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated as RNAnimated, Easing, I18nManager, Image, StyleSheet, View } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';

import { Button, Text } from '@/components/ui';
import { WelcomeScreen } from '@/components/ui/WelcomeScreen';
import { ensureDatabase } from '@/db/database';
import { preloadTiming } from '@/features/quran/timing';
import { preloadWbw } from '@/features/quran/wbw';
import { initI18n, isRtl, i18n } from '@/i18n';
import { installErrorListener } from '@/services/diagnostics';
import * as Notifications from 'expo-notifications';
import { resyncPrayerNotifications, setupNotificationChannels } from '@/services/notifications';
import { useSettings } from '@/store/settings';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

type GateState = 'unpacking' | 'indexing' | 'ready' | 'error';

// Bootstraps must never overlap: concurrent unpacks corrupt the db files.
let bootChain: Promise<void> = Promise.resolve();

function i18nKeyToLabel(name: string): string {
  return i18n.exists(`prayer.${name}`) ? i18n.t(`prayer.${name}`) : name;
}

function applyRtl(lang: string | null) {
  I18nManager.allowRTL(true);
  if (lang && isRtl(lang)) {
    I18nManager.forceRTL(true);
  } else {
    I18nManager.forceRTL(false);
  }
}

function GateScreen({ gate, retry }: { gate: Exclude<GateState, 'ready'>; retry: () => void }) {
  const { colors } = useTheme();
  const sweep = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    if (gate === 'error') return;
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(sweep, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        RNAnimated.timing(sweep, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [gate, sweep]);

  const label = gate === 'unpacking' ? i18n.t('gate.preparing') : i18n.t('gate.indexing');
  return (
    <View style={[styles.gate, { backgroundColor: colors.bg }]}>
      {gate === 'error' ? (
        <View style={{ alignItems: 'center', gap: 12 }}>
          <Text variant="subheading" style={{ textAlign: 'center' }}>{i18n.t('gate.error')}</Text>
          <Button title={i18n.t('gate.retry')} onPress={retry} />
        </View>
      ) : (
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.gateMark, { borderColor: colors.hairline, backgroundColor: colors.card }]}>
            <Image source={require('../assets/images/icon.png')} style={styles.gateIcon} resizeMode="cover" />
          </View>
          <Text variant="display" font="arabicBold" style={{ marginTop: space[5], color: colors.text }}>
            هداية
          </Text>
          <Text variant="caption" color="tertiary" style={{ marginTop: 4, letterSpacing: 3, fontSize: 10 }}>
            HIDAYAH
          </Text>
          <View style={[styles.gateTrack, { backgroundColor: colors.hairline }]}>
            <RNAnimated.View
              style={[
                styles.gateBar,
                {
                  backgroundColor: colors.accent,
                  opacity: sweep.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                  transform: [
                    { translateX: sweep.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] }) },
                  ],
                },
              ]}
            />
          </View>
          <Text variant="caption" color="secondary" style={{ marginTop: space[4] }}>{label}</Text>
        </View>
      )}
    </View>
  );
}

function AppShell() {
  const { colors } = useTheme();
  const language = i18n.language;
  const rtl = isRtl(language);
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, direction: rtl ? 'rtl' : 'ltr' }}>
      <SystemBars style={colors.mode === 'light' ? 'dark' : 'light'} hidden={{ navigationBar: true }} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="quran/[surah]" />
        <Stack.Screen name="quran/idx" />
        <Stack.Screen name="quran/search" options={{ presentation: 'modal' }} />
        <Stack.Screen name="hadith/[book]" />
        <Stack.Screen name="tools/qibla" />
        <Stack.Screen name="tools/tasbih" />
        <Stack.Screen name="tools/dhikr" />
        <Stack.Screen name="tools/calendar" />
        <Stack.Screen name="prayer/settings" />
        <Stack.Screen name="prayer/notifications" />
        <Stack.Screen name="more/settings" />
        <Stack.Screen name="more/downloads" />
        <Stack.Screen name="more/bookmarks" />
        <Stack.Screen name="more/memorize" />
        <Stack.Screen name="more/diagnostics" />
        <Stack.Screen name="more/feedback" />
        <Stack.Screen name="more/legal" options={{ presentation: 'modal' }} />
        <Stack.Screen name="tools/wird" />
        <Stack.Screen name="tools/fatawa" />
        <Stack.Screen name="tools/zakat" />
      </Stack>
    </View>
  );
}

function Providers() {
  const theme = useSettings((s) => s.theme);
  const setTheme = useSettings((s) => s.setTheme);
  const language = useSettings((s) => s.language);
  const [gate, setGate] = useState<GateState>(() => {
    applyRtl(language);
    return 'unpacking';
  });
  const [attempt, setAttempt] = useState(0);
  const onBoarded = useSettings((s) => s.onBoarded);
  const setOnBoarded = useSettings((s) => s.setOnBoarded);
  const [hydrated, setHydrated] = useState(() => useSettings.persist.hasHydrated());

  useEffect(() => {
    const unsub = useSettings.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(useSettings.persist.hasHydrated());
    return unsub;
  }, []);

  useEffect(() => {
    applyRtl(language);
  }, [language]);

  useEffect(() => {
    installErrorListener();
    let cancelled = false;
    bootChain = bootChain.catch(() => {}).then(async () => {
      try {
        await initI18n(language);
        applyRtl(language);
        if (!cancelled) setGate('indexing');
        await ensureDatabase();
        // Warm the recitation-timing and word-by-word tables in the background
        // so the first Quran open (and first playback) is instant.
        void preloadTiming();
        void preloadWbw();
        await setupNotificationChannels();
        const perm = await Notifications.getPermissionsAsync();
        if (perm.granted) {
          try {
            await resyncPrayerNotifications(i18nKeyToLabel);
          } catch (e) {
            console.warn('resync notifications failed', e);
          }
        }
        if (!cancelled) setGate('ready');
      } catch (e) {
        console.error('bootstrap failed', e);
        if (!cancelled) setGate('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [language, attempt]);

  return (
    <ThemeProvider preference={theme} setPreference={setTheme}>
      {gate !== 'ready' ? (
        <GateScreen gate={gate} retry={() => setAttempt((a) => a + 1)} />
      ) : !hydrated ? (
        <View style={[styles.gate, { backgroundColor: '#050607' }]} />
      ) : !onBoarded ? (
        <WelcomeScreen onDone={() => setOnBoarded(true)} />
      ) : (
        <AppShell />
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
    ScheherazadeNew_400Regular,
    ScheherazadeNew_700Bold,
  });
  if (!fontsLoaded) {
    return <View style={styles.gate} />;
  }
  return <Providers />;
}

const styles = StyleSheet.create({
  gateMark: {
    width: 104,
    height: 104,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gateIcon: { width: 104, height: 104 },
  gateTrack: { width: 120, height: 2, borderRadius: 2, overflow: 'hidden', marginTop: space[5] },
  gateBar: { width: 60, height: 2, borderRadius: 2 },
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#050607' },
});
