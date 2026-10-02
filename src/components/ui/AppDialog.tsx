// src/components/ui/AppDialog.tsx
import React from 'react';
import {
  Modal, View, Text, TouchableOpacity,
  StyleSheet, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/colors';
import Theme from '../../constants/theme';

export type DialogType = 'error' | 'warning' | 'success' | 'confirm';

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface Props {
  visible: boolean;
  type?: DialogType;
  title: string;
  message?: string;
  buttons?: DialogButton[];
  onClose?: () => void;
}

const TYPE_META: Record<DialogType, {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}> = {
  error:   { icon: 'close-circle',       color: Colors.danger,  bg: Colors.dangerLight  },
  warning: { icon: 'warning',            color: Colors.warning, bg: Colors.warningLight },
  success: { icon: 'checkmark-circle',   color: Colors.success, bg: Colors.successLight },
  confirm: { icon: 'help-circle',        color: Colors.primary, bg: Colors.primaryDim   },
};

export default function AppDialog({
  visible, type = 'warning', title, message, buttons, onClose,
}: Props) {
  const meta = TYPE_META[type];
  const btns = buttons ?? [{ text: 'حسناً', style: 'default' as const }];

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <Pressable style={s.overlay} onPress={onClose}>
        <Pressable style={s.card} onPress={() => {}}>
          {/* Icon */}
          <View style={[s.iconWrap, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={32} color={meta.color} />
          </View>

          {/* Title */}
          <Text style={s.title}>{title}</Text>

          {/* Message */}
          {!!message && <Text style={s.message}>{message}</Text>}

          {/* Buttons */}
          <View style={[s.btnRow, btns.length === 1 && s.btnRowSingle]}>
            {btns.map((btn, i) => {
              const isDestructive = btn.style === 'destructive';
              const isCancel      = btn.style === 'cancel';
              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.btn,
                    btns.length > 1 && s.btnFlex,
                    isDestructive && s.btnDestructive,
                    isCancel      && s.btnCancel,
                    !isDestructive && !isCancel && s.btnPrimary,
                  ]}
                  onPress={() => { btn.onPress?.(); onClose?.(); }}
                >
                  <Text style={[
                    s.btnText,
                    isCancel && s.btnTextCancel,
                  ]}>
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Hook مساعد لتسهيل الاستخدام ────────────────────────────────────────────
interface DialogState {
  visible: boolean;
  type: DialogType;
  title: string;
  message?: string;
  buttons?: DialogButton[];
}

const DEFAULT_STATE: DialogState = {
  visible: false, type: 'warning', title: '',
};

export function useDialog() {
  const [state, setState] = React.useState<DialogState>(DEFAULT_STATE);

  const show = React.useCallback((
    type: DialogType,
    title: string,
    message?: string,
    buttons?: DialogButton[],
  ) => setState({ visible: true, type, title, message, buttons }), []);

  const hide = React.useCallback(() =>
    setState(prev => ({ ...prev, visible: false })), []);

  const dialog = (
    <AppDialog
      visible={state.visible}
      type={state.type}
      title={state.title}
      message={state.message}
      buttons={state.buttons}
      onClose={hide}
    />
  );

  return { show, hide, dialog };
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.surfaceLight,
    borderRadius: Theme.radius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Theme.spacing.lg,
    alignItems: 'center',
    ...Theme.shadow.lg,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  title: {
    fontSize: Theme.fontSize.lg,
    fontWeight: Theme.fontWeight.bold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Theme.spacing.sm,
  },
  message: {
    fontSize: Theme.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Theme.spacing.md,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    width: '100%',
    marginTop: Theme.spacing.sm,
  },
  btnRowSingle: {
    justifyContent: 'center',
  },
  btnFlex: { flex: 1 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: Theme.radius.md,
    alignItems: 'center',
    minWidth: 80,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
  },
  btnDestructive: {
    backgroundColor: Colors.danger,
  },
  btnCancel: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnText: {
    fontSize: Theme.fontSize.sm,
    fontWeight: Theme.fontWeight.semiBold,
    color: Colors.white,
  },
  btnTextCancel: {
    color: Colors.textSecondary,
  },
});
