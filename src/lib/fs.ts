import { Directory, File, Paths } from 'expo-file-system';

export type Entry = {
  uri: string;
  name: string;
  isDirectory: boolean;
  size: number;
  mimeType: string;
  modified: number | null;
  extension: string;
};

export type SortKey = 'name' | 'size' | 'date' | 'type';

/** Android shared storage. Falls back to the app's own folder when unavailable. */
export function defaultRoot(): Directory {
  try {
    const shared = new Directory('file:///storage/emulated/0');
    if (shared.exists) return shared;
  } catch {
    // Not Android, or the folder is not readable.
  }
  return Paths.document;
}

export function toEntry(item: Directory | File): Entry {
  if (item instanceof Directory) {
    return {
      uri: item.uri,
      name: item.name,
      isDirectory: true,
      size: 0,
      mimeType: 'inode/directory',
      modified: null,
      extension: '',
    };
  }
  return {
    uri: item.uri,
    name: item.name,
    isDirectory: false,
    size: item.size ?? 0,
    mimeType: item.type || 'application/octet-stream',
    modified: item.lastModified ?? null,
    extension: (item.extension || '').replace('.', '').toLowerCase(),
  };
}

export function listDirectory(uri: string): Entry[] {
  const dir = new Directory(uri);
  if (!dir.exists) throw new Error('This folder no longer exists.');
  return dir.list().map(toEntry);
}

export function sortEntries(entries: Entry[], key: SortKey, ascending: boolean): Entry[] {
  const direction = ascending ? 1 : -1;
  return [...entries].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
    let result = 0;
    if (key === 'name') {
      result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    } else if (key === 'size') {
      result = a.size - b.size;
    } else if (key === 'date') {
      result = (a.modified ?? 0) - (b.modified ?? 0);
    } else {
      result = a.extension.localeCompare(b.extension);
    }
    if (result === 0) {
      result = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
    }
    return result * direction;
  });
}

export function filterEntries(entries: Entry[], query: string): Entry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter((entry) => entry.name.toLowerCase().includes(q));
}

/** Depth- and count-limited recursive search, so a huge tree cannot freeze the UI. */
export function searchDirectory(uri: string, query: string, maxDepth = 4, limit = 200): Entry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const found: Entry[] = [];
  const walk = (dirUri: string, depth: number) => {
    if (depth > maxDepth || found.length >= limit) return;
    let items: Entry[];
    try {
      items = listDirectory(dirUri);
    } catch {
      return;
    }
    for (const item of items) {
      if (found.length >= limit) return;
      if (item.name.toLowerCase().includes(q)) found.push(item);
      if (item.isDirectory) walk(item.uri, depth + 1);
    }
  };
  walk(uri, 0);
  return found;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 100 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function formatDate(ms: number | null): string {
  if (!ms) return '—';
  const date = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function parentUri(uri: string): string | null {
  const clean = uri.replace(/\/+$/, '');
  const index = clean.lastIndexOf('/');
  if (index <= 'file://'.length) return null;
  return clean.slice(0, index);
}

export function displayPath(uri: string): string {
  return decodeURIComponent(uri.replace('file://', ''));
}

/** A name that does not collide with anything already in the folder. */
export function uniqueName(dirUri: string, base: string, extension = ''): string {
  const dir = new Directory(dirUri);
  const taken = (name: string) =>
    new File(dir, name).exists || new Directory(dir, name).exists;
  let candidate = `${base}${extension}`;
  let counter = 1;
  while (taken(candidate)) {
    candidate = `${base} (${counter})${extension}`;
    counter += 1;
  }
  return candidate;
}
