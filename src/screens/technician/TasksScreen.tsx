import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth }      from '../../hooks/useAuth';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useAppTheme }  from '../../context/ThemeContext';
import { faultService } from '../../services/faultService';
import { machineService } from '../../services/machineService';
import FaultCard, { FaultCardAction } from '../../components/ui/FaultCard';
import Theme            from '../../constants/theme';
import type { Fault, FaultStatus } from '../../types';
import { Dimensions } from 'react-native';
import AppHeader, { HeaderBtn } from '../../components/ui/AppHeader';

const { width: W } = Dimensions.get('window');

function formatDowntime(minutes: number): string {
  if (minutes < 60) return `${minutes}د`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}س ${m}د` : `${h}س`;
}

function timeAgo(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return 'الآن';
  if (m < 60) return `${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}

// ── Resolve Modal ──────────────────────────────────────────────────────────
function ResolveModal({ fault, onClose, onSubmit }: {
  fault: Fault | null;
  onClose: () => void;
  onSubmit: (faultId: string, notes: string) => Promise<void>;
}) {
  const { colors } = useAppTheme();
  const [notes,      setNotes]      = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'grid' | 'list'>('list');
  

  useEffect(() => { if (!fault) setNotes(''); }, [fault]);
  if (!fault) return null;

  const elapsed      = Math.floor((Date.now() - new Date(fault.reportedAt).getTime()) / 60000);
  const elapsedColor = elapsed > 120 ? colors.danger : elapsed > 60 ? colors.warning : colors.success;

  const handleSubmit = async () => {
    if (notes.trim().length < 5) {
      Alert.alert('تنبيه', 'يرجى كتابة ملاحظات الإصلاح (5 أحرف على الأقل)');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(fault.id, notes.trim());
      setNotes('');
      onClose();
    } catch {
      Alert.alert('خطأ', 'فشل تسجيل الإصلاح');
      setSubmitting(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={[rm.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[rm.handle, { backgroundColor: colors.border }]} />
          <View style={rm.titleRow}>
            <TouchableOpacity style={[rm.closeBtn, { backgroundColor: colors.surfaceAlt }]} onPress={onClose}>
              <Ionicons name="close" size={17} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[rm.title, { color: colors.textPrimary }]}>تسجيل إنهاء الإصلاح</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={[rm.summary, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
              {[
                { label: 'الماكينة',   value: fault.machineName,       color: colors.textPrimary   },
                { label: 'العطل',      value: fault.description,       color: colors.textSecondary },
                { label: 'وقت التوقف', value: formatDowntime(elapsed), color: elapsedColor         },
              ].map((row, i) => (
                <View key={i}>
                  {i > 0 && <View style={[rm.divider, { backgroundColor: colors.border }]} />}
                  <View style={rm.summaryRow}>
                    <Text style={[rm.summaryVal, { color: row.color }]} numberOfLines={2}>{row.value}</Text>
                    <Text style={[rm.summaryLbl, { color: colors.textMuted }]}>{row.label}</Text>
                  </View>
                </View>
              ))}
            </View>
            <Text style={[rm.label, { color: colors.textSecondary }]}>ملاحظات الإصلاح</Text>
            <TextInput
              style={[rm.textarea, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="اكتب ما تم عمله بالتفصيل..."
              placeholderTextColor={colors.textMuted}
              multiline numberOfLines={4}
              textAlign="right" textAlignVertical="top"
              maxLength={400}
            />
            <Text style={[rm.charCount, { color: colors.textMuted }]}>{notes.length} / 400</Text>
            <View style={[rm.hint, { backgroundColor: colors.success + '12', borderColor: colors.success + '30' }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.success} />
              <Text style={[rm.hintText, { color: colors.success }]}>سيتم تغيير حالة الماكينة إلى "متوقفة" بعد الإصلاح</Text>
            </View>
            <TouchableOpacity
              style={[rm.submitBtn, { backgroundColor: colors.success }, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color="#fff" size="small" />
                : <><Ionicons name="checkmark-circle" size={18} color="#fff" /><Text style={rm.submitText}>تأكيد الإصلاح</Text></>
              }
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const rm = StyleSheet.create({
  sheet:      { borderTopLeftRadius: Theme.radius.xl, borderTopRightRadius: Theme.radius.xl, borderTopWidth: 1, paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.sm, maxHeight: '92%' },
  handle:     { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Theme.spacing.md },
  titleRow:   { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.lg },
  title:      { fontSize: 16, fontWeight: '700' },
  closeBtn:   { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  summary:    { borderRadius: Theme.radius.md, borderWidth: 1, padding: Theme.spacing.md, marginBottom: Theme.spacing.lg },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 7, gap: 12 },
  summaryLbl: { fontSize: 11, minWidth: 60, paddingTop: 2 },
  summaryVal: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'right' },
  divider:    { height: 1 },
  label:      { fontSize: 13, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  textarea:   { borderRadius: Theme.radius.md, borderWidth: 1.5, padding: 12, fontSize: 14, minHeight: 110, marginBottom: 4 },
  charCount:  { fontSize: 11, textAlign: 'left', marginBottom: Theme.spacing.md },
  hint:       { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, borderRadius: Theme.radius.md, borderWidth: 1, padding: 12, marginBottom: Theme.spacing.lg },
  hintText:   { flex: 1, fontSize: 12, textAlign: 'right', lineHeight: 18 },
  submitBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: Theme.radius.md, height: 50 },
  submitText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

// ── main screen ────────────────────────────────────────────────────────────
type TabKey = 'active' | 'resolved';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'active',   label: 'النشطة'  },
  { key: 'resolved', label: 'المنجزة' },
];

export default function TasksScreen() {
  const insets     = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { user }   = useAuth();

  const [faults,           setFaults]           = useState<Fault[]>([]);
  const [machineImagesMap, setMachineImagesMap] = useState<Record<string, string>>({});
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [activeTab,        setActiveTab]        = useState<TabKey>('active');
  const [resolveTarget,    setResolveTarget]    = useState<Fault | null>(null);
  const [layoutMode,       setLayoutMode]       = useState<'grid' | 'list'>('list'); 

  const fetchData = useCallback(async () => {
    try {
      const [all, machs] = await Promise.all([
        faultService.getAll(),
        machineService.getAll(),
      ]);
      setFaults(all);
      const imgs: Record<string, string> = {};
      machs.forEach(m => { if (m.image) imgs[m.id] = m.image; });
      setMachineImagesMap(imgs);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useWebSocket(user, useCallback((event) => {
    if (event.type === 'fault_created') {
      setFaults(prev => [event.fault, ...prev]);
    }
    if (event.type === 'fault_resolved') {
      setFaults(prev => prev.map(f =>
        f.id === event.faultId
          ? { ...f, status: 'resolved' as FaultStatus, resolvedAt: event.resolvedAt }
          : f
      ));
    }
  }, []));

  const handleAccept = useCallback(async (fault: Fault) => {
    const updated = await faultService.accept(fault.id);
    setFaults(prev => prev.map(f => f.id === fault.id ? updated : f));
  }, []);

  const handleUnaccept = useCallback(async (fault: Fault) => {
    await new Promise<void>((resolve, reject) => {
      Alert.alert(
        'تراجع عن القبول',
        'هل أنت متأكد من التراجع عن قبول هذه المهمة؟',
        [
          { text: 'إلغاء', style: 'cancel', onPress: () => reject() },
          {
            text: 'تراجع', style: 'destructive',
            onPress: async () => {
              const updated = await faultService.unaccept(fault.id);
              setFaults(prev => prev.map(f => f.id === fault.id ? updated : f));
              resolve();
            },
          },
        ]
      );
    });
  }, []);

  const handleResolve = useCallback(async (faultId: string, notes: string) => {
    const updated = await faultService.resolve(faultId, '', notes);
    setFaults(prev => prev.map(f => f.id === faultId ? updated : f));
  }, []);

  const pendingCount    = faults.filter(f => f.status === 'pending').length;
  const inProgressCount = faults.filter(f => f.status === 'in_progress').length;
  const activeFaults    = faults.filter(f => f.status !== 'resolved');
  const resolvedFaults  = faults.filter(f => f.status === 'resolved');
  const displayed       = activeTab === 'active' ? activeFaults : resolvedFaults;

  const getActions = (fault: Fault): FaultCardAction[] => {
    if (fault.status === 'pending') return [
      { label: 'قبول المهمة', icon: 'hand-right-outline', color: '#FFB100', onPress: () => handleAccept(fault) },
    ];
    if (fault.status === 'in_progress') return [
      { label: 'تراجع', icon: 'arrow-undo-outline', color: '#FF5757', onPress: () => handleUnaccept(fault) },
      { label: 'إنهاء الإصلاح', icon: 'checkmark-circle-outline', color: '#00D26A', onPress: () => setResolveTarget(fault) },
    ];
    return [];
  };

  if (loading) {
    return (
      <View style={[s.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
        <View style={s.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <AppHeader
  title="مهامي"
  subtitle={`${user?.name ?? ''} · ${user?.department ?? ''}`}
  right={
    <HeaderBtn
      icon={layoutMode === 'grid' ? 'list-outline' : 'grid-outline'}
      onPress={() => setLayoutMode(m => m === 'grid' ? 'list' : 'grid')}
    />
  }
/>
      <View style={[s.summaryBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[
          { label: 'انتظار', count: pendingCount,          color: colors.danger,  icon: 'time-outline'             as const },
          { label: 'تشغيل',  count: inProgressCount,       color: colors.warning, icon: 'construct-outline'        as const },
          { label: 'منجزة',  count: resolvedFaults.length, color: colors.success, icon: 'checkmark-circle-outline' as const },
        ].map((item, i) => (
          <View key={i} style={[s.summaryItem, i < 2 && { borderRightWidth: 1, borderRightColor: colors.border }]}>
            <View style={[s.summaryIconWrap, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon} size={14} color={item.color} />
            </View>
            <Text style={[s.summaryCount, { color: item.color }]}>{item.count}</Text>
            <Text style={[s.summaryLabel, { color: colors.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      <View style={[s.tabsRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map(tab => {
          const active   = activeTab === tab.key;
          const tabColor = tab.key === 'active' ? colors.primary : colors.success;
          const count    = tab.key === 'active' ? activeFaults.length : resolvedFaults.length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, active && { borderBottomColor: tabColor }]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, { color: active ? tabColor : colors.textMuted }, active && s.tabTextActive]}>
                {tab.label}
              </Text>
              <View style={[s.tabBadge, { backgroundColor: active ? tabColor : colors.surfaceAlt }]}>
                <Text style={[s.tabBadgeText, { color: active ? '#fff' : colors.textMuted }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={displayed}
      key={layoutMode}
numColumns={layoutMode === 'grid' ? 2 : 1}
columnWrapperStyle={layoutMode === 'grid' ? { flexDirection: 'row-reverse', justifyContent: 'space-between', paddingHorizontal: 14 } : undefined}
renderItem={({ item }) => (
  <FaultCard
    fault={item}
    machineImage={machineImagesMap[item.machineId]}
    width={layoutMode === 'grid' ? (W - 42) / 2 : W - 28}
    actions={getActions(item)}
  />
)}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={s.emptyWrap}>
            <View style={[s.emptyIconCircle, { backgroundColor: colors.surfaceAlt }]}>
              <Ionicons
                name={activeTab === 'active' ? 'construct-outline' : 'checkmark-done-circle-outline'}
                size={36} color={colors.textMuted}
              />
            </View>
            <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>
              {activeTab === 'active' ? 'لا توجد مهام نشطة' : 'لا توجد مهام منجزة'}
            </Text>
            <Text style={[s.emptySub, { color: colors.textMuted }]}>
              {activeTab === 'active' ? 'ستظهر هنا المهام المسندة إليك' : 'المهام التي أنجزتها ستظهر هنا'}
            </Text>
          </View>
        }
      />

      <ResolveModal
        fault={resolveTarget}
        onClose={() => setResolveTarget(null)}
        onSubmit={handleResolve}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1 },
  loader:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryBar:      { flexDirection: 'row-reverse', borderBottomWidth: 1 },
  summaryItem:     { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 3 },
  summaryIconWrap: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  summaryCount:    { fontSize: 20, fontWeight: '900', lineHeight: 24 },
  summaryLabel:    { fontSize: 10 },
  tabsRow:         { flexDirection: 'row-reverse', borderBottomWidth: 1 },
  tab:             { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 13, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText:         { fontSize: 13 },
  tabTextActive:   { fontWeight: '700' },
  tabBadge:        { minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  tabBadgeText:    { fontSize: 11, fontWeight: '800' },
  list:            { padding: 14, paddingBottom: 120 },
  emptyWrap:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIconCircle: { width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center' },
  emptyTitle:      { fontSize: 16, fontWeight: '700' },
  emptySub:        { fontSize: 13, textAlign: 'center', paddingHorizontal: 32, lineHeight: 20 },
});