import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Colors from '../../constants/colors';
import Theme  from '../../constants/theme';

interface Props {
  children:  React.ReactNode;
  onPress?:  () => void;
  style?:    ViewStyle;
  variant?:  'default' | 'elevated' | 'flat';
}

export default function Card({ children, onPress, style, variant = 'default' }: Props) {
  const base = [s.card, variant === 'elevated' && s.elevated, variant === 'flat' && s.flat, style];

  if (onPress) {
    return (
      <TouchableOpacity style={base} onPress={onPress} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={base}>{children}</View>;
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    Theme.radius.lg,
    borderWidth:     1,
    borderColor:     Colors.borderLight,
    padding:         Theme.spacing.md,
  },
  elevated: {
    backgroundColor: Colors.surfaceDark,
    borderColor:     Colors.glassBorderHigh,
  },
  flat: {
    backgroundColor: Colors.surfaceAlt,
    borderColor:     Colors.border,
  },
});