import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppShell } from '@/components/AppShell';
import { AppText } from '@/components/AppText';
import { TopAppBar } from '@/components/TopAppBar';
import { AdminCustomerProductPreview } from '@/components/admin/AdminCustomerProductPreview';
import { useAppTranslation } from '@/hooks/useAppTranslation';
import { RootStackParamList } from '@/navigation/types';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { LanguageCode } from '@/types/api';
import { mirroredRow } from '@/utils/layout';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminMenuCustomerPreview'>;

export const AdminMenuCustomerPreviewScreen = ({ route, navigation }: Props) => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [previewLanguage, setPreviewLanguage] = useState<LanguageCode>(route.params.initialLanguage ?? 'en');

  return (
    <View style={styles.page}>
      <TopAppBar title={t('admin.customerPreviewTitle')} onBack={() => navigation.goBack()} />
      <AppShell includeTopInset={false}>
        <View style={[styles.previewHeader, mirroredRow(isRTL)]}>
          <View style={styles.headerCopy}>
            <AppText variant="h2">{t('admin.previewAsCustomer')}</AppText>
            <AppText variant="bodySmall" color={theme.colors.textSecondary}>
              {t('admin.customerPreviewHelp')}
            </AppText>
          </View>
          <View style={[styles.languageToggle, mirroredRow(isRTL)]}>
            {(['en', 'ar'] as const).map((entry) => (
              <Pressable
                key={entry}
                style={[styles.languageChip, previewLanguage === entry ? styles.languageChipActive : null]}
                onPress={() => setPreviewLanguage(entry)}
                accessibilityRole="button"
                accessibilityState={{ selected: previewLanguage === entry }}>
                <AppText variant="caption" align="center" color={previewLanguage === entry ? theme.colors.primary700 : theme.colors.textSecondary}>
                  {entry.toUpperCase()}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
        <AdminCustomerProductPreview item={route.params.item} language={previewLanguage} variant="detail" />
      </AppShell>
    </View>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  previewHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  headerCopy: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  languageToggle: {
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 2,
    gap: 2,
  },
  languageChip: {
    minWidth: 42,
    borderRadius: theme.radius.pill,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
  },
  languageChipActive: {
    backgroundColor: theme.colors.primary50,
  },
});
