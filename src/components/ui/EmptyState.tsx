import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import Theme  from '../../constants/theme';

interface Props {
  icon:    keyof typeof Ionicons.glyphMap;
  title:   string;
  sub?:    string;
  color?:  string;
}

export default function EmptyState({ icon, title, sub, color = Colors.textMuted }: Props) {
  return (
    <View style={s.wrap}>
      <View style={[s.iconWrap, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <Text style={s.title}>{title}</Text>
      {sub && <Text style={s.sub}>{sub}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:    { alignItems: 'center', paddingVertical: 48, gap: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title:   { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub:     { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },
});