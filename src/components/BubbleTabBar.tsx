import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  I18nManager,
  LayoutChangeEvent,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const BAR_HEIGHT = 68;
const BUBBLE = 54;
const BUBBLE_TOP = -20; // الفقاعة تطلع فوق حافة الشريط

// أيقونة لكل شاشة (حسب اسم الـ route). أي اسم غير موجود ياخد أيقونة افتراضية.
const ICONS: Record<string, IconName> = {
  Dashboard: 'home-outline',
  Machines: 'hardware-chip-outline',
  Reports: 'bar-chart-outline',
  Admin: 'settings-outline',
  Faults: 'warning-outline',
  Production: 'layers-outline',
  Operators: 'people-outline',
  Tasks: 'clipboard-outline',
  Operator: 'construct-outline',
};
const FALLBACK_ICON: IconName = 'ellipse-outline';

export default function BubbleTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [barWidth, setBarWidth] = useState(0);
  const [items, setItems] = useState<Record<number, { x: number; w: number }>>({});

  const tx = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const placed = useRef(false);

  // مكان الفقاعة المطلوب (يشتغل صح في RTL و LTR)
  let target: number | null = null;
  const active = items[state.index];
  if (active && barWidth > 0) {
    const center = active.x + active.w / 2;
    const anchor = I18nManager.isRTL ? barWidth - BUBBLE / 2 : BUBBLE / 2;
    target = center - anchor;
  }

  useEffect(() => {
    if (target === null) return;
    if (!placed.current) {
      tx.setValue(target);
      placed.current = true;
      return;
    }
    Animated.spring(tx, {
      toValue: target,
      damping: 16,
      stiffness: 190,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
    pop.setValue(0.75);
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 140,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const onItemLayout = (index: number) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setItems(prev =>
      prev[index]?.x === x && prev[index]?.w === width ? prev : { ...prev, [index]: { x, w: width } },
    );
  };

  const focusedRoute = state.routes[state.index];
  const focusedIcon = ICONS[focusedRoute.name] ?? FALLBACK_ICON;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingBottom: Math.max(insets.bottom, 12) + 4 },
      ]}
    >
      <View
        style={[
          styles.bar,
          {
            backgroundColor: colors.surface,
            borderColor: colors.primaryGlow,
            shadowColor: colors.black,
          },
        ]}
      >
        <View style={styles.row} onLayout={e => setBarWidth(e.nativeEvent.layout.width)}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : options.title ?? route.name;
            const icon = ICONS[route.name] ?? FALLBACK_ICON;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                (navigation as any).navigate(route.name);
              }
            };
            const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });

            return (
              <Pressable
                key={route.key}
                style={styles.item}
                onLayout={onItemLayout(index)}
                onPress={onPress}
                onLongPress={onLongPress}
                accessibilityRole="button"
                accessibilityState={focused ? { selected: true } : {}}
                accessibilityLabel={label}
              >
                <View style={styles.iconSlot}>
                  {!focused && <Ionicons name={icon} size={24} color={colors.textMuted} />}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    focused
                      ? { color: colors.primary, fontWeight: '700' }
                      : { color: colors.textMuted, fontWeight: '500' },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* الفقاعة المتحركة */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.bubble,
            {
              backgroundColor: colors.primary,
              shadowColor: colors.primary,
              transform: [{ translateX: tx }, { scale: pop }],
              opacity: target === null ? 0 : 1,
            },
          ]}
        >
          <Ionicons name={focusedIcon} size={26} color={colors.white} />
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 26, // مساحة للفقاعة اللي بتطلع فوق الشريط
  },
  bar: {
    height: BAR_HEIGHT,
    borderRadius: 36,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 10,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 12,
  },
  iconSlot: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    fontSize: 11,
  },
  bubble: {
    position: 'absolute',
    start: 0,
    top: BUBBLE_TOP,
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
});