import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
  RefreshControl, KeyboardAvoidingView, Platform,
  I18nManager, Image, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';

I18nManager.forceRTL(true);
const { width: SW } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface User {
  id: number; username: string; email?: string;
  first_name?: string; last_name?: string; role?: string; is_active?: boolean;
}
interface Machine {
  id: number; name: string; machine_type: string; machine_type_display?: string;
  department: string; department_display?: string; status: string; image?: string;
}
type Tab = 'machines' | 'users';

// ─── Constants ────────────────────────────────────────────────────────────────
const ROLES = [
  { label: 'مدير المصنع',  value: 'factory_manager' },
  { label: 'مشرف تشغيل',  value: 'supervisor' },
  { label: 'فني صيانة',   value: 'maintenance_technician' },
  { label: 'مشغل ماكينة', value: 'machine_operator' },
];
const MACHINE_TYPES = [
  { label: 'عجانة',    value: 'mixer' },       { label: 'فرن',       value: 'oven' },
  { label: '1 تغليف',  value: 'packaging_1' }, { label: '2 تغليف',  value: 'packaging_2' },
  { label: '3 تغليف',  value: 'packaging_3' }, { label: '4 تغليف',  value: 'packaging_4' },
  { label: '5 تغليف',  value: 'packaging_5' }, { label: '6 تغليف',  value: 'packaging_6' },
];
const DEPARTMENTS = [{ label: 'البسكويت', value: 'biscuits' }];

const S_CFG: Record<string, { label: string; icon: any; c: string }> = {
  running:     { label: 'شغّالة', icon: 'ellipse',   c: '#22C55E' },
  stopped:     { label: 'متوقفة', icon: 'stop',      c: '#EF4444' },
  maintenance: { label: 'صيانة',  icon: 'construct', c: '#F59E0B' },
};
const R_CFG: Record<string, { c: string; icon: any }> = {
  factory_manager:        { c: '#8B5CF6', icon: 'star'  },
  supervisor:             { c: '#06B6D4', icon: 'eye'   },
  maintenance_technician: { c: '#F97316', icon: 'build' },
  machine_operator:       { c: '#10B981', icon: 'cog'   },
};

// ─── Palette ──────────────────────────────────────────────────────────────────
const BG     = '#0A0A0F';
const SURF   = '#12121A';
const CARD   = '#1A1A26';
const BORDER = '#FFFFFF10';
const TEXT   = '#E8EAF0';
const MUTED  = '#4A5568';
const ACCENT = '#7C6FE0';

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPanel() {
  const { logout } = useAuth();
  const [tab, setTab]          = useState<Tab>('machines');
  const [users, setUsers]      = useState<User[]>([]);
  const [machines, setMachines]= useState<Machine[]>([]);
  const [loading, setLoading]  = useState(false);
  const [refreshing, setRefresh] = useState(false);

  const [uModal, setUModal] = useState<{ open: boolean; mode: 'add'|'edit'; data?: User }>({ open: false, mode: 'add' });
  const [mModal, setMModal] = useState<{ open: boolean; mode: 'add'|'edit'; data?: Machine }>({ open: false, mode: 'add' });
  const [dialog, setDialog] = useState<{ open: boolean; msg: string; ok: () => void }>({ open: false, msg: '', ok: () => {} });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [u, m] = await Promise.all([api.get('/auth/users/'), api.get('/machines/')]);
      setUsers(u.data); setMachines(m.data);
    } catch { Alert.alert('خطأ', 'فشل تحميل البيانات'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh  = async () => { setRefresh(true); await fetchAll(); setRefresh(false); };
  const askDelete  = (msg: string, ok: () => void) => setDialog({ open: true, msg, ok });
  const delUser    = async (id: number) => { try { await api.delete(`/auth/users/${id}/`);  setUsers(p => p.filter(u => u.id !== id)); } catch { Alert.alert('خطأ', 'فشل الحذف'); }};
  const delMachine = async (id: number) => { try { await api.delete(`/machines/${id}/`);    setMachines(p => p.filter(m => m.id !== id)); } catch { Alert.alert('خطأ', 'فشل الحذف'); }};

  const running = machines.filter(m => m.status === 'running').length;
  const stopped = machines.filter(m => m.status === 'stopped').length;
  const maint   = machines.filter(m => m.status === 'maintenance').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top']}>

      {/* ── Header ── */}
      <LinearGradient colors={['#1C1836', BG]} style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <TouchableOpacity
            style={{ width: 40, height: 40, backgroundColor: '#EF444418', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => Alert.alert('تسجيل الخروج', 'هل أنت متأكد؟', [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'خروج', style: 'destructive', onPress: logout },
            ])}
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 22, fontWeight: '900', color: TEXT }}>لوحة التحكم</Text>
            <Text style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>إدارة المصنع</Text>
          </View>
          <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: ACCENT + '20', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="grid" size={22} color={ACCENT} />
          </View>
        </View>

        {/* Stats Strip */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
          <Pill icon="cog"         label="ماكينة" val={machines.length} c={ACCENT}  />
          <Pill icon="people"      label="مستخدم" val={users.length}    c="#06B6D4" />
          <Pill icon="ellipse"     label="شغالة"  val={running}         c="#22C55E" />
          <Pill icon="stop-circle" label="متوقفة" val={stopped}         c="#EF4444" />
          <Pill icon="construct"   label="صيانة"  val={maint}           c="#F59E0B" />
        </ScrollView>
      </LinearGradient>

      {/* ── Tabs ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', backgroundColor: CARD, borderRadius: 16, padding: 4, gap: 4 }}>
          {(['machines', 'users'] as Tab[]).map(t => {
            const active = tab === t;
            return (
              <TouchableOpacity key={t}
                style={[{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 12 }, active && { backgroundColor: ACCENT }]}
                onPress={() => setTab(t)}
              >
                <Ionicons name={t === 'machines' ? 'cog-outline' : 'people-outline'} size={15} color={active ? '#fff' : MUTED} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: active ? '#fff' : MUTED }}>
                  {t === 'machines' ? 'الماكينات' : 'المستخدمون'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Body ── */}
      {loading
        ? <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={ACCENT} /></View>
        : <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />}
            showsVerticalScrollIndicator={false}
          >
            {tab === 'machines'
              ? machines.length === 0
                ? <Empty label="لا توجد ماكينات" />
                : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                    {machines.map(m => (
                      <MCard key={m.id} machine={m}
                        onEdit={() => setMModal({ open: true, mode: 'edit', data: m })}
                        onDelete={() => askDelete(`حذف "${m.name}"؟`, () => delMachine(m.id))}
                        onImgUpd={(img: string) => setMachines(p => p.map(x => x.id === m.id ? { ...x, image: img } : x))}
                      />
                    ))}
                  </View>
              : users.length === 0
                ? <Empty label="لا يوجد مستخدمون" />
                : users.map(u => (
                    <UCard key={u.id} user={u}
                      onEdit={() => setUModal({ open: true, mode: 'edit', data: u })}
                      onDelete={() => askDelete(`حذف "${u.username}"؟`, () => delUser(u.id))}
                    />
                  ))
            }
          </ScrollView>
      }

      {/* ── FAB ── */}
      <TouchableOpacity
        style={{ position: 'absolute', bottom: 28, right: 20, zIndex: 99 }}
        onPress={() => tab === 'machines' ? setMModal({ open: true, mode: 'add' }) : setUModal({ open: true, mode: 'add' })}
      >
        <LinearGradient colors={[ACCENT, '#A78BFA']} style={{ width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="add" size={30} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Modals ── */}
      <UFormModal
        visible={uModal.open} mode={uModal.mode} init={uModal.data}
        onClose={() => setUModal({ open: false, mode: 'add' })}
        onSaved={(u: User) => {
          setUsers(p => uModal.mode === 'add' ? [u, ...p] : p.map(x => x.id === u.id ? u : x));
          setUModal({ open: false, mode: 'add' });
        }}
      />
      <MFormModal
        visible={mModal.open} mode={mModal.mode} init={mModal.data}
        onClose={() => setMModal({ open: false, mode: 'add' })}
        onSaved={(m: Machine) => {
          setMachines(p => mModal.mode === 'add' ? [m, ...p] : p.map(x => x.id === m.id ? m : x));
          setMModal({ open: false, mode: 'add' });
        }}
      />
      <ConfirmModal
        visible={dialog.open} msg={dialog.msg}
        onOk={() => { dialog.ok(); setDialog({ open: false, msg: '', ok: () => {} }); }}
        onCancel={() => setDialog({ open: false, msg: '', ok: () => {} })}
      />
    </SafeAreaView>
  );
}

// ─── Stat Pill ────────────────────────────────────────────────────────────────
function Pill({ icon, label, val, c }: { icon: any; label: string; val: number; c: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c + '18', borderRadius: 20, borderWidth: 1, borderColor: c + '30', paddingHorizontal: 12, paddingVertical: 8 }}>
      <Ionicons name={icon} size={13} color={c} />
      <Text style={{ fontSize: 15, fontWeight: '800', color: c }}>{val}</Text>
      <Text style={{ fontSize: 11, color: MUTED }}>{label}</Text>
    </View>
  );
}

// ─── Machine Card (2-col grid) ────────────────────────────────────────────────
function MCard({ machine, onEdit, onDelete, onImgUpd }: any) {
  const [uploading, setUploading] = useState(false);
  const cfg = S_CFG[machine.status] ?? { label: machine.status, icon: 'help-circle', c: MUTED };
  const W = (SW - 44) / 2;

  const pick = async () => {
    const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!p.granted) { Alert.alert('تنبيه', 'يرجى السماح بالوصول'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.7, base64: true });
    if (r.canceled || !r.assets[0].base64) return;
    setUploading(true);
    try {
      const b64 = `data:image/jpeg;base64,${r.assets[0].base64}`;
      await api.patch(`/machines/${machine.id}/`, { image: b64 });
      onImgUpd(b64);
    } catch { Alert.alert('خطأ', 'فشل رفع الصورة'); }
    finally { setUploading(false); }
  };

  return (
    <View style={{ width: W, backgroundColor: CARD, borderRadius: 20, borderWidth: 1, borderColor: cfg.c + '35', overflow: 'hidden' }}>
      {/* Status stripe */}
      <View style={{ height: 3, backgroundColor: cfg.c }} />

      {/* Image area */}
      <TouchableOpacity onPress={pick} style={{ height: 88, margin: 10, borderRadius: 14, backgroundColor: cfg.c + '14', alignItems: 'center', justifyContent: 'center' }}>
        {uploading
          ? <ActivityIndicator color={cfg.c} />
          : machine.image
            ? <Image source={{ uri: machine.image }} style={{ width: '100%', height: '100%', borderRadius: 14 }} />
            : <Ionicons name="camera-outline" size={24} color={cfg.c} />
        }
      </TouchableOpacity>

      {/* Info */}
      <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: TEXT, textAlign: 'right' }} numberOfLines={1}>
          {machine.name}
        </Text>
        <Text style={{ fontSize: 11, color: MUTED, textAlign: 'right', marginTop: 2 }} numberOfLines={1}>
          {machine.machine_type_display ?? machine.machine_type}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', backgroundColor: cfg.c + '20', borderRadius: 6, borderWidth: 1, borderColor: cfg.c + '40', paddingHorizontal: 7, paddingVertical: 3, marginTop: 6 }}>
          <Ionicons name={cfg.icon} size={9} color={cfg.c} />
          <Text style={{ fontSize: 10, fontWeight: '700', color: cfg.c }}>{cfg.label}</Text>
        </View>
      </View>

      {/* Footer actions */}
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: BORDER }}>
        <TouchableOpacity style={{ flex: 1, padding: 10, alignItems: 'center' }} onPress={onEdit}>
          <Ionicons name="pencil" size={16} color="#A78BFA" />
        </TouchableOpacity>
        <View style={{ width: 1, backgroundColor: BORDER }} />
        <TouchableOpacity style={{ flex: 1, padding: 10, alignItems: 'center' }} onPress={onDelete}>
          <Ionicons name="trash" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────
function UCard({ user, onEdit, onDelete }: any) {
  const roleLabel = ROLES.find(r => r.value === user.role)?.label ?? user.role ?? 'بدون دور';
  const initials  = ((user.first_name?.[0] ?? '') + (user.last_name?.[0] ?? '')) || user.username[0].toUpperCase();
  const fullName  = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username;
  const isActive  = user.is_active !== false;
  const rc        = R_CFG[user.role ?? ''] ?? { c: ACCENT, icon: 'person' };

  return (
    <View style={{ flexDirection: 'row', backgroundColor: CARD, borderRadius: 18, borderWidth: 1, borderColor: BORDER, marginBottom: 10, overflow: 'hidden' }}>
      {/* Role color strip */}
      <View style={{ width: 4, backgroundColor: rc.c }} />

      <View style={{ flex: 1, padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {/* Status dot */}
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isActive ? '#22C55E' : '#EF4444' }} />

          {/* Info */}
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: TEXT }}>{fullName}</Text>
            <Text style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>@{user.username}</Text>
            {user.email ? <Text style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{user.email}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-end', backgroundColor: rc.c + '20', borderRadius: 7, borderWidth: 1, borderColor: rc.c + '40', paddingHorizontal: 8, paddingVertical: 4, marginTop: 6 }}>
              <Ionicons name={rc.icon} size={10} color={rc.c} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: rc.c }}>{roleLabel}</Text>
            </View>
          </View>

          {/* Gradient Avatar */}
          <LinearGradient colors={[rc.c + '80', rc.c + '20']} style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: rc.c }}>{initials}</Text>
          </LinearGradient>
        </View>

        {/* Actions */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#A78BFA18', borderRadius: 9, paddingVertical: 8 }} onPress={onEdit}>
            <Ionicons name="pencil-outline" size={13} color="#A78BFA" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#A78BFA' }}>تعديل</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#EF444418', borderRadius: 9, paddingVertical: 8 }} onPress={onDelete}>
            <Ionicons name="trash-outline" size={13} color="#EF4444" />
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>حذف</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function Empty({ label }: { label: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
      <View style={{ width: 72, height: 72, borderRadius: 22, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="folder-open-outline" size={34} color={MUTED} />
      </View>
      <Text style={{ color: MUTED, fontSize: 14 }}>{label}</Text>
    </View>
  );
}

// ─── Shared Dark Field ────────────────────────────────────────────────────────
function DField({ label, ...props }: any) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, color: MUTED, marginBottom: 6, textAlign: 'right', fontWeight: '600' }}>{label}</Text>
      <TextInput
        style={{ backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 13, fontSize: 14, color: TEXT }}
        placeholderTextColor={MUTED}
        textAlign="right"
        {...props}
      />
    </View>
  );
}

// ─── Sheet Shell ──────────────────────────────────────────────────────────────
function Sheet({ children, topColor, icon, title, onClose }: { children: React.ReactNode; topColor: string; icon: any; title: string; onClose: () => void }) {
  return (
    <View style={{ backgroundColor: SURF, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '94%' }}>
      <View style={{ width: 40, height: 4, backgroundColor: BORDER, borderRadius: 2, alignSelf: 'center', marginTop: 12 }} />
      <LinearGradient colors={[topColor + '22', SURF]} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: BORDER }}>
        <TouchableOpacity style={{ width: 34, height: 34, backgroundColor: CARD, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }} onPress={onClose}>
          <Ionicons name="close" size={20} color={MUTED} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '800', color: TEXT }}>{title}</Text>
        <View style={{ width: 38, height: 38, backgroundColor: topColor + '20', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={topColor} />
        </View>
      </LinearGradient>
      {children}
    </View>
  );
}

// ─── Dropdown ─────────────────────────────────────────────────────────────────
function Dropdown({ label, value, open, onToggle, list, onSelect }: { label: string; value: string; open: boolean; onToggle: () => void; list: { label: string; value: string }[]; onSelect: (v: string) => void }) {
  const sel = list.find(i => i.value === value);
  return (
    <View style={{ marginBottom: 6 }}>
      <Text style={{ fontSize: 12, color: MUTED, marginBottom: 6, textAlign: 'right', fontWeight: '600' }}>{label}</Text>
      <TouchableOpacity
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: CARD, borderRadius: 12, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 14, paddingVertical: 13 }}
        onPress={onToggle}
      >
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={MUTED} />
        <Text style={{ flex: 1, fontSize: 14, color: sel ? TEXT : MUTED, textAlign: 'right' }}>
          {sel?.label ?? `اختر ${label}...`}
        </Text>
      </TouchableOpacity>
      {open && (
        <View style={{ backgroundColor: BG, borderRadius: 12, borderWidth: 1, borderColor: BORDER, marginTop: 4, marginBottom: 10, overflow: 'hidden' }}>
          {list.map(i => (
            <TouchableOpacity key={i.value}
              style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: BORDER }, value === i.value && { backgroundColor: ACCENT + '18' }]}
              onPress={() => onSelect(i.value)}
            >
              <Text style={{ fontSize: 14, color: value === i.value ? ACCENT : TEXT }}>{i.label}</Text>
              {value === i.value && <Ionicons name="checkmark" size={14} color={ACCENT} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── User Form Modal ──────────────────────────────────────────────────────────
function UFormModal({ visible, mode, init, onClose, onSaved }: any) {
  const [form, setForm] = useState({ username: '', email: '', first_name: '', last_name: '', password: '', role: '' });
  const [saving, setSaving] = useState(false);
  const [roleDrop, setRoleDrop] = useState(false);

  useEffect(() => {
    if (visible) setForm({ username: init?.username ?? '', email: init?.email ?? '', first_name: init?.first_name ?? '', last_name: init?.last_name ?? '', password: '', role: init?.role ?? '' });
  }, [visible, init]);

  const f = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.username.trim()) return Alert.alert('تنبيه', 'اسم المستخدم مطلوب');
    if (mode === 'add' && !form.password.trim()) return Alert.alert('تنبيه', 'كلمة المرور مطلوبة');
    setSaving(true);
    try {
      const payload: any = { username: form.username, email: form.email, first_name: form.first_name, last_name: form.last_name, role: form.role };
      if (form.password) payload.password = form.password;
      const { data } = mode === 'add' ? await api.post('/auth/users/', payload) : await api.patch(`/auth/users/${init!.id}/`, payload);
      onSaved(data);
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data ? JSON.stringify(e.response.data) : 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' }}>
        <Sheet topColor={ACCENT} icon="person-add-outline" title={mode === 'add' ? 'مستخدم جديد' : 'تعديل المستخدم'} onClose={onClose}>
          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <DField label="اسم المستخدم *" value={form.username} onChangeText={f('username')} placeholder="username" autoCapitalize="none" />
            <DField label={mode === 'add' ? 'كلمة المرور *' : 'كلمة مرور جديدة'} value={form.password} onChangeText={f('password')} placeholder="••••••••" secureTextEntry />
            <DField label="الاسم الأول"  value={form.first_name} onChangeText={f('first_name')} placeholder="الاسم" />
            <DField label="الاسم الأخير" value={form.last_name}  onChangeText={f('last_name')}  placeholder="اللقب" />
            <DField label="البريد"        value={form.email}      onChangeText={f('email')}      placeholder="name@mail.com" keyboardType="email-address" />
            <Dropdown
              label="الدور" value={form.role}
              open={roleDrop} onToggle={() => setRoleDrop(v => !v)}
              list={ROLES}
              onSelect={v => { setForm(p => ({ ...p, role: v })); setRoleDrop(false); }}
            />
            <TouchableOpacity style={[{ marginTop: 12, marginBottom: 24, borderRadius: 16, overflow: 'hidden' }, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
              <LinearGradient colors={[ACCENT, '#A78BFA']} style={{ paddingVertical: 15, alignItems: 'center' }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{mode === 'add' ? 'إضافة المستخدم' : 'حفظ التعديلات'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Sheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Machine Form Modal ───────────────────────────────────────────────────────
function MFormModal({ visible, mode, init, onClose, onSaved }: any) {
  const [form, setForm]       = useState({ name: '', machine_type: '', department: '' });
  const [saving, setSaving]   = useState(false);
  const [typeDrop, setTypeDrop] = useState(false);
  const [deptDrop, setDeptDrop] = useState(false);
  const GREEN = '#22C55E';

  useEffect(() => {
    if (visible) setForm({ name: init?.name ?? '', machine_type: init?.machine_type ?? '', department: init?.department ?? '' });
  }, [visible, init]);

  const save = async () => {
    if (!form.name.trim()) return Alert.alert('تنبيه', 'اسم الماكينة مطلوب');
    setSaving(true);
    try {
      const { data } = mode === 'add' ? await api.post('/machines/', form) : await api.patch(`/machines/${init!.id}/`, form);
      onSaved(data);
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data ? JSON.stringify(e.response.data) : 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.75)' }}>
        <Sheet topColor={GREEN} icon="cog-outline" title={mode === 'add' ? 'ماكينة جديدة' : 'تعديل الماكينة'} onClose={onClose}>
          <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
            <DField label="اسم الماكينة *" value={form.name} onChangeText={(v: string) => setForm(p => ({ ...p, name: v }))} placeholder="مثال: تغليف 1" />
            <Dropdown
              label="نوع الماكينة" value={form.machine_type}
              open={typeDrop} onToggle={() => setTypeDrop(v => !v)}
              list={MACHINE_TYPES}
              onSelect={v => { setForm(p => ({ ...p, machine_type: v })); setTypeDrop(false); }}
            />
            <Dropdown
              label="القسم" value={form.department}
              open={deptDrop} onToggle={() => setDeptDrop(v => !v)}
              list={DEPARTMENTS}
              onSelect={v => { setForm(p => ({ ...p, department: v })); setDeptDrop(false); }}
            />
            <TouchableOpacity style={[{ marginTop: 12, marginBottom: 24, borderRadius: 16, overflow: 'hidden' }, saving && { opacity: 0.5 }]} onPress={save} disabled={saving}>
              <LinearGradient colors={[GREEN, '#16A34A']} style={{ paddingVertical: 15, alignItems: 'center' }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{mode === 'add' ? 'إضافة الماكينة' : 'حفظ التعديلات'}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Sheet>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────
function ConfirmModal({ visible, msg, onOk, onCancel }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 32, backgroundColor: 'rgba(0,0,0,0.82)' }}>
        <View style={{ backgroundColor: SURF, borderRadius: 24, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#EF444428' }}>
          <LinearGradient colors={['#EF444428', '#EF444408']} style={{ width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            <Ionicons name="warning" size={30} color="#EF4444" />
          </LinearGradient>
          <Text style={{ fontSize: 16, color: TEXT, textAlign: 'center', lineHeight: 26, marginBottom: 24 }}>{msg}</Text>
          <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: CARD, borderRadius: 14, paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: BORDER }} onPress={onCancel}>
              <Text style={{ color: MUTED, fontWeight: '700' }}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1, backgroundColor: '#EF4444', borderRadius: 14, paddingVertical: 13, alignItems: 'center' }} onPress={onOk}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>حذف</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}