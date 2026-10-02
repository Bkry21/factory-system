// src/screens/auth/LoginScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Image,
  Platform, Animated, Dimensions, StatusBar,
  TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

import { useAuth } from '../../hooks/useAuth';
import Field from '../../components/form/Field';
import { useDialog } from '../../components/ui/AppDialog';

// ── ألوان منار ──────────────────────────────────────────────
const MANAR = {
  royalBlue:    '#1A3F8F',
  royalBlueMid: '#2352C0',
  royalBlueDim: 'rgba(26,63,143,0.12)',
  gold:         '#D4A843',
  goldDim:      'rgba(212,168,67,0.15)',
  goldBorder:   'rgba(212,168,67,0.30)',

  // داكن
  darkBg:       '#0B0F1C',
  darkSurface:  '#111827',
  darkInput:    '#0B0F1C',
  darkBorder:   'rgba(212,168,67,0.14)',
  darkText:     '#F1F5FF',
  darkSub:      'rgba(241,245,255,0.40)',
  darkMuted:    'rgba(241,245,255,0.22)',

  // فاتح
  lightBg:      '#EEF3FF',
  lightSurface: '#FFFFFF',
  lightInput:   '#F0F4FF',
  lightBorder:  'rgba(26,63,143,0.13)',
  lightText:    '#0E1A3A',
  lightSub:     'rgba(14,26,58,0.45)',
  lightMuted:   'rgba(14,26,58,0.28)',

  success:      '#22C55E',
  successDim:   'rgba(34,197,94,0.12)',
  white:        '#FFFFFF',
};

const { height: H } = Dimensions.get('window');

// ── مؤشر الاتصال المتحرك ────────────────────────────────────
function LiveDot({ dark }: { dark: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 7, height: 7, borderRadius: 4,
      backgroundColor: MANAR.success,
      opacity: pulse,
    }} />
  );
}

export default function LoginScreen() {
  const { login }   = useAuth();
  const insets      = useSafeAreaInsets();
  const dark        = true; // داكن دايماً

  const C = dark ? {
    bg:      MANAR.darkBg,
    surface: MANAR.darkSurface,
    input:   MANAR.darkInput,
    border:  MANAR.darkBorder,
    text:    MANAR.darkText,
    sub:     MANAR.darkSub,
    muted:   MANAR.darkMuted,
  } : {
    bg:      MANAR.lightBg,
    surface: MANAR.lightSurface,
    input:   MANAR.lightInput,
    border:  MANAR.lightBorder,
    text:    MANAR.lightText,
    sub:     MANAR.lightSub,
    muted:   MANAR.lightMuted,
  };

  const [username, setUsername]           = useState('');
  const [password, setPassword]           = useState('');
  const [loading, setLoading]             = useState(false);
  const { show: showDialog, dialog }      = useDialog();
  const [usernameErr, setUsernameErr]     = useState('');
  const [passwordErr, setPasswordErr]     = useState('');

  // ── حالات تسجيل الدخول بالبصمة ──────────────────────────
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [hasSavedToken, setHasSavedToken]               = useState(false);

  // ── أنيميشن الدخول ──────────────────────────────────────
  const fadeTop   = useRef(new Animated.Value(0)).current;
  const fadeForm  = useRef(new Animated.Value(0)).current;
  const slideForm = useRef(new Animated.Value(40)).current;
  const goldScale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeTop,   { toValue: 1,    duration: 650, useNativeDriver: true }),
        Animated.spring(goldScale, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeForm,  { toValue: 1,    duration: 480, useNativeDriver: true }),
        Animated.timing(slideForm, { toValue: 0,    duration: 480, useNativeDriver: true }),
      ]),
    ]).start();

    checkBiometricSupport();
  }, []);

  // ── فحص إمكانية البصمة والتوكن المحفوظ ──────────────────────
  const checkBiometricSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled   = await LocalAuthentication.isEnrolledAsync();
      const savedToken = await SecureStore.getItemAsync('manar_user_token');

      setIsBiometricSupported(compatible && enrolled);
      if (savedToken) setHasSavedToken(true);
    } catch (e) {
      console.log('Biometric support check error:', e);
    }
  };

  // ── التحقق ──────────────────────────────────────────────
  const validate = () => {
    let ok = true;
    if (!username.trim()) { setUsernameErr('أدخل اسم المستخدم'); ok = false; }
    else setUsernameErr('');
    if (!password)        { setPasswordErr('أدخل كلمة المرور');  ok = false; }
    else setPasswordErr('');
    return ok;
  };

  // ── تسجيل الدخول الاعتيادي ────────────────────────────────
  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login(username.trim(), password);
      
      // حفظ التوكن/الجلسة لتمكين البصمة للمرات القادمة
      await SecureStore.setItemAsync('manar_user_token', 'active_session');
      setHasSavedToken(true);
    } catch (e: any) {
      const msg =
        e?.response?.status === 401 ? 'اسم المستخدم أو كلمة المرور غلط' :
        e?.response?.status === 0   ? 'تعذر الاتصال بالخادم، تحقق من الشبكة' :
        'حدث خطأ، حاول مرة أخرى';
      showDialog('error', 'خطأ في تسجيل الدخول', msg);
    } finally {
      // إيقاف التخمير والتحميل بشكل مؤكد
      setLoading(false);
    }
  };

  // ── تسجيل الدخول بالبصمة ─────────────────────────────────
  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'تأكيد الهوية للوصول لنظام منار',
        fallbackLabel: 'استخدم كلمة المرور',
        cancelLabel: 'إلغاء',
      });

      if (result.success) {
        setLoading(true);
        const token = await SecureStore.getItemAsync('manar_user_token');
        if (token) {
          showDialog('success', 'تم التحقق', 'تم التعرف على البصمة بنجاح');
        }
      }
    } catch (e) {
      showDialog('error', 'خطأ', 'تعذر التحقق من البصمة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[s.root, { backgroundColor: C.bg }]}>
        <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

        <KeyboardAvoidingView
          style={s.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* ── منطقة اللوقو العلوية ── */}
          <Animated.View style={[s.topZone, {
            opacity: fadeTop,
            paddingTop: insets.top + 28,
          }]}>

            {/* اللوقو */}
            <Animated.View style={[s.logoWrap, { transform: [{ scale: goldScale }] }]}>
              <Image
                source={require('../../assets/images/manar-logo.png')}
                style={s.logoImg}
                resizeMode="contain"
              />
            </Animated.View>

            {/* خط ذهبي فاصل */}
            <View style={s.goldDivider}>
              <View style={[s.gdLine, { backgroundColor: MANAR.goldBorder }]} />
              <View style={[s.gdDot,  { backgroundColor: MANAR.gold }]} />
              <View style={[s.gdLine, { backgroundColor: MANAR.goldBorder }]} />
            </View>

            {/* نص النظام */}
            <Text style={[s.systemLabel, { color: C.muted }]}>
              نظام إدارة المصنع
            </Text>

          </Animated.View>

          {/* ── كارد الفورم ── */}
          <Animated.View style={[s.formCard, {
            backgroundColor: C.surface,
            borderColor: dark ? MANAR.goldBorder : MANAR.lightBorder,
            opacity: fadeForm,
            transform: [{ translateY: slideForm }],
            ...(dark ? {} : {
              shadowColor: MANAR.royalBlue,
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.10,
              shadowRadius: 24,
              elevation: 6,
            }),
          }]}>

            {/* رأس الكارد */}
            <View style={s.cardHeader}>
              <View style={[s.accentStripe, { backgroundColor: MANAR.gold }]} />
              <View style={s.cardHeaderTxt}>
                <Text style={[s.cardTitle, { color: C.text }]}>تسجيل الدخول</Text>
                <Text style={[s.cardSub, { color: C.sub }]}>أدخل بياناتك للوصول للنظام</Text>
              </View>
            </View>

            {/* الحقول */}
            <View style={s.fields}>
              <Field
                label="اسم المستخدم"
                icon="person-outline"
                value={username}
                onChangeText={t => { setUsername(t); setUsernameErr(''); }}
                placeholder="username"
                autoCapitalize="none"
                autoCorrect={false}
                error={usernameErr}
                returnKeyType="next"
              />
              <Field
                label="كلمة المرور"
                icon="lock-closed-outline"
                value={password}
                onChangeText={t => { setPassword(t); setPasswordErr(''); }}
                placeholder="••••••••"
                password
                error={passwordErr}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
              />
            </View>

            {/* زر الدخول */}
            <TouchableOpacity
              style={[s.loginBtn, loading && s.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.82}
            >
              {loading ? (
                <ActivityIndicator color={MANAR.white} size="small" />
              ) : (
                <>
                  <Ionicons name="arrow-back" size={18} color={MANAR.white} />
                  <Text style={s.loginTxt}>دخول</Text>
                  <View style={s.btnGoldDot} />
                </>
              )}
            </TouchableOpacity>

            {/* زر البصمة (يظهر فقط إذا كان الجهاز يدعمها وتوجد جلسة سابقة) */}
            {isBiometricSupported && hasSavedToken && (
              <TouchableOpacity
                style={s.bioBtn}
                onPress={handleBiometricLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Ionicons name="finger-print-outline" size={20} color={MANAR.gold} />
                <Text style={s.bioTxt}>الدخول باستخدام البصمة</Text>
              </TouchableOpacity>
            )}

            {/* شريط الأمان */}
            <View style={s.secRow}>
              {([
                ['shield-checkmark-outline', 'SSL'],
                ['lock-closed-outline',      'مشفر'],
                ['server-outline',           'آمن'],
              ] as [keyof typeof Ionicons.glyphMap, string][]).map(([icon, lbl]) => (
                <View key={lbl} style={s.secItem}>
                  <Ionicons name={icon} size={12} color={C.muted} />
                  <Text style={[s.secTxt, { color: C.muted }]}>{lbl}</Text>
                </View>
              ))}
            </View>

          </Animated.View>

          {/* الإصدار */}
          <Text style={[s.version, { color: C.muted, paddingBottom: insets.bottom + 14 }]}>
            v1.0.0 • Manar Factory Management System
          </Text>

        </KeyboardAvoidingView>
        {dialog}
      </View>
    </TouchableWithoutFeedback>
  );
}

// ── الستايل ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1 },
  kav:  {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },

  // منطقة اللوقو
  topZone: {
    alignItems: 'center',
    gap: 10,
  },
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImg: {
    width: 300,
    height: 200,
  },

  // فاصل ذهبي
  goldDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '55%',
    marginTop: -30,
  },
  gdLine: { flex: 1, height: 1 },
  gdDot:  { width: 5, height: 5, borderRadius: 3 },

  systemLabel: {
    fontSize: 11,
    letterSpacing: 2.5,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  livePill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 2,
  },
  liveTxt: { fontSize: 12, fontWeight: '600' },

  // كارد الفورم
  formCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 16,
  },

  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
  },
  accentStripe: {
    width: 4,
    height: 42,
    borderRadius: 2,
    marginTop: 2,
  },
  cardHeaderTxt: { flex: 1, alignItems: 'flex-start', gap: 3 },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  cardSub:   { fontSize: 12 },

  fields: { gap: 10 },

  loginBtn: {
    height: 52,
    backgroundColor: MANAR.royalBlue,
    borderRadius: 16,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 3,
    borderColor: MANAR.gold + 'AA',
  },
  loginBtnDisabled: { opacity: 0.60 },
  loginTxt: { fontSize: 17, fontWeight: '800', color: MANAR.white },
  btnGoldDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: MANAR.gold,
    position: 'absolute',
    right: 18,
  },

  // زر البصمة المصمم بطابع منار
  bioBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MANAR.goldBorder,
    backgroundColor: MANAR.goldDim,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  bioTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: MANAR.gold,
  },

  secRow:  {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 20,
    paddingTop: 4,
  },
  secItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  secTxt:  { fontSize: 11 },

  version: { textAlign: 'center', fontSize: 11, letterSpacing: 0.5 },
});