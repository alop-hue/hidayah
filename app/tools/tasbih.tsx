import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Svg, { Circle } from 'react-native-svg';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Button, Text } from '@/components/ui';
import { ResizableSheet } from '@/components/ui/Sheet';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

const RING = 268;
const STROKE = 5;
const RADIUS = (RING - STROKE * 2) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TasbihScreen() {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tasbihTarget, setTasbihTarget, tasbihDhikr, setTasbihDhikr } = useSettings();
  const [count, setCount] = useState(0);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const debounce = useRef(false);

  const tap = () => {
    if (debounce.current) return;
    debounce.current = true;
    setTimeout(() => (debounce.current = false), 110);
    setCount((c) => {
      const next = c + 1;
      if (next === tasbihTarget) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      return next;
    });
  };

  const reset = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCount(0);
  };

  const progress = Math.min(1, count / tasbihTarget);
  const strokeOffset = CIRCUMFERENCE * (1 - progress);
  const trackColor = mode === 'light' ? 'rgba(14,15,17,0.07)' : 'rgba(255,255,255,0.08)';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <View style={styles.header}>
        <AnimatedPressable
          onPress={() => router.back()}
          accessibilityLabel={t('common.back')}
          style={[styles.iconBtn, { backgroundColor: colors.card }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </AnimatedPressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text variant="subheading" font="uiBold">{t('tools.tasbih')}</Text>
          <Text variant="caption" color="secondary">{t('tools.tasbihHint')}</Text>
        </View>
        <AnimatedPressable
          onPress={() => {
            setDraft(tasbihDhikr);
            setEditOpen(true);
          }}
          accessibilityLabel={t('tools.editDhikr')}
          style={[styles.iconBtn, { backgroundColor: colors.card }]}
        >
          <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
        </AnimatedPressable>
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: insets.bottom + space[6] }}>
        <AnimatedPressable
          onPress={tap}
          pressScale={0.975}
          accessibilityRole="button"
          accessibilityLabel={tasbihDhikr}
          style={[styles.ring, { backgroundColor: colors.card }]}
        >
          <Svg width={RING} height={RING} style={StyleSheet.absoluteFill}>
            <Circle cx={RING / 2} cy={RING / 2} r={RADIUS} stroke={trackColor} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={RING / 2}
              cy={RING / 2}
              r={RADIUS}
              stroke={colors.primary}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              strokeDashoffset={strokeOffset}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
            />
          </Svg>

          <Text
            variant="body"
            font="arabicBold"
            style={{ color: colors.text, fontSize: 26, lineHeight: 44, textAlign: 'center', writingDirection: 'rtl', paddingHorizontal: space[6] }}
            numberOfLines={2}
          >
            {tasbihDhikr}
          </Text>
          <Text variant="display" font="uiBold" style={{ fontSize: 64, lineHeight: 76, marginTop: space[2], fontVariant: ['tabular-nums'] }}>
            {count}
          </Text>
          <Text variant="caption" color="tertiary">
            {t('dhikr.progress', { done: count, total: tasbihTarget })}
          </Text>
        </AnimatedPressable>

        <View style={styles.targets}>
          {[33, 50, 100].map((n) => {
            const selected = n === tasbihTarget;
            return (
              <AnimatedPressable
                key={n}
                haptic
                onPress={() => {
                  setTasbihTarget(n);
                  setCount(0);
                }}
                style={[
                  styles.targetChip,
                  {
                    borderColor: selected ? colors.text : colors.hairline,
                    backgroundColor: selected ? colors.text : colors.card,
                  },
                ]}
              >
                <Text variant="caption" font="uiBold" style={{ color: selected ? colors.bg : colors.textSecondary }}>
                  {n}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <AnimatedPressable
          onPress={reset}
          style={[styles.resetBtn, { borderColor: colors.hairline }]}
        >
          <Ionicons name="refresh" size={15} color={colors.textSecondary} />
          <Text variant="caption" font="uiBold" color="secondary">{t('dhikr.reset')}</Text>
        </AnimatedPressable>
      </View>

      <ResizableSheet visible={editOpen} onClose={() => setEditOpen(false)}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: insets.bottom + space[6] }}
        >
          <Text variant="subheading" font="uiBold" style={{ textAlign: 'center', marginBottom: space[4] }}>
            {t('tools.editDhikr')}
          </Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="سُبْحَانَ الله"
            placeholderTextColor={colors.placeholder}
            style={[styles.input, { color: colors.text, borderColor: colors.hairline, backgroundColor: colors.card }]}
          />
          <Button
            title={t('common.save')}
            disabled={!draft.trim()}
            style={{ marginTop: space[3] }}
            onPress={() => {
              setTasbihDhikr(draft.trim());
              setEditOpen(false);
            }}
          />
        </ScrollView>
      </ResizableSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[4],
  },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targets: { flexDirection: 'row', gap: space[2], marginTop: space[8] },
  targetChip: {
    minWidth: 64,
    alignItems: 'center',
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginTop: space[5],
    paddingHorizontal: space[4],
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  input: { borderWidth: 1, borderRadius: radius.md, padding: space[3] },
});
