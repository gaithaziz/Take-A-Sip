import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';

import { frontdeskTextAlign, frontdeskTheme } from '@/ui/frontdeskTheme';

type Props = {
  message: string | null;
  onClose: () => void;
  isRTL?: boolean;
  closeLabel?: string;
};

export const OrderBanner = ({ message, onClose, isRTL = false, closeLabel = 'Close' }: Props) => {
  const [renderedMessage, setRenderedMessage] = useState<string | null>(message);
  const fade = useRef(new Animated.Value(message ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(message ? 0 : -8)).current;

  useEffect(() => {
    if (message) {
      setRenderedMessage(message);
      fade.setValue(0);
      translateY.setValue(-8);
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
      return;
    }
    if (!renderedMessage) {
      return;
    }
    Animated.parallel([
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -6, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setRenderedMessage(null);
    });
  }, [fade, message, renderedMessage, translateY]);

  if (!renderedMessage) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.wrap,
        isRTL ? styles.wrapRtl : null,
        {
          opacity: fade,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={[styles.text, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]} numberOfLines={3}>
        {renderedMessage}
      </Text>
      <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={closeLabel}>
        <Text style={[styles.close, isRTL ? frontdeskTextAlign.rtl : frontdeskTextAlign.ltr]}>{closeLabel}</Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: frontdeskTheme.spacing.md,
    paddingHorizontal: frontdeskTheme.spacing.md,
    paddingVertical: frontdeskTheme.spacing.md,
    backgroundColor: frontdeskTheme.colors.warningBg,
    borderColor: frontdeskTheme.colors.warningBorder,
    borderWidth: 1,
    borderRadius: frontdeskTheme.radius.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: frontdeskTheme.spacing.md,
  },
  wrapRtl: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  text: {
    ...frontdeskTheme.typography.bodyStrong,
    color: frontdeskTheme.colors.warningText,
    flexShrink: 1,
    minWidth: 0,
  },
  close: {
    ...frontdeskTheme.typography.body,
    fontWeight: '800',
    color: frontdeskTheme.colors.warningText,
    minWidth: 42,
  },
});
