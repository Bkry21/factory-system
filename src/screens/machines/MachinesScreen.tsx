import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList,
  StatusBar, Animated, Modal, TextInput, Alert, ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { productionService } from '../../services/productionService';
import * as ImagePicker from 'expo-image-picker';
import { useAuth }        from '../../hooks/useAuth';
import { useWebSocket }   from '../../hooks/useWebSocket';
import { useAppTheme }    from '../../context/ThemeContext';
import { machineService } from '../../services/machineService';
import { faultService }   from '../../services/faultService';
import { shiftService }   from '../../services/shiftService';
import AppHeader, { HeaderBtn } from '../../components/ui/AppHeader';
import Card          from '../../components/ui/Card';
import StatusBadge   from '../../components/ui/StatusBadge';
import StatCard      from '../../components/ui/StatCard';
import SectionTitle  from '../../components/ui/SectionTitle';
import EmptyState    from '../../components/ui/EmptyState';
import PhotoPicker   from '../../components/form/PhotoPicker';
import Theme  from '../../constants/theme';
import type { Machine, Fault, Shift, MachineStatus } from '../../types';
import { Dimensions } from 'react-native';

const { width: W } = Dimensions.get('window');

// ── helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return 'الآن';
  if (m < 60) return `${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}

function formatTimer(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ── Toast ──────────────────────────────────────────────────────────────────
type ToastType = 'start' | 'stop' | 'fault';

function Toast({ message, type, colors }: { message: string | null; type: ToastType; colors: any }) {
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(-20)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fade,  { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slide, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start();
    }, 2600);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  const color = type === 'start' ? colors.success : type === 'stop' ? colors.danger : colors.warning;
  const icon: keyof typeof Ionicons.glyphMap =
    type === 'start' ? 'play' : type === 'stop' ? 'square' : 'warning';

  return (
    <Animated.View style={[
      ts.wrap,
      { opacity: fade, transform: [{ translateY: slide }], top: insets.top + 60, backgroundColor: colors.surface, borderColor: colors.border },
    ]}>
      <View style={[ts.icon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={13} color="#fff" />
      </View>
      <Text style={[ts.text, { color: colors.textPrimary }]}>{message}</Text>
    </Animated.View>
  );
}

const ts = StyleSheet.create({
  wrap: {
    position: 'absolute', alignSelf: 'center', zIndex: 999,
    flexDirection: 'row-reverse', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 999, gap: 10,
    borderWidth: 1,
  },
  icon: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 13, fontWeight: '700' },
});

// ── Shift Banner ───────────────────────────────────────────────────────────

function ShiftBanner({
  shift, onStart, onEnd, loading, colors, elapsedSeconds, canControl,
}: {
  shift: Shift | null;
  onStart: () => void;
  onEnd:   () => void;
  loading: boolean;
  colors: any;
  elapsedSeconds: number;
  canControl: boolean; 
}) {
  return (
    <View style={[
      sb.wrap,
      shift
        ? { backgroundColor: colors.success + '15', borderColor: colors.success + '40' }
        : { backgroundColor: colors.surfaceAlt,  borderColor: colors.border },
    ]}>
      {/* زر البدء/الإنهاء — للمشرف فقط */}
      {canControl && (
        <TouchableOpacity
          style={[
            sb.btn,
            shift
              ? { backgroundColor: colors.danger + '15',  borderColor: colors.danger  + '40' }
              : { backgroundColor: colors.success + '15', borderColor: colors.success + '40' },
          ]}
          onPress={shift ? onEnd : onStart}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={shift ? colors.danger : colors.success} />
          ) : (
            <>
              <Ionicons
                name={shift ? 'stop-circle-outline' : 'play-circle-outline'}
                size={15}
                color={shift ? colors.danger : colors.success}
              />
              <Text style={[sb.btnTxt, { color: shift ? colors.danger : colors.success }]}>
                {shift ? 'إنهاء' : 'بدء الوردية'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      <View style={sb.info}>
        <View style={[sb.dot, { backgroundColor: shift ? colors.success : colors.textMuted }]} />
        <View>
          <Text style={[sb.txt, { color: colors.textPrimary }]}>
            {shift
              ? `وردية ${shift.shiftTypeDisplay} — نشطة`
              : 'لا توجد وردية نشطة'}
          </Text>
          {shift && (
            <Text style={[sb.timer, { color: colors.success }]}>
              ⏱️ {formatTimer(elapsedSeconds)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16, marginTop: 12,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Theme.radius.lg, borderWidth: 1,
  },
  info: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:  { width: 7, height: 7, borderRadius: 4 },
  txt:  { fontSize: 12, fontWeight: '600' },
  timer: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  btn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: Theme.radius.sm, borderWidth: 1,
  },
  btnTxt: { fontSize: 12, fontWeight: '700' },
});

// ── Shift Photo Modal ──────────────────────────────────────────────────────
function ShiftPhotoModal({
  visible, onClose, onCapture, loading, colors,
}: {
  visible: boolean;
  onClose: () => void;
  onCapture: (uri: string) => Promise<void>;
  loading: boolean;
  colors: any;
}) {
  const [photo, setPhoto] = useState('');

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('تنبيه', 'يرجى السماح بالوصول للمعرض');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takeCameraPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('تنبيه', 'يرجى السماح بالوصول للكاميرا');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!photo) {
      Alert.alert('تنبيه', 'يرجى التقاط صورة');
      return;
    }
    try {
      await onCapture(photo);
      setPhoto('');
      onClose();
    } catch (e: any) {
      Alert.alert('خطأ', e?.message || 'فشل رفع الصورة');
    }
  };

  useEffect(() => {
    if (!visible) setPhoto('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[spm.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[spm.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={spm.head}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[spm.title, { color: colors.textPrimary }]}>بدء الوردية بصورة</Text>
          </View>

          {photo ? (
            <View style={spm.photoWrap}>
              <Image source={{ uri: photo }} style={spm.photo} />
              <TouchableOpacity
                style={[spm.retakeBtn, { backgroundColor: colors.warning }]}
                onPress={takeCameraPhoto}
              >
                <Ionicons name="camera" size={16} color="#fff" />
                <Text style={spm.retakeBtnText}>إعادة التصوير</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={spm.pickRow}>
              <TouchableOpacity
                style={[spm.cameraPlaceholder, { backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}
                onPress={takeCameraPhoto}
              >
                <View style={[spm.cameraIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="camera-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[spm.cameraText, { color: colors.textPrimary }]}>كاميرا</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[spm.cameraPlaceholder, { backgroundColor: colors.background, borderColor: colors.border, flex: 1 }]}
                onPress={pickFromGallery}
              >
                <View style={[spm.cameraIcon, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="image-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[spm.cameraText, { color: colors.textPrimary }]}>المعرض</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[spm.btn, { backgroundColor: colors.success }, (loading || !photo) && { opacity: 0.6 }]}
            onPress={handleSubmit}
            disabled={loading || !photo}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={spm.btnText}>بدء الوردية</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const spm = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog: { width: '100%', borderRadius: Theme.radius.lg, padding: 16, borderWidth: 1, gap: 16 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700' },
  photoWrap: { gap: 12 },
  photo: { width: '100%', height: 200, borderRadius: Theme.radius.md },
  retakeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: Theme.radius.md },
  retakeBtnText: { color: '#fff', fontWeight: '700' },
  pickRow: { flexDirection: 'row', gap: 10 },
  cameraPlaceholder: { height: 200, borderRadius: Theme.radius.md, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', gap: 6 },
  cameraIcon: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  cameraText: { fontSize: 14, fontWeight: '700' },
  cameraSubText: { fontSize: 12 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: Theme.radius.md },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ── Machine Card ───────────────────────────────────────────────────────────
function MachineCard({
  machine, fault, shiftId, userRole,
  onPress, onUpdated, onToast, onFault, colors, fullWidth,
}: {
  machine:   Machine;
  fault?:    Fault;
  shiftId:   string | null;
  userRole:  string | undefined;
  onPress:   () => void;
  onUpdated: (m: Machine) => void;
  onToast:   (msg: string, type: ToastType) => void;
  onFault:   (m: Machine) => void;
  colors:    any;
  fullWidth?: boolean;
}) {
  const [busy, setBusy] = useState(false);

  // المشرف فقط يتحكم ويبلّغ عن أعطال
  const isSupervisor = userRole === 'supervisor';

const start = async () => {
  if (!shiftId) { Alert.alert('تنبيه', 'ابدأ الوردية أولاً'); return; }
  setBusy(true);
  try {
    await machineService.start(machine.id, shiftId);
    onUpdated({ ...machine, status: 'running', lastUpdated: new Date().toISOString() });
    onToast(`تم تشغيل ${machine.name}`, 'start');
  } catch (e: any) {
    Alert.alert('خطأ', JSON.stringify(e?.response?.data) ?? 'تعذر تشغيل الماكينة');
  }
  finally { setBusy(false); }
};
  const stop = async () => {
    if (!shiftId) { Alert.alert('تنبيه', 'لا توجد وردية نشطة'); return; }
    setBusy(true);
    try {
      await machineService.stop(machine.id, shiftId);
      onUpdated({ ...machine, status: 'stopped', lastUpdated: new Date().toISOString() });
      onToast(`تم إيقاف ${machine.name}`, 'stop');
    } catch { Alert.alert('خطأ', 'تعذر إيقاف الماكينة'); }
    finally { setBusy(false); }
  };

  const isFaulted = !!fault;
  const isRunning = machine.status === 'running';
  const isStopped = machine.status === 'stopped';
  const glowColor = isRunning ? colors.success : isStopped ? colors.danger : colors.warning;

  return (
    <TouchableOpacity
      style={[mc.card, fullWidth && { width: W - 32 }, { borderColor: glowColor, shadowColor: glowColor }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* ── Background image / fallback ── */}
      {machine.image
        ? <Image source={{ uri: machine.image }} style={mc.bg} />
        : <View style={[mc.bg, mc.bgFallback]} />
      }

      {/* ── Dark overlay ── */}
      <View style={mc.overlay} />

      {/* ── Content ── */}
      <View style={mc.content}>

        {/* Top row: status badge + room + time */}
        <View style={mc.topRow}>
          <View style={[mc.statusBadge, { backgroundColor: glowColor + '33', borderColor: glowColor + '70' }]}>
            <View style={[mc.dot, { backgroundColor: glowColor }]} />
            <Text style={mc.statusTxt}>
              {isRunning ? 'شغالة' : isStopped ? 'متوقفة' : 'صيانة'}
            </Text>
          </View>
          <View style={mc.topRight}>
            <View style={mc.roomBadge}>
              <Text style={mc.roomTxt}>{machine.department?.slice(0, 3)}</Text>
            </View>
            <Text style={mc.time}>{timeAgo(machine.lastUpdated)}</Text>
          </View>
        </View>

        {/* Bottom: name + tags + actions */}
        <View style={mc.bottom}>
          

          <View style={mc.tags}>
            {machine.type ? (
              <View style={mc.tag}><Text style={mc.tagTxt}>{machine.type}</Text></View>
            ) : null}
            {machine.department ? (
              <View style={mc.tag}><Text style={mc.tagTxt}>{machine.department}</Text></View>
            ) : null}
          </View>

          <View style={mc.divider} />

          {isFaulted ? (
            <View style={[mc.faultBox, { backgroundColor: colors.danger + '30', borderColor: colors.danger + '60' }]}>
              <Ionicons name="warning-outline" size={11} color="#fff" />
              <Text style={mc.faultTxt} numberOfLines={1}>{fault.description}</Text>
            </View>
          ) : isSupervisor ? (
            /* المشرف فقط: زر إبلاغ + تشغيل/إيقاف */
            <View style={mc.controls}>
              <TouchableOpacity style={mc.btnFault} onPress={() => onFault(machine)}>
                <Ionicons name="build-outline" size={11} color="#FAC775" />
                <Text style={mc.btnFaultTxt}>إبلاغ عطل</Text>
              </TouchableOpacity>

              {isStopped && (
                <TouchableOpacity style={mc.btnStart} onPress={start} disabled={busy}>
                  {busy
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="play" size={11} color="#fff" /><Text style={mc.btnTxt}>تشغيل</Text></>
                  }
                </TouchableOpacity>
              )}
              {isRunning && (
                <TouchableOpacity style={mc.btnStop} onPress={stop} disabled={busy}>
                  {busy
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <><Ionicons name="square" size={11} color="#fff" /><Text style={mc.btnTxt}>إيقاف</Text></>
                  }
                </TouchableOpacity>
              )}
            </View>
          ) : null /* باقي الأدوار: لا أزرار */}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const mc = StyleSheet.create({
  card: {
    width: (W - 16 * 2 - 8) / 2,
    height: 280,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
    marginBottom: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  bg: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bgFallback: {
    backgroundColor: '#1a1a2a',
  },
  content: {
    flex: 1,
    padding: 9,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  topRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  roomBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roomTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  time: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '600',
  },
  bottom: {
    gap: 5,
  },

  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
  },
  tag: {
    backgroundColor: '#000',
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  tagTxt: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  controls: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  btnFault: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'black' ,
    backgroundColor: 'orange',
  },
  btnFaultTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: 'white',
  },
  btnStart: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'green',
  },
  btnStop: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'red',
  },
  btnTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#fff',
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  faultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
  },
  faultTxt: {
    flex: 1,
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'right',
  },
});

// ── Fault Modal ────────────────────────────────────────────────────────────
function FaultModal({
  machine, shiftId, onClose, onSuccess, colors,
}: {
  machine:   Machine | null;
  shiftId:   string | null;
  onClose:   () => void;
  onSuccess: (msg: string) => void;
  colors: any;
}) {
  const [desc,    setDesc]    = useState('');
  const [photo,   setPhoto]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!machine) { setDesc(''); setPhoto(''); } }, [machine]);

  if (!machine) return null;

  const submit = async () => {
    if (!desc.trim()) { Alert.alert('تنبيه', 'اكتب وصف العطل'); return; }
    setLoading(true);
    try {
      await faultService.create({
        machineId:   machine.id,
        shiftId:     shiftId ?? '',
        description: desc.trim(),
        beforePhoto: photo || undefined,
      });
      onSuccess(`تم تسجيل عطل: ${machine.name}`);
      onClose();
    } catch { Alert.alert('خطأ', 'فشل رفع البلاغ'); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[fm.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[fm.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={fm.head}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[fm.title, { color: colors.textPrimary }]}>إبلاغ عن عطل</Text>
          </View>

          <Text style={[fm.machine, { color: colors.warning }]}>{machine.name}</Text>

          <TextInput
            style={[fm.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="اكتب وصف العطل..."
            placeholderTextColor={colors.textMuted}
            multiline numberOfLines={3}
            value={desc} onChangeText={setDesc}
            textAlign="right"
          />

          <PhotoPicker
            uri={photo}
            onChange={setPhoto}
            label="صورة العطل (اختياري)"
            required={false}
          />

          <TouchableOpacity
            style={[fm.btn, { backgroundColor: colors.warning }, loading && { opacity: 0.6 }]}
            onPress={submit} disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={colors.background} size="small" />
              : <Text style={fm.btnTxt}>إرسال البلاغ</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const fm = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog:   { width: '100%', borderRadius: Theme.radius.lg, padding: 16, borderWidth: 1, gap: 12 },
  head:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:    { fontSize: 16, fontWeight: '700' },
  machine:  { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  input:    { borderRadius: Theme.radius.md, padding: 10, textAlign: 'right', textAlignVertical: 'top', minHeight: 80, borderWidth: 1, fontSize: 14 },
  btn:      { paddingVertical: 12, borderRadius: Theme.radius.md, alignItems: 'center' },
  btnTxt:   { fontWeight: '800', fontSize: 14, color: '#fff' },
});

// ── Diag Sheet ─────────────────────────────────────────────────────────────
function DiagSheet({
  machine, faults, onClose, colors,
}: { machine: Machine | null; faults: Fault[]; onClose: () => void; colors: any }) {
  if (!machine) return null;
  const history = faults.filter(f => f.machineId === machine.id);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={[ds.overlay, { backgroundColor: colors.overlay + '50' }]}>
        <TouchableOpacity style={ds.dim} onPress={onClose} activeOpacity={1} />
        <View style={[ds.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[ds.drag, { backgroundColor: colors.border }]} />
          <View style={ds.head}>
            <StatusBadge status={machine.status as any} />
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[ds.name, { color: colors.textPrimary }]}>{machine.name}</Text>
              <Text style={[ds.dept, { color: colors.textMuted }]}>{machine.department}</Text>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
            <Text style={[ds.sec, { color: colors.textMuted }]}>سجل الأعطال</Text>
            {history.length === 0 ? (
              <EmptyState icon="checkmark-done-circle-outline" title="لا توجد أعطال" color={colors.success} />
            ) : history.map(f => (
              <View key={f.id} style={[ds.row, { borderBottomColor: colors.border }]}>
                <Text style={[ds.rowTime, { color: colors.textMuted }]}>{timeAgo(f.reportedAt)}</Text>
                <Text style={[ds.rowDesc, { color: colors.textPrimary }]} numberOfLines={1}>{f.description}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity style={[ds.closeBtn, { backgroundColor: colors.primary }]} onPress={onClose}>
            <Text style={ds.closeTxt}>إغلاق</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const ds = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  dim:      { ...StyleSheet.absoluteFill },
  panel:    { borderTopLeftRadius: Theme.radius.xl, borderTopRightRadius: Theme.radius.xl, padding: Theme.spacing.lg, borderTopWidth: 1, maxHeight: '80%' },
  drag:     { width: 32, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  head:     { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  name:     { fontSize: 15, fontWeight: '700' },
  dept:     { fontSize: 11 },
  sec:      { fontSize: 12, fontWeight: '700', textAlign: 'right', marginBottom: 6 },
  row:      { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1 },
  rowDesc:  { flex: 1, fontSize: 12, textAlign: 'right' },
  rowTime:  { fontSize: 10, marginLeft: 8 },
  closeBtn: { paddingVertical: 12, borderRadius: Theme.radius.md, alignItems: 'center', marginTop: 12 },
  closeTxt: { color: '#fff', fontWeight: '700' },
});

// ══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════
export default function MachinesScreen() {
 const { user, logout, activeShift: shift, setActiveShift } = useAuth();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const isSupervisor = user?.role === 'supervisor';
  const isManager    = user?.role === 'factory_manager';

  const [machines, setMachines] = useState<Machine[]>([]);
  const [faults, setFaults] = useState<Fault[]>([]);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('grid');
 


  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftBusy, setShiftBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<MachineStatus | 'all'>('all');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showShiftPhoto, setShowShiftPhoto] = useState(false);

  const [selected, setSelected] = useState<Machine | null>(null);
  const [faultMach, setFaultMach] = useState<Machine | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('start');

  const showToast = (msg: string, type: ToastType) => {
    setToastType(type);
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!shift) { setElapsedSeconds(0); return; }
    const interval = setInterval(() => { setElapsedSeconds(prev => prev + 1); }, 1000);
    return () => clearInterval(interval);
  }, [shift]);

const initialLoad = useCallback(async () => {
  try {
    const dept = isManager ? undefined : user?.department;
    const [m, f, s] = await Promise.all([
      machineService.getAll(dept),
      faultService.getAll({ status: 'pending' }),
      shiftService.getActive(),
    ]);
    setMachines(m ?? []);
    setFaults(f ?? []);
    setActiveShift(s);
    if (s) {
      const elapsed = Math.floor((Date.now() - new Date(s.startTime).getTime()) / 1000);
      setElapsedSeconds(Math.max(0, elapsed));
    }
  } catch (e) { /* silent */ }
  finally { setLoading(false); }
}, [isManager, user?.department]);

  const refreshData = useCallback(async () => {
    try {
      const dept = isManager ? undefined : user?.department;
      const [m, f] = await Promise.all([
        machineService.getAll(dept),
        faultService.getAll({ status: 'pending' }),
      ]);
      setMachines(m ?? []);
      setFaults(f ?? []);
  } catch (e) { /* silent */ }
    finally { setRefreshing(false); }
  }, [isManager, user?.department]);

  useEffect(() => { initialLoad(); }, [initialLoad]);

  const startShift = async () => {
    setShowShiftPhoto(true);
  };

  const doStartShift = async (photoUri?: string) => {
    setShiftBusy(true);
    try {
      const s = await shiftService.start('morning', photoUri);
      setActiveShift(s);
      setElapsedSeconds(0);
      showToast('تم بدء الوردية', 'start');
    } catch (e: any) {
      Alert.alert('خطأ', JSON.stringify(e?.response?.data) ?? 'تعذر بدء الوردية');
    } finally { setShiftBusy(false); }
  };

const endShift = async () => {
  if (!shift) return;

  // 1. تحقق من إنتاج اليوم
  try {
    const todayProd = await productionService.getToday(user?.department);
    if (!todayProd) {
      Alert.alert(
        'تنبيه ⚠️',
        'لم يتم تسجيل إنتاج اليوم بعد. هل تريد إنهاء الوردية بدون تسجيل الإنتاج؟',
        [
          { text: 'إلغاء', style: 'cancel' },
          { text: 'إنهاء بدون إنتاج', style: 'destructive', onPress: confirmEndShift },
        ]
      );
      return;
    }
  } catch {}


  Alert.alert(
    'إنهاء الوردية',
    'هل أنت متأكد من إنهاء الوردية؟',
    [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'إنهاء', style: 'destructive', onPress: confirmEndShift },
    ]
  );
};

const confirmEndShift = async () => {
  if (!shift) return; 
   
  try {
    await shiftService.end(shift.id); 
    setActiveShift(null);
    setElapsedSeconds(0);
    setMachines(prev => prev.map(m =>
      m.status === 'running' ? { ...m, status: 'stopped' as MachineStatus } : m
    ));
    showToast('تم إنهاء الوردية', 'stop');
} catch (e: any) {
  Alert.alert('خطأ', e?.message ?? 'تعذر إنهاء الوردية');
}
};

  useWebSocket(user, useCallback((evt) => {
    if (evt.type === 'machine_status_changed') {
      setMachines(prev => prev.map(m =>
        String(m.id) === String(evt.machineId) ? { ...m, status: evt.status as MachineStatus, lastUpdated: evt.timestamp } : m
      ));
    }
    if (evt.type === 'fault_created') {
      setFaults(prev => [evt.fault, ...prev]);
    }
  }, []));

  const running     = machines.filter(m => m.status === 'running').length;
  const maintenance = machines.filter(m => m.status === 'maintenance').length;
  const stopped     = machines.filter(m => m.status === 'stopped').length;

  const visible = machines.filter(m => {
    if (filter !== 'all' && m.status !== filter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filterOptions = [
    { id: 'maintenance', label: 'صيانة',  value: maintenance,     color: colors.warning },
    { id: 'stopped',     label: 'متوقفة', value: stopped,         color: colors.danger  },
    { id: 'running',     label: 'شغالة',  value: running,         color: colors.success },
    { id: 'all',         label: 'الكل',   value: machines.length, color: colors.primary },
  ];

  if (loading) {
    return (
      <View style={[s.root, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title="الماكينات"
        subtitle={`${machines.length} ماكينة`}
          left={
           <HeaderBtn
            icon={layoutMode === 'grid' ? 'list-outline' : 'grid-outline'}
            onPress={() => setLayoutMode((m: any) => m === 'grid' ? 'list' : 'grid')}
          />
          } />

      {/* بانر الوردية — للمشرف والمدير فقط */}
      {(isSupervisor || isManager) && (
      <ShiftBanner
        shift={shift}
  onStart={startShift}
  onEnd={endShift}
  loading={shiftBusy}
  colors={colors}
  elapsedSeconds={elapsedSeconds}
         canControl={isSupervisor}  
       />
      )}

      <View style={s.statsRow}>
        {filterOptions.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[s.statChip, { backgroundColor: colors.surface, borderColor: filter === c.id ? c.color : colors.border }]}
            onPress={() => setFilter(c.id as any)}
          >
            <Text style={[s.statVal, { color: c.color }]}>{c.value}</Text>
            <Text style={[s.statLbl, { color: colors.textMuted }]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[s.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <TextInput
          style={[s.searchInput, { color: colors.textPrimary }]}
          placeholder="ابحث عن ماكينة..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
        <Ionicons name="search-outline" size={16} color={colors.textMuted} />
      </View>

      <FlatList
  data={visible}
  keyExtractor={item => item.id}
  key={layoutMode}
  numColumns={layoutMode === 'grid' ? 2 : 1}
  columnWrapperStyle={layoutMode === 'grid' ? s.gridRow : undefined}
  contentContainerStyle={s.listPad}
  showsVerticalScrollIndicator={false}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => { setRefreshing(true); refreshData(); }}
      tintColor={colors.primary}
    />
  }
  renderItem={({ item }) => (
    <MachineCard
      machine={item}
      fault={faults.find(f => f.machineId === item.id)}
      shiftId={shift?.id ?? null}
      userRole={user?.role}
      onPress={() => setSelected(item)}
      onUpdated={upd => setMachines(prev => prev.map(m => m.id === upd.id ? upd : m))}
      onToast={showToast}
      onFault={setFaultMach}
      colors={colors}
      fullWidth={layoutMode === 'list'}
    />
  )}
  ListEmptyComponent={
    <EmptyState
      icon="hardware-chip-outline"
      title="لا توجد ماكينات"
      sub="لا توجد ماكينات مطابقة للبحث"
    />
  }
/>

      <DiagSheet
        machine={selected}
        faults={faults}
        onClose={() => setSelected(null)}
        colors={colors}
      />

      <FaultModal
        machine={faultMach}
        shiftId={shift?.id ?? null}
        onClose={() => setFaultMach(null)}
        onSuccess={msg => showToast(msg, 'fault')}
        colors={colors}
      />

      <ShiftPhotoModal
        visible={showShiftPhoto}
        onClose={() => setShowShiftPhoto(false)}
        onCapture={async (uri) => {
          setShowShiftPhoto(false);
          await doStartShift(uri);
        }}
        loading={shiftBusy}
        colors={colors}
      />

      <Toast message={toast} type={toastType} colors={colors} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  statsRow: { flexDirection: 'row-reverse', gap: 6, paddingHorizontal: 16, marginTop: 12 },
  statChip: {
    flex: 1, borderRadius: Theme.radius.md, borderWidth: 1,
    paddingVertical: 8, alignItems: 'center', gap: 2,
  },
  statVal: { fontSize: 18, fontWeight: '900' },
  statLbl: { fontSize: 10 },
  searchWrap: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 10, marginBottom: 4,
    paddingHorizontal: 12, height: 40,
    borderRadius: Theme.radius.md, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 13 },
  gridRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 16 },
  listPad: { paddingBottom: 130, paddingTop: 8 },
});