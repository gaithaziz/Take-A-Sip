import { PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertButton,
  AlertOptions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { useAppTranslation } from '@/hooks/useAppTranslation';
import { useLanguage } from '@/state/LanguageContext';
import { theme } from '@/theme';
import { mirroredRow } from '@/utils/layout';

import { AppText } from './AppText';

type DialogState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

type ShowDialog = (
  title: string,
  message?: string,
  buttons?: AlertButton[],
  options?: AlertOptions,
) => void;

const isErrorTitle = (title: string) => title.trim().toLowerCase().includes('error');

export const AppDialogProvider = ({ children }: PropsWithChildren) => {
  const { t } = useAppTranslation();
  const { isRTL } = useLanguage();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const latestShowDialog = useRef<ShowDialog>(() => undefined);

  const closeDialog = useCallback(() => {
    setDialog(null);
  }, []);

  const showDialog = useCallback<ShowDialog>(
    (title, message, buttons, options) => {
      setDialog({
        title,
        message,
        buttons: buttons?.length ? buttons : [{ text: t('common.ok') }],
        options,
      });
    },
    [t],
  );

  latestShowDialog.current = showDialog;

  useEffect(() => {
    const originalAlert = Alert.alert;
    Alert.alert = (title, message, buttons, options) => {
      latestShowDialog.current(title, message, buttons, options);
    };

    return () => {
      Alert.alert = originalAlert;
    };
  }, []);

  const runButton = (button: AlertButton) => {
    closeDialog();
    button.onPress?.();
  };

  const dismissDialog = () => {
    const cancelButton = dialog?.buttons.find((button) => button.style === 'cancel');
    if (cancelButton) {
      runButton(cancelButton);
      return;
    }
    if (dialog?.options?.cancelable === false) {
      return;
    }
    closeDialog();
  };

  const hasDestructiveAction = dialog?.buttons.some((button) => button.style === 'destructive') ?? false;
  const tone: 'brand' | 'error' | 'warning' = dialog
    ? isErrorTitle(dialog.title)
      ? 'error'
      : hasDestructiveAction
        ? 'warning'
        : 'brand'
    : 'brand';

  return (
    <>
      {children}
      <Modal
        transparent
        visible={dialog !== null}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={dismissDialog}>
        <Pressable style={styles.backdrop} onPress={dismissDialog}>
          <Pressable
            style={styles.card}
            onPress={(event) => event.stopPropagation()}
            accessibilityRole="alert"
            accessibilityViewIsModal>
            <View style={[styles.header, mirroredRow(isRTL)]}>
              <View style={[styles.brandMark, toneStyles[tone]]}>
                <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="cover" />
              </View>
              <View style={styles.titleWrap}>
                <AppText variant="h2" align={isRTL ? 'right' : 'left'}>
                  {dialog?.title}
                </AppText>
              </View>
            </View>

            {dialog?.message ? (
              <AppText variant="body" color={theme.colors.textSecondary} align={isRTL ? 'right' : 'left'}>
                {dialog.message}
              </AppText>
            ) : null}

            <View style={[styles.actions, mirroredRow(isRTL)]}>
              {dialog?.buttons.map((button, index) => {
                const variant =
                  button.style === 'destructive'
                    ? 'destructive'
                    : button.style === 'cancel'
                      ? 'secondary'
                      : 'primary';
                return (
                  <Pressable
                    key={`${button.text ?? t('common.ok')}-${index}`}
                    onPress={() => runButton(button)}
                    accessibilityRole="button"
                    accessibilityLabel={button.text ?? t('common.ok')}
                    style={({ pressed }) => [
                      styles.actionButton,
                      button.style === 'cancel' ? styles.secondaryButton : null,
                      button.style === 'destructive' ? styles.destructiveButton : null,
                      variant === 'primary' ? styles.primaryButton : null,
                      pressed ? styles.pressed : null,
                    ]}>
                    <AppText
                      variant="button"
                      align="center"
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                      color={variant === 'primary' || variant === 'destructive' ? theme.colors.white : theme.colors.primary700}>
                      {button.text ?? t('common.ok')}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(31, 23, 19, 0.48)',
    padding: theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    gap: theme.spacing.lg,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.primary100,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xl,
    ...theme.shadows.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  brandMark: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    justifyContent: 'flex-end',
  },
  actionButton: {
    minHeight: 48,
    minWidth: 112,
    flexGrow: 1,
    flexBasis: 112,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary500,
    borderColor: theme.colors.primary600,
  },
  secondaryButton: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary100,
  },
  destructiveButton: {
    backgroundColor: theme.colors.error,
    borderColor: '#b54b3d',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});

const toneStyles = StyleSheet.create({
  brand: {
    backgroundColor: theme.colors.primary50,
    borderColor: theme.colors.primary200,
  },
  warning: {
    backgroundColor: theme.colors.warningSurface,
    borderColor: theme.colors.warning,
  },
  error: {
    backgroundColor: theme.colors.errorSurface,
    borderColor: theme.colors.error,
  },
});
