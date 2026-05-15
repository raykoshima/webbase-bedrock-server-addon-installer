# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser-based Minecraft Bedrock addon management tool. Fully client-side — no backend, no database, no authentication. Thai-language UI. Users drag-drop `.mcpack`/`.mcaddon`/`.zip` files, review/reorder packs, then export a Bedrock-server-compatible ZIP with registration JSONs.

## Commands

```bash
npm run dev          # Start dev server (Next.js, port 3000)
npm run build        # Production build
npm run start        # Serve production build
npm run lint         # Lint with Biome
npm run lint:fix     # Auto-fix lint issues
```

No test framework is configured.

## Tech Stack

- **Next.js 16** (App Router, single client-side page)
- **React 19** with hooks-based state management (no external state library)
- **TypeScript** (strict mode, path alias `@/*` → `./src/*`)
- **CSS Modules** (component-scoped, dark theme)
- **Biome** for linting/formatting (tabs, organized imports)
- **JSZip** for archive handling

## Architecture

Single-page app with a two-step workflow: Import → Review/Export.

### Core flow

```
FileDropZone (drag-drop/click upload)
  → useAddonInstaller hook (central state: pendingPacks, error, isLoading, exportResults)
    → zipHandler.ts: extractFromZip() parses archives, strips JSON comments from manifests,
      deduplicates by UUID, classifies packs as behavior/resource
    → exportHandler.ts: createExportZip() organizes into behavior_packs/ + resource_packs/
      directories, generates world_*_packs.json registration files, triggers download
```

### Key modules

| Module | Role |
|--------|------|
| `src/hooks/useAddonInstaller.ts` | Central state + all user actions (import, export, reorder, remove) |
| `src/utils/zipHandler.ts` | ZIP extraction, manifest parsing, JSON comment stripping, pack type classification |
| `src/utils/exportHandler.ts` | Creates export ZIP with correct Bedrock directory structure and registration files |
| `src/utils/fileSystem.ts` | File System Access API integration for direct-to-disk installation (Chromium only, not yet wired into main UI) |
| `src/utils/metadata.ts` | localStorage persistence for installed pack metadata |
| `src/types/index.ts` | All type definitions including File System API type augmentations |

### Component structure

`page.tsx` renders `FileDropZone` → `PendingPacksList` (contains `PackCard` items with drag-reorder). `PendingPacksList` separates behavior and resource packs visually. `DirectorySelector` and `InstalledPacksList` exist but are not yet integrated into the main page flow.

## Minecraft-specific considerations

- Manifest JSON files contain comments — `stripJsonComments()` in zipHandler.ts handles this before parsing.
- Archives can be nested (`.mcaddon` containing `.mcpack` files) — extraction is recursive.
- Pack type (behavior vs resource) is determined by manifest module types (`data`/`script` = behavior, `resources` = resource).
- Export ZIP must match Bedrock server structure: `behavior_packs/`, `resource_packs/`, `world_behavior_packs.json`, `world_resource_packs.json`.
- Packs are deduplicated by UUID from the manifest header.

## Browser requirements

File System Access API (used in fileSystem.ts) requires Chromium 88+. Core import/export flow works in any modern browser.
