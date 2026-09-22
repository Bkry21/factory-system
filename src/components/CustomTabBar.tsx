import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, Animated, Dimensions, Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');

const TAB_COLORS: Record<string, string> = {
  Dashboard:  '#2E86C1',
  Machines:   '#48C9B0',
  Reports:    '#A569BD',
  Faults:     '#E74C3C',
  Production: '#27AE60',
  Tasks:      '#F39C12',
  Admin:      '#E67E22',   // ← جديد
};

const ICON_FILLED: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard:  'grid',
  Machines:   'cog',
  Reports:    'bar-chart',
  Faults:     'warning',
  Production: 'layers',
  Tasks:      'construct',
  Admin:      'shield',    // ← جديد
};

const ICON_OUTLINE: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard:  'grid-outline',
  Machines:   'cog-outline',
  Reports:    'bar-chart-outline',
  Faults:     'warning-outline',
  Production: 'layers-outline',
  Tasks:      'construct-outline',
  Admin:      'shield-outline', // ← جديد
};

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const count  = state.routes.length;

  const animsRef = useRef<Animated.Value[]>([]);

  // نعمل الـ anims ديناميكي بناءً على عدد الـ routes الفعلي
  if (animsRef.current.length !== count) {
    animsRef.current = state.routes.map(
      (_, i) => animsRef.current[i] ?? new Animated.Value(state.index === i ? 1 : 0)
    );
  }
  const anims = animsRef.current;

  useEffect(() => {
    anims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: state.index === i ? 1 : 0,
        useNativeDriver: true,
        tension: 80,
        friction: 9,
      }).start();
    });
  }, [state.index]);

  const TAB_W = (SCREEN_W - 32) / count;

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom + 6 }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label    = (options.tabBarLabel as string) ?? route.name;
          const isActive = state.index === index;
          const color    = TAB_COLORS[route.name] ?? Colors.primary;
          const anim     = anims[index];

          if (!anim) return null;

          const iconScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.2] });
          const iconUp    = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
          const labelOp   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
          const labelDown = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });

          const onPress = () => {
            const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!isActive && !ev.defaultPrevented) navigation.navigate(route.name);
          };

          return (
            <TouchableOpacity
              key={route.key}
              style={[styles.tab, { width: TAB_W }]}
              onPress={onPress}
              activeOpacity={0.75}
            >
              <Animated.View style={[
                styles.iconWrap,
                isActive && {
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: color,
                  shadowColor: color,
                  ...Platform.select({
                    ios:     { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.45, shadowRadius: 12 },
                    android: { elevation: 8 },
                  }),
                },
                { transform: [{ scale: iconScale }, { translateY: iconUp }] },
              ]}>
                <Ionicons
                  name={isActive
                    ? (ICON_FILLED[route.name]  ?? 'ellipse')
                    : (ICON_OUTLINE[route.name] ?? 'ellipse-outline')}
                  size={isActive ? 22 : 20}
                  color={isActive ? Colors.white : Colors.textMuted}
                />
              </Animated.View>

              <Animated.Text style={[
                styles.label,
                { color: isActive ? color : Colors.textMuted,
                  opacity: labelOp,
                  transform: [{ translateY: labelDown }] },
              ]}>
                {label}
              </Animated.Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    
    overflow: 'visible',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
      },
      android: { elevation: 14 },
    }),
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingVertical: 4,
    paddingTop: 10,
    gap: 2,
    overflow: 'visible',
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
  },
});