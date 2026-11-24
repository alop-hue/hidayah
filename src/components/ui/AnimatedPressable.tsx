import * as Haptics from 'expo-haptics';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Scale the surface dips to while pressed. */
  pressScale?: number;
  /** Fire a light haptic tap on press. */
  haptic?: boolean;
  children?: React.ReactNode;
};

/**
 * Pressable with a soft, springy response — the one interaction primitive
 * used across cards, rows and tiles so every tap feels the same.
 */
export function AnimatedPressable({ style, pressScale = 0.975, haptic = false, onPressIn, onPressOut, children, ...rest }: Props) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <AnimatedPressableBase
      {...rest}
      onPressIn={(e) => {
        scale.value = withTiming(pressScale, { duration: 110 });
        opacity.value = withTiming(0.9, { duration: 110 });
        if (haptic) void Haptics.selectionAsync();
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        opacity.value = withTiming(1, { duration: 150 });
        onPressOut?.(e);
      }}
      style={[style, animatedStyle]}
    >
      {children}
    </AnimatedPressableBase>
  );
}
