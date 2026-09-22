import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import Theme  from '../../constants/theme';

interface Props extends TextInputProps {
  label:    string;
  icon?:    keyof typeof Ionicons.glyphMap;
  error?:   string;
  password?: boolean;  // يعرض زر العين تلقائياً
}

export default function Field({ label, icon, error, password, ...rest }: Props) {
  const [show,    setShow]    = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{label}</Text>

      <View style={[
        s.row,
        focused && s.focused,
        !!error && s.errored,
      ]}>
        {/* أيقونة يمين */}
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={focused ? Colors.primary : Colors.textMuted}
            style={s.iconR}
          />
        )}

        <TextInput
          style={s.input}
          placeholderTextColor={Colors.textMuted}
          textAlign="right"
          secureTextEntry={password && !show}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {/* زر العين — يسار — فقط للحقول password */}
        {password && (
          <TouchableOpacity
            onPress={() => setShow(v => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={s.eyeBtn}
          >
            <Ionicons
              name={show ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={s.err}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap:    { gap: 6 },
  label:   { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, textAlign: 'right' },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    backgroundColor: Colors.bgDeep,
    borderRadius:   Theme.radius.md,
    borderWidth:    1,
    borderColor:    Colors.border,
    paddingHorizontal: 12,
    height:         50,
  },
  focused:  { borderColor: Colors.primary },
  errored:  { borderColor: Colors.danger },
  iconR:    { marginLeft: 8 },          // أيقونة اليمين — مسافة لليسار
  input: {
    flex:     1,
    color:    Colors.textPrimary,
    fontSize: 15,
    textAlign: 'right',
  },
  eyeBtn:   { padding: 4 },             // زر العين — يسار الحقل
  err:      { fontSize: 11, color: Colors.danger, textAlign: 'right' },
});