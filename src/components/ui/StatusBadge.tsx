import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import Theme  from '../../constants/theme';

type Preset = 'running' | 'stopped' | 'maintenance' | 'pending' | 'in_progress' | 'resolved';

const PRESETS: Record<Preset, {
  label: string; color: string; bg: string; icon: keyof typeof Ionicons.glyphMap;
}> = {
  running:     { label: 'شغالة',       color: Colors.success, bg: Colors.successDim, icon: 'play-circle'        },
  stopped:     { label: 'متوقفة',      color: Colors.danger,  bg: Colors.dangerDim,  icon: 'stop-circle'        },
  maintenance: { label: 'صيانة',       color: Colors.warning, bg: Colors.warningDim, icon: 'construct'          },
  pending:     { label: 'في الانتظار', color: Colors.danger,  bg: Colors.dangerDim,  icon: 'time'               },
  in_progress: { label: 'جاري الإصلاح',color: Colors.warning, bg: Colors.warningDim, icon: 'construct'          },
  resolved:    { label: 'تم الإصلاح',  color: Colors.success, bg: Colors.successDim, icon: 'checkmark-circle'   },
};

interface Props {
  status: Preset;
  style?: ViewStyle;
  size?:  'sm' | 'md';
}

export default function StatusBadge({ status, style, size = 'md' }: Props) {
  const p    = PRESETS[status];
  const isLg = size === 'md';

  return (
    <View style={[s.wrap, { backgroundColor: p.bg }, style]}>
      <Ionicons name={p.icon} size={isLg ? 12 : 10} color={p.color} />
      <Text style={[s.label, { color: p.color, fontSize: isLg ? 11 : 10 }]}>{p.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    flexDirection:  'row-reverse',
    alignItems:     'center',
    gap:            4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius:   Theme.radius.full,
  },
  label: { fontWeight: '700' },
});