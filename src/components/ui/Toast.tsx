import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'start' | 'stop';

interface ToastProps {
  message: string | null;
  type:    ToastType;
  colors:  any;
}

const ICON_MAP: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error:   'close-circle',
  warning: 'warning',
  info:    'information-circle',
  start:   'play-circle',
  stop:    'stop-circle',
};

/**
 * Toast component مشترك — يظهر في أعلى الشاشة لمدة 2.6 ثانية
 */
export default function Toast({ message, type, colors }: ToastProps) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(-20)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;

    // reset
    fade.setValue(0);
    slide.setValue(-20);

    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fade,  { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(slide, { toValue: -20, duration: 250, useNativeDriver: true }),
      ]).start();
    }, 2600);

    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  const colorMap: Record<ToastType, string> = {
    success: colors.success,
    error:   colors.danger,
    warning: colors.warning,
    info:    colors.primary,
    start:   colors.success,
    stop:    colors.danger,
  };

  const color = colorMap[type] || colors.primary;

  return (
    <Animated.View style={[
      s.wrap,
      {
        opacity:          fade,
        transform:        [{ translateY: slide }],
        top:              insets.top + 60,
        backgroundColor:  colors.surface,
        borderColor:      colors.border,
      },
    ]}>
      <View style={[s.icon, { backgroundColor: color }]}>
        <Ionicons name={ICON_MAP[type] ?? 'information-circle'} size={13} color="#fff" />
      </View>
      <Text style={[s.text, { color: colors.textPrimary }]}>{message}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    position:         'absolute',
    alignSelf:        'center',
    zIndex:           999,
    flexDirection:    'row-reverse',
    alignItems:       'center',
    paddingHorizontal: 16,
    paddingVertical:  10,
    borderRadius:     999,
    gap:              10,
    borderWidth:      1,
  },
  icon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 13, fontWeight: '700' },
});