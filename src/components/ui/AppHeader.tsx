import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';

interface Props {
  title?:           string;
  subtitle?:        string;
  username?:        string;
  right?:           React.ReactNode;
  left?:            React.ReactNode;
  onSettingsPress?: () => void;
  onNotifPress?:    () => void;
}

export default function AppHeader({
  title, subtitle, username, right, left, onSettingsPress, onNotifPress,
}: Props) {
  const insets                        = useSafeAreaInsets();
  const { colors, isDark, toggleTheme } = useAppTheme();

  const [notifOn, setNotifOn] = React.useState(true);
  const spinAnim              = useRef(new Animated.Value(0)).current;

  const handleToggleTheme = () => {
    Animated.timing(spinAnim, {
      toValue:         1,
      duration:        400,
      useNativeDriver: true,
    }).start(() => spinAnim.setValue(0));
    toggleTheme();
  };

  const spin = spinAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const s = makeStyles(colors, isDark);

  return (
    <View style={[s.wrap, { paddingTop: 5 }]}>

      {/* ── اليمين: الضبط + الثيم ── */}
      <View style={s.sideSection}>
        <TouchableOpacity
          style={s.iconBtn}
          onPress={handleToggleTheme}
          activeOpacity={0.7}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons
              name={isDark ? 'sunny' : 'moon'}
              size={20}
              color={isDark ? '#FBBF24' : '#8B5CF6'}
            />
          </Animated.View>
        </TouchableOpacity>

        {right}
      </View>

      {/* ── المنتصف: العنوان أو اسم المستخدم ── */}
      <View style={s.centerSection}>
        {username ? (
          <View style={s.userBox}>
            <Text style={s.greeting}>مرحباً</Text>
            <Text style={s.username} numberOfLines={1}>{username}</Text>
            {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        ) : (
          <View style={{ alignItems: 'center' }}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        )}
      </View>

      {/* ── اليسار: الإشعارات ── */}
      <View style={[s.sideSection, { justifyContent: 'flex-end' }]}>
        {left ?? (
          <TouchableOpacity
            style={[s.iconBtn, notifOn && s.iconBtnActive]}
            onPress={() => {
              setNotifOn(p => !p);
              onNotifPress?.();
            }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={notifOn ? 'notifications' : 'notifications-off'}
              size={20}
              color={notifOn ? colors.pastelPink : colors.textMuted}
            />
            {notifOn && <View style={[s.dot, { backgroundColor: colors.primary }]} />}
          </TouchableOpacity>
        )}
      </View>

    </View>
  );
}

// ── زر مستقل قابل لإعادة الاستخدام ─────────────────────────────────────────
export function HeaderBtn({
  icon, onPress, color, bg,
}: {
  icon:    keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  color?:  string;
  bg?:     string;
}) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      style={[btnStyle.btn, { backgroundColor: bg ?? colors.surfaceAlt }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={20} color={color ?? colors.textMuted} />
    </TouchableOpacity>
  );
}

const btnStyle = StyleSheet.create({
  btn: {
    width:          40,
    height:         40,
    borderRadius:   12,
    justifyContent: 'center',
    alignItems:     'center',
  },
});

// ── Styles ───────────────────────────────────────────────────────────────────
function makeStyles(colors: any, isDark: boolean) {
  return StyleSheet.create({

    wrap: {
      flexDirection:     'row',
      alignItems:        'center',
      justifyContent:    'space-between',
      paddingHorizontal: 18,
      paddingBottom:     28,
      backgroundColor:   'transparent',
      borderBottomWidth: 0,
      borderBottomColor: isDark
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(0,0,0,0.06)',
    },

    sideSection: {
      flexDirection: 'row',
      alignItems:    'center',
      gap:           8,
      width:         96,
    },

    centerSection: {
      flex:       1,
      alignItems: 'center',
    },

    userBox: {
      alignItems: 'center',
      gap:        1,
    },

    greeting: {
      fontSize:   11,
      color:      colors.textMuted,
      fontWeight: '500',
    },

    username: {
      fontSize:   16,
      fontWeight: '700',
      color:      colors.textPrimary,
      maxWidth:   140,
    },

    title: {
      fontSize:   17,
      fontWeight: '700',
      color:      colors.textPrimary,
      letterSpacing: 0.2,
    },

    subtitle: {
      fontSize:   11,
      color:      colors.textMuted,
      marginTop:  2,
      fontWeight: '500',
    },

    iconBtn: {
      width:           40,
      height:          40,
      borderRadius:    12,
      backgroundColor: isDark
        ? 'rgba(255,255,255,0.07)'
        : 'rgba(0,0,0,0.05)',
      borderWidth:  1,
      borderColor:  isDark
        ? 'rgba(255,255,255,0.10)'
        : 'rgba(0,0,0,0.08)',
      justifyContent: 'center',
      alignItems:     'center',
    },

    iconBtnActive: {
      backgroundColor: colors.primaryDim,
      borderColor:     colors.primary + '40',
    },

    dot: {
      position:     'absolute',
      top:          0,
      right:        8,
      width:        6,
      height:       6,
      borderRadius: 3,
      borderWidth:  1.5,
      borderColor:  isDark ? '#0A0C14' : '#F0F2F8',
    },

  });
}