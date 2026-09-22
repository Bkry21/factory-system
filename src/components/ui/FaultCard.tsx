// src/components/ui/FaultCard.tsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../context/ThemeContext';
import Theme from '../../constants/theme';
import type { Fault, FaultStatus } from '../../types';
import { Dimensions } from 'react-native';

const { width: W } = Dimensions.get('window');

// ── helpers ────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1)  return 'الآن';
  if (m < 60) return `${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}

const STATUS_META: Record<FaultStatus, {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}> = {
  pending:     { label: 'في الانتظار',  icon: 'time-outline',             color: '#FF5757' },
  in_progress: { label: 'جاري الإصلاح', icon: 'construct-outline',        color: '#FFB100' },
  resolved:    { label: 'تم الإصلاح',   icon: 'checkmark-circle-outline', color: '#00D26A' },
};

// ── Props ──────────────────────────────────────────────────────────────────
export interface FaultCardAction {
  label:   string;
  icon:    keyof typeof Ionicons.glyphMap;
  color:   string;
  onPress: () => Promise<void> | void;
}

interface FaultCardProps {
  fault:        Fault;
  machineImage?: string;
  actions?:     FaultCardAction[];
  width?:       number;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function FaultCard({ fault, machineImage, actions, width }: FaultCardProps) {
  const { colors } = useAppTheme();
  const meta  = STATUS_META[fault.status] ?? { label: fault.status, icon: 'help-circle-outline', color: colors.primary };
  const [busyIndex, setBusyIndex] = useState<number | null>(null);

  const elapsed  = Math.floor((Date.now() - new Date(fault.reportedAt).getTime()) / 60000);
  const isUrgent = elapsed > 60 && fault.status !== 'resolved';

  const handleAction = async (action: FaultCardAction, index: number) => {
    setBusyIndex(index);
    try { await action.onPress(); }
    finally { setBusyIndex(null); }
  };

  const cardWidth = width ?? (W - 16 * 2 - 8) / 2;

  return (
    <View style={[s.card, { width: cardWidth, borderColor: meta.color + '60', shadowColor: meta.color }]}>

      {/* ── خلفية الصورة ── */}
      {machineImage
        ? <Image source={{ uri: machineImage }} style={s.bg} resizeMode="cover" />
        : <View style={[s.bg, s.bgFallback]} />
      }

      {/* ── overlay داكن ── */}
      <View style={[s.overlay, { backgroundColor: fault.status === 'resolved' ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.62)' }]} />

      {/* ── urgent strip ── */}
      {isUrgent && (
        <View style={[s.urgentStrip, { backgroundColor: meta.color }]}>
          <Ionicons name="flash" size={10} color="#fff" />
          <Text style={s.urgentText}>عاجل</Text>
        </View>
      )}

      {/* ── content ── */}
      <View style={s.content}>

        {/* top: status badge + time */}
        <View style={s.topRow}>
          <Text style={s.time}>{timeAgo(fault.reportedAt)}</Text>
          <View style={[s.statusBadge, { backgroundColor: meta.color + '33', borderColor: meta.color + '80' }]}>
            <View style={[s.dot, { backgroundColor: meta.color }]} />
            <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>

        {/* bottom: name + desc + actions */}
        <View style={s.bottom}>
          <Text style={s.machineName} numberOfLines={1}>{fault.machineName}</Text>
          {fault.department && (
            <Text style={s.dept} numberOfLines={1}>{fault.department}</Text>
          )}

          <View style={s.divider} />

          <Text style={s.desc} numberOfLines={2}>{fault.description}</Text>

          {/* reporter chip */}
          <View style={s.chip}>
            <Ionicons name="person-outline" size={10} color="rgba(255,255,255,0.6)" />
            <Text style={s.chipText} numberOfLines={1}>{fault.reportedByName}</Text>
          </View>

          {/* actions */}
          {actions && actions.length > 0 && (
            <View style={s.actionsRow}>
              {actions.map((action, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.actionBtn, { backgroundColor: action.color + '25', borderColor: action.color + '60' }]}
                  onPress={() => handleAction(action, i)}
                  disabled={busyIndex !== null}
                  activeOpacity={0.8}
                >
                  {busyIndex === i
                    ? <ActivityIndicator size="small" color={action.color} />
                    : <>
                        <Ionicons name={action.icon} size={12} color={action.color} />
                        <Text style={[s.actionText, { color: action.color }]}>{action.label}</Text>
                      </>
                  }
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    height: 290,
    borderRadius: Theme.radius.md,
    borderWidth: 1.5,
    marginBottom: 8,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  bg: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  bgFallback: {
    backgroundColor: '#1a1a2e',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  urgentStrip: {
    position: 'absolute', top: 0, left: 0,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3,
    borderBottomRightRadius: 8,
  },
  urgentText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  content: {
    flex: 1,
    padding: 10,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 999, borderWidth: 1,
  },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  time:       { fontSize: 9, color: 'rgba(255,255,255,0.55)', fontWeight: '600' },
  bottom:     { gap: 5 },
  machineName:{ fontSize: 14, fontWeight: '800', color: '#fff', textAlign: 'right' },
  dept:       { fontSize: 10, color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  divider:    { height: 0.5, backgroundColor: 'rgba(255,255,255,0.2)' },
  desc:       { fontSize: 11, color: 'rgba(255,255,255,0.85)', textAlign: 'right', lineHeight: 16 },
  chip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 999, alignSelf: 'flex-end',
  },
  chipText:   { fontSize: 9, color: 'rgba(255,255,255,0.7)' },
  actionsRow: { flexDirection: 'row-reverse', gap: 5, marginTop: 2 },
  actionBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center',
    justifyContent: 'center', gap: 4,
    paddingVertical: 6, borderRadius: 8, borderWidth: 1,
  },
  actionText: { fontSize: 10, fontWeight: '700' },
});