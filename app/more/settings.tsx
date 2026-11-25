import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ListRow, SectionLabel, Text, Toggle } from '@/components/ui';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { SUPPORTED_LANGS } from '@/i18n';
import { PRESET_ORDER, READING_PRESETS, type ReadingPreset } from '@/features/quran/presets';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

const THEME_OPTIONS = ['system', 'light', 'dark', 'amoled'] as const;
const LANG_NAMES: Record<string, string> = {
  en: 'English',
  ar: 'العربية',
  tr: 'Türkçe',
  id: 'Bahasa Indonesia',
  ur: 'اردو',
  fr: 'Français',
  de: 'Deutsch',
};

export default function SettingsScreen({ inTab = false }: { inTab?: boolean } = {}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, setTheme, language, setLanguage, tajweed, setTajweed, wordByWord, setWordByWord, showTranslation, setShowTranslation, defaultTranslation, readingPreset, setReadingPreset } = useSettings();

  void defaultTranslation;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScreenHeader title={t('settings.title')} onBack={inTab ? undefined : () => router.back()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: space[3], paddingBottom: insets.bottom + (inTab ? 132 : space[8]) }}>

      <SectionLabel>{t('settings.appearance')}</SectionLabel>
      <ListRow
        icon={<Ionicons name="contrast-outline" size={20} color={colors.primary} />}
        title={t('settings.theme')}
        subtitle={t(`settings.themes.${theme}`)}
        onPress={() => {
          const idx = THEME_OPTIONS.indexOf(theme);
          setTheme(THEME_OPTIONS[(idx + 1) % THEME_OPTIONS.length]);
        }}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      {THEME_OPTIONS.map((opt) => (
        <Pressable key={opt} onPress={() => setTheme(opt)} style={[styles.option, { borderBottomColor: colors.hairline }]}>
          <Text variant="body" color={theme === opt ? 'primary' : 'text'}>{t(`settings.themes.${opt}`)}</Text>
          {theme === opt && <Ionicons name="checkmark" size={18} color={colors.primary} />}
        </Pressable>
      ))}

      <SectionLabel>{t('settings.language')}</SectionLabel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingHorizontal: space[4] }}>
        {SUPPORTED_LANGS.map((lng) => (
          <Pressable
            key={lng}
            onPress={() => setLanguage(lng)}
            style={[
              styles.langChip,
              {
                borderColor: (language ?? 'en') === lng ? colors.primary : colors.hairline,
                backgroundColor: (language ?? 'en') === lng ? colors.primarySoft : colors.card,
              },
            ]}
          >
            <Text variant="bodySmall" font="uiBold" color={(language ?? 'en') === lng ? 'primary' : 'secondary'}>
              {LANG_NAMES[lng]}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionLabel>{t('settings.reading')}</SectionLabel>
      <ListRow
        icon={<Ionicons name="color-palette-outline" size={20} color={colors.primary} />}
        title={t('settings.tajweed')}
        right={<Toggle value={tajweed} onValueChange={setTajweed} />}
      />
      <ListRow
        icon={<Ionicons name="text-outline" size={20} color={colors.primary} />}
        title={t('settings.wordByWord')}
        right={<Toggle value={wordByWord} onValueChange={setWordByWord} />}
      />
      <Text variant="caption" font="uiBold" color="tertiary" style={{ paddingHorizontal: space[4], marginTop: space[3], marginBottom: space[2] }}>
        {t('quran.typography')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingHorizontal: space[4] }}>
        {PRESET_ORDER.map((key: ReadingPreset) => {
          const selected = readingPreset === key;
          return (
            <Pressable
              key={key}
              onPress={() => setReadingPreset(key)}
              style={[
                styles.langChip,
                {
                  borderColor: selected ? colors.primary : colors.hairline,
                  backgroundColor: selected ? colors.primarySoft : colors.card,
                },
              ]}
            >
              <Text variant="bodySmall" font="uiBold" color={selected ? 'primary' : 'secondary'}>
                {t(`quran.preset_${key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {language !== null && !language.startsWith('ar') && (
        <ListRow
          icon={<Ionicons name="language-outline" size={20} color={colors.primary} />}
          title={t('quran.translations')}
          subtitle={showTranslation ? t('quran.translationOn') : t('quran.translationsOff')}
          right={<Toggle value={showTranslation} onValueChange={setShowTranslation} />}
        />
      )}

      <SectionLabel>{t('settings.tools')}</SectionLabel>
      <ListRow
        icon={<Ionicons name="pulse-outline" size={20} color={colors.primary} />}
        title={t('activity.title')}
        subtitle={t('activity.private')}
        onPress={() => router.push('/more/progress' as never)}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="book-outline" size={20} color={colors.primary} />}
        title={t('quran.title')}
        onPress={() => router.push('/(tabs)/quran')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="headset-outline" size={20} color={colors.primary} />}
        title={t('tools.audio')}
        onPress={() => router.push('/more/downloads')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="notifications-outline" size={20} color={colors.primary} />}
        title={t('settings.notifications')}
        onPress={() => router.push('/prayer/notifications')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="compass-outline" size={20} color={colors.primary} />}
        title={t('tools.qibla')}
        onPress={() => router.push('/tools/qibla')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="school-outline" size={20} color={colors.primary} />}
        title={t('memorize.title')}
        onPress={() => router.push('/more/memorize')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="flower-outline" size={20} color={colors.primary} />}
        title={t('tools.dhikr')}
        onPress={() => router.push('/tools/dhikr')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      <ListRow
        icon={<Ionicons name="information-circle-outline" size={20} color={colors.primary} />}
        title={t('settings.about')}
        onPress={() => router.push('/more/legal')}
        right={<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
      />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[3],
    paddingVertical: space[3],
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space[6],
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  langChip: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: 999,
    borderWidth: 1,
  },
});
