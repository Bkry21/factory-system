import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, StatusBar, Animated,
  Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Theme from '../../constants/theme';
import { useAppTheme } from '../../context/ThemeContext';
import { reportService } from '../../services/reportService';
import AppHeader from '../../components/ui/AppHeader';
import type { ProductionReport, MachineReport, FaultReport } from '../../types';

type Period     = 'daily' | 'weekly' | 'monthly';
type ReportType = 'production' | 'machines' | 'faults';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'monthly', label: 'شهري'   },
  { key: 'weekly',  label: 'أسبوعي' },
  { key: 'daily',   label: 'يومي'   },
];

const REPORT_TABS: {
  key:   ReportType;
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'faults',     label: 'الأعطال',   icon: 'warning-outline' },
  { key: 'machines',   label: 'الماكينات', icon: 'cog-outline'     },
  { key: 'production', label: 'الإنتاج',   icon: 'layers-outline'  },
];

// ── helpers ────────────────────────────────────────────────────────────────
const rateColor = (r: number, colors: any) =>
  r >= 90 ? colors.success : r >= 70 ? colors.warning : colors.danger;

const formatTime = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}س ${m}د` : `${m}د`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

// ── AnimatedBar ────────────────────────────────────────────────────────────
function AnimatedBar({
  value, total, color, height = 6, colors,
}: {
  value: number; total: number; color: string; height?: number; colors: any;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct  = total === 0 ? 0 : Math.min(value / total, 1);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: pct, duration: 900, useNativeDriver: false,
    }).start();
  }, [value, total]);

  return (
    <View style={[barS.track, { height, backgroundColor: colors.surfaceAlt }]}>
      <Animated.View style={[
        barS.fill,
        { height, backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
      ]} />
    </View>
  );
}

const barS = StyleSheet.create({
  track: { borderRadius: 4, overflow: 'hidden' },
  fill:  { borderRadius: 4 },
});

// ── StatRow ────────────────────────────────────────────────────────────────
function StatRow({
  icon, iconColor, label, value, valueColor, colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string; label: string; value: string; valueColor?: string; colors: any;
}) {
  return (
    <View style={statS.row}>
      <View style={[statS.iconWrap, { backgroundColor: iconColor + '18' }]}>
        <Ionicons name={icon} size={13} color={iconColor} />
      </View>
      <Text style={[statS.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[statS.value, { color: valueColor ?? colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const statS = StyleSheet.create({
  row:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 8, paddingVertical: 5 },
  iconWrap:{ width: 26, height: 26, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  label:   { flex: 1, fontSize: 12, textAlign: 'right' },
  value:   { fontSize: 12, fontWeight: '700' },
});

// ── RawMaterials Card ──────────────────────────────────────────────────────
function RawMaterialsCard({ data, colors }: { data: ProductionReport; colors: any }) {
  if (!data.rawMaterialsUsed || data.rawMaterialsUsed.length === 0) return null;

  const total = data.rawMaterialsUsed.reduce((sum, m) => sum + m.totalQuantity, 0);

  return (
    <View style={[rmS.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={rmS.header}>
        <View style={[rmS.iconWrap, { backgroundColor: colors.success + '18' }]}>
          <Ionicons name="leaf-outline" size={16} color={colors.success} />
        </View>
        <Text style={[rmS.title, { color: colors.textPrimary }]}>استهلاك المواد الخام</Text>
      </View>

      <View style={[rmS.divider, { backgroundColor: colors.border }]} />

      {data.rawMaterialsUsed.map((m, i) => {
        const pct = total === 0 ? 0 : (m.totalQuantity / total) * 100;
        return (
          <View key={i} style={rmS.row}>
            <View style={rmS.rowRight}>
              <Text style={[rmS.matName, { color: colors.textPrimary }]}>{m.name}</Text>
              <Text style={[rmS.matUnit, { color: colors.textMuted }]}>{m.unit}</Text>
            </View>
            <View style={rmS.barWrap}>
              <AnimatedBar value={m.totalQuantity} total={total} color={colors.success} height={5} colors={colors} />
              <View style={rmS.barMeta}>
                <Text style={[rmS.pct, { color: colors.textMuted }]}>{Math.round(pct)}%</Text>
                <Text style={[rmS.qty, { color: colors.success }]}>{m.totalQuantity.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        );
      })}

      <View style={[rmS.footer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <Text style={[rmS.footerLabel, { color: colors.textMuted }]}>إجمالي المواد المستهلكة</Text>
        <Text style={[rmS.footerVal, { color: colors.textPrimary }]}>{total.toLocaleString()} وحدة</Text>
      </View>
    </View>
  );
}

const rmS = StyleSheet.create({
  card:       { borderRadius: Theme.radius.lg, borderWidth: 1, padding: Theme.spacing.md, gap: 10, marginBottom: Theme.spacing.sm },
  header:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  iconWrap:   { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  title:      { fontSize: 14, fontWeight: '700' },
  divider:    { height: 1 },
  row:        { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  rowRight:   { width: 60, alignItems: 'flex-end', gap: 2 },
  matName:    { fontSize: 12, fontWeight: '700', textAlign: 'right' },
  matUnit:    { fontSize: 10, textAlign: 'right' },
  barWrap:    { flex: 1, gap: 4 },
  barMeta:    { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  qty:        { fontSize: 11, fontWeight: '700' },
  pct:        { fontSize: 11 },
  footer:     { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', borderRadius: Theme.radius.md, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginTop: 2 },
  footerLabel:{ fontSize: 12 },
  footerVal:  { fontSize: 13, fontWeight: '800' },
});

// ── Machine Report Card ────────────────────────────────────────────────────
function MachineReportCard({ m, colors }: { m: any; colors: any }) {
  const total = m.totalRunningHours + m.totalDowntimeHours;
  const avail = total === 0 ? 0 : Math.round((m.totalRunningHours / total) * 100);
  const color = rateColor(avail, colors);

  return (
    <View style={[mrS.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={mrS.header}>
        <View style={[mrS.availBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
          <Text style={[mrS.availNum, { color }]}>{avail}%</Text>
          <Text style={[mrS.availLabel, { color }]}>التوفر</Text>
        </View>
        <View style={mrS.nameWrap}>
          <Text style={[mrS.machineName, { color: colors.textPrimary }]}>{m.machineName}</Text>
          {m.department && (
            <Text style={[mrS.dept, { color: colors.textMuted }]}>{m.department}</Text>
          )}
        </View>
        <View style={[mrS.statusDot, { backgroundColor: color }]} />
      </View>

      <AnimatedBar value={m.totalRunningHours} total={total} color={color} height={7} colors={colors} />
      <View style={mrS.barLabels}>
        <Text style={[mrS.barLabel, { color: colors.textMuted }]}>{m.totalDowntimeHours} دورة توقف</Text>
        <Text style={[mrS.barLabel, { color: colors.textMuted }]}>{m.totalRunningHours} دورة تشغيل</Text>
      </View>

      <View style={[mrS.statsWrap, { borderTopColor: colors.border }]}>
        <StatRow icon="play-circle-outline"  iconColor={colors.success} label="إجمالي التشغيل"  value={`${m.totalRunningHours} دورة`}  valueColor={colors.success}  colors={colors} />
        <StatRow icon="pause-circle-outline" iconColor={colors.danger}  label="إجمالي التوقف"   value={`${m.totalDowntimeHours} دورة`} valueColor={colors.danger}   colors={colors} />
        <StatRow icon="warning-outline"      iconColor={colors.warning} label="الأعطال المسجلة" value={`${m.faultCount} عطل`}          valueColor={m.faultCount > 0 ? colors.warning : colors.textMuted} colors={colors} />
        {m.avgResolutionTime !== undefined && (
          <StatRow icon="timer-outline" iconColor={colors.primary} label="متوسط وقت الإصلاح" value={formatTime(m.avgResolutionTime)} colors={colors} />
        )}
      </View>
    </View>
  );
}

const mrS = StyleSheet.create({
  card:       { borderRadius: Theme.radius.lg, borderWidth: 1, padding: Theme.spacing.md, gap: 10, marginBottom: Theme.spacing.sm },
  header:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  nameWrap:   { flex: 1, alignItems: 'flex-end', gap: 2 },
  machineName:{ fontSize: 14, fontWeight: '800', textAlign: 'right' },
  dept:       { fontSize: 11, textAlign: 'right' },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  availBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: Theme.radius.md, borderWidth: 1, gap: 2 },
  availNum:   { fontSize: 15, fontWeight: '900', lineHeight: 18 },
  availLabel: { fontSize: 9, fontWeight: '600' },
  barLabels:  { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  barLabel:   { fontSize: 10 },
  statsWrap:  { borderTopWidth: 1, paddingTop: 8, gap: 2 },
});

// ── Fault Report Card ──────────────────────────────────────────────────────
function FaultReportCard({ f, rank, maxCount, colors }: { f: any; rank: number; maxCount: number; colors: any }) {
  const rankColors = [colors.danger, colors.warning, colors.primary];
  const color = rankColors[rank] ?? colors.textMuted;

  return (
    <View style={[frS.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={frS.header}>
        <View style={frS.countWrap}>
          <Text style={[frS.count, { color }]}>{f.count}</Text>
          <Text style={[frS.countLabel, { color: colors.textMuted }]}>عطل</Text>
        </View>
        <View style={frS.nameWrap}>
          <Text style={[frS.name, { color: colors.textPrimary }]}>{f.machineName}</Text>
          {f.department && <Text style={[frS.dept, { color: colors.textMuted }]}>{f.department}</Text>}
        </View>
        <View style={[frS.rankBadge, { backgroundColor: color + '18' }]}>
          <Ionicons name="podium-outline" size={12} color={color} />
          <Text style={[frS.rankText, { color }]}>#{rank + 1}</Text>
        </View>
      </View>
      <AnimatedBar value={f.count} total={maxCount} color={color} height={6} colors={colors} />
    </View>
  );
}

const frS = StyleSheet.create({
  card:       { borderRadius: Theme.radius.lg, borderWidth: 1, padding: Theme.spacing.md, gap: 10, marginBottom: Theme.spacing.sm },
  header:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  nameWrap:   { flex: 1, alignItems: 'flex-end', gap: 2 },
  name:       { fontSize: 13, fontWeight: '700', textAlign: 'right' },
  dept:       { fontSize: 11, textAlign: 'right' },
  countWrap:  { alignItems: 'center' },
  count:      { fontSize: 20, fontWeight: '900', lineHeight: 22 },
  countLabel: { fontSize: 10 },
  rankBadge:  { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: Theme.radius.sm },
  rankText:   { fontSize: 11, fontWeight: '800' },
});

// ── Summary Stat Card ──────────────────────────────────────────────────────
function SummaryStatCard({ icon, color, label, value, colors }: {
  icon: keyof typeof Ionicons.glyphMap; color: string; label: string; value: string; colors: any;
}) {
  return (
    <View style={[ssS.card, { backgroundColor: colors.surface, borderColor: color + '40' }]}>
      <View style={[ssS.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[ssS.value, { color }]}>{value}</Text>
      <Text style={[ssS.label, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const ssS = StyleSheet.create({
  card:    { flex: 1, borderRadius: Theme.radius.lg, borderWidth: 1, padding: 12, alignItems: 'center', gap: 6 },
  iconWrap:{ width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  value:   { fontSize: 20, fontWeight: '900' },
  label:   { fontSize: 11, textAlign: 'center' },
});

// ── main screen ────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const insets     = useSafeAreaInsets();
  const { colors } = useAppTheme();

  const [period,     setPeriod]     = useState<Period>('daily');
  const [repType,    setRepType]    = useState<ReportType>('production');
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);

  const [prodData,  setProdData]  = useState<ProductionReport | null>(null);
  const [machData,  setMachData]  = useState<MachineReport    | null>(null);
  const [faultData, setFaultData] = useState<FaultReport      | null>(null);

  const fetchReport = useCallback(async () => {
    let alive = true;
    setLoading(true);
    try {
      if (repType === 'production') {
        const r = await reportService.getProduction(period);
        if (alive) setProdData(r);
      } else if (repType === 'machines') {
        const r = await reportService.getMachines(period);
        if (alive) setMachData(r);
      } else {
        const r = await reportService.getFaults(period);
        if (alive) setFaultData(r);
      }
    } catch (e) {
    } finally {
      if (alive) setLoading(false);
    }
    return () => { alive = false; };
  }, [period, repType]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── دالة التصدير ────────────────────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const fileFormat = repType === 'production' ? 'excel' : 'pdf';
      
      await reportService.export({
        type: repType,
        period: period,
        file_format: fileFormat,
      });

    } catch (error) {
      Alert.alert('خطأ', 'فشل تصدير التقرير');
    } finally {
      setExporting(false);
    }
  }, [repType, period]);

  const tabColor = repType === 'production' ? colors.primary
                 : repType === 'machines'   ? colors.success
                 :                            colors.danger;

  const exportIcon: keyof typeof Ionicons.glyphMap =
    repType === 'production' ? 'grid-outline' : 'document-text-outline';
  const exportLabel =
    repType === 'production' ? 'Excel' : 'PDF';

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      {/* ── الهيدر وبداخله زر التصدير ع اليسار ── */}
      <View style={s.headerContainer}>
        <AppHeader
          title="التقارير"
          subtitle={new Date().toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' })}
        />

        <TouchableOpacity
          style={[s.headerExportBtn, {marginLeft:50, backgroundColor: tabColor + '18', borderColor: tabColor + '40' }]}
          onPress={handleExport}
          disabled={exporting}
          activeOpacity={0.75}
        >
          {exporting ? (
            <ActivityIndicator size={13} color={tabColor} />
          ) : (
            <View style={s.exportContent}>
              <Ionicons name={exportIcon} size={14} color={tabColor} />
              <Text style={[s.exportText, { color: tabColor }]}>
                {exportLabel}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── Report type tabs ── */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {REPORT_TABS.map(t => {
          const active = repType === t.key;
          const tColor = t.key === 'production' ? colors.primary
                       : t.key === 'machines'   ? colors.success
                       :                          colors.danger;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, active && { borderBottomColor: tColor, borderBottomWidth: 2 }]}
              onPress={() => setRepType(t.key)}
              activeOpacity={0.7}
            >
              <View style={[s.tabIconWrap, active && { backgroundColor: tColor + '18' }]}>
                <Ionicons name={t.icon} size={15} color={active ? tColor : colors.textMuted} />
              </View>
              <Text style={[s.tabText, { color: active ? tColor : colors.textMuted }, active && { fontWeight: '700' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Period selector ── */}
      <View style={[s.periodRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, margin: Theme.spacing.md }]}>
        {PERIODS.map(p => {
          const active = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[s.periodTab, active && { backgroundColor: tabColor }]}
              onPress={() => setPeriod(p.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.periodText, { color: active ? '#fff' : colors.textMuted }, active && { fontWeight: '700' }]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={tabColor} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* ════ PRODUCTION ════ */}
          {repType === 'production' && prodData && (
            <>
              <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={s.cardHeader}>
                  <Ionicons name="layers" size={16} color={colors.primary} />
                  <Text style={[s.cardTitle, { color: colors.textPrimary }]}>أداء الإنتاج</Text>
                </View>

                <View style={s.rateCircleWrap}>
                  <View style={[s.rateCircle, {
                    borderColor: rateColor(prodData.achievementRate, colors) + '55',
                    backgroundColor: colors.background,
                  }]}>
                    <Ionicons name="speedometer-outline" size={20} color={rateColor(prodData.achievementRate, colors)} style={{ marginBottom: 4 }} />
                    <Text style={[s.rateNum, { color: rateColor(prodData.achievementRate, colors) }]}>
                      {Math.round(prodData.achievementRate)}%
                    </Text>
                    <Text style={[s.rateLbl, { color: colors.textMuted }]}>نسبة الإنجاز</Text>
                  </View>
                </View>

                <AnimatedBar
                  value={prodData.totalActual}
                  total={prodData.totalTarget}
                  color={rateColor(prodData.achievementRate, colors)}
                  height={8}
                  colors={colors}
                />

                <View style={s.statsGrid}>
                  {[
                    { label: 'المستهدف', value: prodData.totalTarget, color: colors.primary, icon: 'flag-outline'              },
                    { label: 'الفعلي',   value: prodData.totalActual, color: colors.success, icon: 'checkmark-circle-outline'  },
                  ].map(cell => (
                    <View key={cell.label} style={[s.statCell, { backgroundColor: colors.background, borderColor: cell.color + '30' }]}>
                      <Ionicons name={cell.icon as any} size={14} color={cell.color} />
                      <Text style={[s.statNum, { color: cell.color }]}>{cell.value.toLocaleString()}</Text>
                      <Text style={[s.statLbl, { color: colors.textMuted }]}>{cell.label}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* المواد الخام */}
              <RawMaterialsCard data={prodData} colors={colors} />

              {/* التفصيل اليومي */}
              {prodData.dailyBreakdown?.length > 0 && (
                <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.cardHeader}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
                    <Text style={[s.cardTitle, { color: colors.textPrimary }]}>التفصيل اليومي</Text>
                  </View>
                  {prodData.dailyBreakdown.map((day, i) => {
                    const rate  = day.target === 0 ? 0 : Math.round((day.actual / day.target) * 100);
                    const color = rateColor(rate, colors);
                    return (
                      <View key={i} style={[s.dayRow, i > 0 && [s.dayBorder, { borderTopColor: colors.border }]]}>
                        <View style={s.dayLeft}>
                          <Text style={[s.dayRate, { color }]}>{rate}%</Text>
                          <Text style={[s.dayDate, { color: colors.textMuted }]}>{formatDate(day.date)}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 4 }}>
                          <AnimatedBar value={day.actual} total={day.target} color={color} colors={colors} />
                          <View style={s.dayMeta}>
                            <Text style={[s.dayActual, { color }]}>{day.actual.toLocaleString()}</Text>
                            <Text style={[s.dayTarget, { color: colors.textMuted }]}>/ {day.target.toLocaleString()}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ════ MACHINES ════ */}
          {repType === 'machines' && machData && (
            <>
              <View style={s.summaryRow}>
                <SummaryStatCard icon="cog-outline"    color={colors.success} label="متوسط التوفر"   value={`${machData.avgAvailability ?? 0}%`}        colors={colors} />
                <SummaryStatCard icon="warning-outline" color={colors.danger}  label="إجمالي الأعطال" value={String(machData.totalFaults ?? 0)}            colors={colors} />
                <SummaryStatCard icon="timer-outline"   color={colors.warning} label="متوسط الإصلاح" value={formatTime(machData.avgResolutionTime ?? 0)}  colors={colors} />
              </View>
              {machData.machines.map((m, i) => (
                <MachineReportCard key={i} m={m} colors={colors} />
              ))}
            </>
          )}

          {/* ════ FAULTS ════ */}
          {repType === 'faults' && faultData && (
            <>
              <View style={s.summaryRow}>
                <SummaryStatCard icon="alert-circle-outline"   color={colors.danger}  label="إجمالي الأعطال" value={String(faultData.totalFaults)}                        colors={colors} />
                <SummaryStatCard icon="timer-outline"          color={colors.warning} label="متوسط الإصلاح"  value={formatTime(faultData.avgResolutionTimeMinutes)}       colors={colors} />
                <SummaryStatCard icon="checkmark-circle-outline" color={colors.success} label="تم الإصلاح"  value={String(faultData.resolvedCount ?? 0)}                  colors={colors} />
              </View>

              {faultData.mostFrequentFaults?.length > 0 && (
                <>
                  <View style={[s.cardHeader, { marginBottom: 8 }]}>
                    <Ionicons name="podium-outline" size={15} color={colors.textMuted} />
                    <Text style={[s.cardTitle, { color: colors.textPrimary }]}>أكثر الماكينات أعطالاً</Text>
                  </View>
                  {faultData.mostFrequentFaults.map((f, i) => (
                    <FaultReportCard
                      key={i} f={f} rank={i}
                      maxCount={faultData.mostFrequentFaults[0]?.count ?? 1}
                      colors={colors}
                    />
                  ))}
                </>
              )}

              {faultData.byStatus && (
                <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={s.cardHeader}>
                    <Ionicons name="pie-chart-outline" size={16} color={colors.textMuted} />
                    <Text style={[s.cardTitle, { color: colors.textPrimary }]}>توزيع حالات الأعطال</Text>
                  </View>
                  {[
                    { key: 'pending',     label: 'معلقة',        icon: 'time-outline'           as const, color: colors.danger  },
                    { key: 'in_progress', label: 'جاري الإصلاح', icon: 'construct-outline'      as const, color: colors.warning },
                    { key: 'resolved',    label: 'تم الإصلاح',   icon: 'checkmark-done-outline' as const, color: colors.success },
                  ].map(item => (
                    <StatRow
                      key={item.key}
                      icon={item.icon}
                      iconColor={item.color}
                      label={item.label}
                      value={String((faultData.byStatus as any)?.[item.key] ?? 0)}
                      valueColor={item.color}
                      colors={colors}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
    </View>
  );
}

// ── styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: Theme.spacing.md },

  // Header Container & Export Button
  headerContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  headerExportBtn: {
    position: 'absolute',
    left: Theme.spacing.md,
    top: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Theme.radius.md,
    borderWidth: 1,
    zIndex: 10,
  },
  exportContent: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  exportText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Tabs
  tabRow:     { flexDirection: 'row-reverse', borderBottomWidth: 1 },
  tab:        { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabIconWrap:{ width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tabText:    { fontSize: 11 },

  // Period
  periodRow:  { flexDirection: 'row-reverse', borderRadius: Theme.radius.md, borderWidth: 1, padding: 3 },
  periodTab:  { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: Theme.radius.sm },
  periodText: { fontSize: 13 },

  // Card
  card:       { borderRadius: Theme.radius.lg, borderWidth: 1, padding: Theme.spacing.md, gap: Theme.spacing.sm, marginBottom: Theme.spacing.sm },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardTitle:  { fontSize: 14, fontWeight: '700', textAlign: 'right' },

  // Rate circle
  rateCircleWrap: { alignItems: 'center', paddingVertical: 8 },
  rateCircle:     { width: 120, height: 120, borderRadius: 60, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  rateNum:        { fontSize: 28, fontWeight: '900', lineHeight: 32 },
  rateLbl:        { fontSize: 11, marginTop: 2 },

  // Stats grid
  statsGrid:  { flexDirection: 'row-reverse', gap: 6 },
  statCell:   { flex: 1, borderRadius: Theme.radius.md, borderWidth: 1, paddingVertical: 10, alignItems: 'center', gap: 4 },
  statNum:    { fontSize: 15, fontWeight: '800' },
  statLbl:    { fontSize: 10 },

  // Daily row
  dayRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dayBorder: { borderTopWidth: 1 },
  dayLeft:   { alignItems: 'center', minWidth: 42 },
  dayRate:   { fontSize: 13, fontWeight: '700' },
  dayDate:   { fontSize: 10 },
  dayMeta:   { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  dayActual: { fontSize: 11, fontWeight: '700' },
  dayTarget: { fontSize: 11 },

  // Summary row
  summaryRow: { flexDirection: 'row-reverse', gap: 8, marginBottom: Theme.spacing.sm },
});