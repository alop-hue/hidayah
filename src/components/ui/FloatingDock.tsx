import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PanResponder, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/audio/MiniPlayer';
import { Text } from '@/components/ui';
import { DockIcon } from '@/components/ui/DockIcons';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

// Blur is optional: older dev builds of the app may not include the native
// expo-blur module yet. In that case we keep the liquid-glass look with a
// translucent tint + specular highlight (no native dependency required).
let BlurView: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  BlurView = require('expo-blur').BlurView;
} catch {
  BlurView = null;
}

const TABS = [
  { name: 'index', icon: 'home', labelKey: 'tabs.home' },
  { name: 'quran', icon: 'quran', labelKey: 'tabs.quran' },
  { name: 'qibla', icon: 'qibla', labelKey: 'tabs.qibla' },
  { name: 'dhikr', icon: 'dhikr', labelKey: 'tabs.dhikr' },
  { name: 'settings', icon: 'settings', labelKey: 'tabs.settings' },
] as const;

// Fade ramp painted above the dock (top → bottom), so the scrolling content
// melts into the glass instead of being cut off by a hard edge.
const FADE = Array.from({ length: 22 }, (_, i) => Math.pow((i + 1) / 22, 2.1) * 0.95);

/**
 * Floating liquid-glass navigation, matched to the Hidayah reference.
 * A translucent pill hovering over the canvas: real blur where the native
 * module is available, a soft fade so content dissolves underneath, a
 * spring-animated selection capsule, and drag-across navigation — press and
 * slide along the dock to switch tabs.
 */
export function CustomTabBar({ state, navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const rtl = i18n.dir() === 'rtl';
  const bottom = Math.max(insets.bottom, 10);

  const rowRef = useRef<View>(null);
  const rowX = useRef(0);
  const rowW = useRef(0);
  const lastIndex = useRef(state.index);
  const [measured, setMeasured] = useState(0);

  const pillX = useSharedValue(0);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.value }] }));

  const tabWidth = TABS.length ? measured / TABS.length : 0;
  const tabWidthRef = useRef(tabWidth);
  tabWidthRef.current = tabWidth;
  const rtlRef = useRef(rtl);
  rtlRef.current = rtl;

  useEffect(() => {
    const visualIndex = rtl ? TABS.length - 1 - state.index : state.index;
    pillX.value = withSpring(visualIndex * tabWidth, { damping: 18, stiffness: 220, mass: 0.7 });
  }, [state.index, tabWidth, rtl, pillX]);

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(TABS.length - 1, index));
    if (clamped === lastIndex.current) return;
    lastIndex.current = clamped;
    void Haptics.selectionAsync();
    navigation.navigate(TABS[clamped].name);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderGrant: () => {
        rowRef.current?.measureInWindow((x, _y, w) => {
          rowX.current = x;
          rowW.current = w;
        });
      },
      onPanResponderMove: (_, g) => {
        const w = tabWidthRef.current;
        if (!w) return;
        const local = g.moveX - rowX.current - space[2];
        const raw = Math.floor(local / w);
        goTo(rtlRef.current ? TABS.length - 1 - raw : raw);
      },
    }),
  ).current;

  const items = TABS.map((tab, index) => {
    const focused = state.index === index;
    const color = focused ? colors.text : colors.textTertiary;
    return (
      <Pressable
        key={tab.name}
        onPress={() => {
          lastIndex.current = index;
          navigation.navigate(tab.name);
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={t(tab.labelKey)}
        style={({ pressed }) => [styles.tab, pressed && { opacity: 0.7 }]}
      >
        <View style={styles.iconCapsule}>
          <DockIcon name={tab.icon} color={color} active={focused} />
        </View>
        <Text variant="micro" font="uiBold" style={{ color, marginTop: 4 }} numberOfLines={1}>
          {t(tab.labelKey)}
        </Text>
      </Pressable>
    );
  });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottom }]}>
      {/* soft fade so content dissolves into the dock, as in the reference */}
      <View pointerEvents="none" style={styles.fadeZone}>
        {FADE.map((opacity, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: colors.bg, opacity }} />
        ))}
      </View>
      <View style={styles.playerSlot}>
        <MiniPlayer />
      </View>
      <View
        style={[
          styles.dock,
          {
            borderColor: colors.glassBorder,
            backgroundColor: Platform.OS === 'web' || !BlurView ? colors.glass : 'transparent',
            shadowColor: '#000',
          },
        ]}
      >
        {/* real blur where available */}
        {BlurView ? (
          <BlurView
            intensity={Platform.OS === 'android' ? 90 : 45}
            tint={mode === 'light' ? 'light' : 'dark'}
            blurMethod="dimezisBlurViewSdk31Plus"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {/* tint + top specular highlight (liquid glass) */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass, opacity: 0.52 }]} />
        <View style={[styles.specular, { backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.16)' }]} />
        <View
          ref={rowRef}
          onLayout={(e) => {
            setMeasured(e.nativeEvent.layout.width - space[2] * 2);
            rowRef.current?.measureInWindow((x) => {
              rowX.current = x;
            });
          }}
          style={[styles.row, { flexDirection: 'row', direction: rtl ? 'rtl' : 'ltr' }]}
          {...pan.panHandlers}
        >
          {tabWidth > 0 ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.pill,
                pillStyle,
                {
                  width: tabWidth - 4,
                  backgroundColor: mode === 'light' ? 'rgba(14,15,17,0.06)' : 'rgba(255,255,255,0.16)',
                  borderColor: mode === 'light' ? 'rgba(14,15,17,0.04)' : 'rgba(255,255,255,0.06)',
                },
              ]}
            />
          ) : null}
          {items}
        </View>
      </View>
    </View>
  );
}

/** Height reserved at the bottom of scrollable screens so the dock never covers content. */
export const DOCK_SPACE = 118;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space[4],
  },
  fadeZone: { height: 92, marginHorizontal: -space[4], flexDirection: 'column' },
  playerSlot: { marginBottom: space[2] },
  dock: {
    borderRadius: 34,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  specular: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.8,
  },
  row: {
    alignItems: 'center',
    paddingHorizontal: space[2],
    paddingVertical: 6,
  },
  pill: {
    position: 'absolute',
    left: space[2] + 2,
    top: 6,
    bottom: 6,
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  iconCapsule: {
    width: 46,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
