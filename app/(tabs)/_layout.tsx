import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { BlurTargetView } from 'expo-blur';

import { CustomTabBar } from '@/components/ui/FloatingDock';
import { dockBlurTarget } from '@/components/ui/dockBlur';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';

export default function TabsLayout() {
  const { i18n } = useTranslation();
  const { colors } = useTheme();
  void useSettings((s) => s.language);
  const rtl = i18n.dir() === 'rtl';
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, direction: rtl ? 'rtl' : 'ltr' }}>
      <BlurTargetView ref={dockBlurTarget} style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'home' }} />
        <Tabs.Screen name="quran" options={{ title: 'quran' }} />
        <Tabs.Screen name="qibla" options={{ title: 'qibla' }} />
        <Tabs.Screen name="dhikr" options={{ title: 'dhikr' }} />
        <Tabs.Screen name="settings" options={{ title: 'settings' }} />
      </Tabs>
      </BlurTargetView>
    </View>
  );
}
