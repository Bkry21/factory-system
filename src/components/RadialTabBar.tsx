// components/RadialTabBar.tsx
import React, { useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Animated, Pressable,
  Platform, 
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

const RADIUS   = 100;
const BTN_SIZE = 60;

const TAB_META: Record<string, { color: string; icon: keyof typeof Ionicons.glyphMap; iconOff: keyof typeof Ionicons.glyphMap }> = {
  Dashboard:  { color:'#2E86C1', icon:'grid',      iconOff:'grid-outline'      },
  Machines:   { color:'#48C9B0', icon:'cog',       iconOff:'cog-outline'       },
  Reports:    { color:'#A569BD', icon:'bar-chart', iconOff:'bar-chart-outline' },
  Faults:     { color:'#E74C3C', icon:'warning',   iconOff:'warning-outline'   },
  Production: { color:'#27AE60', icon:'layers',    iconOff:'layers-outline'    },
  Tasks:      { color:'#F39C12', icon:'construct', iconOff:'construct-outline' },
  Admin:      { color:'#E67E22', icon:'shield',    iconOff:'shield-outline'    },
};

function getAngle(i: number, total: number): number {
  if (total === 1) return -90;
  return -180 + (180 / (total - 1)) * i;
}

function polarToXY(angleDeg: number, r: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}

export default function RadialTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const count  = state.routes.length;

  // state للـ render + ref للقراءة الفورية
  const [isOpen, setIsOpen]   = useState(false);
  const isOpenRef             = useRef(false);

  const openAnim   = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim  = useRef(new Animated.Value(0)).current;

  const tabAnims = useRef(
    state.routes.map(() => ({
      scale:   new Animated.Value(0),
      transX:  new Animated.Value(0),
      transY:  new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  /* ── غلق فوري بدون انميشن ── */
  const resetAll = useCallback(() => {
    isOpenRef.current = false;
    setIsOpen(false);
    rotateAnim.setValue(0);
    openAnim.setValue(0);
    tabAnims.forEach(ta => {
      ta.scale.setValue(0);
      ta.transX.setValue(0);
      ta.transY.setValue(0);
      ta.opacity.setValue(0);
    });
  }, [tabAnims, openAnim, rotateAnim]);

  /* ── غلق مع انميشن ── */
  const closeWheel = useCallback(() => {
    isOpenRef.current = false;
    setIsOpen(false);

    Animated.parallel([
      Animated.spring(rotateAnim, { toValue: 0, useNativeDriver: true, tension: 200, friction: 12 }),
      Animated.spring(openAnim,   { toValue: 0, useNativeDriver: true, tension: 200, friction: 12 }),
      ...tabAnims.map(ta => Animated.parallel([
        Animated.spring(ta.scale,   { toValue: 0, useNativeDriver: true, tension: 200, friction: 12 }),
        Animated.spring(ta.transX,  { toValue: 0, useNativeDriver: true, tension: 200, friction: 12 }),
        Animated.spring(ta.transY,  { toValue: 0, useNativeDriver: true, tension: 200, friction: 12 }),
        Animated.timing(ta.opacity, { toValue: 0, useNativeDriver: true, duration: 60 }),
      ])),
    ]).start();
  }, [tabAnims, openAnim, rotateAnim]);

const toggleWheel = useCallback(() => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

  if (!isOpenRef.current) {
    isOpenRef.current = true;
    setIsOpen(true);

    Animated.spring(rotateAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }).start();
    Animated.spring(openAnim,   { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }).start();

    // ضع التابات في مكانها فوراً
    state.routes.forEach((_, i) => {
      const { x, y } = polarToXY(getAngle(i, count), RADIUS);
      tabAnims[i].transX.setValue(x);
      tabAnims[i].transY.setValue(y);
    });

    // فقط scale + opacity مع انميشن
    Animated.parallel(
      tabAnims.map(ta => Animated.parallel([
        Animated.spring(ta.scale,   { toValue: 1, useNativeDriver: true, tension: 200, friction: 12 }),
        Animated.timing(ta.opacity, { toValue: 1, useNativeDriver: true, duration: 80 }),
      ]))
    ).start();

  } else {
    closeWheel();
  }
}, [count, tabAnims, openAnim, rotateAnim, closeWheel]);
  /* ── اختيار تاب ── */
  const onTabPress = useCallback((route: typeof state.routes[0], index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // غلق فوري بدون انميشن عشان navigate يشتغل فوراً
    resetAll();

    // pulse في الخلفية
    pulseAnim.setValue(0);
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start();

    // navigate فوري
    const ev = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (state.index !== index && !ev.defaultPrevented) {
      navigation.navigate(route.name);
    }
  }, [state.index, navigation, resetAll, pulseAnim]);

  const activeRoute = state.routes[state.index];
  const activeMeta  = TAB_META[activeRoute.name];
  const activeColor = activeMeta?.color ?? '#6C63FF';
  const activeLabel = (descriptors[activeRoute.key].options.tabBarLabel as string) ?? activeRoute.name;

  const rotate  = rotateAnim.interpolate({ inputRange: [0,1], outputRange: ['0deg','45deg'] });
  const ringOp  = openAnim.interpolate({ inputRange: [0,1], outputRange: [0, 0.5] });
  const r1Scale = openAnim.interpolate({ inputRange: [0,1], outputRange: [0.3, 1] });
  const r2Scale = openAnim.interpolate({ inputRange: [0,1], outputRange: [0.2, 1] });

  const pulseScale = pulseAnim.interpolate({ inputRange: [0,1], outputRange: [1, 2.2] });
  const pulseOp    = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.6, 0] });

  return (
    <View
      style={[styles.root, { bottom: insets.bottom + 16 }]}
      pointerEvents="box-none"
    >
      {/* حلقات */}
      <Animated.View style={[styles.ring, styles.ring2, { opacity: ringOp, transform: [{ scale: r2Scale }] }]} />
      <Animated.View style={[styles.ring, styles.ring1, { opacity: ringOp, transform: [{ scale: r1Scale }] }]} />

      {/* pulse */}
      <Animated.View style={[
        styles.pulse,
        { borderColor: activeColor, opacity: pulseOp, transform: [{ scale: pulseScale }] },
      ]} />

      {/* التابات */}
      {state.routes.map((route, i) => {
        const meta     = TAB_META[route.name];
        const color    = meta?.color ?? '#888';
        const ta       = tabAnims[i];
        const label    = (descriptors[route.key].options.tabBarLabel as string) ?? route.name;
        const isActive = state.index === i;

        return (
          <Animated.View
  key={route.key}
  style={[
    styles.tabItem,
    {
      backgroundColor: isActive ? color + 'cc' : 'rgba(255,255,255,0.92)',
      
      opacity:   ta.opacity,
      transform: [
        { translateX: ta.transX },
        { translateY: ta.transY },
        { scale: ta.scale },
      ],
    },
  ]}
>
  <Pressable
    style={styles.tabPressable}
    onPress={() => {
      if (!isOpenRef.current) return; // ← الحماية هنا بدل pointerEvents
      onTabPress(route, i);
    }}
    android_ripple={{ color: color + '55', borderless: true, radius: 28 }}
  >
              <Ionicons
                name={isActive ? (meta?.icon ?? 'ellipse') : (meta?.iconOff ?? 'ellipse-outline')}
                size={22}
                color={color}
              />
              <Text style={[styles.tabLabel, { color }]}>{label}</Text>
            </Pressable>
          </Animated.View>
        );
      })}

      {/* زر المركز */}
      <Pressable
        onPress={toggleWheel}
        android_ripple={{ color: '#ffffff33', borderless: true, radius: 30 }}
        style={({ pressed }) => [
          styles.centerBtn,
          { backgroundColor: activeColor },
          Platform.OS === 'ios' && {
            shadowColor: activeColor,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.55,
            shadowRadius: 16,
          },
          Platform.OS === 'android' && { elevation: 12 },
          pressed && { transform: [{ scale: 0.93 }] },
        ]}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons
            name={isOpen ? 'close' : (activeMeta?.icon ?? 'grid')}
            size={26}
            color="#fff"
          />
        </Animated.View>
      </Pressable>

      {/* label */}
      <Text style={[styles.centerLabel, { color: activeColor }]}>
        {isOpen ? 'إغلاق' : activeLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position:       'absolute',
    alignSelf:      'center',
    alignItems:     'center',
    justifyContent: 'center',
    width:          BTN_SIZE,
    height:         BTN_SIZE,
    overflow:       'visible',
  },
  ring: {
    position:     'absolute',
    borderRadius: 999,
    borderWidth:  1,
    borderColor:  'rgba(255,255,255,0.12)',
  },
  ring1: { width: RADIUS * 2 + BTN_SIZE,      height: RADIUS * 2 + BTN_SIZE      },
  ring2: { width: RADIUS * 2 + BTN_SIZE + 40, height: RADIUS * 2 + BTN_SIZE + 40 },
  pulse: {
    position:     'absolute',
    width:        BTN_SIZE,
    height:       BTN_SIZE,
    borderRadius: BTN_SIZE / 2,
    borderWidth:  2,
  },
  tabItem: {
    position:       'absolute',
    width:          56,
    height:         56,
    borderRadius:   28,
    borderWidth:    1.5,
    alignItems:     'center',
    justifyContent: 'center',
    overflow:       'hidden',
  },
  tabPressable: {
    width:          '100%',
    height:         '100%',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
  },
  tabLabel: {
    fontSize:      7.5,
    fontWeight:    '700',
    textAlign:     'center',
    marginTop:     1,
  },
  centerBtn: {
    width:          BTN_SIZE,
    height:         BTN_SIZE,
    borderRadius:   BTN_SIZE / 2,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         10,
  },
  centerLabel: {
    position:      'absolute',
    bottom:        -20,
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: 0.3,
  },
});