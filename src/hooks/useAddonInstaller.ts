'use client';

import { useState, useCallback, useEffect } from 'react';
import { extractAddonFile, isValidAddonFile } from '@/utils/zipHandler';
import { createExportZip, downloadBlob, generateExportFileName, exportSinglePack } from '@/utils/exportHandler';
import type { ParsedPack } from '@/types';

export interface ExportResult {
    success: boolean;
    pack?: ParsedPack;
    message: string;
}

export interface UseAddonInstallerReturn {
    // State
    isMounted: boolean;
    isLoading: boolean;
    error: string | null;
    pendingPacks: ParsedPack[];
    exportResults: ExportResult[];

    // Actions
    importAddonFile: (file: File) => Promise<void>;
    exportAllPacks: () => Promise<void>;
    exportSinglePackAction: (pack: ParsedPack) => Promise<ExportResult>;
    clearPendingPacks: () => void;
    clearError: () => void;
    removePendingPack: (uuid: string) => void;
}

export function useAddonInstaller(): UseAddonInstallerReturn {
    const [isMounted, setIsMounted] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [pendingPacks, setPendingPacks] = useState<ParsedPack[]>([]);
    const [exportResults, setExportResults] = useState<ExportResult[]>([]);

    // Set mounted state on client side
    useEffect(() => {
        setIsMounted(true);
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

    const exportSinglePackAction = useCallback(async (pack: ParsedPack): Promise<ExportResult> => {
        try {
            setIsLoading(true);
            const blob = await exportSinglePack(pack);
            const fileName = generateExportFileName([pack]);
            downloadBlob(blob, fileName);

            // Remove from pending after successful export
            setPendingPacks(prev => prev.filter(p => p.manifest.header.uuid !== pack.manifest.header.uuid));

            return {
                success: true,
                pack,
                message: `Successfully exported "${pack.manifest.header.name}"`
            };
        } catch (err) {
            return {
                success: false,
                pack,
                message: `Failed to export: ${(err as Error).message}`
            };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const exportAllPacks = useCallback(async () => {
        if (pendingPacks.length === 0) return;

        setIsLoading(true);
        setExportResults([]);

        try {
            const blob = await createExportZip(pendingPacks);
            const fileName = generateExportFileName(pendingPacks);
            downloadBlob(blob, fileName);

            const results: ExportResult[] = pendingPacks.map(pack => ({
                success: true,
                pack,
                message: `Successfully exported "${pack.manifest.header.name}"`
            }));

            setExportResults(results);

            // Clear pending packs after successful export
            setPendingPacks([]);
        } catch (err) {
            setError(`Failed to export packs: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }, [pendingPacks]);

    const clearPendingPacks = useCallback(() => {
        setPendingPacks([]);
        setExportResults([]);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const removePendingPack = useCallback((uuid: string) => {
        setPendingPacks(prev => prev.filter(p => p.manifest.header.uuid !== uuid));
    }, []);

    return {
        isMounted,
        isLoading,
        error,
        pendingPacks,
        exportResults,
        importAddonFile,
        exportAllPacks,
        exportSinglePackAction,
        clearPendingPacks,
        clearError,
        removePendingPack
    };
}
