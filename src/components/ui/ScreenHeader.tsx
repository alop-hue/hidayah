import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backIcon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
  /** Larger editorial title used on top-level screens. */
  large?: boolean;
};

/**
 * Shared page header: a circular glass back button, a left-aligned title and
 * optional trailing action. No bar, no border — the page surface runs to the
 * top edge, matching the reference boards.
 */
export function ScreenHeader({ title, subtitle, onBack, backIcon = 'chevron-back', right, large = true }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      {onBack ? (
        <AnimatedPressable
          onPress={onBack}
          accessibilityRole="button"
          style={[styles.iconBtn, { backgroundColor: colors.card }]}
        >
          <Ionicons name={backIcon} size={20} color={colors.text} />
        </AnimatedPressable>
      ) : (
        <View style={styles.iconBtn} />
      )}
      <View style={{ flex: 1 }}>
        <Text variant={large ? 'title' : 'subheading'} font="uiBold" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? <View style={styles.iconBtn} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[3],
    paddingBottom: space[3],
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
