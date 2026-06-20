import { Ionicons } from '@expo/vector-icons';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';
import { useAppTranslation } from '@/hooks/useAppTranslation';

import { AppText } from './AppText';

type TopAppBarProps = {
  title?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
};

export const TopAppBar = ({ title, onBack, rightAction }: TopAppBarProps) => {
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  const { t } = useAppTranslation();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + theme.spacing.sm }]}>
      <View style={[styles.row, mirroredRow(isRTL)]}>
        <View style={styles.side}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              style={styles.iconButton}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('common.goBack')}>
              <Ionicons
                name={isRTL ? 'chevron-forward' : 'chevron-back'}
                size={theme.iconSizes.xl}
                color={theme.colors.primary700}
              />
            </Pressable>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
        <View style={styles.titleWrap}>
          {title ? (
            <AppText variant="h2" align="center" numberOfLines={1} maxFontSizeMultiplier={1.1}>
              {title}
            </AppText>
          ) : null}
        </View>
        <View style={styles.side}>{rightAction ?? <View style={styles.placeholder} />}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...theme.shadows.floating,
  },
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  side: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary50,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
  },
  placeholder: {
    width: 44,
    height: 44,
  },
});
