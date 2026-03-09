import { ViewStyle } from 'react-native';

export const mirroredRow = (isRTL: boolean): ViewStyle => ({
  flexDirection: isRTL ? 'row-reverse' : 'row',
});
