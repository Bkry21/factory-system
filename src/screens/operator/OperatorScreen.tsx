import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
  StatusBar, Modal, TextInput, Alert, Image
} from 'react-native';
import { Ionicons }             from '@expo/vector-icons';
import { useSafeAreaInsets }    from 'react-native-safe-area-context';
import { useAuth }              from '../../hooks/useAuth';
import { useAppTheme }          from '../../context/ThemeContext';
import { useWebSocket }         from '../../hooks/useWebSocket';
import { machineService }       from '../../services/machineService';
import { faultService }         from '../../services/faultService';
import { dayService }           from '../../services/dayService';
import AppHeader, { HeaderBtn } from '../../components/ui/AppHeader';
import PhotoPicker              from '../../components/form/PhotoPicker';
import Theme                    from '../../constants/theme';
import Toast, { ToastType } from '../../components/ui/Toast';
import type { Machine, Fault, MachineStatus } from '../../types';

// ── Fault Modal ─────────────────────────────────────────────────────────────
function FaultModal({ machine, onClose, onSuccess, colors }: {
  machine:   Machine | null;
  onClose:   () => void;
  onSuccess: (msg: string) => void;
  colors:    any;
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
        description: desc.trim(),
        beforePhoto: photo || undefined,
      });
      onSuccess(`تم رفع البلاغ للماكينة ${machine.name}`);
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

// ── Roll Log Modal ──────────────────────────────────────────────────────────
function RollLogModal({ machine, onClose, onSuccess, colors }: {
  machine:   Machine | null;
  onClose:   () => void;
  onSuccess: (msg: string) => void;
  colors:    any;
}) {
  const [count,   setCount]   = useState('');
  const [notes,   setNotes]   = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!machine) { setCount(''); setNotes(''); } }, [machine]);
  if (!machine) return null;

  const submit = async () => {
    const num = parseInt(count);
    if (!count || isNaN(num) || num <= 0) { Alert.alert('تنبيه', 'أدخل عدد الرولات صحيح'); return; }
    setLoading(true);
    try {
      await dayService.createRollLog({ machine: Number(machine.id), rollCount: num, notes: notes.trim() });
      onSuccess(`تم تسجيل ${num} رولة`);
      onClose();
    } catch (e: any) {
      const msg = e?.response?.data?.non_field_errors?.[0] ?? 'فشل تسجيل الرولات';
      Alert.alert('خطأ', msg);
    }
    finally { setLoading(false); }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={[rl.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[rl.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={rl.head}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[rl.title, { color: colors.textPrimary }]}>تسجيل رولات الكيس</Text>
          </View>

          <Text style={[rl.machine, { color: colors.primary }]}>{machine.name}</Text>

          <View style={[rl.inputWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[rl.inputLabel, { color: colors.textMuted }]}>عدد الرولات</Text>
            <TextInput
              style={[rl.numInput, { color: colors.textPrimary }]}
              placeholder="0"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              value={count}
              onChangeText={setCount}
              textAlign="center"
            />
          </View>

          <TextInput
            style={[rl.notes, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
            placeholder="ملاحظات (اختياري)..."
            placeholderTextColor={colors.textMuted}
            multiline numberOfLines={2}
            value={notes} onChangeText={setNotes}
            textAlign="right"
          />

          <View style={[rl.hint, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.primary} />
            <Text style={[rl.hintText, { color: colors.primary }]}>يمكن التسجيل مرة واحدة فقط في اليوم لكل ماكينة</Text>
          </View>

          <TouchableOpacity
            style={[rl.btn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            onPress={submit} disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Ionicons name="save-outline" size={16} color="#fff" /><Text style={rl.btnTxt}>حفظ</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const rl = StyleSheet.create({
  backdrop:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  dialog:     { width: '100%', borderRadius: Theme.radius.lg, padding: 16, borderWidth: 1, gap: 12 },
  head:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title:      { fontSize: 16, fontWeight: '700' },
  machine:    { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  inputWrap:  { borderRadius: Theme.radius.md, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  inputLabel: { fontSize: 11, fontWeight: '600' },
  numInput:   { fontSize: 42, fontWeight: '900', width: '100%', textAlign: 'center' },
  notes:      { borderRadius: Theme.radius.md, borderWidth: 1, padding: 10, minHeight: 60, fontSize: 13, textAlign: 'right', textAlignVertical: 'top' },
  hint:       { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: Theme.radius.md, borderWidth: 1, padding: 10 },
  hintText:   { flex: 1, fontSize: 11, textAlign: 'right' },
  btn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: Theme.radius.md },
  btnTxt:     { color: '#fff', fontWeight: '800', fontSize: 14 },
});

// ══════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════
export default function OperatorScreen() {
  const { user, logout }   = useAuth();
  const { colors }         = useAppTheme();
  const insets             = useSafeAreaInsets();

  const [machine,     setMachine]     = useState<Machine | null>(null);
  const [fault,       setFault]       = useState<Fault | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [busy,        setBusy]        = useState(false);
  const [showFault,   setShowFault]   = useState(false);
  const [showRoll,    setShowRoll]    = useState(false);
  const [toast,       setToast]       = useState<string | null>(null);
  const [toastType,   setToastType]   = useState<ToastType>('success');

  const showToast = (msg: string, type: ToastType) => {
    setToastType(type);
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const assignedId = user?.assigned_machine?.id;
      if (!assignedId) { setLoading(false); return; }

      const [machines, faults] = await Promise.all([
        machineService.getAll(),
        faultService.getAll({ machineId: String(assignedId), status: 'pending' }),
      ]);

      const found = machines.find(m => m.id === String(assignedId)) ?? null;
      setMachine(found);
      setFault(faults[0] ?? null);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [user?.assigned_machine?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  // WebSocket — تحديث حالة الماكينة لحظياً
  useWebSocket(user, useCallback((evt) => {
    if (evt.type === 'machine_status_changed' && machine && String(evt.machineId) === machine.id) {
      setMachine(prev => prev ? { ...prev, status: evt.status as MachineStatus, lastUpdated: evt.timestamp } : prev);
    }
    if (evt.type === 'fault_created' && machine && String(evt.fault?.machineId) === machine.id) {
      setFault(evt.fault);
    }
    if (evt.type === 'fault_resolved' && fault && evt.faultId === fault.id) {
      setFault(null);
    }
  }, [machine, fault]));

  const handleStart = async () => {
    if (!machine) return;
    setBusy(true);
    try {
      await machineService.start(machine.id);
      setMachine(prev => prev ? { ...prev, status: 'running', lastUpdated: new Date().toISOString() } : prev);
      showToast(`تم تشغيل ${machine.name}`, 'start');
    } catch { Alert.alert('خطأ', 'تعذر تشغيل الماكينة'); }
    finally { setBusy(false); }
  };

  const handleStop = async () => {
    if (!machine) return;
    Alert.alert('إيقاف الماكينة', 'هل أنت متأكد؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'إيقاف', style: 'destructive', onPress: async () => {
        setBusy(true);
        try {
          await machineService.stop(machine.id);
          setMachine(prev => prev ? { ...prev, status: 'stopped', lastUpdated: new Date().toISOString() } : prev);
          showToast(`تم إيقاف ${machine.name}`, 'stop');
        } catch { Alert.alert('خطأ', 'تعذر إيقاف الماكينة'); }
        finally { setBusy(false); }
      }},
    ]);
  };

  // ── حالة الماكينة ──
  const isRunning     = machine?.status === 'running';
  const isStopped     = machine?.status === 'stopped';
  const isMaintenance = machine?.status === 'maintenance';
  const hasFault      = !!fault;

  const statusColor = isRunning ? colors.success : isStopped ? colors.danger : colors.warning;
  const statusLabel = isRunning ? 'شغالة' : isStopped ? 'متوقفة' : 'تحت الصيانة';

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title="ماكينتي"
        subtitle={user?.name ?? ''}
        right={
          <HeaderBtn
            icon="log-out-outline"
            color={colors.danger}
            bg={colors.danger + '15'}
            onPress={() => Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'خروج', style: 'destructive', onPress: logout },
            ])}
          />
        }
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={colors.primary} />
        }
      >
        {!machine ? (
          // ── لا توجد ماكينة مرتبطة ──
          <View style={s.emptyWrap}>
            <View style={[s.emptyIcon, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons name="hardware-chip-outline" size={40} color={colors.textMuted} />
            </View>
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>لا توجد ماكينة مربوطة</Text>
            <Text style={[s.emptySub, { color: colors.textMuted }]}>تواصل مع المشرف لإسناد ماكينة لك</Text>
          </View>
        ) : (
          <>
            {/* ── بطاقة الماكينة ── */}
            <View style={[s.machineCard, { backgroundColor: colors.surface, borderColor: statusColor + '60', shadowColor: statusColor }]}>
              
              {/* صورة الماكينة */}
              {machine.image && (
                <Image
                  source={{ uri: machine.image }}
                  style={s.machineImg}
                  resizeMode="cover"
                />
              )}

              {/* Header */}
              <View style={s.cardHead}>
                <View style={[s.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '50' }]}>
                  <View style={[s.dot, { backgroundColor: statusColor }]} />
                  <Text style={[s.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
                </View>
                <Text style={[s.machineName, { color: colors.textPrimary }]}>{machine.name}</Text>
              </View>

              {/* Info Row */}
              <View style={[s.infoRow, { borderTopColor: colors.border }]}>
                {[
                  { label: 'النوع', value: machine.type       ?? '—', icon: 'construct-outline' as const },
                  { label: 'القسم', value: machine.department ?? '—', icon: 'business-outline'  as const },
                ].map((item, i) => (
                  <View key={i} style={[s.infoItem, i === 0 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
                    <Ionicons name={item.icon} size={14} color={colors.textMuted} />
                    <Text style={[s.infoVal, { color: colors.textPrimary }]}>{item.value}</Text>
                    <Text style={[s.infoLbl, { color: colors.textMuted }]}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {/* عطل معلق */}
              {hasFault && (
                <View style={[s.faultBanner, { backgroundColor: colors.warning + '15', borderColor: colors.warning + '40' }]}>
                  <Text style={[s.faultDesc, { color: colors.textPrimary }]} numberOfLines={2}>{fault!.description}</Text>
                  <View style={s.faultLabel}>
                    <Ionicons name="warning-outline" size={13} color={colors.warning} />
                    <Text style={[s.faultLabelTxt, { color: colors.warning }]}>عطل معلق — جاري الإصلاح</Text>
                  </View>
                </View>
              )}
            </View>

            {/* ── أزرار التحكم ── */}
            <View style={s.controls}>
              {/* تشغيل / إيقاف — يظهر فقط إذا ما في عطل */}
              {!hasFault && !isMaintenance && (
                <>
                  {isStopped && (
                    <TouchableOpacity
                      style={[s.btn, { backgroundColor: colors.success }]}
                      onPress={handleStart}
                      disabled={busy}
                      activeOpacity={0.85}
                    >
                      {busy
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <><Ionicons name="play" size={20} color="#fff" /><Text style={s.btnTxt}>تشغيل الماكينة</Text></>
                      }
                    </TouchableOpacity>
                  )}
                  {isRunning && (
                    <TouchableOpacity
                      style={[s.btn, { backgroundColor: colors.danger }]}
                      onPress={handleStop}
                      disabled={busy}
                      activeOpacity={0.85}
                    >
                      {busy
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <><Ionicons name="square" size={20} color="#fff" /><Text style={s.btnTxt}>إيقاف الماكينة</Text></>
                      }
                    </TouchableOpacity>
                  )}
                </>
              )}

              {/* إبلاغ عطل — يظهر فقط إذا ما في عطل معلق */}
              {!hasFault && (
                <TouchableOpacity
                  style={[s.btn, { backgroundColor: colors.warning }]}
                  onPress={() => setShowFault(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="build-outline" size={20} color="#fff" />
                  <Text style={s.btnTxt}>إبلاغ عن عطل</Text>
                </TouchableOpacity>
              )}

              {/* تسجيل رولات — دايماً ظاهر */}
              <TouchableOpacity
                style={[s.btn, s.btnOutline, { borderColor: colors.primary }]}
                onPress={() => setShowRoll(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="layers-outline" size={20} color={colors.primary} />
                <Text style={[s.btnTxt, { color: colors.primary }]}>تسجيل رولات الكيس</Text>
              </TouchableOpacity>
            </View>

            {/* ── معلومات اليوم ── */}
            <View style={[s.dayCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[s.dayTitle, { color: colors.textMuted }]}>معلومات اليوم</Text>
              <View style={s.dayRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} />
                <Text style={[s.dayVal, { color: colors.textPrimary }]}>
                  {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <View style={s.dayRow}>
                <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                <Text style={[s.dayVal, { color: colors.textPrimary }]}>العمل من 7 ص حتى 5 م</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <FaultModal
        machine={showFault ? machine : null}
        onClose={() => setShowFault(false)}
        onSuccess={msg => { showToast(msg, 'warning'); setFault({ id: 'temp', machineId: machine?.id ?? '', machineName: machine?.name ?? '', reportedById: '', reportedByName: '', description: msg, status: 'pending', reportedAt: new Date().toISOString(), beforePhoto: '', resolutionNotes: '' }); loadData(); }}
        colors={colors}
      />
      <RollLogModal
        machine={showRoll ? machine : null}
        onClose={() => setShowRoll(false)}
        onSuccess={msg => showToast(msg, 'success')}
        colors={colors}
      />

      <Toast message={toast} type={toastType} colors={colors} />
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  scroll:      { padding: 16, paddingBottom: 120, gap: 14 },

  emptyWrap:   { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon:   { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  emptyTitle:  { fontSize: 16, fontWeight: '700' },
  emptySub:    { fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },

  machineCard: {
    borderRadius: Theme.radius.lg, borderWidth: 1.5,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
  },
  cardHead:    { padding: 10, gap: 6, flexDirection: 'row-reverse' },
  machineName: { fontSize: 22, fontWeight: '900', textAlign: 'right' },
  statusBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    alignSelf: 'flex-end',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 999, borderWidth: 1,
  },
  dot:         { width: 7, height: 7, borderRadius: 4 },
  statusTxt:   { fontSize: 12, fontWeight: '700' },
  infoRow:     { flexDirection: 'row-reverse', borderTopWidth: 1 },
  infoItem:    { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 4 },
  infoVal:     { fontSize: 13, fontWeight: '700' },
  infoLbl:     { fontSize: 10 },
  faultBanner: { margin: 12, borderRadius: Theme.radius.md, borderWidth: 1, padding: 12, gap: 6 },
  faultLabel:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 5 },
  faultLabelTxt: { fontSize: 12, fontWeight: '700' },
  faultDesc:   { fontSize: 13, textAlign: 'right' },

  controls:    { gap: 10 },
  btn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: Theme.radius.md },
  btnOutline:  { backgroundColor: 'transparent', borderWidth: 1.5 },
  btnTxt:      { fontSize: 15, fontWeight: '800', color: '#fff' },

  dayCard:     { borderRadius: Theme.radius.md, borderWidth: 1, padding: 14, gap: 10 },
  dayTitle:    { fontSize: 11, fontWeight: '700', textAlign: 'right' },
  dayRow:      { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  dayVal:      { fontSize: 13, fontWeight: '600' },
  machineImg:  { width: '95%', height: 200, borderRadius: Theme.radius.md, marginTop: 8, alignSelf: 'center' },
});