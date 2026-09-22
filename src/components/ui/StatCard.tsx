import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import Theme  from '../../constants/theme';

interface Props {
  icon:   keyof typeof Ionicons.glyphMap;
  color:  string;
  value:  string | number;
  label:  string;
  style?: ViewStyle;
}

export default function StatCard({ icon, color, value, label, style }: Props) {
  return (
    <View style={[s.card, { borderColor: color + '30' }, style]}>
      <View style={[s.iconWrap, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[s.value, { color }]}>{value}</Text>
      <Text style={s.label}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flex:            1,
    backgroundColor: Colors.surface,
    borderRadius:    Theme.radius.lg,
    borderWidth:     1,
    padding:         12,
    alignItems:      'center',
    gap:             4,
  },
  iconWrap: {
    width:          40,
    height:         40,
    borderRadius:   12,
    justifyContent: 'center',
    alignItems:     'center',
    marginBottom:   2,
  },
  value: { fontSize: 22, fontWeight: '900', lineHeight: 26 },
  label: { fontSize: 11, color: Colors.textMuted, textAlign: 'center' },
});