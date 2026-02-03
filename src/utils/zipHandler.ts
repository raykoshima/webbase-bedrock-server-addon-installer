import JSZip from 'jszip';
import type { PackManifest, ParsedPack, PackType } from '@/types';

/**
 * Extract and parse an addon file (.mcpack or .mcaddon)
 * Both formats are ZIP files with renamed extensions
 */
export async function extractAddonFile(file: File): Promise<ParsedPack[]> {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const parsedPacks: ParsedPack[] = [];
    const manifestPaths: string[] = [];

    // Find all manifest.json files in the archive
    zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && relativePath.toLowerCase().endsWith('manifest.json')) {
            manifestPaths.push(relativePath);
        }
    });

    // Process each manifest found
    for (const manifestPath of manifestPaths) {
        try {
            const manifestContent = await zip.file(manifestPath)?.async('string');
            if (!manifestContent) continue;

            const manifest: PackManifest = JSON.parse(manifestContent);
            const packType = determinePackType(manifest);

            // Get the directory containing the manifest
            const manifestDir = manifestPath.substring(0, manifestPath.lastIndexOf('/') + 1);

            // Determine folder name
            const folderName = determineFolderName(manifestPath, manifest);

            // Collect all files belonging to this pack
            const files = new Map<string, Uint8Array>();
            let iconBlob: Blob | undefined;

            for (const [path, zipEntry] of Object.entries(zip.files)) {
                if (zipEntry.dir) continue;

                // Check if this file belongs to this pack's directory
                if (path.startsWith(manifestDir) || manifestDir === '') {
                    const relativePath = manifestDir ? path.substring(manifestDir.length) : path;

                    // Skip if this is a different pack's file (for root-level manifests)
                    if (manifestDir === '' && manifestPaths.length > 1) {
                        const pathSegments = path.split('/');
                        if (pathSegments.length > 1 && manifestPaths.some(mp =>
                            mp !== manifestPath && mp.startsWith(pathSegments[0] + '/')
                        )) {
                            continue;
                        }
                    }

                    const data = await zipEntry.async('uint8array');
                    files.set(relativePath, data);

                    // Check for pack icon
                    if (relativePath.toLowerCase() === 'pack_icon.png') {
                        iconBlob = new Blob([data], { type: 'image/png' });
                    }
                }
            }

            parsedPacks.push({
                manifest,
                packType,
                folderName,
                originalFileName: file.name,
                files,
                iconBlob,
                relativePath: manifestDir
            });
        } catch (error) {
            console.error(`Error parsing manifest at ${manifestPath}:`, error);
        }
    }

    return parsedPacks;
}

/**
 * Determine pack type based on module types in manifest
 */
function determinePackType(manifest: PackManifest): PackType {
    for (const module of manifest.modules) {
        if (module.type === 'data' || module.type === 'script') {
            return 'behavior';
        }
        if (module.type === 'resources' || module.type === 'client_data') {
            return 'resource';
        }
    }
    // Default to resource if unable to determine
    return 'resource';
}

/**
 * Determine the folder name for the pack
 * Uses existing folder structure or creates one from pack name
 */
function determineFolderName(manifestPath: string, manifest: PackManifest): string {
    const pathSegments = manifestPath.split('/').filter(Boolean);

    // If manifest is in a subfolder, use that folder name
    if (pathSegments.length > 1) {
        return pathSegments[0];
    }

    // Create folder name from pack name (replace spaces with underscores)
    return manifest.header.name
        .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
        .replace(/\s+/g, '_')
        .trim() || 'unnamed_pack';
}

/**
 * Validate if a file is a valid addon format
 */
export function isValidAddonFile(file: File): boolean {
    const validExtensions = ['.mcpack', '.mcaddon'];
    const fileName = file.name.toLowerCase();
    return validExtensions.some(ext => fileName.endsWith(ext));
}
