import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MiniPlayer } from '@/components/audio/MiniPlayer';
import { Text } from '@/components/ui';
import { DockIcon } from '@/components/ui/DockIcons';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

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

/**
 * Floating liquid-glass navigation, matched to the Hidayah reference:
 * a translucent pill hovering over the canvas, with a soft selected
 * capsule and 10px labels. Blur is real on supported platforms, with a
 * tinted fallback everywhere else.
 */
export function CustomTabBar({ state, navigation }: any) {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const rtl = i18n.dir() === 'rtl';
  const bottom = Math.max(insets.bottom, 10);

  const items = TABS.map((tab, index) => {
    const focused = state.index === index;
    const color = focused ? colors.text : colors.textTertiary;
    return (
      <Pressable
        key={tab.name}
        onPress={() => navigation.navigate(tab.name)}
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={t(tab.labelKey)}
        style={styles.tab}
      >
        <View style={[styles.iconCapsule, focused && { backgroundColor: colors.primarySoft }]}>
          <DockIcon name={tab.icon} color={color} active={focused} />
        </View>
        <Text variant="micro" font="uiBold" style={{ color, marginTop: 3 }} numberOfLines={1}>
          {t(tab.labelKey)}
        </Text>
      </Pressable>
    );
  });

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: bottom }]}>
      <View style={styles.playerSlot}>
        <MiniPlayer />
      </View>
      <View
        style={[
          styles.dock,
          {
            borderColor: colors.glassBorder,
            backgroundColor: Platform.OS === 'web' ? colors.glass : 'transparent',
            shadowColor: '#000',
          },
        ]}
      >
        {/* real blur where available */}
        {BlurView ? (
          <BlurView
            intensity={Platform.OS === 'android' ? 55 : 30}
            tint={mode === 'light' ? 'light' : 'dark'}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
        ) : null}
        {/* tint + top specular highlight (liquid glass) */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glass, opacity: 0.78 }]} />
        <View style={[styles.specular, { backgroundColor: mode === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.14)' }]} />
        <View style={[styles.row, { direction: rtl ? 'rtl' : 'ltr' }]}>{items}</View>
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
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2], paddingTop: 7, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCapsule: {
    width: 46,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
