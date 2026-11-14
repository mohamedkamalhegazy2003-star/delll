import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing, useColors } from '@/constants/theme';

export type SheetAction = {
  key: string;
  label: string;
  icon: ComponentProps<typeof Ionicons>['name'];
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  title?: string;
  subtitle?: string;
  actions: SheetAction[];
  onClose: () => void;
};

/** Bottom action sheet. Built in-app so it behaves the same on every platform. */
export function Sheet({ visible, title, subtitle, actions, onClose }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.panel,
            { backgroundColor: colors.card, paddingBottom: insets.bottom + spacing.md },
          ]}
          onPress={() => {}}>
          <View style={[styles.grabber, { backgroundColor: colors.border }]} />
          {title ? (
            <View style={styles.header}>
              <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                {title}
              </Text>
              {subtitle ? (
                <Text numberOfLines={1} style={[styles.subtitle, { color: colors.muted }]}>
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          <ScrollView bounces={false} style={styles.list}>
            {actions.map((action) => (
              <Pressable
                key={action.key}
                accessibilityRole="button"
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
                style={({ pressed }) => [
                  styles.action,
                  { borderTopColor: colors.border },
                  pressed && { backgroundColor: colors.background },
                ]}>
                <Ionicons
                  name={action.icon}
                  size={20}
                  color={action.destructive ? colors.danger : colors.text}
                />
                <Text
                  style={[
                    styles.actionLabel,
                    { color: action.destructive ? colors.danger : colors.text },
                  ]}>
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  panel: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: spacing.sm },
  grabber: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: spacing.sm },
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, gap: 2 },
  title: { fontSize: 16, fontWeight: '700' },
  subtitle: { fontSize: 13 },
  list: { maxHeight: 420 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionLabel: { fontSize: 16 },
});
