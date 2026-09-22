import React, { useRef, useEffect } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Easing } from 'react-native';

interface Props { children: React.ReactNode; }

export default function TabScreenWrapper({ children }: Props) {
  const isFocused  = useIsFocused();
  const insets     = useSafeAreaInsets();
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    if (isFocused) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue:  1,
          duration: 600,
          easing:   Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue:  0,
          duration: 500,
          easing:   Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scale.setValue(1);
      translateY.setValue(40);
      opacity.setValue(0);
    }
  }, [isFocused]);

  return (
    <Animated.View style={[
      styles.wrap,
      { opacity, transform: [{ translateY }] },
    ]}>
      {/* padding للـ tab bar + safe area */}
     <View style={[styles.inner, { paddingBottom: insets.bottom + 65 }]}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap:  { flex: 1 },
  inner: { flex: 1 },
});