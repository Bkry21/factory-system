import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
  RefreshControl, KeyboardAvoidingView, Platform,
  I18nManager, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme }  from '../context/ThemeContext';
import { useAuth }      from '../hooks/useAuth';
import AppHeader, { HeaderBtn } from '../components/ui/AppHeader';
import api              from '../services/api';

I18nManager.forceRTL(true);

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
}

interface Machine {
  id: number;
  name: string;
  machine_type: string;
  machine_type_display?: string;
  department: string;
  department_display?: string;
  status: string;
  image?: string;
}

type Tab = 'users' | 'machines';

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = [
  { label: 'مدير المصنع',  value: 'factory_manager' },
  { label: 'مشرف تشغيل',  value: 'supervisor' },
  { label: 'فني صيانة',    value: 'maintenance_technician' },
];

const MACHINE_TYPES = [
  { label: 'عجانة',        value: 'mixer' },
  { label: 'فرن ',         value: 'oven' },
  { label: '1 تغليف ',     value: 'packaging_1' },
  { label: '2 تغليف ',     value: 'packaging_2' },
  { label: '3 تغليف ',     value: 'packaging_3' },
  { label: '4 تغليف ',     value: 'packaging_4' },
  { label: '5 تغليف ',     value: 'packaging_5' },
  { label: '6 تغليف ',     value: 'packaging_6' },
];

const DEPARTMENTS = [
  { label: 'البسكويت',     value: 'biscuits' },
];

const STATUS_MAP: Record<string, { label: string; icon: any }> = {
  running:     { label: 'شغالة',  icon: 'play-circle' },
  stopped:     { label: 'متوقفة', icon: 'stop-circle' },
  maintenance: { label: 'صيانة',  icon: 'construct' },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { colors } = useAppTheme();
  const { logout } = useAuth();

  const [activeTab,   setActiveTab]   = useState<Tab>('machines');
  const [users,       setUsers]       = useState<User[]>([]);
  const [machines,    setMachines]    = useState<Machine[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [refreshing,  setRefreshing]  = useState(false);

  const [userModal,    setUserModal]    = useState<{ open: boolean; mode: 'add'|'edit'; data?: User }>({ open: false, mode: 'add' });
  const [machineModal, setMachineModal] = useState<{ open: boolean; mode: 'add'|'edit'; data?: Machine }>({ open: false, mode: 'add' });
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; msg: string; onOk: () => void }>({ open: false, msg: '', onOk: () => {} });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, m] = await Promise.all([
        api.get('/auth/users/'),
        api.get('/machines/'),
      ]);
      setUsers(u.data);
      setMachines(m.data);
    } catch {
      Alert.alert('خطأ', 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const confirm = (msg: string, onOk: () => void) =>
    setConfirmModal({ open: true, msg, onOk });

  const deleteUser = async (id: number) => {
    try {
      await api.delete(`/auth/users/${id}/`);
      setUsers(p => p.filter(u => u.id !== id));
    } catch { Alert.alert('خطأ', 'فشل حذف المستخدم'); }
  };

  const deleteMachine = async (id: number) => {
    try {
      await api.delete(`/machines/${id}/`);
      setMachines(p => p.filter(m => m.id !== id));
    } catch { Alert.alert('خطأ', 'فشل حذف الماكينة'); }
  };

  const s = makeStyles(colors);

  return (
    <SafeAreaView style={[s.root, { backgroundColor: colors.background }]} edges={['top']}>

      <AppHeader
        title="لوحة التحكم"
        subtitle="إدارة النظام"
        right={
          <HeaderBtn
            icon="log-out-outline"
            color={colors.danger}
            bg={colors.danger + '18'}
            onPress={() => Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'خروج', style: 'destructive', onPress: logout },
            ])}
          />
        }
      />

      {/* ── Tabs ── */}
      <View style={s.tabs}>
        {/* المستخدمون على اليسار */}
        <TabBtn
          label="المستخدمون"
          icon="people-outline"
          count={users.length}
          active={activeTab === 'users'}
          color="#6C63FF"
          onPress={() => setActiveTab('users')}
          colors={colors}
        />
        {/* الماكينات على اليمين */}
        <TabBtn
          label="الماكينات"
          icon="cog-outline"
          count={machines.length}
          active={activeTab === 'machines'}
          color="#48C9B0"
          onPress={() => setActiveTab('machines')}
          colors={colors}
        />
      </View>

      {/* ── Content ── */}
      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Add Button */}
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.primary }]}
            onPress={() =>
              activeTab === 'users'
                ? setUserModal({ open: true, mode: 'add' })
                : setMachineModal({ open: true, mode: 'add' })
            }
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={s.addBtnText}>
              {activeTab === 'users' ? 'مستخدم جديد' : 'ماكينة جديدة'}
            </Text>
          </TouchableOpacity>

          {activeTab === 'users'
            ? users.length === 0
              ? <Empty msg="لا يوجد مستخدمون" colors={colors} />
              : users.map(u => (
                  <UserCard
                    key={u.id} user={u} colors={colors}
                    onEdit={() => setUserModal({ open: true, mode: 'edit', data: u })}
                    onDelete={() => confirm(`حذف "${u.username}"؟`, () => deleteUser(u.id))}
                  />
                ))
            : machines.length === 0
              ? <Empty msg="لا توجد ماكينات" colors={colors} />
              : machines.map(m => (
                  <MachineCard
                    key={m.id} machine={m} colors={colors}
                    onEdit={() => setMachineModal({ open: true, mode: 'edit', data: m })}
                    onDelete={() => confirm(`حذف "${m.name}"؟`, () => deleteMachine(m.id))}
                    onImageUpdated={(img: string) => setMachines(p => p.map(x => x.id === m.id ? { ...x, image: img } : x))}
                  />
                ))
          }
        </ScrollView>
      )}

      {/* ── Modals ── */}
      <UserFormModal
        visible={userModal.open}
        mode={userModal.mode}
        initial={userModal.data}
        colors={colors}
        onClose={() => setUserModal({ open: false, mode: 'add' })}
        onSaved={(u: User) => {
          setUsers(p => userModal.mode === 'add' ? [u, ...p] : p.map(x => x.id === u.id ? u : x));
          setUserModal({ open: false, mode: 'add' });
        }}
      />

      <MachineFormModal
        visible={machineModal.open}
        mode={machineModal.mode}
        initial={machineModal.data}
        colors={colors}
        onClose={() => setMachineModal({ open: false, mode: 'add' })}
        onSaved={(m: Machine) => {
          setMachines(p => machineModal.mode === 'add' ? [m, ...p] : p.map(x => x.id === m.id ? m : x));
          setMachineModal({ open: false, mode: 'add' });
        }}
      />

      <ConfirmModal
        visible={confirmModal.open}
        msg={confirmModal.msg}
        colors={colors}
        onConfirm={() => { confirmModal.onOk(); setConfirmModal({ open: false, msg: '', onOk: () => {} }); }}
        onCancel={() => setConfirmModal({ open: false, msg: '', onOk: () => {} })}
      />
    </SafeAreaView>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────
function TabBtn({ label, icon, count, active, onPress, color, colors }: any) {
  return (
    <TouchableOpacity
      style={[tabS.btn, { backgroundColor: active ? color + '18' : colors.surface, borderColor: active ? color + '55' : colors.border }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={active ? color : colors.textMuted} />
      <Text style={[tabS.txt, { color: active ? color : colors.textMuted }]}>{label}</Text>
      <View style={[tabS.badge, { backgroundColor: active ? color : colors.border }]}>
        <Text style={[tabS.badgeTxt, { color: active ? '#fff' : colors.textMuted }]}>{count}</Text>
      </View>
    </TouchableOpacity>
  );
}
const tabS = StyleSheet.create({
  btn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 14, borderWidth: 1 },
  txt:      { fontSize: 14, fontWeight: '700' },
  badge:    { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, fontWeight: '800' },
});

// ─── User Card ────────────────────────────────────────────────────────────────
function UserCard({ user, onEdit, onDelete, colors }: any) {
  const roleLabel = ROLES.find(r => r.value === user.role)?.label ?? user.role;
  const initials  = ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')) || user.username[0].toUpperCase();
  const fullName  = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
  const isActive  = user.is_active !== false;

  const roleColors: Record<string, string> = {
    factory_manager:        '#6C63FF',
    supervisor:             '#48C9B0',
    maintenance_technician: '#F5A623',
  };
  const rColor = roleColors[user.role ?? ''] ?? colors.primary;

  return (
    <View style={[cardS.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* ROW: Status (أقصى اليمين) | Info (وسط) | Avatar (أقصى اليسار) */}
      <View style={cardS.row}>
        {/* Status - أقصى اليمين */}
        <View style={[cardS.statusBadge, { backgroundColor: (isActive ? colors.success : colors.danger) + '18', borderColor: (isActive ? colors.success : colors.danger) + '44' }]}>
          <View style={[cardS.statusDot, { backgroundColor: isActive ? colors.success : colors.danger }]} />
          <Text style={[cardS.statusTxt, { color: isActive ? colors.success : colors.danger }]}>
            {isActive ? 'نشط' : 'غير نشط'}
          </Text>
        </View>

        {/* Info - وسط */}
        <View style={cardS.info}>
          <Text style={[cardS.name, { color: colors.textPrimary }]}>{fullName}</Text>
          <Text style={[cardS.sub, { color: colors.textMuted }]}>@{user.username}</Text>
          {user.email ? <Text style={[cardS.sub, { color: colors.textMuted }]}>{user.email}</Text> : null}
        </View>

        {/* Avatar - أقصى اليسار */}
        <View style={[cardS.avatar, { backgroundColor: rColor + '22' }]}>
          <Text style={[cardS.avatarTxt, { color: rColor }]}>{initials}</Text>
        </View>
      </View>

      {/* Role Pill - تحت على اليسار */}
      {roleLabel ? (
        <View style={[cardS.rolePill, { backgroundColor: rColor + '18', borderColor: rColor + '33' }]}>
          <Ionicons name="shield-checkmark-outline" size={12} color={rColor} />
          <Text style={[cardS.roleTxt, { color: rColor }]}>{roleLabel}</Text>
        </View>
      ) : null}

      {/* Actions - تعديل على اليمين، حذف على اليسار */}
      <View style={cardS.actions}>
        {/* تعديل أول (يمين) */}
        <TouchableOpacity style={[cardS.btnEdit, { borderColor: colors.primary + '55' }]} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={14} color={colors.primary} />
          <Text style={[cardS.btnEditTxt, { color: colors.primary }]}>تعديل</Text>
        </TouchableOpacity>
        {/* حذف ثاني (يسار) */}
        <TouchableOpacity style={[cardS.btnDel, { backgroundColor: colors.danger + '12', borderColor: colors.danger + '33' }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color={colors.danger} />
          <Text style={[cardS.btnDelTxt, { color: colors.danger }]}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Machine Card ─────────────────────────────────────────────────────────────
function MachineCard({ machine, onEdit, onDelete, onImageUpdated, colors }: any) {
  const [uploading, setUploading] = useState(false);
  const st = STATUS_MAP[machine.status] ?? { label: machine.status, icon: 'help-circle' };

  const statusColors: Record<string, string> = {
    running:     colors.success,
    stopped:     colors.danger,
    maintenance: colors.warning,
  };
  const sColor = statusColors[machine.status] ?? colors.textMuted;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('تنبيه', 'يرجى السماح بالوصول للمعرض'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.7, base64: true });
    if (result.canceled || !result.assets[0].base64) return;
    setUploading(true);
    try {
      const b64 = `data:image/jpeg;base64,${result.assets[0].base64}`;
      await api.patch(`/machines/${machine.id}/`, { image: b64 });
      onImageUpdated(b64);
    } catch { Alert.alert('خطأ', 'فشل رفع الصورة'); }
    finally { setUploading(false); }
  };

  return (
    <View style={[cardS.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* ROW: Status (أقصى اليمين) | Info (وسط) | Image (أقصى اليسار) */}
      <View style={cardS.row}>
        {/* Status - أقصى اليمين */}
        <View style={[cardS.statusBadge, { backgroundColor: sColor + '18', borderColor: sColor + '44' }]}>
          <Ionicons name={st.icon} size={12} color={sColor} />
          <Text style={[cardS.statusTxt, { color: sColor }]}>{st.label}</Text>
        </View>

        {/* Info - وسط */}
        <View style={cardS.info}>
          <Text style={[cardS.name, { color: colors.textPrimary }]}>{machine.name}</Text>
          <Text style={[cardS.sub, { color: colors.textMuted }]}>
            {machine.machine_type_display ?? machine.machine_type}
          </Text>
          <Text style={[cardS.sub, { color: colors.textMuted }]}>
            {machine.department_display ?? machine.department}
          </Text>
        </View>

        {/* Image - أقصى اليسار */}
        <TouchableOpacity onPress={pickImage} style={[cardS.machineImgWrap, { borderColor: sColor + '55', backgroundColor: sColor + '12' }]}>
          {uploading ? (
            <ActivityIndicator size="small" color={sColor} />
          ) : machine.image ? (
            <Image source={{ uri: machine.image }} style={cardS.machineImg} />
          ) : (
            <View style={cardS.machineImgPlaceholder}>
              <Ionicons name="camera-outline" size={20} color={sColor} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Actions - تعديل أول (يمين)، حذف ثاني (يسار) */}
      <View style={cardS.actions}>
        <TouchableOpacity style={[cardS.btnEdit, { borderColor: colors.primary + '55' }]} onPress={onEdit}>
          <Ionicons name="pencil-outline" size={14} color={colors.primary} />
          <Text style={[cardS.btnEditTxt, { color: colors.primary }]}>تعديل</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[cardS.btnDel, { backgroundColor: colors.danger + '12', borderColor: colors.danger + '33' }]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={14} color={colors.danger} />
          <Text style={[cardS.btnDelTxt, { color: colors.danger }]}>حذف</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const cardS = StyleSheet.create({
  wrap:               { marginHorizontal: 16, marginBottom: 10, borderRadius: 18, padding: 14, borderWidth: 1 },
  row:                { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:             { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:          { fontWeight: '800', fontSize: 18 },
  info:               { flex: 1, alignItems: 'flex-end' },
  name:               { fontSize: 15, fontWeight: '700', textAlign: 'right' },
  sub:                { fontSize: 12, textAlign: 'right', marginTop: 2 },
  statusBadge:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusDot:          { width: 6, height: 6, borderRadius: 3 },
  statusTxt:          { fontSize: 11, fontWeight: '700' },
  rolePill:           { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
  roleTxt:            { fontSize: 12, fontWeight: '600' },
  machineImgWrap:     { width: 56, height: 56, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  machineImg:         { width: 56, height: 56 },
  machineImgPlaceholder: { alignItems: 'center', justifyContent: 'center', flex: 1 },
  actions:            { flexDirection: 'row', justifyContent: 'flex-start', gap: 8, marginTop: 12 },
  btnEdit:            { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  btnEditTxt:         { fontSize: 13, fontWeight: '600' },
  btnDel:             { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  btnDelTxt:          { fontSize: 13, fontWeight: '600' },
});

// ─── User Form Modal ──────────────────────────────────────────────────────────
function UserFormModal({ visible, mode, initial, onClose, onSaved, colors }: any) {
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', password: '', role: '' });
  const [saving, setSaving] = useState(false);
  const [roleDrop, setRoleDrop] = useState(false);

  useEffect(() => {
    if (visible) setForm({
      username: initial?.username ?? '', email: initial?.email ?? '',
      first_name: initial?.first_name ?? '', last_name: initial?.last_name ?? '',
      password: '', role: initial?.role ?? '',
    });
  }, [visible, initial]);

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.username.trim()) return Alert.alert('تنبيه', 'اسم المستخدم مطلوب');
    if (mode === 'add' && !form.password.trim()) return Alert.alert('تنبيه', 'كلمة المرور مطلوبة');
    setSaving(true);
    try {
      const payload: any = { username: form.username, email: form.email, first_name: form.first_name, last_name: form.last_name, role: form.role };
      if (form.password) payload.password = form.password;
      const { data } = mode === 'add'
        ? await api.post('/auth/users/', payload)
        : await api.patch(`/auth/users/${initial!.id}/`, payload);
      onSaved(data);
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data ? JSON.stringify(e.response.data) : 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  const s = sheetStyles(colors);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          {/* Header: عنوان يمين، X يسار */}
          <View style={s.sheetHead}>
            <Text style={[s.sheetTitle, { color: colors.textPrimary }]}>
              {mode === 'add' ? 'مستخدم جديد' : 'تعديل المستخدم'}
            </Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Field label="اسم المستخدم *" value={form.username} onChangeText={f('username')} placeholder="username" autoCapitalize="none" colors={colors} />
            <Field label={mode === 'add' ? 'كلمة المرور *' : 'كلمة مرور جديدة'} value={form.password} onChangeText={f('password')} placeholder="••••••••" secureTextEntry colors={colors} />

            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>الدور</Text>
            <TouchableOpacity style={[s.dropBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setRoleDrop(v => !v)}>
              <Text style={[form.role ? s.dropText : s.dropPlaceholder, { color: form.role ? colors.textPrimary : colors.textMuted }]}>
                {ROLES.find(r => r.value === form.role)?.label ?? 'اختر الدور...'}
              </Text>
              <Ionicons name={roleDrop ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {roleDrop && (
              <View style={[s.dropList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {ROLES.map(r => (
                  <TouchableOpacity key={r.value}
                    style={[s.dropItem, { borderBottomColor: colors.border }, form.role === r.value && { backgroundColor: colors.primary + '18' }]}
                    onPress={() => { setForm(p => ({ ...p, role: r.value })); setRoleDrop(false); }}>
                    <Text style={[s.dropItemTxt, { color: form.role === r.value ? colors.primary : colors.textPrimary }]}>{r.label}</Text>
                    {form.role === r.value && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>{mode === 'add' ? 'إضافة' : 'حفظ'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Machine Form Modal ───────────────────────────────────────────────────────
function MachineFormModal({ visible, mode, initial, onClose, onSaved, colors }: any) {
  const [form, setForm] = useState({ name: '', machine_type: '', department: '' });
  const [saving, setSaving] = useState(false);
  const [typeDrop, setTypeDrop] = useState(false);
  const [deptDrop, setDeptDrop] = useState(false);

  useEffect(() => {
    if (visible) setForm({ name: initial?.name ?? '', machine_type: initial?.machine_type ?? '', department: initial?.department ?? '' });
  }, [visible, initial]);

  const save = async () => {
    if (!form.name.trim()) return Alert.alert('تنبيه', 'اسم الماكينة مطلوب');
    setSaving(true);
    try {
      const { data } = mode === 'add'
        ? await api.post('/machines/', form)
        : await api.patch(`/machines/${initial!.id}/`, form);
      onSaved(data);
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data ? JSON.stringify(e.response.data) : 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  const s = sheetStyles(colors);
  const selType = MACHINE_TYPES.find(t => t.value === form.machine_type);
  const selDept = DEPARTMENTS.find(d => d.value === form.department);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          {/* Header: عنوان يمين، X يسار */}
          <View style={s.sheetHead}>
            <Text style={[s.sheetTitle, { color: colors.textPrimary }]}>
              {mode === 'add' ? 'ماكينة جديدة' : 'تعديل الماكينة'}
            </Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Field label="اسم الماكينة *" value={form.name} onChangeText={(v: string) => setForm(p => ({ ...p, name: v }))} placeholder="مثال: تغليف 1" colors={colors} />

            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>نوع الماكينة</Text>
            <TouchableOpacity style={[s.dropBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setTypeDrop(v => !v)}>
              <Text style={{ flex: 1, fontSize: 14, color: selType ? colors.textPrimary : colors.textMuted, textAlign: 'right' }}>
                {selType?.label ?? 'اختر النوع...'}
              </Text>
              <Ionicons name={typeDrop ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {typeDrop && (
              <View style={[s.dropList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {MACHINE_TYPES.map(t => (
                  <TouchableOpacity key={t.value}
                    style={[s.dropItem, { borderBottomColor: colors.border }, form.machine_type === t.value && { backgroundColor: colors.primary + '18' }]}
                    onPress={() => { setForm(p => ({ ...p, machine_type: t.value })); setTypeDrop(false); }}>
                    <Text style={[s.dropItemTxt, { color: form.machine_type === t.value ? colors.primary : colors.textPrimary }]}>{t.label}</Text>
                    {form.machine_type === t.value && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[s.fieldLabel, { color: colors.textMuted }]}>القسم</Text>
            <TouchableOpacity style={[s.dropBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setDeptDrop(v => !v)}>
              <Text style={{ flex: 1, fontSize: 14, color: selDept ? colors.textPrimary : colors.textMuted, textAlign: 'right' }}>
                {selDept?.label ?? 'اختر القسم...'}
              </Text>
              <Ionicons name={deptDrop ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
            </TouchableOpacity>
            {deptDrop && (
              <View style={[s.dropList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {DEPARTMENTS.map(d => (
                  <TouchableOpacity key={d.value}
                    style={[s.dropItem, { borderBottomColor: colors.border }, form.department === d.value && { backgroundColor: colors.primary + '18' }]}
                    onPress={() => { setForm(p => ({ ...p, department: d.value })); setDeptDrop(false); }}>
                    <Text style={[s.dropItemTxt, { color: form.department === d.value ? colors.primary : colors.textPrimary }]}>{d.label}</Text>
                    {form.department === d.value && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TouchableOpacity style={[s.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.saveBtnTxt}>{mode === 'add' ? 'إضافة' : 'حفظ'}</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ visible, msg, onConfirm, onCancel, colors }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={[confS.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
        <View style={[confS.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[confS.iconWrap, { backgroundColor: colors.danger + '18' }]}>
            <Ionicons name="warning" size={28} color={colors.danger} />
          </View>
          <Text style={[confS.msg, { color: colors.textPrimary }]}>{msg}</Text>
          <View style={confS.btns}>
            <TouchableOpacity style={[confS.cancel, { borderColor: colors.border }]} onPress={onCancel}>
              <Text style={[confS.cancelTxt, { color: colors.textMuted }]}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[confS.del, { backgroundColor: colors.danger }]} onPress={onConfirm}>
              <Text style={confS.delTxt}>حذف</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const confS = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'center', padding: 32 },
  box:       { borderRadius: 22, padding: 28, alignItems: 'center', borderWidth: 1 },
  iconWrap:  { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  msg:       { fontSize: 16, textAlign: 'center', lineHeight: 26, marginBottom: 24 },
  btns:      { flexDirection: 'row', gap: 12, width: '100%' },
  cancel:    { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelTxt: { fontWeight: '700' },
  del:       { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  delTxt:    { color: '#fff', fontWeight: '800' },
});

// ─── Shared Field ─────────────────────────────────────────────────────────────
function Field({ label, colors, ...props }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 6, textAlign: 'right' }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.textPrimary }}
        placeholderTextColor={colors.textMuted}
        textAlign="right"
        {...props}
      />
    </View>
  );
}

function Empty({ msg, colors }: any) {
  return (
    <View style={{ paddingVertical: 60, alignItems: 'center', gap: 12 }}>
      <Ionicons name="folder-open-outline" size={44} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, fontSize: 14 }}>{msg}</Text>
    </View>
  );
}

// ─── Sheet Styles ─────────────────────────────────────────────────────────────
function sheetStyles(colors: any) {
  return StyleSheet.create({
    overlay:         { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    sheet:           { backgroundColor: colors.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 20, maxHeight: '92%' },
    handle:          { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
    // عنوان يمين، X يسار
    sheetHead:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    sheetTitle:      { fontSize: 18, fontWeight: '800' },
    closeBtn:        { padding: 4 },
    fieldLabel:      { fontSize: 13, marginBottom: 6, textAlign: 'right' },
    // السهم على اليمين، النص على اليسار
    dropBtn:         { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4 },
    dropText:        { flex: 1, fontSize: 14, textAlign: 'right' },
    dropPlaceholder: { flex: 1, fontSize: 14, textAlign: 'right' },
    dropList:        { borderRadius: 12, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
    // النص يمين، checkmark يسار
    dropItem:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
    dropItemTxt:     { fontSize: 14, textAlign: 'right' },
    saveBtn:         { borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, marginBottom: 20 },
    saveBtnTxt:      { color: '#fff', fontWeight: '800', fontSize: 15 },
  });
}

// ─── Main Styles ──────────────────────────────────────────────────────────────
function makeStyles(colors: any) {
  return StyleSheet.create({
    root:       { flex: 1 },
    tabs:       { flexDirection: 'row', marginHorizontal: 16, gap: 10, marginBottom: 14 },
    addBtn:     { alignSelf: 'flex-start', marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  });
}