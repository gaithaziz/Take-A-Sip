import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppText } from '../AppText';

type AdminActionSheetItem = {
  key: string;
  label: string;
  tone?: 'default' | 'destructive';
  onPress: () => void;
};

type AdminActionSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  items: AdminActionSheetItem[];
};

export const AdminActionSheet = ({ open, title, onClose, items }: AdminActionSheetProps) => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();

  return (
    <Modal transparent visible={open} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <AppText variant="h3" numberOfLines={2}>
            {title}
          </AppText>

          <ScrollView style={styles.optionsScroll} showsVerticalScrollIndicator={false}>
            {items.map((item) => (
              <Pressable
                key={item.key}
                style={[styles.option, item.tone === 'destructive' ? styles.optionDestructive : null]}
                onPress={() => {
                  onClose();
                  item.onPress();
                }}>
                <AppText
                  variant="bodySmall"
                  numberOfLines={2}
                  color={item.tone === 'destructive' ? theme.colors.error : theme.colors.textPrimary}>
                  {item.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>

          <View style={[styles.footer, mirroredRow(isRTL)]}>
            <Pressable onPress={onClose} style={styles.footerBtn}>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {t('common.cancel')}
              </AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  modalCard: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.lg,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadows.floating,
  },
  optionsScroll: {
    marginTop: theme.spacing.md,
  },
  option: {
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  optionDestructive: {
    backgroundColor: theme.colors.errorSurface,
    borderColor: '#e7c2bb',
  },
  footer: {
    marginTop: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  footerBtn: {
    paddingVertical: theme.spacing.sm,
    minWidth: 72,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
});
