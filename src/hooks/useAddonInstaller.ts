'use client';

import { useState, useCallback, useEffect } from 'react';
import {
    requestDirectoryAccess,
    verifyBedrockWorldDirectory,
    installPack,
    scanInstalledPacks,
    isFileSystemAccessSupported
} from '@/utils/fileSystem';
import { extractAddonFile, isValidAddonFile } from '@/utils/zipHandler';
import { storeMetadata } from '@/utils/metadata';
import type { ParsedPack, InstalledPack, InstallationResult } from '@/types';

export interface UseAddonInstallerReturn {
    // State
    isSupported: boolean;
    isMounted: boolean;
    worldDirectory: FileSystemDirectoryHandle | null;
    directoryName: string | null;
    isLoading: boolean;
    error: string | null;
    pendingPacks: ParsedPack[];
    installedPacks: InstalledPack[];
    installationResults: InstallationResult[];

    // Actions
    selectWorldDirectory: () => Promise<void>;
    importAddonFile: (file: File) => Promise<void>;
    installAllPacks: () => Promise<void>;
    installSinglePack: (pack: ParsedPack) => Promise<InstallationResult>;
    refreshInstalledPacks: () => Promise<void>;
    clearPendingPacks: () => void;
    clearError: () => void;
    removePendingPack: (uuid: string) => void;
}

export function useAddonInstaller(): UseAddonInstallerReturn {
    const [isMounted, setIsMounted] = useState(false);
    const [isSupported, setIsSupported] = useState(true); // Default to true to avoid flash
    const [worldDirectory, setWorldDirectory] = useState<FileSystemDirectoryHandle | null>(null);
    const [directoryName, setDirectoryName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingPacks, setPendingPacks] = useState<ParsedPack[]>([]);
    const [installedPacks, setInstalledPacks] = useState<InstalledPack[]>([]);
    const [installationResults, setInstallationResults] = useState<InstallationResult[]>([]);

    // Check browser support only on client side to avoid hydration mismatch
    useEffect(() => {
        setIsMounted(true);
        setIsSupported(isFileSystemAccessSupported());
    }, []);

    const selectWorldDirectory = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const handle = await requestDirectoryAccess();

            if (handle) {
                const verification = await verifyBedrockWorldDirectory(handle);

                if (!verification.valid) {
                    setError(verification.message);
                    return;
                }

                setWorldDirectory(handle);
                setDirectoryName(handle.name);

                // Scan for installed packs
                const installed = await scanInstalledPacks(handle);
                setInstalledPacks(installed);
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const importAddonFile = useCallback(async (file: File) => {
        if (!isValidAddonFile(file)) {
            setError('Invalid file format. Please select a .mcpack or .mcaddon file.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const packs = await extractAddonFile(file);

            if (packs.length === 0) {
                setError('No valid packs found in the selected file.');
                return;
            }

            // Add to pending packs, avoiding duplicates
            setPendingPacks(prev => {
                const existingUuids = new Set(prev.map(p => p.manifest.header.uuid));
                const newPacks = packs.filter(p => !existingUuids.has(p.manifest.header.uuid));
                return [...prev, ...newPacks];
            });
        } catch (err) {
            setError(`Failed to extract addon: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const installSinglePack = useCallback(async (pack: ParsedPack): Promise<InstallationResult> => {
        if (!worldDirectory) {
            return {
                success: false,
                pack,
                message: 'No world directory selected.'
            };
        }

        const result = await installPack(worldDirectory, pack);

        if (result.success) {
            // Store metadata
            storeMetadata(pack);

            // Refresh installed packs
            const installed = await scanInstalledPacks(worldDirectory);
            setInstalledPacks(installed);

            // Remove from pending
            setPendingPacks(prev => prev.filter(p => p.manifest.header.uuid !== pack.manifest.header.uuid));
        }

        return {
            ...result,
            pack
        };
    }, [worldDirectory]);

    const installAllPacks = useCallback(async () => {
        if (!worldDirectory || pendingPacks.length === 0) return;

        setIsLoading(true);
        setInstallationResults([]);

        const results: InstallationResult[] = [];

        for (const pack of pendingPacks) {
            const result = await installSinglePack(pack);
            results.push(result);
        }

        setInstallationResults(results);
        setIsLoading(false);
    }, [worldDirectory, pendingPacks, installSinglePack]);

    const refreshInstalledPacks = useCallback(async () => {
        if (!worldDirectory) return;

        setIsLoading(true);
        try {
            const installed = await scanInstalledPacks(worldDirectory);
            setInstalledPacks(installed);
        } catch (err) {
            setError(`Failed to scan installed packs: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }, [worldDirectory]);

    const clearPendingPacks = useCallback(() => {
        setPendingPacks([]);
        setInstallationResults([]);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const removePendingPack = useCallback((uuid: string) => {
        setPendingPacks(prev => prev.filter(p => p.manifest.header.uuid !== uuid));
    }, []);

    return {
        isSupported,
        isMounted,
        worldDirectory,
        directoryName,
        isLoading,
        error,
        pendingPacks,
        installedPacks,
        installationResults,
        selectWorldDirectory,
        importAddonFile,
        installAllPacks,
        installSinglePack,
        refreshInstalledPacks,
        clearPendingPacks,
        clearError,
        removePendingPack
    };
}
