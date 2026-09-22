import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import Theme  from '../../constants/theme';

interface Props {
  uri?:      string;
  onChange:  (uri: string) => void;
  label?:    string;
  required?: boolean;
}

export default function PhotoPicker({ uri, onChange, label = 'صورة', required }: Props) {

  const pick = async () => {
    // جرب الكاميرا أولاً
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (camPerm.granted) {
      const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
      if (!res.canceled && res.assets[0]) { onChange(res.assets[0].uri); return; }
    }
    // fallback المعرض
    const galPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!galPerm.granted) { Alert.alert('تنبيه', 'يرجى السماح بالوصول للكاميرا أو المعرض'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.8 });
    if (!res.canceled && res.assets[0]) onChange(res.assets[0].uri);
  };

  return (
    <View style={s.wrap}>
      <View style={s.labelRow}>
        <Text style={s.label}>{label}</Text>
        {required && <Text style={s.req}>*إلزامي</Text>}
      </View>

      <TouchableOpacity style={s.btn} onPress={pick} activeOpacity={0.8}>
        {uri ? (
          <>
            <Image source={{ uri }} style={s.img} />
            <View style={s.overlay}>
              <Ionicons name="camera" size={22} color={Colors.white} />
              <Text style={s.overlayTxt}>تغيير الصورة</Text>
            </View>
          </>
        ) : (
          <View style={s.placeholder}>
            <View style={[s.iconWrap, { backgroundColor: Colors.primaryDim }]}>
              <Ionicons name="camera-outline" size={26} color={Colors.primary} />
            </View>
            <Text style={s.placeholderTxt}>اضغط لالتقاط صورة</Text>
            <Text style={s.placeholderSub}>الكاميرا أو المعرض</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// helper لتحويل URI → FormData field (يُستخدم في السيرفيسات)
export function buildImageField(uri: string, fieldName: string, filename = 'photo.jpg') {
  return {
    uri,
    name: filename,
    type: 'image/jpeg',
  } as any;
}

const s = StyleSheet.create({
  wrap:    { gap: 6 },
  labelRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  label:   { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  req:     { fontSize: 11, color: Colors.danger },
  btn: {
    borderRadius: Theme.radius.md,
    overflow:     'hidden',
    borderWidth:  1.5,
    borderColor:  Colors.border,
    borderStyle:  'dashed',
  },
  img:     { width: '100%', height: 180 },
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent:  'center',
    alignItems:      'center',
    gap:             6,
  },
  overlayTxt:     { color: Colors.white, fontSize: 13, fontWeight: '600' },
  placeholder: {
    height:         140,
    justifyContent: 'center',
    alignItems:     'center',
    gap:            6,
    backgroundColor: Colors.bgDeep,
  },
  iconWrap: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  placeholderTxt: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  placeholderSub: { fontSize: 11, color: Colors.textMuted },
});