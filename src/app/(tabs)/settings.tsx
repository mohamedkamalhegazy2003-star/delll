import Ionicons from '@expo/vector-icons/Ionicons';
import Constants from 'expo-constants';
import { Paths } from 'expo-file-system';
import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Card } from '@/components/ui';
import { spacing, useColors } from '@/constants/theme';
import { formatBytes } from '@/lib/fs';

export default function AboutScreen() {
  const colors = useColors();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  let free = 0;
  let total = 0;
  try {
    free = Paths.availableDiskSpace ?? 0;
    total = Paths.totalDiskSpace ?? 0;
  } catch {
    // Not available on this platform.
  }

  const features = [
    'Browse folders and files on the device',
    'Open files with the app that handles them',
    'Copy, cut and paste, with automatic name de-duplication',
    'Rename, delete and create folders',
    'Search inside the current folder tree',
    'Sort by name, size, date or type',
    'File details: size, type, modified date, location',
  ];

  return (
    <Screen>
      <Card>
        <View style={styles.brandRow}>
          <View style={[styles.logo, { backgroundColor: colors.primary }]}>
            <Ionicons name="folder" size={26} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.appName, { color: colors.text }]}>FileX</Text>
            <Text style={[styles.version, { color: colors.muted }]}>Version {version}</Text>
          </View>
        </View>
        <Text style={[styles.body, { color: colors.muted }]}>
          A fast, minimal file manager for Android. No ads, no accounts, no network access.
        </Text>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Storage</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          {total > 0
            ? `${formatBytes(free)} free of ${formatBytes(total)}`
            : 'Storage information is not available on this platform.'}
        </Text>
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>What it does</Text>
        {features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
            <Text style={[styles.feature, { color: colors.muted }]}>{feature}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Permissions</Text>
        <Text style={[styles.body, { color: colors.muted }]}>
          FileX asks for access to shared storage so it can show your files. On Android 11 and
          newer, grant “All files access” in system settings if a folder appears empty.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  appName: { fontSize: 20, fontWeight: '700' },
  version: { fontSize: 13 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  feature: { flex: 1, fontSize: 14, lineHeight: 20 },
});
