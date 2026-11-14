import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, useColors } from '@/constants/theme';

import { Button } from './ui/button';
import { TextField } from './ui/text-field';

type Props = {
  visible: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmTitle: string;
  cancelTitle: string;
  /** Returns an error message, or null when the value is acceptable. */
  validate?: (value: string) => string | null;
  onSubmit: (value: string) => void;
  onCancel: () => void;
};

/** Single-field prompt used for renaming and for creating a folder. */
export function PromptDialog({
  visible,
  title,
  label,
  initialValue = '',
  confirmTitle,
  cancelTitle,
  validate,
  onSubmit,
  onCancel,
}: Props) {
  const colors = useColors();
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setError(null);
    }
  }, [visible, initialValue]);

  const submit = () => {
    const trimmed = value.trim();
    const problem = trimmed.length === 0 ? 'Enter a name.' : validate ? validate(trimmed) : null;
    if (problem) {
      setError(problem);
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.panel, { backgroundColor: colors.card }]} onPress={() => {}}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <TextField
            label={label}
            value={value}
            onChangeText={(next) => {
              setValue(next);
              setError(null);
            }}
            error={error}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button title={cancelTitle} variant="secondary" onPress={onCancel} />
            </View>
            <View style={styles.action}>
              <Button title={confirmTitle} onPress={submit} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  panel: { width: '100%', maxWidth: 420, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  title: { fontSize: 18, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: spacing.sm },
  action: { flex: 1 },
});
