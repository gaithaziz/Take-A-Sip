import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { theme } from '@/theme';

import { AppText } from '../AppText';

type ExpandableTextProps = {
  value: string;
  numberOfLines?: number;
  variant?: 'h3' | 'body' | 'bodySmall' | 'caption';
  color?: string;
};

export const ExpandableText = ({
  value,
  numberOfLines = 2,
  variant = 'bodySmall',
  color,
}: ExpandableTextProps) => {
  const { t } = useAppTranslation();
  const [expanded, setExpanded] = useState(false);

  if (!value.trim()) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <Pressable onPress={() => setExpanded((prev) => !prev)}>
        <AppText variant={variant} numberOfLines={expanded ? undefined : numberOfLines} color={color}>
          {value}
        </AppText>
      </Pressable>
      {value.length > 60 ? (
        <Pressable onPress={() => setExpanded((prev) => !prev)} hitSlop={6}>
          <AppText variant="caption" color={theme.colors.primary700}>
            {expanded ? t('admin.showLess') : t('admin.showMore')}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: theme.spacing.xs,
  },
});
