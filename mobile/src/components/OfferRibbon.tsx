import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { Promotion } from '@/types/api';
import { getLocalizedValue } from '@/utils/i18n';

import { AppCard } from './AppCard';
import { AppText } from './AppText';
import { BadgeChip } from './BadgeChip';

type OfferRibbonProps = {
  offers: Promotion[];
};

export const OfferRibbon = ({ offers }: OfferRibbonProps) => {
  const { language, t } = useAppTranslation();
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
      <View style={styles.row}>
        <BadgeChip label={t('home.offers')} tone="warning" />
      </View>
      <AppText variant="h3">{getLocalizedValue(active, language, 'title')}</AppText>
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
    backgroundColor: '#fff4e5',
    borderColor: '#eed8b7',
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'center',
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#d5b89a',
  },
  dotActive: {
    width: 18,
    backgroundColor: '#8d5d33',
  },
});
