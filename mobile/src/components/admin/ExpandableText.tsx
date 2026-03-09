import { Alert, Pressable } from 'react-native';

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
  return (
    <Pressable onPress={() => Alert.alert('', value)}>
      <AppText variant={variant} numberOfLines={numberOfLines} color={color}>
        {value}
      </AppText>
    </Pressable>
  );
};
