import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  Image, Dimensions,
} from 'react-native';
import { faultService } from '../../services/faultService';
import FaultCard from '../../components/ui/FaultCard';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { shiftService } from '../../services/shiftService';
import { machineService } from '../../services/machineService';
import { useAuth } from '../../hooks/useAuth';
import { useAppTheme } from '../../context/ThemeContext';
import { useWebSocket } from '../../hooks/useWebSocket';
import AppHeader, { HeaderBtn } from '../../components/ui/AppHeader';
import Theme from '../../constants/theme';
import type { Fault, Machine, FaultStatus, Shift } from '../../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
type ViewLayout = 'grid' | 'list';

const STATUS_CONFIG: Record<FaultStatus, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending:     { label: 'معلقة',        color: '#FF5757', icon: 'time'             },
  in_progress: { label: 'جاري الإصلاح', color: '#FFB100', icon: 'construct'        },
  resolved:    { label: 'تم الإصلاح',   color: '#00D26A', icon: 'checkmark-circle' },
};

const STATUS_FILTERS: { key: FaultStatus | 'all'; label: string }[] = [
  { key: 'resolved',    label: 'تمت الصيانة'  },
  { key: 'in_progress', label: 'تحت الصيانة'  },
  { key: 'pending',     label: 'معلقة'         },
  { key: 'all',         label: 'جميع الأعطال' },
];

function StatPill({ label, count, color, colors }: { label: string; count: number; color: string; colors: any }) {
  return (
    <View style={[pillStyles.wrap, { borderColor: color + '30', backgroundColor: color + '15' }]}>
      <Text style={[pillStyles.count, { color }]}>{count}</Text>
      <Text style={[pillStyles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

const pillStyles = StyleSheet.create({
  wrap:  { flex: 1, alignItems: 'center', paddingVertical: 10, borderWidth: 1, borderRadius: 12 },
  count: { fontSize: 20, fontWeight: 'bold' },
  label: { fontSize: 11, marginTop: 2, fontWeight: '600' },
});

interface ReportModalProps {
  visible: boolean;
  machines: Machine[];
  onClose: () => void;
  onSubmit: (machineId: string, description: string, photoUri: string) => Promise<void>;
}

function ReportFaultModal({ visible, machines, onClose, onSubmit }: ReportModalProps) {
  const { colors } = useAppTheme();
  const [selectedMachine, setSelectedMachine] = useState('');
  const [description,     setDescription]     = useState('');
  const [photoUri,        setPhotoUri]         = useState('');
  const [submitting,      setSubmitting]       = useState(false);

  const reset = () => { setSelectedMachine(''); setDescription(''); setPhotoUri(''); setSubmitting(false); };
  const handleClose = () => { reset(); onClose(); };

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

  const handleSubmit = async () => {
    if (!selectedMachine)                      { Alert.alert('تنبيه', 'يرجى اختيار الماكينة المعطلة'); return; }
    if (description.trim().length < 10)        { Alert.alert('تنبيه', 'يرجى كتابة وصف تفصيلي للعطل (10 أحرف على الأقل)'); return; }
    if (!photoUri)                             { Alert.alert('تنبيه', 'صورة العطل إجبارية لتوضيح المشكلة'); return; }
    setSubmitting(true);
    try {
      await onSubmit(selectedMachine, description.trim(), photoUri);
      reset(); onClose();
    } catch {
      Alert.alert('خطأ', 'فشل رفع العطل، حاول مرة أخرى');
      setSubmitting(false);
    }
  };

  const availableMachines = machines.filter(m => m.status !== 'maintenance');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={[modalStyles.handle, { backgroundColor: colors.border }]} />
          <View style={modalStyles.titleRow}>
            <TouchableOpacity onPress={handleClose} style={[modalStyles.closeBtn, { backgroundColor: colors.background }]}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={[modalStyles.title, { color: colors.textPrimary }]}>تسجيل عطل جديد ⚠️</Text>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[modalStyles.label, { color: colors.textSecondary }]}>اختر الماكينة المتأثرة</Text>
            <View style={modalStyles.machineGrid}>
              {availableMachines.map(m => {
                const isSelected = selectedMachine === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[
                      modalStyles.machineChip,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      isSelected && { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
                    ]}
                    onPress={() => setSelectedMachine(m.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="cube-outline" size={16} color={isSelected ? '#FFFFFF' : colors.textMuted} />
                    <Text style={[
                      modalStyles.machineChipText,
                      { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                      isSelected && { fontWeight: 'bold' },
                    ]}>{m.name}</Text>
                  </TouchableOpacity>
                );
              })}
              {availableMachines.length === 0 && (
                <Text style={[modalStyles.noMachines, { color: colors.textMuted }]}>جميع الماكينات تحت الصيانة حالياً</Text>
              )}
            </View>
            <Text style={[modalStyles.label, { color: colors.textSecondary }]}>تفاصيل العطل المشاهد</Text>
            <TextInput
              style={[modalStyles.textArea, { backgroundColor: colors.background, borderColor: colors.border, color: colors.textPrimary }]}
              value={description} onChangeText={setDescription}
              placeholder="اكتب وصفاً واضحاً ومختصراً للمشكلة..."
              placeholderTextColor={colors.textMuted}
              multiline numberOfLines={4}
              textAlign="right" textAlignVertical="top" maxLength={300}
            />
            <Text style={[modalStyles.charCount, { color: colors.textMuted }]}>{description.length} / 300</Text>
            <Text style={[modalStyles.label, { color: colors.textSecondary }]}>
              صورة توضيحية <Text style={modalStyles.required}>*إلزامي</Text>
            </Text>
            <TouchableOpacity
              style={[modalStyles.photoBtn, { borderColor: 'rgba(255,107,107,0.3)', backgroundColor: colors.background }]}
              onPress={pickPhoto} activeOpacity={0.85}
            >
              {photoUri ? (
                <>
                  <Image source={{ uri: photoUri }} style={modalStyles.photoPreview} />
                  <View style={modalStyles.photoOverlay}>
                    <Ionicons name="camera" size={22} color="#FFFFFF" />
                    <Text style={modalStyles.photoOverlayText}>تغيير الصورة</Text>
                  </View>
                </>
              ) : (
                <View style={modalStyles.photoPlaceholder}>
                  <View style={modalStyles.photoIconWrap}>
                    <Ionicons name="camera-outline" size={26} color="#FF6B6B" />
                  </View>
                  <Text style={[modalStyles.photoPlaceholderTitle, { color: colors.textPrimary }]}>التقط صورة للعطل الآن</Text>
                  <Text style={[modalStyles.photoPlaceholderSub, { color: colors.textMuted }]}>اضغط لفتح الكاميرا أو المعرض</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={[modalStyles.warningBox, { backgroundColor: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' }]}>
              <Ionicons name="alert-circle-outline" size={18} color="#F59E0B" />
              <Text style={modalStyles.warningText}>سيتم تحويل حالة الماكينة تلقائياً إلى "تحت الصيانة" وإشعار فريق الفنيين فوراً.</Text>
            </View>
            <TouchableOpacity
              style={[modalStyles.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit} disabled={submitting} activeOpacity={0.85}
            >
              {submitting
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <><Ionicons name="send-outline" size={18} color="#FFFFFF" /><Text style={modalStyles.submitText}>إرسال البلاغ الآن</Text></>
              }
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  sheet:                 { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: Theme.spacing.lg, paddingTop: Theme.spacing.md, maxHeight: '90%', borderWidth: 1 },
  handle:                { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Theme.spacing.md },
  titleRow:              { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: Theme.spacing.lg },
  title:                 { fontSize: Theme.fontSize.lg, fontWeight: 'bold' },
  closeBtn:              { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  label:                 { fontSize: Theme.fontSize.sm, fontWeight: '700', textAlign: 'right', marginBottom: Theme.spacing.sm },
  required:              { fontSize: Theme.fontSize.xs, color: '#FF6B6B', fontWeight: 'normal' },
  machineGrid:           { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginBottom: Theme.spacing.lg },
  machineChip:           { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: Theme.radius.md, borderWidth: 1 },
  machineChipText:       { fontSize: Theme.fontSize.sm, fontWeight: '600' },
  noMachines:            { fontSize: Theme.fontSize.sm, textAlign: 'right', fontStyle: 'italic' },
  textArea:              { borderRadius: Theme.radius.md, borderWidth: 1, padding: Theme.spacing.md, fontSize: Theme.fontSize.md, minHeight: 100, marginBottom: 4 },
  charCount:             { fontSize: Theme.fontSize.xs, textAlign: 'left', marginBottom: Theme.spacing.md },
  photoBtn:              { borderRadius: Theme.radius.md, overflow: 'hidden', marginBottom: Theme.spacing.md, borderWidth: 1.5, borderStyle: 'dashed' },
  photoPreview:          { width: '100%', height: 160 },
  photoOverlay:          { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', gap: 6 },
  photoOverlayText:      { color: '#FFFFFF', fontSize: Theme.fontSize.sm, fontWeight: 'bold' },
  photoPlaceholder:      { height: 130, justifyContent: 'center', alignItems: 'center', gap: 6 },
  photoIconWrap:         { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,107,107,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  photoPlaceholderTitle: { fontSize: Theme.fontSize.sm, fontWeight: 'bold' },
  photoPlaceholderSub:   { fontSize: Theme.fontSize.xs },
  warningBox:            { flexDirection: 'row-reverse', alignItems: 'flex-start', gap: Theme.spacing.sm, borderRadius: Theme.radius.md, padding: Theme.spacing.md, marginBottom: Theme.spacing.lg, borderWidth: 1 },
  warningText:           { flex: 1, fontSize: Theme.fontSize.xs, color: '#F59E0B', textAlign: 'right', lineHeight: 18 },
  submitBtn:             { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Theme.spacing.sm, backgroundColor: '#FF6B6B', borderRadius: Theme.radius.md, height: 50 },
  submitText:            { fontSize: Theme.fontSize.md, fontWeight: 'bold', color: '#FFFFFF' },
});

export default function FaultsScreen() {
  const { user }   = useAuth();
  const { colors } = useAppTheme();
  const insets     = useSafeAreaInsets();

  const [faults,          setFaults]          = useState<Fault[]>([]);
  const [machines,        setMachines]        = useState<Machine[]>([]);
  const [machineImagesMap, setMachineImagesMap] = useState<Record<string, string>>({});
  const [currentShift,    setCurrentShift]    = useState<Shift | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [statusFilter,    setStatusFilter]    = useState<FaultStatus | 'all'>('all');
  const [layoutMode,      setLayoutMode]      = useState<ViewLayout>('grid');
  const [showModal,       setShowModal]       = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const dept = user?.department ? String(user.department) : undefined;
      const [f, m, shift] = await Promise.all([
        faultService.getAll({ department: dept }),
        machineService.getAll(dept),
        shiftService.getActive(),
      ]);
      setFaults(f);
      setMachines(m);
      setCurrentShift(shift);
      const imgs: Record<string, string> = {};
      m.forEach((machine: Machine) => { if (machine.image) imgs[machine.id] = machine.image; });
      setMachineImagesMap(imgs);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  useWebSocket(user, useCallback((event) => {
    if (event.type === 'fault_created') {
      setFaults(prev => [event.fault, ...prev]);
    }
    if (event.type === 'fault_accepted') {
      setFaults(prev => prev.map(f =>
        f.id === event.faultId ? { ...f, status: 'in_progress', assignedToName: event.technicianName } : f
      ));
    }
    if (event.type === 'fault_resolved') {
      setFaults(prev => prev.map(f =>
        f.id === event.faultId ? { ...f, status: 'resolved', resolvedAt: event.resolvedAt } : f
      ));
      setMachines(prev => prev.map(m =>
        m.id === event.machineId ? { ...m, status: 'running', lastUpdated: event.resolvedAt } : m
      ));
    }
  }, []));

  const handleReportFault = async (machineId: string, description: string, photoUri: string) => {
    if (!currentShift) {
      Alert.alert('تنبيه', 'لا توجد وردية نشطة حالياً، يرجى بدء الوردية أولاً');
      return;
    }
    try {
      const fault = await faultService.create({
        machineId, shiftId: currentShift.id, description, beforePhoto: photoUri,
      });
      setFaults(prev => [fault, ...prev]);
      setMachines(prev => prev.map(m =>
        m.id === machineId ? { ...m, status: 'maintenance', lastUpdated: new Date().toISOString() } : m
      ));
    } catch (e: any) {
      Alert.alert('خطأ ' + (e?.response?.status ?? ''), JSON.stringify(e?.response?.data ?? ''));
    }
  };

  const filtered = faults.filter(f => statusFilter === 'all' || f.status === statusFilter);

  const counts = {
    all:         faults.length,
    pending:     faults.filter(f => f.status === 'pending').length,
    in_progress: faults.filter(f => f.status === 'in_progress').length,
    resolved:    faults.filter(f => f.status === 'resolved').length,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color="#FF5757" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <AppHeader
        title="الأعطال"
        subtitle="إدارة ومتابعة الأعطال"
        right={
          <HeaderBtn
            icon={layoutMode === 'grid' ? 'list-outline' : 'grid-outline'}
            onPress={() => setLayoutMode(m => m === 'grid' ? 'list' : 'grid')}
          />
        }
      />

      <View style={[styles.statsBar, { backgroundColor: colors.background }]}>
        <StatPill label="تحت الصيانة" count={counts.in_progress} color={colors.danger}colors={colors} />
        <StatPill label="تمت الصيانة" count={counts.resolved}    color={colors.warning} colors={colors} />
        <StatPill label="معلقة"        count={counts.pending}     color={colors.success} colors={colors} />
      </View>

      <View style={[styles.filterSectionContainer, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          {STATUS_FILTERS.map(f => {
            const cfg = f.key !== 'all' ? STATUS_CONFIG[f.key] : null;
            const isActive    = statusFilter === f.key;
            const activeColor = cfg?.color ?? colors.primary;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  isActive && { backgroundColor: activeColor + '20', borderColor: activeColor },
                ]}
                onPress={() => setStatusFilter(f.key)}
                activeOpacity={0.8}
              >
                {cfg && <Ionicons name={cfg.icon} size={14} color={isActive ? activeColor : colors.textMuted} />}
                <Text style={[styles.filterChipText, { color: colors.textSecondary }, isActive && { color: activeColor, fontWeight: '700' }]}>
                  {f.label}
                </Text>
                <View style={[styles.countBubble, { backgroundColor: colors.borderLight }, isActive && { backgroundColor: activeColor }]}>
                  <Text style={[styles.countBubbleText, { color: colors.textMuted }, isActive && { color: '#FFFFFF' }]}>
                    {counts[f.key]}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        key={layoutMode}
        data={filtered}
        keyExtractor={f => f.id}
        numColumns={layoutMode === 'grid' ? 2 : 1}
        columnWrapperStyle={layoutMode === 'grid' ? styles.gridColumnWrapper : undefined}
        renderItem={({ item }) => (
          <FaultCard
            fault={item}
            machineImage={machineImagesMap[item.machineId]}
            width={layoutMode === 'grid' ? (SCREEN_WIDTH - 42) / 2 : SCREEN_WIDTH - 32}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF5757" />}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconBox, { backgroundColor: 'rgba(0,210,106,0.1)' }]}>
              <Ionicons name="checkmark-done-circle-outline" size={48} color="#00D26A" />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>لا توجد أعطال مسجلة</Text>
            <Text style={[styles.emptyText,  { color: colors.textMuted }]}>جميع الماكينات تعمل بكفاءة تامة الآن</Text>
          </View>
        }
      />

      <TouchableOpacity
  style={[styles.fab, { backgroundColor: colors.danger }]}
  onPress={() => setShowModal(true)} 
  activeOpacity={0.85}
>
      </TouchableOpacity>

      <ReportFaultModal
        visible={showModal}
        machines={machines}
        onClose={() => setShowModal(false)}
        onSubmit={handleReportFault}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  statsBar:               { flexDirection: 'row-reverse', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  filterSectionContainer: { borderBottomWidth: 1, marginTop: 10 },
  filterRow:              { flexDirection: 'row-reverse', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip:             { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  filterChipText:         { fontSize: 13, fontWeight: '500' },
  countBubble:            { minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5 },
  countBubbleText:        { fontSize: 10, fontWeight: 'bold' },
  gridColumnWrapper:      { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  list:                   { padding: 16, paddingBottom: 100 },
  emptyWrap:              { alignItems: 'center', paddingTop: 90, gap: 8 },
  emptyIconBox:           { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTitle:             { fontSize: 17, fontWeight: 'bold' },
  emptyText:              { fontSize: 13 },
  fab: {
  position: 'absolute', bottom: 220, alignSelf: 'center',
  backgroundColor: '#FF5757',  // ← ثابت هنا
  width: 56, height: 56, borderRadius: 28,
  justifyContent: 'center', alignItems: 'center',
  shadowColor: '#FF5757', shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
},
});