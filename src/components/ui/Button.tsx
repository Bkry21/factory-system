import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../constants/colors';
import Theme from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  iconName,
  style,
  textStyle,
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'secondary':
        return { bg: Colors.accent, text: Colors.white };
      case 'danger':
        return { bg: Colors.danger, text: Colors.white };
      case 'outline':
        return { bg: Colors.transparent, text: Colors.primary, border: Colors.primary };
      default:
        return { bg: Colors.primary, text: Colors.white };
    }
  };

  const current = getVariantStyle();

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: current.bg },
        current.border && { borderWidth: 1.5, borderColor: current.border },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={current.text} size="small" />
      ) : (
        <>
          {iconName && (
            <Ionicons
              name={iconName}
              size={Theme.sizes.iconSm}
              color={current.text}
              style={styles.icon}
            />
          )}
          <Text style={[styles.text, { color: current.text }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    height: Theme.sizes.buttonHeight,
    borderRadius: Theme.radius.md,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.lg,
    ...Theme.shadow.sm,
  },
  disabled: {
    opacity: 0.6,
  },
  icon: {
    marginLeft: Theme.spacing.xs,
  },
  text: {
    fontSize: Theme.fontSize.md,
    fontWeight: Theme.fontWeight.bold,
  },
});

export default Button;