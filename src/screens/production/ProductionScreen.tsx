import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { productionService } from '../../services/productionService';
import Theme from '../../constants/theme';
import type { Production, RawMaterialUsed } from '../../types';
import AppHeader from '../../components/ui/AppHeader';

const today = () => new Date().toISOString().split('T')[0];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ar-EG', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function progressColor(rate: number): string {
  if (rate >= 90) return '#10B981';
  if (rate >= 70) return '#F59E0B';
  return '#EF4444';
}

function ProgressBar({ rate }: { rate: number }) {
  const clamped = Math.min(rate, 100);
  const color   = progressColor(rate);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ height: 10, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 5, overflow: 'hidden' }}>
        <View style={{ height: '100%', borderRadius: 5, width: `${clamped}%`, backgroundColor: color }} />
      </View>
      <Text style={{ fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.bold, textAlign: 'right', color }}>{rate}%</Text>
    </View>
  );
}

function TodayCard({ production, onEdit }: { production: Production; onEdit: () => void }) {
  const { colors } = useAppTheme();
  const rate        = Math.round((production.actualQuantity / production.targetQuantity) * 100);
  const netQuantity = production.actualQuantity - production.rejectedQuantity;
  const color       = progressColor(rate);

  return (
    <View style={[todayStyles.card, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
      <View style={[todayStyles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          style={[todayStyles.editBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={onEdit} activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={15} color={colors.primary} />
          <Text style={[todayStyles.editText, { color: colors.primary }]}>تعديل السجل</Text>
        </TouchableOpacity>
        <View style={todayStyles.headerRight}>
          <Text style={[todayStyles.title, { color: colors.textPrimary }]}>تقرير إنتاج الوردية</Text>
          <Text style={[todayStyles.date, { color: colors.textMuted }]}>{formatDate(production.date)}</Text>
        </View>
      </View>

      <View style={[todayStyles.progressSection, { backgroundColor: colors.background }]}>
        <View style={todayStyles.progressMeta}>
          <View style={[todayStyles.statusIndicator, { backgroundColor: color }]}>
            <Text style={todayStyles.statusIndicatorText}>{rate}% إنجاز</Text>
          </View>
          <Text style={[todayStyles.targetText, { color: colors.textSecondary }]}>
            الهدف المخطط:{' '}
            <Text style={{ fontWeight: Theme.fontWeight.bold, color: colors.textPrimary }}>
              {production.targetQuantity.toLocaleString('ar-EG')}
            </Text>{' '}وحدة
          </Text>
        </View>
        <ProgressBar rate={rate} />
      </View>

      <View style={todayStyles.grid}>
        <StatBox label="الإنتاج الفعلي"  value={production.actualQuantity.toLocaleString('ar-EG')}  unit="وحدة" color={colors.primary}   icon="stats-chart-outline"    colors={colors} />
        <StatBox label="المرفوضات"        value={production.rejectedQuantity.toLocaleString('ar-EG')} unit="وحدة" color={production.rejectedQuantity > 0 ? colors.danger : colors.textSecondary} icon="alert-circle-outline" colors={colors} />
        <StatBox label="الصافي النهائي"   value={netQuantity.toLocaleString('ar-EG')}                unit="وحدة" color={colors.success}  icon="checkmark-circle-outline" colors={colors} />
      </View>

      {production.rawMaterialsUsed && production.rawMaterialsUsed.length > 0 && (
        <View style={[todayStyles.materialsContainer, { borderTopColor: colors.borderLight }]}>
          <Text style={[todayStyles.materialsTitle, { color: colors.textSecondary }]}>المواد الخام المستهلكة</Text>
          <View style={todayStyles.materialsGrid}>
            {production.rawMaterialsUsed.map((m, i) => (
              <View key={i} style={[todayStyles.materialCard, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
                <Text style={[todayStyles.materialName, { color: colors.textSecondary }]}>{m.name}</Text>
                <Text style={[todayStyles.materialValue, { color: colors.textPrimary }]}>
                  {m.quantity.toLocaleString('ar-EG')}{' '}
                  <Text style={{ color: colors.textMuted }}>{m.unit}</Text>
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

function StatBox({ label, value, unit, color, icon, colors }: {
  label: string; value: string; unit: string; color: string;
  icon: keyof typeof Ionicons.glyphMap; colors: any;
}) {
  return (
    <View style={[todayStyles.statBox, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
      <View style={todayStyles.statHeader}>
        <Text style={[todayStyles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Ionicons name={icon} size={15} color={color} />
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[todayStyles.statValue, { color }]}>{value}</Text>
        <Text style={[todayStyles.statUnit, { color: colors.textMuted }]}>{unit}</Text>
      </View>
    </View>
  );
}

const todayStyles = StyleSheet.create({
  card:             { borderRadius: Theme.radius.lg, padding: Theme.spacing.lg, borderWidth: 1, ...Theme.shadow.md, marginBottom: Theme.spacing.md },
  header:           { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: Theme.spacing.md, paddingBottom: Theme.spacing.sm, borderBottomWidth: 1 },
  headerRight:      { alignItems: 'flex-end', gap: 2 },
  title:            { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold },
  date:             { fontSize: Theme.fontSize.xs },
  editBtn:          { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: Theme.spacing.md, paddingVertical: 6, borderRadius: Theme.radius.md, borderWidth: 1 },
  editText:         { fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.semiBold },
  progressSection:  { borderRadius: Theme.radius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.md, gap: Theme.spacing.sm },
  progressMeta:     { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  targetText:       { fontSize: Theme.fontSize.xs },
  statusIndicator:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Theme.radius.sm },
  statusIndicatorText: { fontSize: 10, fontWeight: Theme.fontWeight.bold, color: '#FFFFFF' },
  grid:             { flexDirection: 'row-reverse', gap: Theme.spacing.sm, marginBottom: Theme.spacing.md },
  statBox:          { flex: 1, borderRadius: Theme.radius.md, padding: Theme.spacing.sm, borderWidth: 1, justifyContent: 'space-between', minHeight: 76 },
  statHeader:       { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center' },
  statLabel:        { fontSize: 10, fontWeight: Theme.fontWeight.medium },
  statValue:        { fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.bold },
  statUnit:         { fontSize: 9, fontWeight: Theme.fontWeight.regular },
  materialsContainer: { borderTopWidth: 1, paddingTop: Theme.spacing.md, gap: Theme.spacing.sm },
  materialsTitle:   { fontSize: Theme.fontSize.xs, fontWeight: Theme.fontWeight.semiBold, textAlign: 'right' },
  materialsGrid:    { flexDirection: 'row-reverse', gap: Theme.spacing.sm },
  materialCard:     { flex: 1, padding: Theme.spacing.sm, borderRadius: Theme.radius.md, borderWidth: 1, alignItems: 'flex-end', gap: 2 },
  materialName:     { fontSize: Theme.fontSize.xs },
  materialValue:    { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.bold },
});

function HistoryCard({ production }: { production: Production }) {
  const { colors } = useAppTheme();
  const rate  = Math.round((production.actualQuantity / production.targetQuantity) * 100);
  const color = progressColor(rate);
  return (
    <View style={[histStyles.wrap, { backgroundColor: colors.surface }]}>
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[histStyles.date, { color: colors.textPrimary }]}>{formatDate(production.date)}</Text>
        <ProgressBar rate={rate} />
      </View>
      <View style={{ alignItems: 'flex-end', minWidth: 70 }}>
        <Text style={[histStyles.rate, { color }]}>{rate}%</Text>
        <Text style={[histStyles.qty, { color: colors.textSecondary }]}>{production.actualQuantity.toLocaleString('ar-EG')} وحدة</Text>
        {production.rejectedQuantity > 0 && (
          <Text style={[histStyles.rejected, { color: colors.danger }]}>{production.rejectedQuantity} مرفوض</Text>
        )}
      </View>
    </View>
  );
}

const histStyles = StyleSheet.create({
  wrap:     { flexDirection: 'row-reverse', alignItems: 'center', gap: Theme.spacing.md, borderRadius: Theme.radius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.sm, ...Theme.shadow.sm },
  date:     { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semiBold, textAlign: 'right' },
  rate:     { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold },
  qty:      { fontSize: Theme.fontSize.xs },
  rejected: { fontSize: Theme.fontSize.xs },
});

interface EntryModalProps {
  visible: boolean;
  existing: Production | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  department: string;
  supervisorId: string;
  shiftId: string | number;
}

const DEFAULT_MATERIALS: RawMaterialUsed[] = [
  { name: 'دقيق', quantity: 0, unit: 'شوال' },
  { name: 'سكر',  quantity: 0, unit: 'شوال' },
  { name: 'زبدة', quantity: 0, unit: 'شوال' },
];

function EntryModal({ visible, existing, onClose, onSave, department, supervisorId, shiftId }: EntryModalProps) {
  const { colors } = useAppTheme();
  const isEdit = !!existing;

  const [target,    setTarget]    = useState('');
  const [actual,    setActual]    = useState('');
  const [rejected,  setRejected]  = useState('');
  const [materials, setMaterials] = useState<RawMaterialUsed[]>(DEFAULT_MATERIALS);
  const [photoUri,  setPhotoUri]  = useState('');
  const [saving,    setSaving]    = useState(false);

  useEffect(() => {
    if (existing) {
      setTarget(String(existing.targetQuantity));
      setActual(String(existing.actualQuantity));
      setRejected(String(existing.rejectedQuantity));
      setMaterials(existing.rawMaterialsUsed?.length ? existing.rawMaterialsUsed : DEFAULT_MATERIALS);
      setPhotoUri(existing.photoUrl ?? '');
    } else {
      setTarget(''); setActual(''); setRejected('0');
      setMaterials(DEFAULT_MATERIALS); setPhotoUri('');
    }
    setSaving(false);
  }, [existing, visible]);

  const updateMaterial = (index: number, qty: string) =>
    setMaterials(prev => prev.map((m, i) => i === index ? { ...m, quantity: Number(qty) || 0 } : m));

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      const galleryPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!galleryPerm.granted) { Alert.alert('تنبيه', 'يرجى السماح بالوصول للكاميرا أو المعرض'); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.7 });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

const validate = (): string | null => {
  if (!target || Number(target) <= 0)    return 'أدخل الكمية المستهدفة';
  if (!actual || Number(actual) < 0)     return 'أدخل الكمية الفعلية';
  if (Number(rejected) > Number(actual)) return 'الكمية المرفوضة لا تتجاوز الفعلية';
  if (!shiftId)                          return 'يرجى التأكد من وجود وردية نشطة';
  return null;
};

  const handleSave = async () => {
    const err = validate();
    if (err) { Alert.alert('تنبيه', err); return; }
    setSaving(true);
    try {
      await onSave({
        department,
        date: today(),
        targetQuantity:   Number(target),
        actualQuantity:   Number(actual),
        rejectedQuantity: Number(rejected) || 0,
        rawMaterialsUsed: materials.filter(m => m.quantity > 0),
        photoUrl:         photoUri || '',
        supervisorId:     Number(supervisorId) || supervisorId,
        shift:            Number(shiftId),
      });
      onClose();
    } catch (e: any) {
      Alert.alert('خطأ ' + (e?.response?.status || ''), JSON.stringify(e?.response?.data ?? e?.message));
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <View style={[entryStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[entryStyles.handle, { backgroundColor: colors.border }]} />

          <View style={entryStyles.titleRow}>
            <TouchableOpacity
              style={[entryStyles.closeBtn, { backgroundColor: colors.background }]}
              onPress={onClose} activeOpacity={0.8}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[entryStyles.title, { color: colors.textPrimary }]}>
              {isEdit ? 'تعديل بيانات الإنتاج' : 'إدخال إنتاج اليوم'}
            </Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[entryStyles.sectionTitle, { color: colors.textSecondary }]}>الكميات</Text>
            <NumField label="الكمية المستهدفة" value={target}   onChange={setTarget}   icon="flag-outline"         placeholder="مثال: 5000" colors={colors} />
            <NumField label="الكمية الفعلية"   value={actual}   onChange={setActual}   icon="layers-outline"       placeholder="مثال: 4500" colors={colors} />
            <NumField label="الكمية المرفوضة"  value={rejected} onChange={setRejected} icon="close-circle-outline" placeholder="0"          colors={colors} optional />

            {actual && target ? (
              <View style={[entryStyles.preview, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
                <ProgressBar rate={Math.round((Number(actual) / Number(target)) * 100)} />
                <Text style={[entryStyles.previewLabel, { color: colors.textMuted }]}>
                  معدل الإنجاز: {Math.round((Number(actual) / Number(target)) * 100)}%
                </Text>
              </View>
            ) : null}

            <Text style={[entryStyles.sectionTitle, { color: colors.textSecondary }]}>المواد الخام المستخدمة</Text>
            {materials.map((m, i) => (
              <View key={i} style={entryStyles.materialRow}>
                <TextInput
                  style={[entryStyles.materialInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
                  value={m.quantity > 0 ? String(m.quantity) : ''}
                  onChangeText={v => updateMaterial(i, v)}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  textAlign="right"
                />
                <Text style={[entryStyles.materialUnit, { color: colors.textMuted }]}>{m.unit}</Text>
                <Text style={[entryStyles.materialName, { color: colors.textPrimary }]}>{m.name}</Text>
                <Ionicons name="leaf-outline" size={16} color={colors.success} />
              </View>
            ))}

            <View style={entryStyles.sectionTitleWrap}>
              <Text style={[entryStyles.optionalTag, { color: colors.textMuted, backgroundColor: colors.borderLight }]}>اختياري</Text>
              <Text style={[entryStyles.sectionTitle, { color: colors.textSecondary }]}>صورة الإنتاج</Text>
            </View>

            <TouchableOpacity
              style={[entryStyles.photoBtn, { borderColor: colors.border }]}
              onPress={pickPhoto} activeOpacity={0.85}
            >
              {photoUri ? (
                <>
                  <Image source={{ uri: photoUri }} style={entryStyles.photoPreview} />
                  <View style={entryStyles.photoOverlay}>
                    <Ionicons name="camera" size={20} color="#FFFFFF" />
                    <Text style={entryStyles.photoOverlayText}>تغيير الصورة</Text>
                  </View>
                </>
              ) : (
                <View style={[entryStyles.photoPlaceholder, { backgroundColor: colors.background }]}>
                  <View style={[entryStyles.photoIconWrap, { backgroundColor: colors.primary + '15' }]}>
                    <Ionicons name="camera-outline" size={28} color={colors.primary} />
                  </View>
                  <Text style={[entryStyles.photoPlaceholderTitle, { color: colors.textPrimary }]}>التقط صورة للإنتاج (اختياري)</Text>
                  <Text style={[entryStyles.photoPlaceholderSub, { color: colors.textMuted }]}>اضغط للكاميرا أو المعرض</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[entryStyles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving} activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />
                  <Text style={entryStyles.saveBtnText}>{isEdit ? 'حفظ التعديلات' : 'حفظ بيانات الإنتاج'}</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function NumField({ label, value, onChange, icon, placeholder, optional, colors }: {
  label: string; value: string; onChange: (v: string) => void;
  icon: keyof typeof Ionicons.glyphMap; placeholder: string; optional?: boolean; colors: any;
}) {
  return (
    <View style={{ marginBottom: Theme.spacing.md }}>
      <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: Theme.spacing.sm, marginBottom: 6 }}>
        {optional && (
          <Text style={[entryStyles.optionalTag, { color: colors.textMuted, backgroundColor: colors.borderLight }]}>اختياري</Text>
        )}
        <Text style={{ fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.medium, color: colors.textSecondary }}>{label}</Text>
      </View>
      <View style={[entryStyles.fieldInput, { backgroundColor: colors.background, borderColor: colors.border }]}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} style={{ paddingHorizontal: 4 }} />
        <TextInput
          style={[entryStyles.input, { color: colors.textPrimary }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          textAlign="right"
        />
      </View>
    </View>
  );
}

const entryStyles = StyleSheet.create({
  sheet:            { borderTopLeftRadius: Theme.radius.xl, borderTopRightRadius: Theme.radius.xl, paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.sm, maxHeight: '92%' },
  handle:           { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Theme.spacing.md },
  titleRow:         { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.lg },
  title:            { fontSize: Theme.fontSize.xl, fontWeight: Theme.fontWeight.bold },
  closeBtn:         { width: 36, height: 36, borderRadius: Theme.radius.full, justifyContent: 'center', alignItems: 'center' },
  sectionTitleWrap: { flexDirection: 'row-reverse', alignItems: 'center', gap: Theme.spacing.sm, marginTop: Theme.spacing.md, marginBottom: Theme.spacing.sm },
  sectionTitle:     { fontSize: Theme.fontSize.md, fontWeight: Theme.fontWeight.semiBold, textAlign: 'right' },
  optionalTag:      { fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: Theme.radius.full },
  fieldInput:       { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: Theme.radius.md, borderWidth: 1.5, height: 50, paddingHorizontal: Theme.spacing.sm },
  input:            { flex: 1, fontSize: Theme.fontSize.lg, height: '100%' },
  preview:          { borderRadius: Theme.radius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.md, gap: 6, borderWidth: 1 },
  previewLabel:     { fontSize: Theme.fontSize.xs, textAlign: 'right' },
  materialRow:      { flexDirection: 'row-reverse', alignItems: 'center', gap: Theme.spacing.sm, marginBottom: Theme.spacing.sm },
  materialName:     { flex: 1, fontSize: Theme.fontSize.md, textAlign: 'right' },
  materialUnit:     { fontSize: Theme.fontSize.sm, width: 30, textAlign: 'right' },
  materialInput:    { width: 80, borderRadius: Theme.radius.md, borderWidth: 1.5, paddingHorizontal: Theme.spacing.sm, height: 44, fontSize: Theme.fontSize.md, textAlign: 'right' },
  photoBtn:         { borderRadius: Theme.radius.md, overflow: 'hidden', marginBottom: Theme.spacing.md, borderWidth: 1.5, borderStyle: 'dashed' },
  photoPreview:     { width: '100%', height: 180 },
  photoOverlay:     { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', gap: 6 },
  photoOverlayText: { color: '#FFFFFF', fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semiBold },
  photoPlaceholder: { height: 120, justifyContent: 'center', alignItems: 'center', gap: 6 },
  photoIconWrap:    { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  photoPlaceholderTitle: { fontSize: Theme.fontSize.sm, fontWeight: Theme.fontWeight.semiBold },
  photoPlaceholderSub:   { fontSize: Theme.fontSize.xs },
  saveBtn:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Theme.spacing.sm, borderRadius: Theme.radius.md, height: 52, marginTop: Theme.spacing.lg, ...Theme.shadow.sm },
  saveBtnText:      { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.bold, color: '#FFFFFF' },
});

export default function ProductionScreen() {
  const { user, activeShift: currentShift } = useAuth();
  const { colors } = useAppTheme();
  const insets     = useSafeAreaInsets();

  const [todayProd,  setTodayProd]  = useState<Production | null>(null);
  const [history,    setHistory]    = useState<Production[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState<Production | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const dept = user?.department;
      const [tp, hist] = await Promise.all([
        productionService.getToday(dept),
        productionService.getAll({ department: dept }),
      ]);
      setTodayProd(tp);
      setHistory(
        hist
          .filter((p: Production) => p.date !== today())
          .sort((a: Production, b: Production) => new Date(b.date).getTime() - new Date(a.date).getTime())
      );
    } catch (e) {
     
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const handleSave = useCallback(async (data: any) => {
    const targetShiftId = currentShift?.id;
    if (!targetShiftId) {
      Alert.alert('تنبيه', 'لا توجد وردية نشطة حالياً، يرجى بدء الوردية أولاً');
      return;
    }
    try {
      const payload = { ...data, shift: Number(targetShiftId) };
      if (editTarget) {
        const updated = await productionService.update(editTarget.id, payload);
        setTodayProd(updated);
      } else {
        const created = await productionService.create(payload);
        setTodayProd(created);
      }
      setEditTarget(null);
      setShowModal(false);
    } catch (e: any) {
      Alert.alert('خطأ ' + (e?.response?.status || ''), JSON.stringify(e?.response?.data ?? e?.message));
      throw e;
    }
  }, [editTarget, currentShift]);

  const openCreate = () => {
    if (!currentShift?.id) {
      Alert.alert('تنبيه', 'لا يمكن تسجيل الإنتاج لعدم وجود وردية نشطة حالياً');
      return;
    }
    setEditTarget(null);
    setShowModal(true);
  };

  if (loading) {
    return (
      <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[{ flex: 1 }, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <AppHeader
        title="الإنتاج"
        subtitle={user?.department ? `القسم: ${user.department}` : undefined}
        left={
          !todayProd ? (
            <TouchableOpacity
              style={[styles.addBtnHeader, { backgroundColor: colors.success }]}
              onPress={openCreate} activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.addBtnTextHeader}>إدخال اليوم</Text>
            </TouchableOpacity>
          ) : undefined
        }
      />

      <ScrollView
        contentContainerStyle={{ padding: Theme.spacing.md }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {todayProd ? (
          <TodayCard production={todayProd} onEdit={() => { setEditTarget(todayProd); setShowModal(true); }} />
        ) : (
          <TouchableOpacity
            style={[styles.emptyToday, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}
            onPress={openCreate} activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={40} color={colors.primary} />
            <Text style={[styles.emptyTodayTitle, { color: colors.textPrimary }]}>لم يُدخل إنتاج اليوم بعد</Text>
            <Text style={[styles.emptyTodayText,  { color: colors.textMuted }]}>اضغط لإدخال بيانات إنتاج اليوم</Text>
          </TouchableOpacity>
        )}

        {history.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>السجل السابق</Text>
              <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{history.length} يوم</Text>
            </View>
            {history.map((p: Production) => <HistoryCard key={p.id} production={p} />)}
          </>
        )}

        <View style={{ height: Theme.spacing.xl }} />
      </ScrollView>

      <EntryModal
        visible={showModal}
        existing={editTarget}
        onClose={() => { setShowModal(false); setEditTarget(null); }}
        onSave={handleSave}
        department={user?.department ?? ''}
        supervisorId={user?.id ?? ''}
        shiftId={currentShift?.id || ''}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  addBtnHeader:    { flexDirection: 'row-reverse', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Theme.radius.md },
  addBtnTextHeader:{ fontSize: Theme.fontSize.xs, fontWeight: 'bold', color: '#FFFFFF' },
  emptyToday:      { borderRadius: Theme.radius.lg, padding: Theme.spacing.xl, alignItems: 'center', gap: Theme.spacing.sm, borderWidth: 2, borderStyle: 'dashed', ...Theme.shadow.sm },
  emptyTodayTitle: { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.semiBold },
  emptyTodayText:  { fontSize: Theme.fontSize.sm },
  sectionHeader:   { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginTop: Theme.spacing.xl, marginBottom: Theme.spacing.md },
  sectionTitle:    { fontSize: Theme.fontSize.lg, fontWeight: Theme.fontWeight.semiBold },
  sectionCount:    { fontSize: Theme.fontSize.sm },
});