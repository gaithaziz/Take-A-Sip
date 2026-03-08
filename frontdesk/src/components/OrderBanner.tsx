import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  message: string | null;
  onClose: () => void;
  isRTL?: boolean;
};

export const OrderBanner = ({ message, onClose, isRTL = false }: Props) => {
  if (!message) {
    return null;
  }
  return (
    <View style={[styles.wrap, isRTL ? styles.wrapRtl : null]}>
      <Text style={[styles.text, isRTL ? styles.rtlText : styles.ltrText]}>{message}</Text>
      <Pressable onPress={onClose}>
        <Text style={styles.close}>X</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FDF2D0',
    borderColor: '#E5C36B',
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wrapRtl: {
    flexDirection: 'row-reverse',
  },
  text: {
    color: '#5A3D00',
    fontWeight: '700',
    fontSize: 16,
  },
  close: {
    fontSize: 16,
    fontWeight: '800',
    color: '#5A3D00',
  },
  rtlText: {
    textAlign: 'right',
  },
  ltrText: {
    textAlign: 'left',
  },
});
