# FileX

A fast, minimal file manager for Android. Browse, open, move and organise the files on
your phone — no ads, no accounts, no network access.

Built with Expo (React Native + TypeScript).

---

## Features

| | |
|---|---|
| **Browse** | Walk the whole device tree, starting at shared storage. Path shown in the header, one tap to go up. |
| **Open** | Files open in whichever app handles their type (Android `ACTION_VIEW`). |
| **Copy / Cut / Paste** | Single item or multi-select. Name collisions are resolved automatically (`photo (1).jpg`). |
| **Rename** | Inline prompt with validation for characters Android forbids. |
| **Delete** | Confirmation dialog, single or batch. |
| **New folder** | Created in the folder you are currently viewing. |
| **Search** | Recursive search inside the current folder tree, depth- and result-limited so a huge tree cannot freeze the UI. |
| **Details** | Name, MIME type, size, last-modified date and location. |
| **Sort** | By name, size, date modified or type — ascending or descending. Folders always stay on top. |

### Design

One screen, one job. A compact header (back, folder name, path, sort), a search field, a
flat list of rows with type-coloured icons, and a three-button action bar at the bottom.
Long-press any row for the full action sheet. Light and dark themes follow the system
setting. No decorative chrome, no onboarding, no splash screens to dismiss.

---

## Download the APK

The APK is built automatically by GitHub Actions on every push to `main`.

1. Open the **Actions** tab of this repository.
2. Pick the newest **Build APK** run (green check).
3. Scroll to **Artifacts** and download **`filex-apk`**.
4. Unzip it — you get `filex.apk`.
5. Copy it to your Android phone and tap it. Allow *Install unknown apps* for your file
   manager or browser when Android asks.

> The APK is signed with the standard Android debug key, which is what makes it
> installable straight from an artifact. It is fine for personal use and testing; for
> Google Play you need your own release keystore.

### First launch

FileX asks for storage access. On **Android 11+** the system may only grant media access
by default — if a folder looks empty, open **Settings → Apps → FileX → Permissions** and
enable **All files access** (or *Files and media → Allow management of all files*).

---

## Build it yourself

### Option A — GitHub Actions (no local toolchain)

Push to `main`. The workflow in `.github/workflows/build-apk.yml` runs
`expo prebuild` and `./gradlew assembleRelease` on an Ubuntu runner and uploads the APK.
You can also trigger it by hand from **Actions → Build APK → Run workflow**.

### Option B — locally

Requirements: Node.js 20+, JDK 17, Android SDK (platform 35, build-tools 35).

```bash
npm install
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

### Option C — Expo EAS (cloud build, needs a free Expo account)

```bash
npm install -g eas-cli
eas login
eas init
eas build --platform android --profile preview
```

`eas.json` already defines a `preview` profile that produces an APK rather than an AAB.

### Run in development

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on the phone, or press `a` for an Android emulator.

---

## Project layout

```
src/
  app/
    (tabs)/
      index.tsx        the file browser: list, search, sort, selection, actions
      settings.tsx     about screen, storage figures, feature list
      _layout.tsx      tab bar
    _layout.tsx        root stack + theme provider
  components/
    file-row.tsx       one list row: icon, name, size/date
    sheet.tsx          bottom action sheet
    prompt-dialog.tsx  single-field prompt (rename, new folder)
    screen.tsx         safe-area page container
    ui/                Button, Card, TextField, EmptyState, ConfirmDialog
  lib/
    fs.ts              filesystem layer: listing, sorting, search, formatting
  constants/theme.ts   light/dark palette and spacing scale
```

All filesystem work goes through `src/lib/fs.ts`, which wraps `expo-file-system`'s
`File` / `Directory` API. Screens never touch the native module directly, so the storage
backend can be swapped without rewriting the UI.

---

## Permissions

| Permission | Why |
|---|---|
| `READ_EXTERNAL_STORAGE` | List files on Android 10 and below. |
| `WRITE_EXTERNAL_STORAGE` | Rename, move and delete on Android 10 and below. |
| `MANAGE_EXTERNAL_STORAGE` | Full tree access on Android 11+. Granted by the user in system settings. |
| `READ_MEDIA_IMAGES` / `_VIDEO` / `_AUDIO` | Media access on Android 13+ when all-files access is not granted. |

FileX makes no network requests and collects no data.

---

## Tech

- Expo SDK 57 · React Native 0.86 · React 19
- TypeScript (strict)
- `expo-router` for navigation
- `expo-file-system` (new `File`/`Directory` API) for all storage operations
- `expo-intent-launcher` to hand files to other apps
- `expo-haptics` for selection feedback

> `package-lock.json` is not committed. The CI workflow uses `npm install`, which resolves
dependencies from `package.json`. Run `npm install` once locally to generate a lockfile
if you want fully reproducible builds.

## License

MIT
