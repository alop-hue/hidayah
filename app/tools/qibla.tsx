import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { ResizableSheet } from '@/components/ui/Sheet';
import { Text, LoadingState } from '@/components/ui';
import { qiblaDirection } from '@/services/prayer';
import { useSettings } from '@/store/settings';
import { useTheme } from '@/theme/ThemeContext';
import { space } from '@/theme/tokens';

const DIAL = 236;
const TICKS = Array.from({ length: 60 }, (_, i) => i);

export default function QiblaScreen({ inTab = false }: { inTab?: boolean } = {}) {
  const { t } = useTranslation();
  const { colors, mode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { prayer, setPrayer } = useSettings();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(prayer.coords);
  const [loading, setLoading] = useState(false);
  const [heading, setHeading] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const subscribed = useRef(false);

  useEffect(() => {
    if (!prayer.coords) {
      (async () => {
        setLoading(true);
        const perm = await Location.requestForegroundPermissionsAsync();
        if (perm.granted) {
          const loc = await Location.getCurrentPositionAsync({});
          const c = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          setCoords(c);
          setPrayer({ coords: c });
        }
        setLoading(false);
      })();
    }
  }, []);

  useEffect(() => {
    if (subscribed.current) return;
    subscribed.current = true;
    let headingSub: Location.LocationSubscription | null = null;
    let magnetoSub: { remove: () => void } | null = null;

    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) return;
      try {
        headingSub = await Location.watchHeadingAsync((h) => setHeading(h.magHeading));
        return;
      } catch {
        // fall through to magnetometer
      }
      Magnetometer.setUpdateInterval(100);
      magnetoSub = Magnetometer.addListener(({ x, y }) => {
        const rad = Math.atan2(x, y);
        const deg = ((rad >= 0 ? rad : 2 * Math.PI + rad) * 180) / Math.PI;
        setHeading((deg + 360) % 360);
      });
    })();

    return () => {
      subscribed.current = false;
      headingSub?.remove();
      magnetoSub?.remove();
    };
  }, []);

  const direction = coords ? qiblaDirection(coords.lat, coords.lng) : null;
  const rotation = direction !== null && heading !== null ? direction - heading : direction ?? 0;
  const distance = coords ? haversine(coords.lat, coords.lng, 21.4225, 39.8262) : null;
  const dialTickColor = mode === 'light' ? 'rgba(14,15,17,0.28)' : 'rgba(255,255,255,0.28)';
  const dialMajorColor = mode === 'light' ? 'rgba(14,15,17,0.7)' : 'rgba(255,255,255,0.75)';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: space[5],
          paddingBottom: insets.bottom + (inTab ? 132 : space[6]),
        }}
      >
        {inTab ? (
          <View style={{ height: space[6] }} />
        ) : (
          <View style={[styles.topBar, { flexDirection: 'row' }]}>
            <AnimatedPressable
              onPress={() => router.back()}
              accessibilityLabel={t('common.back')}
              style={[styles.iconBtn, { backgroundColor: colors.card }]}
            >
              <Ionicons name="chevron-back" size={20} color={colors.text} />
            </AnimatedPressable>
            <View style={{ width: 34 }} />
          </View>
        )}

        <Text variant="micro" font="uiBold" color="tertiary" style={styles.kicker}>
          {t('qibla.finding')}
        </Text>
        <Text variant="title" font="uiBold" style={{ marginTop: space[1] }}>
          {t('qibla.kaabaMakkah')}
        </Text>

        {loading ? (
          <LoadingState />
        ) : !coords || direction === null ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="location-outline" size={28} color={colors.textSecondary} />
            <Text variant="body" style={{ marginTop: space[2], textAlign: 'center' }}>{t('qibla.locationNeeded')}</Text>
            <Text variant="caption" color="secondary" style={{ marginTop: 4, textAlign: 'center' }}>
              {t('qibla.locationNeededHint')}
            </Text>
          </View>
        ) : focusMode ? (
          <View style={styles.focusWrap}>
            <View
              style={[
                styles.bigArrow,
                { transform: [{ rotate: `${rotation}deg` }], backgroundColor: colors.text },
              ]}
            />
            <Text variant="bodySmall" color="secondary" style={{ marginTop: space[7], textAlign: 'center' }}>
              {t('qibla.alignHint')}
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.dial, { backgroundColor: colors.card, borderColor: colors.hairline }]}>
              <View style={[styles.dialInner, { borderColor: colors.hairline }]} />
              <View style={StyleSheet.absoluteFill}>
                {TICKS.map((i) => {
                  const major = i % 5 === 0;
                  return (
                    <View key={i} style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${i * 6}deg` }] }]}>
                      <View
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: '50%',
                          marginLeft: major ? -1 : -0.75,
                          width: major ? 2 : 1.5,
                          height: major ? 10 : 5,
                          borderRadius: 1,
                          backgroundColor: major ? dialMajorColor : dialTickColor,
                        }}
                      />
                    </View>
                  );
                })}
                <View style={styles.northWrap}>
                  <Text variant="micro" font="uiBold" style={{ color: colors.textSecondary, letterSpacing: 1 }}>
                    N
                  </Text>
                </View>
              </View>

              {/* needle */}
              <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: `${rotation}deg` }] }]}>
                <View style={[styles.needle, { backgroundColor: colors.primary, height: DIAL / 2 - 30 }]} />
                <View style={[styles.needleTip, { borderBottomColor: colors.primary }]} />
              </View>
              <View style={[styles.centerDot, { backgroundColor: colors.text }]} />
            </View>

            <View style={[styles.arrow, { transform: [{ rotate: `${rotation}deg` }] }]}>
              <View style={[styles.arrowHead, { borderBottomColor: colors.text }]} />
              <View style={[styles.arrowShaft, { backgroundColor: colors.text }]} />
            </View>

            <Text variant="display" font="uiBold" style={{ marginTop: space[5], letterSpacing: -1 }}>
              {Math.round(distance ?? 0).toLocaleString('en-US')} km
            </Text>
            <Text variant="bodySmall" color="secondary" style={{ marginTop: 2 }}>
              {t('qibla.toward')}
            </Text>

            <View style={styles.actions}>
              <AnimatedPressable
                onPress={() => setDetailsOpen(true)}
                style={[styles.actionBtn, { backgroundColor: colors.card }]}
              >
                <Ionicons name="information-circle-outline" size={16} color={colors.text} />
                <Text variant="bodySmall" font="uiBold">{t('qibla.details')}</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => setFocusMode(true)}
                style={[styles.actionBtn, { backgroundColor: colors.card }]}
              >
                <Ionicons name="navigate-outline" size={16} color={colors.text} />
                <Text variant="bodySmall" font="uiBold">{t('qibla.direction')}</Text>
              </AnimatedPressable>
            </View>
          </>
        )}
      </ScrollView>

      <ResizableSheet visible={detailsOpen} onClose={() => setDetailsOpen(false)}>
        <View style={{ paddingHorizontal: space[5], paddingBottom: insets.bottom + space[4] }}>
          <Text variant="subheading" font="uiBold" style={{ marginBottom: space[4], textAlign: 'center' }}>
            {t('qibla.details')}
          </Text>
          <DetailRow label={t('qibla.heading')} value={`${Math.round((direction ?? 0))}°`} />
          <DetailRow label={t('qibla.phoneHeading')} value={heading !== null ? `${Math.round(heading)}°` : '—'} />
          <DetailRow label={t('qibla.distance')} value={distance !== null ? `${Math.round(distance)} km` : '—'} />
          <DetailRow
            label={t('qibla.coordinates')}
            value={coords ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : '—'}
          />
          <Text variant="caption" color="tertiary" style={{ marginTop: space[4], textAlign: 'center' }}>
            {t('qibla.calibrate')}
          </Text>
        </View>
      </ResizableSheet>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.hairline }]}>
      <Text variant="bodySmall" color="secondary">{label}</Text>
      <Text variant="bodySmall" font="uiBold">{value}</Text>
    </View>
  );
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const styles = StyleSheet.create({
  topBar: { alignItems: 'center', justifyContent: 'space-between', paddingTop: space[3], paddingBottom: space[4] },
  iconBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  kicker: { letterSpacing: 1.8, textTransform: 'uppercase' },
  dial: {
    width: DIAL,
    height: DIAL,
    borderRadius: DIAL / 2,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: space[8],
  },
  dialInner: {
    position: 'absolute',
    width: DIAL - 46,
    height: DIAL - 46,
    borderRadius: (DIAL - 46) / 2,
    borderWidth: StyleSheet.hairlineWidth,
  },
  northWrap: { position: 'absolute', top: 22, left: 0, right: 0, alignItems: 'center' },
  needle: {
    position: 'absolute',
    bottom: '50%',
    left: '50%',
    marginLeft: -1,
    width: 2,
    borderRadius: 1,
  },
  needleTip: {
    position: 'absolute',
    bottom: '50%',
    left: '50%',
    marginLeft: -6,
    marginBottom: DIAL / 2 - 44,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  centerDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 4.5,
  },
  arrow: { alignItems: 'center', marginTop: space[5] },
  arrowHead: {
    width: 0,
    height: 0,
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 19,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  arrowShaft: { width: 6, height: 52, borderRadius: 3, marginTop: -1 },
  bigArrow: {
    width: 10,
    height: 116,
    borderRadius: 5,
    marginTop: space[6],
  },
  focusWrap: { alignItems: 'center', marginTop: space[8] },
  actions: { flexDirection: 'row', gap: space[3], marginTop: space[7] },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    paddingVertical: 14,
    borderRadius: 24,
  },
  emptyCard: {
    marginTop: space[6],
    padding: space[6],
    borderRadius: 20,
    alignItems: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
