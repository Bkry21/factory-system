import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, StatusBar, Animated, Modal, Platform,
} from 'react-native';
import { Ionicons }          from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme }       from '../../context/ThemeContext';
import { useDialog }         from '../../components/ui/AppDialog';
import Toast, { ToastType }  from '../../components/ui/Toast';
import AppHeader             from '../../components/ui/AppHeader';
import Theme                 from '../../constants/theme';
import { reportService, Period, PeriodParams } from '../../services/reportService';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'production' | 'machines' | 'faults';

interface SummaryData {
  production: { achievementRate: number; totalActual: number; totalTarget: number };
  faults:     { pending: number; inProgress: number; resolved: number; total: number };
  machines:   { total: number; running: number; maintenance: number; stopped: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(min: number): string {
  if (!min) return '0د';
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}س ${m}د` : `${m}د`;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function rateColor(r: number, colors: any): string {
  return r >= 90 ? colors.success : r >= 70 ? colors.warning : colors.danger;
}

function progressColor(rate: number): string {
  return rate >= 90 ? '#10B981' : rate >= 70 ? '#F59E0B' : '#EF4444';
}

// ─── Animated Bar ─────────────────────────────────────────────────────────────

function AnimBar({ value, total, color, h = 5, colors }: {
  value: number; total: number; color: string; h?: number; colors: any;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const pct  = total === 0 ? 0 : Math.min(value / total, 1);

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: pct, duration: 800, useNativeDriver: false }).start();
  }, [value, total]);

  return (
    <View style={{ height: h, borderRadius: h / 2, overflow: 'hidden', backgroundColor: colors.border }}>
      <Animated.View style={{
        height: h, borderRadius: h / 2, backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }} />
    </View>
  );
}

// ─── Period Selector ──────────────────────────────────────────────────────────

const PERIODS: { key: Period; label: string; short: string }[] = [
  { key: 'daily',   label: 'اليوم',    short: 'يوم'  },
  { key: 'weekly',  label: 'الأسبوع',  short: 'أسبوع'},
  { key: 'monthly', label: 'الشهر',    short: 'شهر'  },
  { key: 'yearly',  label: 'السنة',    short: 'سنة'  },
  { key: 'custom',  label: 'مخصص',     short: 'مخصص' },
];

// Date picker بسيط واحترافي بدون مكتبة خارجية
function DatePickerModal({ visible, value, onConfirm, onClose, label, colors }: {
  visible:   boolean;
  value:     string;
  onConfirm: (v: string) => void;
  onClose:   () => void;
  label:     string;
  colors:    any;
}) {
  const today = new Date();
  const init  = value ? new Date(value) : today;

  const [year,  setYear]  = useState(init.getFullYear());
  const [month, setMonth] = useState(init.getMonth() + 1);
  const [day,   setDay]   = useState(init.getDate());

  const daysInMonth = new Date(year, month, 0).getDate();
  const clampedDay  = Math.min(day, daysInMonth);

  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                   'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  const confirm = () => {
    const d = clampedDay.toString().padStart(2,'0');
    const m = month.toString().padStart(2,'0');
    onConfirm(`${year}-${m}-${d}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={dp.overlay}>
        <View style={[dp.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[dp.title, { color: colors.textPrimary }]}>{label}</Text>

          {/* السنة */}
          <View style={dp.row}>
            <TouchableOpacity onPress={() => setYear(y => y - 1)} style={dp.arrow}>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[dp.val, { color: colors.textPrimary }]}>{year}</Text>
            <TouchableOpacity onPress={() => setYear(y => Math.min(y + 1, today.getFullYear()))} style={dp.arrow}>
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* الشهر */}
          <View style={dp.row}>
            <TouchableOpacity onPress={() => setMonth(m => m === 1 ? 12 : m - 1)} style={dp.arrow}>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[dp.val, { color: colors.textPrimary }]}>{months[month - 1]}</Text>
            <TouchableOpacity onPress={() => setMonth(m => m === 12 ? 1 : m + 1)} style={dp.arrow}>
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* اليوم */}
          <View style={dp.row}>
            <TouchableOpacity onPress={() => setDay(d => d <= 1 ? daysInMonth : d - 1)} style={dp.arrow}>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
            <Text style={[dp.val, { color: colors.textPrimary }]}>{clampedDay}</Text>
            <TouchableOpacity onPress={() => setDay(d => d >= daysInMonth ? 1 : d + 1)} style={dp.arrow}>
              <Ionicons name="chevron-back" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={dp.btns}>
            <TouchableOpacity onPress={onClose} style={[dp.btn, { borderColor: colors.border }]}>
              <Text style={[dp.btnTxt, { color: colors.textMuted }]}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirm} style={[dp.btn, dp.btnPrimary, { backgroundColor: colors.primary }]}>
              <Text style={[dp.btnTxt, { color: '#fff' }]}>تأكيد</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dp = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
  card:     { width: 280, borderRadius: 20, padding: 20, borderWidth: 1, gap: 12 },
  title:    { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  row:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrow:    { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  val:      { fontSize: 18, fontWeight: '800', minWidth: 120, textAlign: 'center' },
  btns:     { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn:      { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  btnPrimary:{ borderWidth: 0 },
  btnTxt:   { fontSize: 14, fontWeight: '700' },
});

function PeriodBar({ period, setPeriod, customStart, customEnd, setCustomStart, setCustomEnd, colors }: {
  period:        Period;
  setPeriod:     (p: Period) => void;
  customStart:   string;
  customEnd:     string;
  setCustomStart:(v: string) => void;
  setCustomEnd:  (v: string) => void;
  colors:        any;
}) {
  const [pickerOpen, setPickerOpen] = useState<'start' | 'end' | null>(null);

  return (
    <View style={{ gap: 8, paddingHorizontal: 16, marginBottom: 8 }}>
      {/* الأزرار */}
      <View style={[pb.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {PERIODS.map(p => {
          const active = period === p.key;
          return (
            <TouchableOpacity
              key={p.key}
              style={[pb.tab, active && { backgroundColor: colors.primary }]}
              onPress={() => setPeriod(p.key)}
              activeOpacity={0.75}
            >
              <Text style={[pb.txt, { color: active ? '#fff' : colors.textMuted }, active && { fontWeight: '700' }]}>
                {p.short}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Date range للـ custom */}
      {period === 'custom' && (
        <View style={pb.customRow}>
          <TouchableOpacity
            style={[pb.datePill, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setPickerOpen('end')}
          >
            <Ionicons name="calendar-outline" size={13} color={colors.primary} />
            <Text style={[pb.dateTxt, { color: colors.textPrimary }]}>
              {customEnd || 'إلى'}
            </Text>
          </TouchableOpacity>

          <Ionicons name="arrow-back-outline" size={14} color={colors.textMuted} />

          <TouchableOpacity
            style={[pb.datePill, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setPickerOpen('start')}
          >
            <Ionicons name="calendar-outline" size={13} color={colors.primary} />
            <Text style={[pb.dateTxt, { color: colors.textPrimary }]}>
              {customStart || 'من'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <DatePickerModal
        visible={pickerOpen === 'start'}
        value={customStart}
        label="تاريخ البداية"
        onConfirm={setCustomStart}
        onClose={() => setPickerOpen(null)}
        colors={colors}
      />
      <DatePickerModal
        visible={pickerOpen === 'end'}
        value={customEnd}
        label="تاريخ النهاية"
        onConfirm={setCustomEnd}
        onClose={() => setPickerOpen(null)}
        colors={colors}
      />
    </View>
  );
}

const pb = StyleSheet.create({
  row:       { flexDirection: 'row', borderRadius: 12, borderWidth: 1, padding: 3, gap: 2 },
  tab:       { flex: 1, paddingVertical: 7, alignItems: 'center', borderRadius: 9 },
  txt:       { fontSize: 11 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  datePill:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  dateTxt:   { fontSize: 13, fontWeight: '600' },
});

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ data, onSelect, colors }: {
  data:     SummaryData;
  onSelect: (t: ReportType) => void;
  colors:   any;
}) {
  const cards: {
    key:   ReportType;
    icon:  keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    lines: { label: string; value: string; color?: string }[];
  }[] = [
    {
      key:   'production',
      icon:  'layers-outline',
      label: 'الإنتاج',
      color: colors.primary,
      lines: [
        { label: 'نسبة الإنجاز اليوم', value: `${data.production.achievementRate}%`, color: progressColor(data.production.achievementRate) },
        { label: 'الكمية الفعلية',     value: data.production.totalActual.toLocaleString() },
        { label: 'المستهدف',           value: data.production.totalTarget.toLocaleString() },
      ],
    },
    {
      key:   'faults',
      icon:  'warning-outline',
      label: 'الأعطال',
      color: colors.danger,
      lines: [
        { label: 'معلقة',     value: String(data.faults.pending),    color: colors.danger  },
        { label: 'جاري إصلاح',value: String(data.faults.inProgress), color: colors.warning },
        { label: 'محلولة',    value: String(data.faults.resolved),   color: colors.success },
      ],
    },
    {
      key:   'machines',
      icon:  'cog-outline',
      label: 'الماكينات',
      color: colors.success,
      lines: [
        { label: 'شغالة',   value: String(data.machines.running),     color: colors.success },
        { label: 'صيانة',   value: String(data.machines.maintenance), color: colors.warning },
        { label: 'متوقفة',  value: String(data.machines.stopped),     color: colors.danger  },
      ],
    },
  ];

  return (
    <View style={sc.row}>
      {cards.map(c => (
        <TouchableOpacity
          key={c.key}
          style={[sc.card, { backgroundColor: colors.surface, borderColor: c.color + '40' }]}
          onPress={() => onSelect(c.key)}
          activeOpacity={0.8}
        >
          <View style={[sc.iconWrap, { backgroundColor: c.color + '18' }]}>
            <Ionicons name={c.icon} size={20} color={c.color} />
          </View>
          <Text style={[sc.label, { color: colors.textMuted }]}>{c.label}</Text>
          <View style={sc.lines}>
            {c.lines.map(l => (
              <View key={l.label} style={sc.line}>
                <Text style={[sc.lineVal, { color: l.color ?? colors.textPrimary }]}>{l.value}</Text>
                <Text style={[sc.lineLbl, { color: colors.textMuted }]}>{l.label}</Text>
              </View>
            ))}
          </View>
          <View style={[sc.footer, { borderTopColor: colors.border }]}>
            <Text style={[sc.footerTxt, { color: c.color }]}>عرض التقرير</Text>
            <Ionicons name="chevron-back" size={12} color={c.color} />
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const sc = StyleSheet.create({
  row:      { flexDirection: 'row-reverse', gap: 8, padding: 16 },
  card:     { flex: 1, borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  iconWrap: { margin: 12, width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  label:    { fontSize: 11, fontWeight: '600', textAlign: 'right', paddingHorizontal: 12, marginBottom: 8 },
  lines:    { paddingHorizontal: 12, gap: 6, marginBottom: 10 },
  line:     { alignItems: 'flex-end', gap: 1 },
  lineVal:  { fontSize: 16, fontWeight: '900', lineHeight: 18 },
  lineLbl:  { fontSize: 9 },
  footer:   { borderTopWidth: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 3, paddingHorizontal: 12, paddingVertical: 8 },
  footerTxt:{ fontSize: 10, fontWeight: '700' },
});

// ─── Production Section ───────────────────────────────────────────────────────

function ProductionSection({ data, colors }: { data: any; colors: any }) {
  const rate  = Math.round(data.achievementRate ?? 0);
  const color = progressColor(rate);

  return (
    <View style={{ gap: 10 }}>
      {/* بطاقة الإجمالي */}
      <View style={[card.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={card.head}>
          <View style={[card.iconWrap, { backgroundColor: colors.primary + '18' }]}>
            <Ionicons name="layers" size={16} color={colors.primary} />
          </View>
          <Text style={[card.title, { color: colors.textPrimary }]}>أداء الإنتاج</Text>
        </View>

        {/* دائرة نسبة الإنجاز */}
        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
          <View style={[prod.circle, { borderColor: color + '55', backgroundColor: colors.background }]}>
            <Ionicons name="speedometer-outline" size={18} color={color} style={{ marginBottom: 2 }} />
            <Text style={[prod.circleNum, { color }]}>{rate}%</Text>
            <Text style={[prod.circleLbl, { color: colors.textMuted }]}>الإنجاز</Text>
          </View>
        </View>

        <AnimBar value={data.totalActual} total={data.totalTarget} color={color} h={6} colors={colors} />

        <View style={prod.statsRow}>
          {[
            { label: 'المستهدف', value: (data.totalTarget ?? 0).toLocaleString(), color: colors.primary },
            { label: 'الفعلي',   value: (data.totalActual  ?? 0).toLocaleString(), color: colors.success },
            { label: 'المرفوض',  value: (data.totalRejected ?? 0).toLocaleString(), color: colors.danger  },
          ].map(s => (
            <View key={s.label} style={[prod.stat, { backgroundColor: colors.background, borderColor: s.color + '30' }]}>
              <Text style={[prod.statNum, { color: s.color }]}>{s.value}</Text>
              <Text style={[prod.statLbl, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* التفصيل اليومي */}
      {data.dailyBreakdown?.length > 0 && (
        <View style={[card.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={card.head}>
            <View style={[card.iconWrap, { backgroundColor: colors.textMuted + '18' }]}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            </View>
            <Text style={[card.title, { color: colors.textPrimary }]}>التفصيل اليومي</Text>
          </View>
          {data.dailyBreakdown
            .filter((d: any) => d.target > 0 || d.actual > 0)
            .map((d: any, i: number) => {
              const r  = d.target > 0 ? Math.round((d.actual / d.target) * 100) : 0;
              const c  = progressColor(r);
              return (
                <View key={i} style={[day.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  {/* تاريخ + نسبة — واضحة وكبيرة */}
                  <View style={day.right}>
                    <Text style={[day.date, { color: colors.textMuted }]}>{fmtDate(d.date)}</Text>
                    <Text style={[day.rate, { color: c }]}>{r}%</Text>
                  </View>

                  {/* شريط رقيق + أرقام كبيرة */}
                  <View style={day.mid}>
                    <AnimBar value={d.actual} total={d.target} color={c} h={3} colors={colors} />
                    <View style={day.nums}>
                      <Text style={[day.numSub, { color: colors.textMuted }]}>/{d.target.toLocaleString()}</Text>
                      <Text style={[day.numMain, { color: c }]}>{d.actual.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
        </View>
      )}

      {/* المواد الخام */}
      {data.rawMaterialsUsed?.length > 0 && (
        <View style={[card.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={card.head}>
            <View style={[card.iconWrap, { backgroundColor: colors.success + '18' }]}>
              <Ionicons name="leaf-outline" size={16} color={colors.success} />
            </View>
            <Text style={[card.title, { color: colors.textPrimary }]}>المواد الخام المستهلكة</Text>
          </View>
          {data.rawMaterialsUsed.map((m: any, i: number) => {
            const total = data.rawMaterialsUsed.reduce((s: number, x: any) => s + x.totalQuantity, 0);
            return (
              <View key={i} style={[rm.row, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={rm.right}>
                  <Text style={[rm.name, { color: colors.textPrimary }]}>{m.name}</Text>
                  <Text style={[rm.unit, { color: colors.textMuted }]}>{m.unit}</Text>
                </View>
                <View style={rm.left}>
                  <AnimBar value={m.totalQuantity} total={total} color={colors.success} h={4} colors={colors} />
                  <Text style={[rm.qty, { color: colors.success }]}>{m.totalQuantity.toLocaleString()}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const prod = StyleSheet.create({
  circle:    { width: 110, height: 110, borderRadius: 55, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  circleNum: { fontSize: 26, fontWeight: '900', lineHeight: 28 },
  circleLbl: { fontSize: 10, marginTop: 2 },
  statsRow:  { flexDirection: 'row-reverse', gap: 6, marginTop: 8 },
  stat:      { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 8, alignItems: 'center', gap: 3 },
  statNum:   { fontSize: 14, fontWeight: '800' },
  statLbl:   { fontSize: 9 },
});

const day = StyleSheet.create({
  row:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 12, paddingVertical: 10 },
  right:   { alignItems: 'center', minWidth: 44 },
  date:    { fontSize: 10 },
  rate:    { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  mid:     { flex: 1, gap: 6 },
  nums:    { flexDirection: 'row-reverse', alignItems: 'baseline', gap: 3 },
  numMain: { fontSize: 20, fontWeight: '900' },
  numSub:  { fontSize: 12 },
});

const rm = StyleSheet.create({
  row:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8 },
  right: { width: 60, alignItems: 'flex-end' },
  name:  { fontSize: 12, fontWeight: '700' },
  unit:  { fontSize: 10 },
  left:  { flex: 1, gap: 4 },
  qty:   { fontSize: 11, fontWeight: '700', textAlign: 'left' },
});

// ─── Machines Section ─────────────────────────────────────────────────────────

function MachinesSection({ data, colors }: { data: any; colors: any }) {
  return (
    <View style={{ gap: 10 }}>
      {/* ملخص عام */}
      <View style={[mach.summary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[
          { icon: 'speedometer-outline' as const, color: colors.success, label: 'متوسط التوفر',   value: `${data.avgAvailability ?? 0}%`      },
          { icon: 'warning-outline'     as const, color: colors.danger,  label: 'إجمالي الأعطال', value: String(data.totalFaults ?? 0)          },
          { icon: 'timer-outline'       as const, color: colors.warning, label: 'متوسط الإصلاح',  value: fmtTime(data.avgResolutionTime ?? 0)  },
        ].map(s => (
          <View key={s.label} style={mach.sumItem}>
            <View style={[mach.sumIcon, { backgroundColor: s.color + '18' }]}>
              <Ionicons name={s.icon} size={18} color={s.color} />
            </View>
            <Text style={[mach.sumVal, { color: s.color }]}>{s.value}</Text>
            <Text style={[mach.sumLbl, { color: colors.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* كارد لكل ماكينة */}
      {data.machines?.map((m: any) => {
        const avail = m.availabilityPct ?? 0;
        const color = rateColor(avail, colors);
        return (
          <View key={m.machineId} style={[card.wrap, { backgroundColor: colors.surface, borderColor: color + '40' }]}>
            {/* هيدر */}
            <View style={mach.cardHead}>
              <View style={[mach.statusDot, { backgroundColor:
                m.currentStatus === 'running' ? colors.success :
                m.currentStatus === 'maintenance' ? colors.warning : colors.danger
              }]} />
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={[mach.machName, { color: colors.textPrimary }]}>{m.machineName}</Text>
                <Text style={[mach.dept, { color: colors.textMuted }]}>
                  {m.department} · {m.currentStatusLabel}
                </Text>
              </View>
              {avail !== null && (
                <View style={[mach.availBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
                  <Text style={[mach.availNum, { color }]}>{avail}%</Text>
                  <Text style={[mach.availLbl, { color }]}>التوفر</Text>
                </View>
              )}
            </View>

            {/* شريط التوفر */}
            <AnimBar value={m.runningMinutes} total={m.runningMinutes + m.downtimeMinutes} color={color} h={6} colors={colors} />

            {/* الإحصائيات */}
            <View style={[mach.stats, { borderTopColor: colors.border }]}>
              {[
                { icon: 'play-circle-outline'  as const, c: colors.success, label: 'مرات التشغيل',   v: String(m.startCount)    },
                { icon: 'stop-circle-outline'  as const, c: colors.danger,  label: 'مرات الإيقاف',   v: String(m.stopCount)     },
                { icon: 'warning-outline'      as const, c: colors.warning, label: 'أعطال الفترة',   v: String(m.faultCount)    },
                { icon: 'checkmark-circle-outline' as const, c: colors.success, label: 'محلولة', v: String(m.resolvedFaults ?? 0) },
              ].map(s => (
                <View key={s.label} style={mach.statItem}>
                  <View style={[mach.statIcon, { backgroundColor: s.c + '15' }]}>
                    <Ionicons name={s.icon} size={13} color={s.c} />
                  </View>
                  <Text style={[mach.statVal, { color: s.c }]}>{s.v}</Text>
                  <Text style={[mach.statLbl2, { color: colors.textMuted }]}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* آخر عطل */}
            {m.lastFaultAt && (
              <View style={[mach.lastFault, { backgroundColor: colors.warning + '12', borderColor: colors.warning + '30' }]}>
                <Text style={[mach.lastFaultTxt, { color: colors.textPrimary }]} numberOfLines={1}>
                  {m.lastFaultDesc}
                </Text>
                <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 4, marginTop: 3 }}>
                  <Ionicons name="time-outline" size={11} color={colors.warning} />
                  <Text style={[mach.lastFaultDate, { color: colors.warning }]}>آخر عطل: {m.lastFaultAt}</Text>
                </View>
              </View>
            )}

            {/* متوسط الإصلاح */}
            {m.avgResolutionMin != null && (
              <View style={[mach.resRow, { borderTopColor: colors.border }]}>
                <Text style={[mach.resVal, { color: colors.primary }]}>{fmtTime(m.avgResolutionMin)}</Text>
                <Text style={[mach.resLbl, { color: colors.textMuted }]}>متوسط وقت الإصلاح</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const mach = StyleSheet.create({
  summary:    { flexDirection: 'row-reverse', borderRadius: 16, borderWidth: 1, padding: 12, gap: 8, marginBottom: 2 },
  sumItem:    { flex: 1, alignItems: 'center', gap: 4 },
  sumIcon:    { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  sumVal:     { fontSize: 16, fontWeight: '900' },
  sumLbl:     { fontSize: 9, textAlign: 'center' },
  cardHead:   { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 6 },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  machName:   { fontSize: 14, fontWeight: '800' },
  dept:       { fontSize: 11, marginTop: 1 },
  availBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, gap: 1 },
  availNum:   { fontSize: 15, fontWeight: '900', lineHeight: 17 },
  availLbl:   { fontSize: 9, fontWeight: '600' },
  stats:      { flexDirection: 'row-reverse', borderTopWidth: 1, paddingTop: 10, gap: 4 },
  statItem:   { flex: 1, alignItems: 'center', gap: 3 },
  statIcon:   { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  statVal:    { fontSize: 14, fontWeight: '800' },
  statLbl2:   { fontSize: 9, textAlign: 'center' },
  lastFault:  { borderRadius: 10, borderWidth: 1, padding: 10, marginTop: 8 },
  lastFaultTxt:  { fontSize: 12, fontWeight: '600', textAlign: 'right' },
  lastFaultDate: { fontSize: 10, fontWeight: '600' },
  resRow:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  resVal:     { fontSize: 13, fontWeight: '800' },
  resLbl:     { fontSize: 11 },
});

// ─── Faults Section ───────────────────────────────────────────────────────────

function FaultsSection({ data, colors }: { data: any; colors: any }) {
  return (
    <View style={{ gap: 10 }}>
      {/* ملخص */}
      <View style={[card.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={card.head}>
          <View style={[card.iconWrap, { backgroundColor: colors.danger + '18' }]}>
            <Ionicons name="warning" size={16} color={colors.danger} />
          </View>
          <Text style={[card.title, { color: colors.textPrimary }]}>ملخص الأعطال</Text>
        </View>
        <View style={fault.summRow}>
          {[
            { label: 'الإجمالي',      value: data.totalFaults,              color: colors.textPrimary },
            { label: 'معلقة',         value: data.byStatus?.pending ?? 0,   color: colors.danger      },
            { label: 'جاري الإصلاح', value: data.byStatus?.in_progress ?? 0, color: colors.warning   },
            { label: 'محلولة',        value: data.byStatus?.resolved ?? 0,  color: colors.success     },
          ].map(s => (
            <View key={s.label} style={[fault.summItem, { backgroundColor: colors.background }]}>
              <Text style={[fault.summVal, { color: s.color }]}>{s.value}</Text>
              <Text style={[fault.summLbl, { color: colors.textMuted }]}>{s.label}</Text>
            </View>
          ))}
        </View>
        <View style={[fault.avgRow, { borderTopColor: colors.border }]}>
          <Ionicons name="timer-outline" size={14} color={colors.primary} />
          <Text style={[fault.avgVal, { color: colors.primary }]}>{fmtTime(data.avgResolutionTimeMinutes)}</Text>
          <Text style={[fault.avgLbl, { color: colors.textMuted }]}>متوسط وقت الإصلاح</Text>
        </View>
      </View>

      {/* أكثر الماكينات أعطالاً */}
      {data.mostFrequentFaults?.length > 0 && (
        <View style={[card.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={card.head}>
            <View style={[card.iconWrap, { backgroundColor: colors.warning + '18' }]}>
              <Ionicons name="podium-outline" size={16} color={colors.warning} />
            </View>
            <Text style={[card.title, { color: colors.textPrimary }]}>أكثر الماكينات أعطالاً</Text>
          </View>
          {data.mostFrequentFaults.map((f: any, i: number) => {
            const rankColors = [colors.danger, colors.warning, colors.primary, colors.textMuted, colors.textMuted];
            const c = rankColors[i] ?? colors.textMuted;
            return (
              <View key={i} style={[fault.rankRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[fault.rankBadge, { backgroundColor: c + '18' }]}>
                  <Text style={[fault.rankNum, { color: c }]}>#{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <AnimBar value={f.count} total={data.mostFrequentFaults[0]?.count ?? 1} color={c} h={4} colors={colors} />
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[fault.machName, { color: colors.textPrimary }]}>{f.machineName}</Text>
                  <Text style={[fault.machDept, { color: colors.textMuted }]}>{f.department}</Text>
                </View>
                <Text style={[fault.faultCount, { color: c }]}>{f.count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* قائمة الأعطال */}
      {data.faultList?.length > 0 && (
        <View style={[card.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={card.head}>
            <View style={[card.iconWrap, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="list-outline" size={16} color={colors.primary} />
            </View>
            <Text style={[card.title, { color: colors.textPrimary }]}>تفاصيل الأعطال</Text>
          </View>
          {data.faultList.map((f: any, i: number) => {
            const statusColor =
              f.status === 'resolved'    ? colors.success :
              f.status === 'in_progress' ? colors.warning : colors.danger;
            return (
              <View key={f.id} style={[fault.listRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
                <View style={[fault.statusDot, { backgroundColor: statusColor }]} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[fault.listDesc, { color: colors.textPrimary }]} numberOfLines={1}>
                    {f.description}
                  </Text>
                  <Text style={[fault.listMeta, { color: colors.textMuted }]}>
                    {f.machineName} · {f.reportedAt}
                  </Text>
                  {f.resolutionMinutes && (
                    <Text style={[fault.listRes, { color: colors.success }]}>
                      حُل في {fmtTime(f.resolutionMinutes)}
                    </Text>
                  )}
                </View>
                <View style={[fault.statusPill, { backgroundColor: statusColor + '18', borderColor: statusColor + '40' }]}>
                  <Text style={[fault.statusTxt, { color: statusColor }]}>{f.statusLabel}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const fault = StyleSheet.create({
  summRow:    { flexDirection: 'row-reverse', gap: 6, marginTop: 4 },
  summItem:   { flex: 1, alignItems: 'center', borderRadius: 10, paddingVertical: 8, gap: 3 },
  summVal:    { fontSize: 20, fontWeight: '900' },
  summLbl:    { fontSize: 9 },
  avgRow:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderTopWidth: 1, paddingTop: 8, marginTop: 4 },
  avgVal:     { fontSize: 14, fontWeight: '800' },
  avgLbl:     { fontSize: 12 },
  rankRow:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rankBadge:  { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  rankNum:    { fontSize: 12, fontWeight: '800' },
  machName:   { fontSize: 12, fontWeight: '700' },
  machDept:   { fontSize: 10 },
  faultCount: { fontSize: 20, fontWeight: '900', minWidth: 28, textAlign: 'center' },
  listRow:    { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  statusDot:  { width: 7, height: 7, borderRadius: 4, marginTop: 4 },
  listDesc:   { fontSize: 13, fontWeight: '600', textAlign: 'right' },
  listMeta:   { fontSize: 10 },
  listRes:    { fontSize: 10, fontWeight: '600' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  statusTxt:  { fontSize: 10, fontWeight: '700' },
});

// ─── Shared card styles ───────────────────────────────────────────────────────

const card = StyleSheet.create({
  wrap:    { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  head:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  iconWrap:{ width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  title:   { fontSize: 14, fontWeight: '700' },
});

// ─── Tab Labels ───────────────────────────────────────────────────────────────

const TAB_META: Record<ReportType, { label: string; icon: keyof typeof Ionicons.glyphMap; colorKey: 'primary' | 'success' | 'danger' }> = {
  production: { label: 'الإنتاج',   icon: 'layers-outline',  colorKey: 'primary'  },
  machines:   { label: 'الماكينات', icon: 'cog-outline',     colorKey: 'success'  },
  faults:     { label: 'الأعطال',   icon: 'warning-outline', colorKey: 'danger'   },
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ReportsScreen() {
  const insets     = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { show: showDialog, dialog } = useDialog();

  const [view,        setView]        = useState<'summary' | ReportType>('summary');
  const [period,      setPeriod]      = useState<Period>('daily');
  const [customStart, setCustomStart] = useState('');
  const [customEnd,   setCustomEnd]   = useState('');

  const [summary,    setSummary]    = useState<SummaryData | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading,    setLoading]    = useState(true);
  const [exporting,  setExporting]  = useState(false);

  const [toast,     setToast]     = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>('success');

  const showToast = (msg: string, type: ToastType) => {
    setToastType(type); setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const periodParams = useCallback((): PeriodParams => {
    if (period === 'custom') {
      return { period: 'custom', start_date: customStart, end_date: customEnd };
    }
    return { period };
  }, [period, customStart, customEnd]);

  // ── تحميل ملخص الـ 3 كروت ──
  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const s = await reportService.getSummary();
      setSummary(s);
    } catch {
      showDialog('error', 'خطأ', 'تعذر تحميل ملخص التقارير');
    } finally {
      setLoading(false);
    }
  }, []);

  // ── تحميل تقرير تفصيلي ──
  const loadReport = useCallback(async (type: ReportType) => {
    if (period === 'custom' && (!customStart || !customEnd)) return;
    setLoading(true);
    setReportData(null);
    try {
      const p = periodParams();
      const d = type === 'production' ? await reportService.getProduction(p)
              : type === 'machines'   ? await reportService.getMachines(p)
              :                         await reportService.getFaults(p);
      setReportData(d);
    } catch {
      showDialog('error', 'خطأ', 'تعذر تحميل التقرير');
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, periodParams]);

  useEffect(() => {
    if (view === 'summary') loadSummary();
    else                    loadReport(view as ReportType);
  }, [view, period, customStart, customEnd]);

  const handleExport = async () => {
    if (view === 'summary') return;
    setExporting(true);
    try {
      await reportService.exportWord({ type: view as ReportType, periodParams: periodParams() });
      showToast('تم تصدير التقرير بنجاح', 'success');
    } catch (e: any) {
      showDialog('error', 'خطأ في التصدير', e?.message ?? 'فشل تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };

  const tabColor = view === 'summary' ? colors.primary
    : colors[TAB_META[view as ReportType].colorKey];

  return (
    <View style={[s.root, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" />

      <AppHeader
        title="التقارير"
        subtitle={new Date().toLocaleDateString('ar-EG', { weekday: 'long', month: 'long', day: 'numeric' })}
        left={
          view !== 'summary' ? (
            <TouchableOpacity
              style={[s.exportBtn, { backgroundColor: tabColor + '18', borderColor: tabColor + '40' }]}
              onPress={handleExport}
              disabled={exporting}
              activeOpacity={0.75}
            >
              {exporting
                ? <ActivityIndicator size={13} color={tabColor} />
                : <>
                    <Ionicons name="document-text-outline" size={14} color={tabColor} />
                    <Text style={[s.exportTxt, { color: tabColor }]}>Word</Text>
                  </>
              }
            </TouchableOpacity>
          ) : undefined
        }
      />

      {/* Tabs */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* زر ملخص */}
       {(([{ key: 'summary', label: 'الملخص', icon: 'grid-outline', colorKey: 'primary' },
   ...Object.entries(TAB_META).map(([k, v]) => ({ key: k, ...v }))]) as any[]).map(t => {
  const active = view === t.key;
  const tColor = (colors as any)[t.colorKey] ?? colors.primary; 
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, active && { borderBottomColor: tColor, borderBottomWidth: 2 }]}
              onPress={() => { setView(t.key as any); setReportData(null); }}
              activeOpacity={0.7}
            >
              <View style={[s.tabIcon, active && { backgroundColor: tColor + '18' }]}>
                <Ionicons name={t.icon} size={15} color={active ? tColor : colors.textMuted} />
              </View>
              <Text style={[s.tabTxt, { color: active ? tColor : colors.textMuted }, active && { fontWeight: '700' }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Period bar — يظهر فقط في التفصيل */}
      {view !== 'summary' && (
        <PeriodBar
          period={period}
          setPeriod={p => { setPeriod(p); }}
          customStart={customStart}
          customEnd={customEnd}
          setCustomStart={setCustomStart}
          setCustomEnd={setCustomEnd}
          colors={colors}
        />
      )}

      {/* Content */}
      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator size="large" color={tabColor} />
        </View>
      ) : view === 'summary' && summary ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <SummaryCards
            data={summary}
            onSelect={t => { setView(t); setReportData(null); }}
            colors={colors}
          />
        </ScrollView>
      ) : reportData ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>
          {view === 'production' && <ProductionSection data={reportData} colors={colors} />}
          {view === 'machines'   && <MachinesSection   data={reportData} colors={colors} />}
          {view === 'faults'     && <FaultsSection     data={reportData} colors={colors} />}
          <View style={{ height: 100 }} />
        </ScrollView>
      ) : null}

      <Toast message={toast} type={toastType} colors={colors} />
      {dialog}
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  loader:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll:    { padding: 16 },
  exportBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  exportTxt: { fontSize: 12, fontWeight: '700' },
  tabRow:    { flexDirection: 'row-reverse', borderBottomWidth: 1 },
  tab:       { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabIcon:   { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tabTxt:    { fontSize: 10 },
});