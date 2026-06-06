import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { LanguageCode, Promotion } from '@/types/api';
import { getLocalizedValue } from '@/utils/i18n';
import { mirroredRow } from '@/utils/layout';

import { AppCard } from './AppCard';
import { AppText } from './AppText';

type OfferRibbonProps = {
  offers: Promotion[];
  languageOverride?: LanguageCode;
  isRTLOverride?: boolean;
};

export const OfferRibbon = ({ offers, languageOverride, isRTLOverride }: OfferRibbonProps) => {
  const { language, t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const displayLanguage = languageOverride ?? language;
  const displayIsRTL = isRTLOverride ?? isRTL;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [offers.length]);

  useEffect(() => {
    if (offers.length <= 1) {
      return;
    }
    const id = setInterval(() => {
      setIndex((current) => (current + 1) % offers.length);
    }, 3500);
    return () => clearInterval(id);
  }, [offers.length]);

  const active = useMemo(() => offers[index], [index, offers]);
  if (!active) {
    return null;
  }

  return (
    <AppCard style={styles.card}>
      <View style={[styles.row, mirroredRow(displayIsRTL)]}>
        <View style={styles.badge}>
          <AppText variant="caption" color={theme.colors.primary700} align="center">
            {t('home.offers')}
          </AppText>
        </View>
      </View>
      <AppText variant="h3" color={theme.colors.white} align={displayIsRTL ? 'right' : 'left'}>
        {getLocalizedValue(active, displayLanguage, 'title')}
      </AppText>
      {offers.length > 1 ? (
        <View style={styles.dots}>
          {offers.map((offer, dotIndex) => (
            <View key={offer.id} style={[styles.dot, dotIndex === index ? styles.dotActive : null]} />
          ))}
        </View>
      ) : null}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.primary500,
    borderColor: theme.colors.primary600,
    gap: theme.spacing.sm,
    ...theme.shadows.floating,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  badge: {
    minHeight: 28,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignSelf: 'center',
    marginTop: theme.spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e7c8a5',
  },
  dotActive: {
    width: 18,
    backgroundColor: theme.colors.white,
  },
});
