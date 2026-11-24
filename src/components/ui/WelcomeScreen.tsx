import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

type Step = 'welcome' | 'reading' | 'goal' | 'reminders';

/**
 * First-open welcome + personalization quiz.
 * Every answer writes to the real settings store, so the choices actually
 * shape the app (translation visibility, daily goal, prayer reminders).
 */
export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { setShowTranslation, setDailyWird, setPrayer } = useSettings();
  const [step, setStep] = useState<Step>('welcome');
  const [reading, setReading] = useState<'ar' | 'both'>(i18n.language.startsWith('ar') ? 'both' : 'both');
  const [goal, setGoal] = useState(4);

  const finish = async () => {
    setShowTranslation(reading === 'both');
    setDailyWird({ enabled: true, goal: 'pages', target: goal });
    setPrayer({ notificationsEnabled: true });
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // Permission can be declined; the app stays fully usable.
    }
    onDone();
  };

  const skip = () => {
    setDailyWird({ enabled: true, goal: 'pages', target: 4 });
    onDone();
  };

  const next = () => {
    if (step === 'welcome') setStep('reading');
    else if (step === 'reading') setStep('goal');
    else if (step === 'goal') setStep('reminders');
    else void finish();
  };

  const dots = ['welcome', 'reading', 'goal', 'reminders'];
  const activeIndex = dots.indexOf(step);

  const option = (label: string, selected: boolean, onPress: () => void, icon?: keyof typeof Ionicons.glyphMap) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? colors.primarySoft : colors.card,
          borderColor: selected ? colors.primary : colors.hairline,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={18} color={selected ? colors.primary : colors.textSecondary} /> : null}
      <Text variant="body" font={selected ? 'uiBold' : 'ui'} style={{ flex: 1 }}>
        {label}
      </Text>
      <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={selected ? colors.primary : colors.textTertiary} />
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: mode === 'light' ? colors.bg : '#000' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + space[8],
          paddingBottom: insets.bottom + space[6],
          paddingHorizontal: space[6],
          justifyContent: 'space-between',
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.mark, { borderColor: colors.hairline, backgroundColor: colors.card }]}>
            <Ionicons name="moon" size={26} color={colors.text} />
          </View>
          <Text variant="display" font="uiBold" style={{ marginTop: space[5], letterSpacing: -0.5 }}>
            Hidayah
          </Text>
          <Text variant="subheading" font="arabicBold" color="secondary" style={{ marginTop: space[1] }}>
            هداية
          </Text>
          <Text variant="body" color="secondary" style={{ marginTop: space[3], textAlign: 'center' }}>
            {t('welcome.tagline')}
          </Text>
        </View>

        <View style={{ marginTop: space[8] }}>
          {step === 'welcome' ? (
            <Text variant="heading" font="uiBold" style={{ textAlign: 'center' }}>
              {t('welcome.q1')}
            </Text>
          ) : null}

          {step === 'reading' ? (
            <View style={{ gap: space[2] }}>
              <Text variant="heading" font="uiBold" style={{ marginBottom: space[3] }}>
                {t('welcome.q1')}
              </Text>
              {option(t('welcome.q1a'), reading === 'ar', () => setReading('ar'), 'book-outline')}
              {option(t('welcome.q1b'), reading === 'both', () => setReading('both'), 'albums-outline')}
            </View>
          ) : null}

          {step === 'goal' ? (
            <View style={{ gap: space[2] }}>
              <Text variant="heading" font="uiBold" style={{ marginBottom: space[3] }}>
                {t('welcome.q2')}
              </Text>
              {option(t('welcome.q2a'), goal === 1, () => setGoal(1), 'document-outline')}
              {option(t('welcome.q2b'), goal === 4, () => setGoal(4), 'documents-outline')}
              {option(t('welcome.q2c'), goal === 20, () => setGoal(20), 'library-outline')}
            </View>
          ) : null}

          {step === 'reminders' ? (
            <View style={{ gap: space[2] }}>
              <Text variant="heading" font="uiBold" style={{ marginBottom: space[3] }}>
                {t('welcome.q3')}
              </Text>
              {option(t('welcome.q3a'), true, () => void finish(), 'notifications-outline')}
              {option(t('welcome.q3b'), false, skip, 'notifications-off-outline')}
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: space[8] }}>
          <View style={styles.dots}>
            {dots.map((d, i) => (
              <View
                key={d}
                style={[
                  styles.dot,
                  { backgroundColor: i === activeIndex ? colors.text : colors.hairlineStrong, width: i === activeIndex ? 18 : 6 },
                ]}
              />
            ))}
          </View>
          <Pressable
            onPress={next}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cta, { backgroundColor: colors.text }, pressed && { opacity: 0.85 }]}
          >
            <Text variant="body" font="uiBold" style={{ color: colors.bg }}>
              {step === 'reminders' ? t('welcome.start') : t('welcome.next')}
            </Text>
            <Ionicons name={i18n.dir() === 'rtl' ? 'arrow-back' : 'arrow-forward'} size={18} color={colors.bg} />
          </Pressable>
          {step !== 'reminders' ? (
            <Pressable onPress={skip} style={{ marginTop: space[4], alignItems: 'center' }}>
              <Text variant="caption" color="tertiary">{t('welcome.skip')}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingVertical: space[4],
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: space[5] },
  dot: { height: 6, borderRadius: 3 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: space[4],
    borderRadius: radius.pill,
  },
});
