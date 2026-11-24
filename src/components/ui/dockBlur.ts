import { createRef } from 'react';
import type { View } from 'react-native';

/**
 * Shared blur target for the floating dock.
 *
 * On Android expo-blur only blurs content that lives inside a `BlurTargetView`
 * referenced by the `BlurView`. The tabs layout attaches this ref to that
 * wrapper and the dock passes it to its BlurView.
 */
export const dockBlurTarget = createRef<View>();
