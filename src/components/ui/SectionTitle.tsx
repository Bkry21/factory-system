import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import Theme  from '../../constants/theme';

interface Props {
  title:  string;
  count?: number;
  right?: React.ReactNode;
}

export default function SectionTitle({ title, count, right }: Props) {
  return (
    <View style={s.row}>
      {right}
      <View style={{ flex: 1 }} />
      <View style={s.left}>
        {count !== undefined && (
          <View style={s.badge}>
            <Text style={s.badgeTxt}>{count}</Text>
          </View>
        )}
        <Text style={s.title}>{title}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row:      { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 10 },
  left:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  title:    { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  badge:    { backgroundColor: Colors.primaryDim, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary },
});