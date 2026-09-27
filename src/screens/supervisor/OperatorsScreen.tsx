import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, FlatList,
  Modal, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../context/ThemeContext';
import AppHeader from '../../components/ui/AppHeader';
import api from '../../services/api';
import type { Machine, User } from '../../types';

// ─── Assign Modal ─────────────────────────────────────────────────────────────
function AssignModal({ visible, operator, machines, onClose, onSaved, colors }: any) {
  const [selectedMachine, setSelectedMachine] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) setSelectedMachine(operator?.assigned_machine?.id?.toString() ?? '');
  }, [visible, operator]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch(`/auth/users/${operator.id}/`, {
        assigned_machine: selectedMachine || null,
      });
      onSaved();
    } catch (e: any) {
      Alert.alert('خطأ', e?.response?.data ? JSON.stringify(e.response.data) : 'فشل الحفظ');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[mo.overlay]}>
        <View style={[mo.sheet, { backgroundColor: colors.surface }]}>
          <View style={[mo.handle, { backgroundColor: colors.border }]} />
          <View style={mo.head}>
            <Text style={[mo.title, { color: colors.textPrimary }]}>
              تخصيص ماكينة
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[mo.sub, { color: colors.textMuted }]}>
            المشغل: {operator?.name}
          </Text>

          <ScrollView style={{ maxHeight: 340 }}>
            {/* خيار بدون ماكينة */}
            <TouchableOpacity
              style={[mo.item, { borderColor: colors.border },
                selectedMachine === '' && { backgroundColor: colors.primary + '18', borderColor: colors.primary + '55' }]}
              onPress={() => setSelectedMachine('')}
            >
              <Ionicons name="close-circle-outline" size={20}
                color={selectedMachine === '' ? colors.primary : colors.textMuted} />
              <Text style={[mo.itemTxt, { color: selectedMachine === '' ? colors.primary : colors.textPrimary }]}>
                بدون ماكينة
              </Text>
              {selectedMachine === '' && <Ionicons name="checkmark" size={16} color={colors.primary} />}
            </TouchableOpacity>

            {machines.map((m: Machine) => {
              const active = selectedMachine === m.id.toString();
              return (
                <TouchableOpacity key={m.id}
                  style={[mo.item, { borderColor: colors.border },
                    active && { backgroundColor: colors.primary + '18', borderColor: colors.primary + '55' }]}
                  onPress={() => setSelectedMachine(m.id.toString())}
                >
                  <Ionicons name="cog-outline" size={20}
                    color={active ? colors.primary : colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={[mo.itemTxt, { color: active ? colors.primary : colors.textPrimary }]}>
                      {m.name}
                    </Text>
                    <Text style={[mo.itemSub, { color: colors.textMuted }]}>
                      {m.department}
                    </Text>
                  </View>
                  {active && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            style={[mo.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
            onPress={save} disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={mo.saveTxt}>حفظ</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const mo = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:   { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  head:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title:    { fontSize: 17, fontWeight: '700' },
  sub:      { fontSize: 13, marginBottom: 16 },
  item:     { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  itemTxt:  { fontSize: 14, fontWeight: '600', flex: 1 },
  itemSub:  { fontSize: 12, marginTop: 2 },
  saveBtn:  { borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveTxt:  { color: '#fff', fontWeight: '700', fontSize: 15 },
});

// ─── Operator Card ────────────────────────────────────────────────────────────
function OperatorCard({ operator, onAssign, colors }: { operator: User; onAssign: () => void; colors: any }) {
  const hasMachine = !!operator.assigned_machine;
  return (
    <View style={[card.wrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[card.avatar, { backgroundColor: colors.primary + '22' }]}>
        <Text style={[card.avatarTxt, { color: colors.primary }]}>
          {operator.name?.charAt(0)?.toUpperCase() ?? '?'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[card.name, { color: colors.textPrimary }]}>{operator.name}</Text>
        <Text style={[card.username, { color: colors.textMuted }]}>@{operator.username}</Text>
        <View style={[card.machinePill,
          { backgroundColor: hasMachine ? colors.success + '18' : colors.textMuted + '18' }]}>
          <Ionicons
            name={hasMachine ? 'cog' : 'cog-outline'}
            size={12}
            color={hasMachine ? colors.success : colors.textMuted}
          />
          <Text style={[card.machineTxt,
            { color: hasMachine ? colors.success : colors.textMuted }]}>
            {hasMachine ? operator.assigned_machine!.name : 'بدون ماكينة'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[card.btn, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}
        onPress={onAssign}
      >
        <Ionicons name="link-outline" size={16} color={colors.primary} />
        <Text style={[card.btnTxt, { color: colors.primary }]}>تخصيص</Text>
      </TouchableOpacity>
    </View>
  );
}

const card = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 10 },
  avatar:     { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:  { fontSize: 18, fontWeight: '700' },
  name:       { fontSize: 14, fontWeight: '700' },
  username:   { fontSize: 12, marginTop: 2 },
  machinePill:{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  machineTxt: { fontSize: 11, fontWeight: '600' },
  btn:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  btnTxt:     { fontSize: 12, fontWeight: '600' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OperatorsScreen() {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [operators, setOperators] = useState<User[]>([]);
  const [machines,  setMachines]  = useState<Machine[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; operator?: User }>({ open: false });

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const [opRes, mRes] = await Promise.all([
        api.get('/auth/users/?role=machine_operator'),
        api.get('/machines/'),
      ]);
      setOperators(opRes.data);
      setMachines(mRes.data);
    } catch {
      Alert.alert('خطأ', 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = styles(colors);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <AppHeader title="مشغلوني" />

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={operators}
          keyExtractor={o => o.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={[s.emptyTxt, { color: colors.textMuted }]}>لا يوجد مشغلون</Text>
            </View>
          }
          renderItem={({ item }) => (
            <OperatorCard
              operator={item}
              colors={colors}
              onAssign={() => setModal({ open: true, operator: item })}
            />
          )}
        />
      )}

      <AssignModal
        visible={modal.open}
        operator={modal.operator}
        machines={machines}
        colors={colors}
        onClose={() => setModal({ open: false })}
        onSaved={() => { setModal({ open: false }); load(true); }}
      />
    </View>
  );
}

const styles = (colors: any) => StyleSheet.create({
  root:     { flex: 1, backgroundColor: colors.bg },
  center:   { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 80 },
  emptyTxt: { fontSize: 14 },
});