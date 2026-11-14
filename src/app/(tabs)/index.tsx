import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FileRow } from '@/components/file-row';
import { PromptDialog } from '@/components/prompt-dialog';
import { Sheet, type SheetAction } from '@/components/sheet';
import { ConfirmDialog, EmptyState } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import {
  defaultRoot,
  displayPath,
  filterEntries,
  formatBytes,
  formatDate,
  listDirectory,
  parentUri,
  searchDirectory,
  sortEntries,
  uniqueName,
  type Entry,
  type SortKey,
} from '@/lib/fs';

const SORT_LABELS: Record<SortKey, string> = {
  name: 'Name',
  size: 'Size',
  date: 'Date modified',
  type: 'Type',
};

type Clipboard = { mode: 'copy' | 'cut'; entries: Entry[] } | null;

type Dialog =
  | { kind: 'none' }
  | { kind: 'newFolder' }
  | { kind: 'rename'; entry: Entry }
  | { kind: 'delete'; entries: Entry[] }
  | { kind: 'details'; entry: Entry };

export default function BrowserScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const [path, setPath] = useState<string>(() => defaultRoot().uri);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState('');

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Entry[]>([]);

  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [ascending, setAscending] = useState(true);

  const [selected, setSelected] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<Clipboard>(null);
  const [dialog, setDialog] = useState<Dialog>({ kind: 'none' });
  const [sheetFor, setSheetFor] = useState<Entry | null>(null);
  const [sortSheet, setSortSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback((uri: string) => {
    setStatus('loading');
    try {
      setEntries(listDirectory(uri));
      setStatus('ready');
      setErrorText('');
    } catch (e) {
      setEntries([]);
      setStatus('error');
      setErrorText(e instanceof Error ? e.message : 'Could not read this folder.');
    }
  }, []);

  useEffect(() => {
    load(path);
    setSelected([]);
  }, [path, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(timer);
  }, [toast]);

  const visible = useMemo(() => {
    const source = searching ? results : entries;
    return sortEntries(filterEntries(source, searching ? '' : query), sortKey, ascending);
  }, [entries, results, searching, query, sortKey, ascending]);

  const runSearch = () => {
    const q = query.trim();
    if (!q) {
      setSearching(false);
      setResults([]);
      return;
    }
    setSearching(true);
    setResults(searchDirectory(path, q));
  };

  const clearSearch = () => {
    setQuery('');
    setSearching(false);
    setResults([]);
  };

  const refresh = () => {
    load(path);
    if (searching) setResults(searchDirectory(path, query));
  };

  const buzz = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(style).catch(() => {});
  };

  const openEntry = async (entry: Entry) => {
    if (entry.isDirectory) {
      setPath(entry.uri);
      clearSearch();
      return;
    }
    try {
      if (Platform.OS === 'android') {
        const file = new File(entry.uri);
        await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
          data: file.contentUri || file.uri,
          type: entry.mimeType,
          flags: 1,
        });
        return;
      }
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(entry.uri);
        return;
      }
      setToast('No app can open this file.');
    } catch {
      setToast('No app can open this file.');
    }
  };

  const toggleSelect = (entry: Entry) => {
    buzz();
    setSelected((prev) =>
      prev.includes(entry.uri) ? prev.filter((u) => u !== entry.uri) : [...prev, entry.uri],
    );
  };

  const selectedEntries = useMemo(
    () => entries.filter((entry) => selected.includes(entry.uri)),
    [entries, selected],
  );

  const paste = async () => {
    if (!clipboard) return;
    setBusy(true);
    let done = 0;
    try {
      for (const entry of clipboard.entries) {
        const name = uniqueName(
          path,
          stripExtension(entry.name),
          entry.isDirectory ? '' : extensionOf(entry.name),
        );
        if (clipboard.mode === 'cut') {
          if (entry.isDirectory) {
            await new Directory(entry.uri).move(new Directory(path, name));
          } else {
            await new File(entry.uri).move(new File(path, name));
          }
        } else {
          const temp = new Directory(Paths.cache, 'filex-tmp');
          if (!temp.exists) temp.create({ intermediates: true });
          if (entry.isDirectory) {
            const copy = new Directory(temp, 'item');
            if (copy.exists) copy.delete();
            await new Directory(entry.uri).copy(copy);
            await copy.move(new Directory(path, name));
          } else {
            const copy = new File(temp, 'item');
            if (copy.exists) copy.delete();
            await new File(entry.uri).copy(copy);
            await copy.move(new File(path, name));
          }
        }
        done += 1;
      }
      setToast(
        `${clipboard.mode === 'cut' ? 'Moved' : 'Copied'} ${done} item${done === 1 ? '' : 's'}`,
      );
      if (clipboard.mode === 'cut') setClipboard(null);
      refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not paste here.');
    } finally {
      setBusy(false);
    }
  };

  const createFolder = (name: string) => {
    try {
      new Directory(path, name).create({ intermediates: true });
      setDialog({ kind: 'none' });
      setToast('Folder created');
      refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not create the folder.');
    }
  };

  const rename = (entry: Entry, name: string) => {
    try {
      if (entry.isDirectory) new Directory(entry.uri).rename(name);
      else new File(entry.uri).rename(name);
      setDialog({ kind: 'none' });
      setToast('Renamed');
      refresh();
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not rename.');
    }
  };

  const remove = (targets: Entry[]) => {
    let failed = 0;
    for (const entry of targets) {
      try {
        if (entry.isDirectory) new Directory(entry.uri).delete();
        else new File(entry.uri).delete();
      } catch {
        failed += 1;
      }
    }
    setDialog({ kind: 'none' });
    setSelected([]);
    setToast(failed ? `${failed} item(s) could not be deleted` : 'Deleted');
    refresh();
  };

  const goUp = () => {
    const parent = parentUri(path);
    if (parent) {
      setPath(parent);
      clearSearch();
    }
  };

  const entryActions = (entry: Entry): SheetAction[] => [
    {
      key: 'open',
      label: entry.isDirectory ? 'Open folder' : 'Open with',
      icon: entry.isDirectory ? 'folder-open-outline' : 'open-outline',
      onPress: () => openEntry(entry),
    },
    {
      key: 'copy',
      label: 'Copy',
      icon: 'copy-outline',
      onPress: () => {
        setClipboard({ mode: 'copy', entries: [entry] });
        setToast('Copied to clipboard');
      },
    },
    {
      key: 'cut',
      label: 'Cut',
      icon: 'cut-outline',
      onPress: () => {
        setClipboard({ mode: 'cut', entries: [entry] });
        setToast('Ready to move');
      },
    },
    {
      key: 'rename',
      label: 'Rename',
      icon: 'pencil-outline',
      onPress: () => setDialog({ kind: 'rename', entry }),
    },
    {
      key: 'details',
      label: 'Details',
      icon: 'information-circle-outline',
      onPress: () => setDialog({ kind: 'details', entry }),
    },
    {
      key: 'delete',
      label: 'Delete',
      icon: 'trash-outline',
      destructive: true,
      onPress: () => setDialog({ kind: 'delete', entries: [entry] }),
    },
  ];

  const sortActions: SheetAction[] = (Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
    key,
    label: `${SORT_LABELS[key]}${sortKey === key ? (ascending ? ' \u2191' : ' \u2193') : ''}`,
    icon: sortKey === key ? 'checkmark-circle-outline' : 'ellipse-outline',
    onPress: () => {
      if (sortKey === key) setAscending((prev) => !prev);
      else {
        setSortKey(key);
        setAscending(true);
      }
    },
  }));

  const selectionMode = selected.length > 0;
  const folderName = displayPath(path).split('/').filter(Boolean).pop() ?? 'Storage';

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        {selectionMode ? (
          <View style={styles.headerRow}>
            <Pressable onPress={() => setSelected([])} hitSlop={10} style={styles.iconButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {selected.length} selected
            </Text>
            <Pressable
              onPress={() => setSelected(visible.map((e) => e.uri))}
              hitSlop={10}
              style={styles.iconButton}>
              <Ionicons name="checkmark-done-outline" size={22} color={colors.text} />
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <Pressable
                onPress={goUp}
                disabled={!parentUri(path)}
                hitSlop={10}
                style={[styles.iconButton, !parentUri(path) && { opacity: 0.3 }]}>
                <Ionicons name="arrow-back" size={22} color={colors.text} />
              </Pressable>
              <View style={styles.titleWrap}>
                <Text numberOfLines={1} style={[styles.headerTitle, { color: colors.text }]}>
                  {folderName}
                </Text>
                <Text numberOfLines={1} style={[styles.headerPath, { color: colors.muted }]}>
                  {displayPath(path)}
                </Text>
              </View>
              <Pressable onPress={() => setSortSheet(true)} hitSlop={10} style={styles.iconButton}>
                <Ionicons name="swap-vertical-outline" size={22} color={colors.text} />
              </Pressable>
            </View>

            {/* Search */}
            <View
              style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.muted} />
              <TextInput
                value={query}
                onChangeText={(next) => {
                  setQuery(next);
                  if (!next.trim()) {
                    setSearching(false);
                    setResults([]);
                  }
                }}
                onSubmitEditing={runSearch}
                placeholder="Search this folder"
                placeholderTextColor={colors.muted}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.searchInput, { color: colors.text }]}
              />
              {query ? (
                <Pressable onPress={clearSearch} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
          </>
        )}
      </View>

      {/* Clipboard banner */}
      {clipboard && !selectionMode ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.primary + '14', borderColor: colors.primary + '33' },
          ]}>
          <Ionicons name="clipboard-outline" size={16} color={colors.primary} />
          <Text numberOfLines={1} style={[styles.bannerText, { color: colors.primary }]}>
            {clipboard.entries.length} item{clipboard.entries.length === 1 ? '' : 's'} ready to{' '}
            {clipboard.mode === 'cut' ? 'move' : 'copy'}
          </Text>
          <Pressable onPress={paste} disabled={busy} hitSlop={8}>
            <Text style={[styles.bannerAction, { color: colors.primary }]}>Paste</Text>
          </Pressable>
          <Pressable onPress={() => setClipboard(null)} hitSlop={8}>
            <Ionicons name="close" size={16} color={colors.primary} />
          </Pressable>
        </View>
      ) : null}

      {/* List */}
      {status === 'loading' ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : status === 'error' ? (
        <EmptyState
          icon="alert-circle-outline"
          title="Cannot open this folder"
          message={errorText}
          actionTitle="Try again"
          onAction={() => load(path)}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={searching ? 'search-outline' : 'folder-open-outline'}
          title={searching ? 'No matches' : 'This folder is empty'}
          message={searching ? 'Try a different name.' : 'Create a folder to get started.'}
          actionTitle={searching ? undefined : 'New folder'}
          onAction={searching ? undefined : () => setDialog({ kind: 'newFolder' })}
        />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.uri}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => (
            <FileRow
              entry={item}
              selected={selected.includes(item.uri)}
              onPress={() => (selectionMode ? toggleSelect(item) : openEntry(item))}
              onLongPress={() => (selectionMode ? toggleSelect(item) : setSheetFor(item))}
            />
          )}
        />
      )}

      {/* Bottom bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom + spacing.sm,
          },
        ]}>
        {selectionMode ? (
          <>
            <BarButton
              icon="copy-outline"
              label="Copy"
              onPress={() => {
                setClipboard({ mode: 'copy', entries: selectedEntries });
                setSelected([]);
                setToast('Copied to clipboard');
              }}
            />
            <BarButton
              icon="cut-outline"
              label="Cut"
              onPress={() => {
                setClipboard({ mode: 'cut', entries: selectedEntries });
                setSelected([]);
                setToast('Ready to move');
              }}
            />
            <BarButton
              icon="trash-outline"
              label="Delete"
              danger
              onPress={() => setDialog({ kind: 'delete', entries: selectedEntries })}
            />
          </>
        ) : (
          <>
            <BarButton
              icon="folder-outline"
              label="New folder"
              onPress={() => setDialog({ kind: 'newFolder' })}
            />
            <BarButton
              icon="clipboard-outline"
              label={busy ? 'Working\u2026' : 'Paste'}
              disabled={!clipboard || busy}
              onPress={paste}
            />
            <BarButton icon="refresh-outline" label="Refresh" onPress={refresh} />
          </>
        )}
      </View>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: colors.text }]}>
          <Text style={[styles.toastText, { color: colors.background }]}>{toast}</Text>
        </View>
      ) : null}

      <Sheet
        visible={!!sheetFor}
        title={sheetFor?.name}
        subtitle={
          sheetFor ? (sheetFor.isDirectory ? 'Folder' : formatBytes(sheetFor.size)) : undefined
        }
        actions={sheetFor ? entryActions(sheetFor) : []}
        onClose={() => setSheetFor(null)}
      />

      <Sheet
        visible={sortSheet}
        title="Sort by"
        actions={sortActions}
        onClose={() => setSortSheet(false)}
      />

      <PromptDialog
        visible={dialog.kind === 'newFolder'}
        title="New folder"
        label="Folder name"
        confirmTitle="Create"
        cancelTitle="Cancel"
        validate={(value) =>
          /[\\/:*?"<>|]/.test(value) ? 'A name cannot contain \\ / : * ? " < > |' : null
        }
        onSubmit={createFolder}
        onCancel={() => setDialog({ kind: 'none' })}
      />

      <PromptDialog
        visible={dialog.kind === 'rename'}
        title="Rename"
        label="New name"
        initialValue={dialog.kind === 'rename' ? dialog.entry.name : ''}
        confirmTitle="Rename"
        cancelTitle="Cancel"
        validate={(value) =>
          /[\\/:*?"<>|]/.test(value) ? 'A name cannot contain \\ / : * ? " < > |' : null
        }
        onSubmit={(value) => {
          if (dialog.kind === 'rename') rename(dialog.entry, value);
        }}
        onCancel={() => setDialog({ kind: 'none' })}
      />

      <ConfirmDialog
        visible={dialog.kind === 'delete'}
        title={dialog.kind === 'delete' && dialog.entries.length > 1 ? 'Delete items?' : 'Delete?'}
        message={
          dialog.kind === 'delete'
            ? `${
                dialog.entries.length === 1
                  ? dialog.entries[0].name
                  : `${dialog.entries.length} items`
              } will be permanently deleted. This cannot be undone.`
            : undefined
        }
        confirmTitle="Delete"
        cancelTitle="Cancel"
        destructive
        onConfirm={() => {
          if (dialog.kind === 'delete') remove(dialog.entries);
        }}
        onCancel={() => setDialog({ kind: 'none' })}
      />

      <DetailsDialog
        entry={dialog.kind === 'details' ? dialog.entry : null}
        onClose={() => setDialog({ kind: 'none' })}
      />
    </View>
  );
}

function extensionOf(name: string): string {
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(index) : '';
}

function stripExtension(name: string): string {
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(0, index) : name;
}

function BarButton({
  icon,
  label,
  onPress,
  danger,
  disabled,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const colors = useColors();
  const tint = danger ? colors.danger : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.barButton, (pressed || disabled) && { opacity: 0.45 }]}>
      <Ionicons name={icon} size={22} color={tint} />
      <Text style={[styles.barLabel, { color: tint }]}>{label}</Text>
    </Pressable>
  );
}

function DetailsDialog({ entry, onClose }: { entry: Entry | null; onClose: () => void }) {
  const colors = useColors();
  if (!entry) return null;
  const rows: [string, string][] = [
    ['Name', entry.name],
    ['Type', entry.isDirectory ? 'Folder' : entry.mimeType],
    ['Size', entry.isDirectory ? '\u2014' : formatBytes(entry.size)],
    ['Modified', formatDate(entry.modified)],
    ['Location', displayPath(entry.uri).replace(/\/[^/]+$/, '')],
  ];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.detailsBackdrop} onPress={onClose}>
        <Pressable style={[styles.detailsPanel, { backgroundColor: colors.card }]} onPress={() => {}}>
          <Text style={[styles.detailsTitle, { color: colors.text }]}>Details</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {rows.map(([label, value]) => (
              <View key={label} style={[styles.detailsRow, { borderTopColor: colors.border }]}>
                <Text style={[styles.detailsLabel, { color: colors.muted }]}>{label}</Text>
                <Text selectable style={[styles.detailsValue, { color: colors.text }]}>
                  {value}
                </Text>
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.detailsClose,
              { backgroundColor: colors.primary },
              pressed && { opacity: 0.7 },
            ]}>
            <Text style={[styles.detailsCloseText, { color: colors.onPrimary }]}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerPath: { fontSize: 11, marginTop: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bannerText: { flex: 1, fontSize: 13 },
  bannerAction: { fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  barButton: { alignItems: 'center', gap: 3, paddingHorizontal: spacing.md, paddingVertical: 4 },
  barLabel: { fontSize: 11, fontWeight: '600' },
  toast: {
    position: 'absolute',
    bottom: 110,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    maxWidth: '85%',
  },
  toastText: { fontSize: 13, fontWeight: '600' },
  detailsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  detailsPanel: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailsTitle: { fontSize: 18, fontWeight: '700' },
  detailsRow: { paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: 2 },
  detailsLabel: { fontSize: 12, fontWeight: '600' },
  detailsValue: { fontSize: 14 },
  detailsClose: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailsCloseText: { fontSize: 16, fontWeight: '600' },
});
