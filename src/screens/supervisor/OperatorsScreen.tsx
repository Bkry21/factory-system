import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList,
  Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import { useDialog } from '../../components/ui/AppDialog';
import AppHeader from '../../components/ui/AppHeader';
import api from '../../services/api';
import { machineService } from '../../services/machineService';
import type { Machine, User } from '../../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OperatorUser extends User {
  username: string;
  first_name?: string;
  last_name?: string;
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

interface AssignModalProps {
  visible:   boolean;
  operator:  OperatorUser | null;
  machines:  Machine[];
  colors:    any;
  onClose:   () => void;
  onSaved:   () => void;
}

function AssignModal({ visible, operator, machines, colors, onClose, onSaved }: AssignModalProps) {
  const [selectedId, setSelectedId] = useState<string>('');
  const [saving,     setSaving]     = useState(false);
  const { show: showDialog, dialog } = useDialog();

  useEffect(() => {
    if (visible && operator) {
      // assigned_machine الحين بيجي كـ { id, name, status } | null
      setSelectedId(operator.assigned_machine?.id?.toString() ?? '');
    }
  }, [visible, operator]);

  const save = async () => {
    if (!operator) return;
    setSaving(true);
    try {
      await api.patch(`/auth/users/${operator.id}/`, {
        // assigned_machine_id هو الـ write field في الـ backend
        assigned_machine_id: selectedId ? Number(selectedId) : null,
      });
      onSaved();
    } catch (e: any) {
      const msg = e?.response?.data
        ? JSON.stringify(e.response.data)
        : 'فشل الحفظ، حاول مرة أخرى';
      showDialog('error', 'خطأ', msg);
    } finally {
      setSaving(false);
    }
  };

  if (!operator) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={mo.overlay}>
        <View style={[mo.sheet, { backgroundColor: colors.surface }]}>
          <View style={[mo.handle, { backgroundColor: colors.border }]} />

          <View style={mo.head}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
            <Text style={[mo.title, { color: colors.textPrimary }]}>تخصيص ماكينة</Text>
          </View>

          <Text style={[mo.sub, { color: colors.textMuted }]}>المشغل: {operator.name}</Text>

          <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
            {/* خيار "بدون ماكينة" */}
            <TouchableOpacity
              style={[
                mo.item,
                { borderColor: colors.border },
                selectedId === '' && { backgroundColor: colors.primary + '18', borderColor: colors.primary + '55' },
              ]}
              onPress={() => setSelectedId('')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="close-circle-outline"
                size={20}
                color={selectedId === '' ? colors.primary : colors.textMuted}
              />
              <Text style={[
                mo.itemTxt,
                { color: selectedId === '' ? colors.primary : colors.textPrimary, flex: 1 },
              ]}>
                بدون ماكينة
              </Text>
              {selectedId === '' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>

            {machines.map(m => {
              const active = selectedId === m.id.toString();
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    mo.item,
                    { borderColor: colors.border },
                    active && { backgroundColor: colors.primary + '18', borderColor: colors.primary + '55' },
                  ]}
                  onPress={() => setSelectedId(m.id.toString())}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="cog-outline"
                    size={20}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[mo.itemTxt, { color: active ? colors.primary : colors.textPrimary }]}>
                      {m.name}
                    </Text>
                    <Text style={[mo.itemSub, { color: colors.textMuted }]}>{m.department}</Text>
                  </View>
                  {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[mo.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
            onPress={save}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={mo.saveTxt}>حفظ التخصيص</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
      {dialog}
    </Modal>
  );
}

const mo = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:   { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:  { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  head:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title:   { fontSize: 17, fontWeight: '700' },
  sub:     { fontSize: 13, marginBottom: 16 },
  item:    { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  itemTxt: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 2 },
  saveBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Operator Card ────────────────────────────────────────────────────────────

interface OperatorCardProps {
  operator: OperatorUser;
  colors:   any;
  onAssign: () => void;
}

function OperatorCard({ operator, colors, onAssign }: OperatorCardProps) {
  const hasMachine = !!operator.assigned_machine;
  const initial    = operator.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <View style={[card.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[card.avatar, { backgroundColor: colors.primary + '22' }]}>
        <Text style={[card.avatarTxt, { color: colors.primary }]}>{initial}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[card.name, { color: colors.textPrimary }]}>{operator.name}</Text>
        <Text style={[card.username, { color: colors.textMuted }]}>@{operator.username}</Text>
        <View style={[
          card.machinePill,
          { backgroundColor: hasMachine ? colors.success + '18' : colors.textMuted + '18' },
        ]}>
          <Ionicons
            name={hasMachine ? 'cog' : 'cog-outline'}
            size={12}
            color={hasMachine ? colors.success : colors.textMuted}
          />
          <Text style={[
            card.machineTxt,
            { color: hasMachine ? colors.success : colors.textMuted },
          ]}>
            {hasMachine ? operator.assigned_machine!.name : 'بدون ماكينة'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[card.btn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}
        onPress={onAssign}
        activeOpacity={0.75}
      >
        <Ionicons name="link-outline" size={16} color={colors.primary} />
        <Text style={[card.btnTxt, { color: colors.primary }]}>تخصيص</Text>
      </TouchableOpacity>
    </View>
  );
}

const card = StyleSheet.create({
  wrap:        { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:   { fontSize: 18, fontWeight: '700' },
  name:        { fontSize: 14, fontWeight: '700' },
  username:    { fontSize: 12, marginTop: 2 },
  machinePill: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  machineTxt:  { fontSize: 11, fontWeight: '600' },
  btn:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  btnTxt:      { fontSize: 12, fontWeight: '600' },
});

// ─── Mapper ───────────────────────────────────────────────────────────────────
// UserSerializer الحين يرجع: { id, username, first_name, last_name, name, role,
//   role_display, department, assigned_machine: { id, name, status } | null }

function mapOperator(raw: any): OperatorUser {
  return {
    id:               String(raw.id),
    username:         raw.username,
    name:             raw.name ?? (`${raw.first_name ?? ''} ${raw.last_name ?? ''}`.trim() || raw.username),
    email:            raw.email ?? '',
    role:             raw.role,
    department:       raw.department ?? '',
    assigned_machine: raw.assigned_machine
      ? {
          id:     raw.assigned_machine.id,
          name:   raw.assigned_machine.name,
          status: raw.assigned_machine.status,
        }
      : null,
  };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function OperatorsScreen() {
  const { colors } = useAppTheme();
  const insets     = useSafeAreaInsets();
  const { show: showDialog, dialog } = useDialog();

  const [operators,  setOperators]  = useState<OperatorUser[]>([]);
  const [machines,   setMachines]   = useState<Machine[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal,      setModal]      = useState<{ open: boolean; operator: OperatorUser | null }>({
    open: false, operator: null,
  });

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [opRes, machines] = await Promise.all([
        api.get('/auth/users/?role=machine_operator'),
        machineService.getAll(),
      ]);
      setOperators((opRes.data as any[]).map(mapOperator));
      setMachines(machines);
    } catch {
      showDialog('error', 'خطأ', 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal  = (op: OperatorUser) => setModal({ open: true, operator: op });
  const closeModal = ()                  => setModal({ open: false, operator: null });
  const onSaved    = ()                  => { closeModal(); load(true); };

  return (
    <View style={[s.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <AppHeader
        title="مشغلوني"
        subtitle={`${operators.length} مشغل`}
      />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={operators}
          keyExtractor={o => o.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={s.center}>
              <View style={[s.emptyIcon, { backgroundColor: colors.surfaceAlt ?? colors.surface }]}>
                <Ionicons name="people-outline" size={36} color={colors.textMuted} />
              </View>
              <Text style={[s.emptyTxt, { color: colors.textPrimary }]}>لا يوجد مشغلون</Text>
              <Text style={[s.emptySub, { color: colors.textMuted }]}>
                لم يتم تسجيل أي مشغل ماكينة بعد
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <OperatorCard
              operator={item}
              colors={colors}
              onAssign={() => openModal(item)}
            />
          )}
        />
      )}

      <AssignModal
        visible={modal.open}
        operator={modal.operator}
        machines={machines}
        colors={colors}
        onClose={closeModal}
        onSaved={onSaved}
      />
      {dialog}
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyTxt:  { fontSize: 15, fontWeight: '700' },
  emptySub:  { fontSize: 13 },
});