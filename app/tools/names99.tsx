import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Clipboard, FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui';
import { ResizableSheet } from '@/components/ui/Sheet';
import names from '@/assets/data/asmaul-husna.json';
import { useTheme } from '@/theme/ThemeContext';
import { radius, space } from '@/theme/tokens';

interface NameEntry {
  n: number;
  ar: string;
  tr: string;
  en: string;
  arMeaning: string;
  kw: string;
}

const ALL_NAMES = names as NameEntry[];

export default function Names99Screen() {
  const { t, i18n } = useTranslation();
  const { colors, mode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [detail, setDetail] = useState<NameEntry | null>(null);
  const isArabic = i18n.language.startsWith('ar');
  const [quiz, setQuiz] = useState(false);
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [quizIndex, setQuizIndex] = useState(() => Math.floor(Math.random() * 99));
  const [picked, setPicked] = useState<string | null>(null);

  const meaningOf = useCallback((n: NameEntry) => (isArabic ? n.arMeaning : n.en), [isArabic]);

  const quizOptions = useMemo(() => {
    const answer = ALL_NAMES[quizIndex % ALL_NAMES.length];
    const others = ALL_NAMES.filter((n) => n.n !== answer.n)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    return [answer, ...others].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizIndex]);

  const quizAnswer = ALL_NAMES[quizIndex % ALL_NAMES.length];
  const nextQuestion = () => {
    setPicked(null);
    setQuizIndex((i) => (i + 1 + Math.floor(Math.random() * 98)) % 99);
  };

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_NAMES;
    return ALL_NAMES.filter(
      (n) =>
        n.ar.includes(query.trim()) ||
        n.tr.toLowerCase().includes(q) ||
        n.en.toLowerCase().includes(q) ||
        n.arMeaning.includes(query.trim()),
    );
  }, [query]);

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
        <Text variant="title" font="uiBold" style={{ flex: 1 }} numberOfLines={1}>
          {t('tools.names99Title')}
        </Text>
        <AnimatedPressable
          onPress={() => {
            setQuiz((q) => !q);
            setPicked(null);
            void Haptics.selectionAsync().catch(() => {});
          }}
          accessibilityLabel={quiz ? t('namesQuiz.study') : t('namesQuiz.quiz')}
          style={[styles.iconBtn, { backgroundColor: quiz ? colors.primarySoft : colors.card }]}
        >
          <Ionicons name={quiz ? 'book-outline' : 'help-circle-outline'} size={19} color={colors.primary} />
        </AnimatedPressable>
      </View>

      <View style={[styles.searchBox, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={16} color={colors.textTertiary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('tools.names99Search')}
          placeholderTextColor={colors.placeholder}
          style={[styles.input, { color: colors.text }]}
        />
        <Text variant="micro" color="tertiary">
          {list.length}
        </Text>
      </View>

      {quiz ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + space[8] }}>
          <Text variant="caption" color="tertiary" style={{ textAlign: 'center', marginTop: space[2] }}>
            {t('namesQuiz.score', { right: score.right, wrong: score.wrong })}
          </Text>
          <View style={[styles.quizCard, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
            <Text variant="micro" color="tertiary" style={{ textAlign: 'center', letterSpacing: 1.5 }}>
              {t('namesQuiz.prompt')}
            </Text>
            <Text variant="display" font="arabicBold" style={{ fontSize: 44, lineHeight: 78, textAlign: 'center', color: colors.accent, marginTop: space[3] }}>
              {quizAnswer.ar}
            </Text>
            <Text variant="caption" color="secondary" style={{ textAlign: 'center' }}>
              {quizAnswer.tr}
            </Text>
          </View>

          <View style={{ gap: space[2], marginTop: space[4] }}>
            {quizOptions.map((opt) => {
              const isAnswer = opt.n === quizAnswer.n;
              const chosen = picked === meaningOf(opt);
              const show = picked !== null;
              return (
                <AnimatedPressable
                  key={opt.n}
                  onPress={() => {
                    if (picked !== null) return;
                    setPicked(meaningOf(opt));
                    setScore((sc) => (isAnswer ? { ...sc, right: sc.right + 1 } : { ...sc, wrong: sc.wrong + 1 }));
                    void Haptics.notificationAsync(
                      isAnswer ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
                    ).catch(() => {});
                  }}
                  style={[
                    styles.option,
                    {
                      borderColor: show && isAnswer ? colors.accent : show && chosen ? '#C0614F' : colors.hairline,
                      backgroundColor: show && isAnswer ? colors.primarySoft : colors.card,
                    },
                  ]}
                >
                  <Text variant="bodySmall" style={{ flex: 1, textAlign: isArabic ? 'right' : 'left' }}>
                    {meaningOf(opt)}
                  </Text>
                  {show && isAnswer ? <Ionicons name="checkmark-circle" size={18} color={colors.accent} /> : null}
                  {show && chosen && !isAnswer ? <Ionicons name="close-circle" size={18} color="#C0614F" /> : null}
                </AnimatedPressable>
              );
            })}
          </View>

          {picked !== null ? (
            <AnimatedPressable
              onPress={nextQuestion}
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            >
              <Text variant="body" font="uiBold" style={{ color: colors.textOnEmphasis }}>
                {t('namesQuiz.next')}
              </Text>
            </AnimatedPressable>
          ) : null}

          <Text variant="micro" color="tertiary" style={{ textAlign: 'center', marginTop: space[4] }}>
            {t('namesQuiz.hint')}
          </Text>
        </ScrollView>
      ) : (
      <FlatList
        showsVerticalScrollIndicator={false}
        data={list}
        keyExtractor={(n) => String(n.n)}
        contentContainerStyle={{ paddingBottom: insets.bottom + space[8] }}
        renderItem={({ item }) => (
          <AnimatedPressable
            onPress={() => setDetail(item)}
            style={[styles.row, { borderBottomColor: colors.hairline }]}
          >
            <View
              style={[
                styles.num,
                { backgroundColor: mode === 'light' ? 'rgba(14,15,17,0.045)' : 'rgba(255,255,255,0.06)' },
              ]}
            >
              <Text variant="micro" font="uiBold" color="secondary">{item.n}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body" font="uiBold" numberOfLines={1}>{item.tr}</Text>
              <Text variant="caption" color="secondary" numberOfLines={1} style={{ marginTop: 1 }}>
                {i18n.language.startsWith('ar') ? item.arMeaning : item.en}
              </Text>
            </View>
            <Text variant="body" font="arabicBold" style={{ fontSize: 21, lineHeight: 32, color: colors.accent }}>
              {item.ar}
            </Text>
            <View style={[styles.chevron, { backgroundColor: mode === 'light' ? 'rgba(14,15,17,0.045)' : 'rgba(255,255,255,0.06)' }]}>
              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            </View>
          </AnimatedPressable>
        )}
        ListEmptyComponent={
          <Text variant="bodySmall" color="tertiary" style={{ textAlign: 'center', marginTop: space[8] }}>
            {t('quran.noResults')}
          </Text>
        }
      />
      )}

      <ResizableSheet visible={detail !== null} onClose={() => setDetail(null)}>
        {detail && (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: space[5], paddingBottom: insets.bottom + space[4] }}
          >
            <View style={{ alignItems: 'center', marginBottom: space[3] }}>
              <Text variant="caption" font="uiBold" color="tertiary" style={styles.section}>
                {t('tools.names99Meaning')}
              </Text>
              <Text variant="display" font="arabicBold" style={{ fontSize: 44, lineHeight: 64, marginTop: space[1], color: colors.accent }}>
                {detail.ar}
              </Text>
              <Text variant="body" font="uiBold" color="primary" style={{ marginTop: 2 }}>{detail.tr}</Text>
            </View>
            <View style={[styles.meaningBox, { backgroundColor: colors.bgSunken, borderColor: colors.hairline }]}>
              <Text variant="bodySmall" font="arabicBold" style={{ color: colors.quranText, textAlign: 'center', lineHeight: 26 }}>
                {detail.arMeaning}
              </Text>
              {!i18n.language.startsWith('ar') ? (
                <Text variant="bodySmall" color="secondary" style={{ textAlign: 'center', marginTop: space[1] }}>
                  {detail.en}
                </Text>
              ) : null}
            </View>

            <AnimatedPressable
              onPress={() => void Clipboard.setString(`${detail.ar} (${detail.tr})`)}
              style={[styles.copyBtn, { borderColor: colors.hairline, backgroundColor: colors.bgSunken }]}
            >
              <Ionicons name="copy-outline" size={16} color={colors.primary} />
              <Text variant="bodySmall" font="uiBold" color="primary">{t('common.copy')}</Text>
            </AnimatedPressable>
          </ScrollView>
        )}
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
    paddingTop: space[4],
    paddingBottom: space[3],
  },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    marginHorizontal: space[5],
    marginBottom: space[2],
    borderRadius: radius.pill,
    paddingHorizontal: space[4],
    paddingVertical: 10,
  },
  input: { flex: 1, fontSize: 14, padding: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[3] + 1,
    paddingHorizontal: space[5],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  num: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  section: { marginTop: space[4], marginBottom: space[2], textTransform: 'uppercase', letterSpacing: 1 },
  quizCard: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2, padding: space[4], marginTop: space[4] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth * 2,
    minHeight: 52,
  },
  nextBtn: { alignItems: 'center', paddingVertical: space[3], borderRadius: radius.md, marginTop: space[4] },
  meaningBox: { borderWidth: StyleSheet.hairlineWidth * 2, borderRadius: radius.md, padding: space[3] },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    marginTop: space[4],
    paddingVertical: space[3],
    borderRadius: radius.md,
    borderWidth: 1,
  },
});
