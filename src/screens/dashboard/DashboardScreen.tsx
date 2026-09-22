import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, RefreshControl,
  StatusBar, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWebSocket } from '../../hooks/useWebSocket';
import Theme from '../../constants/theme';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { machineService } from '../../services/machineService';
import { faultService }   from '../../services/faultService';
import { shiftService }   from '../../services/shiftService';
import AppHeader from '../../components/ui/AppHeader';
import type { Machine, Fault, Shift } from '../../types';

// ── helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  if (!iso) return 'الآن';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1)  return 'الآن';
  if (diff < 60) return `منذ ${diff} د`;
  const h = Math.floor(diff / 60);
  if (h < 24)   return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} يوم`;
}

// ── sub-components ─────────────────────────────────────────────────────────
function PulseDot({ color }: { color: string }) {
  const anim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={{
      width: 8, height: 8, borderRadius: 4,
      backgroundColor: color, opacity: anim,
    }} />
  );
}


const sc = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: Theme.radius.lg, borderWidth: 1,
    padding: 12, alignItems: 'center', gap: 4,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 2,
  },
  value: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  label: { fontSize: 11, textAlign: 'center' },
  sub:   { fontSize: 10, textAlign: 'center' },
});

function SectionHeader({ title, count, colors }: { title: string; count?: number; colors: any }) {
  return (
    <View style={sh.row}>
      <Text style={[sh.title, { color: colors.textPrimary }]}>{title}</Text>
      {count !== undefined && (
        <View style={[sh.badge, { backgroundColor: colors.primaryDim ?? colors.primary + '20' }]}>
          <Text style={[sh.badgeText, { color: colors.primary }]}>{count}</Text>
        </View>
      )}
    </View>
  );
}

const sh = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  title:     { fontSize: 15, fontWeight: '700', flex: 1 },
  badge:     { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

// KpiCard المعدّل
function KpiCard({
  icon, iconColor, label, value, trend, colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string; label: string; value: string | number;
  trend?: { dir: 'up' | 'down'; label: string }; colors: any;
}) {
  const trendColor = trend?.dir === 'up' ? colors.success : colors.danger;
  return (
    <View style={[kc.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* الصف العلوي: أيقونة + وصفها يمين */}
      <View style={kc.topRow}>
        <View style={[kc.iconWrap, { backgroundColor: iconColor + '18' }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={[kc.iconLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      {/* الصف السفلي: الرقم + الـ trend قصاده */}
      <View style={kc.bottomRow}>
        {trend && (
          <View style={[kc.trendBadge, { backgroundColor: trendColor + '15' }]}>
            <Ionicons
              name={trend.dir === 'up' ? 'trending-up' : 'trending-down'}
              size={11} color={trendColor}
            />
            <Text style={[kc.trendTxt, { color: trendColor }]}>{trend.label}</Text>
          </View>
        )}
        <Text style={[kc.value, { color: colors.textPrimary }]}>{value}</Text>
      </View>
    </View>
  );
}

const kc = StyleSheet.create({
  card:       { flex: 1, borderRadius: Theme.radius.lg, borderWidth: 1, padding: 10, gap: 6, marginBottom: 10 },
  topRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconWrap:   { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  iconLabel:  { fontSize: 11, flex: 1 },
  bottomRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  trendTxt:   { fontSize: 10, fontWeight: '700' },
  value:      { fontSize: 22, fontWeight: '900' },
});

// ── main ───────────────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const { user }       = useAuth();
  const { colors }     = useAppTheme();
  const insets         = useSafeAreaInsets();
  const isManager      = user?.role === 'factory_manager';

  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [machines,    setMachines]    = useState<Machine[]>([]);
  const [faults,      setFaults]      = useState<Fault[]>([]);
  const { activeShift, setActiveShift } = useAuth();

const load = useCallback(async () => {
  try {
    const [m, f, s] = await Promise.all([
      machineService.getAll(),
      faultService.getAll({ status: 'pending' }),
      shiftService.getActive(),
    ]);
    setMachines(m ?? []);
    setFaults(f ?? []);
    setActiveShift(s); 
 } catch (e) { /* silent */ }
  finally { setLoading(false); setRefreshing(false); }
}, [setActiveShift]);

  useEffect(() => { load(); }, [load]);
  useWebSocket(user, useCallback((event) => {
  if (event.type === 'machine_status_changed') {
    setMachines(prev => prev.map(m =>
      m.id === event.machineId ? { ...m, status: event.status as any } : m
    ));
  }
  if (event.type === 'fault_created') {
    setFaults(prev => [event.fault, ...prev]);
  }
  if (event.type === 'fault_resolved') {
    setFaults(prev => prev.filter(f => f.id !== event.faultId));
    setMachines(prev => prev.map(m =>
      m.id === event.machineId ? { ...m, status: 'running' as any } : m
    ));
  }
}, []));

  const onRefresh = useCallback(() => { setRefreshing(true); load(); }, [load]);

  // ── derived ──
  const running     = machines.filter(m => m.status === 'running').length;
  const maintenance = machines.filter(m => m.status === 'maintenance').length;
  const stopped     = machines.filter(m => m.status === 'stopped').length;
  const total       = machines.length;
  const efficiency  = total > 0 ? Math.round((running / total) * 100) : 0;

  if (loading) {
    return (
      <View style={[s.root, s.center, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title="نظرة سريعة"
        subtitle={new Date().toLocaleDateString('ar-EG', {
          weekday: 'long', month: 'long', day: 'numeric',
        })}

      />
      

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >





        {/* ── KPIs للمدير ── */}
        {isManager && (
          <>
            <SectionHeader title="مؤشرات الأداء" colors={colors}  />
            <View style={s.kpiRow}>
              <KpiCard
                icon="speedometer-outline"
                iconColor={colors.primary}
                label="كفاءة التشغيل"
                value={`${efficiency}%`}
                trend={efficiency >= 70
                  ? { dir: 'up',   label: 'جيد' }
                  : { dir: 'down', label: 'منخفض' }}
                colors={colors}
              />
              <KpiCard
                icon="construct-outline"
                iconColor={colors.warning}
                label="ماكينات صيانة"
                value={maintenance}
                trend={maintenance > 0
                  ? { dir: 'down', label: `${maintenance} ماكينة` }
                  : undefined}
                colors={colors}
              />
            </View>
            <View style={[s.kpiRow, { marginTop: 8 }]}>
              <KpiCard
                icon="stop-circle-outline"
                iconColor={colors.danger}
                label="ماكينات متوقفة"
                value={stopped}
                colors={colors}
              />
              <KpiCard
                icon="alert-circle-outline"
                iconColor={colors.danger}
                label="أعطال غير محلولة"
                value={faults.length}
                trend={faults.length > 0
                  ? { dir: 'down', label: 'تحتاج متابعة' }
                  : undefined}
                colors={colors}
              />
            </View>
          </>
        )}

        {/* ── progress bar الماكينات ── */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.cardHeader}>
            <Text style={[s.cardSub, { color: colors.textMuted }]}>
              {running} شغالة · {maintenance} صيانة · {stopped} متوقفة
            </Text>
            <Text style={[s.cardTitle, { color: colors.textPrimary }]}>الماكينات</Text>
          </View>

          <View style={[s.stackBar, { backgroundColor: colors.surfaceAlt }]}>
            {total > 0 && (
              <>
                <View style={[s.stackFill, {
                  flex: running, backgroundColor: colors.success,
                  borderTopRightRadius: 4, borderBottomRightRadius: 4,
                }]} />
                <View style={[s.stackFill, { flex: maintenance, backgroundColor: colors.warning }]} />
                <View style={[s.stackFill, {
                  flex: stopped, backgroundColor: colors.danger,
                  borderTopLeftRadius: 4, borderBottomLeftRadius: 4,
                }]} />
              </>
            )}
          </View>

          <View style={s.legendRow}>
            {[
              { color: colors.success, label: 'شغالة' },
              { color: colors.warning, label: 'صيانة' },
              { color: colors.danger,  label: 'متوقفة' },
            ].map(l => (
              <View key={l.label} style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: l.color }]} />
                <Text style={[s.legendText, { color: colors.textMuted }]}>{l.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── قائمة الماكينات ── */}
        <SectionHeader title="الماكينات المسجلة" count={total} colors={colors} />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {machines.length === 0 ? (
            <Text style={[s.empty, { color: colors.textMuted }]}>لا توجد ماكينات مسجلة</Text>
          ) : (
            machines.map((m, i) => {
              const colorMap: Record<string, string> = {
                running:     colors.success,
                maintenance: colors.warning,
                stopped:     colors.danger,
              };
              const labelMap: Record<string, string> = {
                running:     'شغالة',
                maintenance: 'صيانة',
                stopped:     'متوقفة',
              };
              const color = colorMap[m.status] ?? colors.textMuted;
              const label = labelMap[m.status] ?? m.status;
              return (
                <View key={m.id} style={[s.machRow, i > 0 && [s.machBorder, { borderTopColor: colors.border }]]}>
                  <View style={[s.statusBadge, { backgroundColor: color + '18' }]}>
                    <View style={[s.statusDot, { backgroundColor: color }]} />
                    <Text style={[s.statusText, { color }]}>{label}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.machName, { color: colors.textPrimary }]}>{m.name}</Text>
                    <Text style={[s.machDept, { color: colors.textMuted }]}>{m.department}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ── أعطال معلقة ── */}
        <SectionHeader title="أعطال معلقة" count={faults.length} colors={colors} />
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {faults.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="checkmark-done-circle-outline" size={32} color={colors.success} />
              <Text style={[s.empty, { color: colors.textMuted }]}>لا توجد أعطال معلقة</Text>
            </View>
          ) : (
            faults.slice(0, 5).map((f, i) => (
              <View key={f.id} style={[
                s.faultRow,
                i > 0 && [s.machBorder, { borderTopColor: colors.border }],
              ]}>
                <Text style={[s.faultTime, { color: colors.textMuted }]}>{timeAgo(f.reportedAt)}</Text>
               <View style={{ flex: 1, alignItems: 'flex-start', gap: 2 }}>
  <Text style={[s.faultDesc, { color: colors.textPrimary }]} numberOfLines={1}>{f.description}</Text>
  <Text style={[s.faultMachine, { color: colors.textMuted }]}>{f.machineName}</Text>
</View>
                <View style={[s.faultDot, { backgroundColor: colors.danger }]} />
              </View>
            ))
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingHorizontal: Theme.spacing.md },

  liveRow:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveText: { fontSize: 11, fontWeight: '600' },

  shiftBanner: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 10,
    borderRadius: Theme.radius.lg, borderWidth: 1,
    padding: 12, marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  shiftLabel: { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  shiftSub:   { fontSize: 11, marginTop: 2, textAlign: 'right' },

  summaryRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: Theme.spacing.md },

  kpiRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: 0 },

  card: {
    borderRadius: Theme.radius.lg,
    borderWidth: 1,
    padding: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:  { fontSize: 14, fontWeight: '700' },
  cardSub:    { fontSize: 11 },

  stackBar:  { flexDirection: 'row-reverse', height: 8, borderRadius: 4, overflow: 'hidden' },
  stackFill: { height: '100%' },

  legendRow:  { flexDirection: 'row-reverse', gap: 12, justifyContent: 'flex-end' },
  legendItem: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4 },
  legendDot:  { width: 7, height: 7, borderRadius: 3.5 },
  legendText: { fontSize: 11 },

  machRow:    { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  machBorder: { borderTopWidth: 1 },
  machName:   { fontSize: 13, fontWeight: '600' },
  machDept:   { fontSize: 11, marginTop: 1 },

  statusBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Theme.radius.full,
  },
  statusDot:  { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  faultRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 8 },
  faultDot:    { width: 7, height: 7, borderRadius: 3.5 },
  faultDesc:   { fontSize: 13, fontWeight: '600', textAlign: 'right' },
  faultMachine:{ fontSize: 11, textAlign: 'right' },
  faultTime:   { fontSize: 10, minWidth: 44, textAlign: 'left' },

  emptyWrap: { alignItems: 'center', gap: 8, paddingVertical: 8 },
  empty:     { fontSize: 13, textAlign: 'center' },
});