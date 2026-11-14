import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, useColors } from '@/constants/theme';
import { formatBytes, formatDate, type Entry } from '@/lib/fs';

type IconName = ComponentProps<typeof Ionicons>['name'];

const BY_EXTENSION: Record<string, IconName> = {
  jpg: 'image-outline',
  jpeg: 'image-outline',
  png: 'image-outline',
  gif: 'image-outline',
  webp: 'image-outline',
  svg: 'image-outline',
  heic: 'image-outline',
  mp4: 'videocam-outline',
  mkv: 'videocam-outline',
  mov: 'videocam-outline',
  webm: 'videocam-outline',
  avi: 'videocam-outline',
  mp3: 'musical-notes-outline',
  wav: 'musical-notes-outline',
  m4a: 'musical-notes-outline',
  ogg: 'musical-notes-outline',
  flac: 'musical-notes-outline',
  pdf: 'document-text-outline',
  doc: 'document-text-outline',
  docx: 'document-text-outline',
  txt: 'document-text-outline',
  md: 'document-text-outline',
  rtf: 'document-text-outline',
  xls: 'grid-outline',
  xlsx: 'grid-outline',
  csv: 'grid-outline',
  ppt: 'easel-outline',
  pptx: 'easel-outline',
  zip: 'archive-outline',
  rar: 'archive-outline',
  '7z': 'archive-outline',
  tar: 'archive-outline',
  gz: 'archive-outline',
  apk: 'logo-android',
  exe: 'terminal-outline',
  sh: 'terminal-outline',
  js: 'code-slash-outline',
  ts: 'code-slash-outline',
  tsx: 'code-slash-outline',
  jsx: 'code-slash-outline',
  py: 'code-slash-outline',
  java: 'code-slash-outline',
  kt: 'code-slash-outline',
  json: 'code-slash-outline',
  html: 'code-slash-outline',
  css: 'code-slash-outline',
  xml: 'code-slash-outline',
};

function iconFor(entry: Entry): IconName {
  if (entry.isDirectory) return 'folder';
  return BY_EXTENSION[entry.extension] ?? 'document-outline';
}

type Props = {
  entry: Entry;
  selected: boolean;
  onPress: () => void;
  onLongPress: () => void;
};

export function FileRow({ entry, selected, onPress, onLongPress }: Props) {
  const colors = useColors();
  const tint = entry.isDirectory ? colors.primary : colors.muted;
  const meta = entry.isDirectory
    ? 'Folder'
    : `${formatBytes(entry.size)}${entry.modified ? ` · ${formatDate(entry.modified)}` : ''}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.isDirectory ? 'Folder' : 'File'} ${entry.name}`}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={280}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        selected && { backgroundColor: colors.primary + '18' },
        pressed && { opacity: 0.6 },
      ]}>
      <View style={[styles.iconWrap, { backgroundColor: tint + '1A' }]}>
        <Ionicons name={iconFor(entry)} size={22} color={tint} />
      </View>
      <View style={styles.texts}>
        <Text numberOfLines={1} style={[styles.name, { color: colors.text }]}>
          {entry.name}
        </Text>
        <Text numberOfLines={1} style={[styles.meta, { color: colors.muted }]}>
          {meta}
        </Text>
      </View>
      <Ionicons
        name={entry.isDirectory ? 'chevron-forward' : 'ellipsis-vertical'}
        size={18}
        color={colors.muted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12 },
});
