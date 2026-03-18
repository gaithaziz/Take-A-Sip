import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  message: string | null;
  onClose: () => void;
  isRTL?: boolean;
  closeLabel?: string;
};

export const OrderBanner = ({ message, onClose, isRTL = false, closeLabel = 'Close' }: Props) => {
  if (!message) {
    return null;
  }
  return (
    <View style={[styles.wrap, isRTL ? styles.wrapRtl : null]}>
      <Text style={[styles.text, isRTL ? styles.rtlText : styles.ltrText]}>{message}</Text>
      <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel={closeLabel}>
        <Text style={styles.close}>{closeLabel}</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FFF4DD',
    borderColor: '#E8CFA5',
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  wrapRtl: {
    flexDirection: 'row-reverse',
  },
  text: {
    flex: 1,
    color: '#6F4D1B',
    fontWeight: '700',
    fontSize: 15,
  },
  close: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6F4D1B',
  },
  rtlText: {
    textAlign: 'right',
  },
  ltrText: {
    textAlign: 'left',
  },
});
