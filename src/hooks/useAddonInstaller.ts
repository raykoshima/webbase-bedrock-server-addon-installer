"use client";

import { useCallback, useEffect, useState } from "react";
import type { ParsedPack } from "@/types";
import {
	createExportZip,
	downloadBlob,
	exportSinglePack,
	generateExportFileName,
} from "@/utils/exportHandler";
import { extractAddonFile, isValidAddonFile } from "@/utils/zipHandler";

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
	importAddonFiles: (files: File[]) => Promise<void>;
	exportAllPacks: () => Promise<void>;
	exportSinglePackAction: (pack: ParsedPack) => Promise<ExportResult>;
	clearPendingPacks: () => void;
	clearError: () => void;
	removePendingPack: (uuid: string) => void;
	reorderPendingPacks: (reorderedPacks: ParsedPack[]) => void;
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
			setError(
				"Invalid file format. Please select a .mcpack, .mcaddon, or .zip file.",
			);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const packs = await extractAddonFile(file);

			if (packs.length === 0) {
				setError("No valid packs found in the selected file.");
				return;
			}

			// Add to pending packs, avoiding duplicates
			setPendingPacks((prev) => {
				const existingUuids = new Set(prev.map((p) => p.manifest.header.uuid));
				const newPacks = packs.filter(
					(p) => !existingUuids.has(p.manifest.header.uuid),
				);
				return [...prev, ...newPacks];
			});
		} catch (err) {
			setError(`Failed to extract addon: ${(err as Error).message}`);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const importAddonFiles = useCallback(async (files: File[]) => {
		const validFiles = files.filter(isValidAddonFile);

		if (validFiles.length === 0) {
			setError(
				"No valid addon files selected. Please select .mcpack, .mcaddon, or .zip files.",
			);
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const allPacks: ParsedPack[] = [];

			for (const file of validFiles) {
				try {
					const packs = await extractAddonFile(file);
					allPacks.push(...packs);
				} catch (err) {
					console.error(`Failed to extract ${file.name}:`, err);
				}
			}

			if (allPacks.length === 0) {
				setError("No valid packs found in the selected files.");
				return;
			}

			// Check for duplicates within the batch
			const uuidToFiles = new Map<string, string[]>();
			for (const pack of allPacks) {
				const uuid = pack.manifest.header.uuid;
				const existing = uuidToFiles.get(uuid) || [];
				existing.push(pack.originalFileName);
				uuidToFiles.set(uuid, existing);
			}

			// Find duplicates within batch
			const batchDuplicates: string[] = [];
			for (const [_uuid, filenames] of uuidToFiles) {
				if (filenames.length > 1) {
					batchDuplicates.push(
						`"${filenames.join('" and "')}" (same pack UUID)`,
					);
				}
			}

			if (batchDuplicates.length > 0) {
				setError(
					`Duplicate packs detected in uploaded files: ${batchDuplicates.join("; ")}`,
				);
				return;
			}

			// Check for duplicates against existing pending packs
			const existingDuplicates: string[] = [];
			setPendingPacks((prev) => {
				const existingUuids = new Map(
					prev.map((p) => [p.manifest.header.uuid, p.originalFileName]),
				);

				for (const pack of allPacks) {
					const uuid = pack.manifest.header.uuid;
					if (existingUuids.has(uuid)) {
						existingDuplicates.push(
							`"${pack.originalFileName}" matches already queued "${existingUuids.get(uuid)}"`,
						);
					}
				}

				if (existingDuplicates.length > 0) {
					return prev; // Don't add any packs if duplicates found
				}

				return [...prev, ...allPacks];
			});

			if (existingDuplicates.length > 0) {
				setError(`Duplicate packs: ${existingDuplicates.join("; ")}`);
			}
		} catch (err) {
			setError(`Failed to extract addons: ${(err as Error).message}`);
		} finally {
			setIsLoading(false);
		}
	}, []);

	const exportSinglePackAction = useCallback(
		async (pack: ParsedPack): Promise<ExportResult> => {
			try {
				setIsLoading(true);
				const blob = await exportSinglePack(pack);
				const fileName = generateExportFileName([pack]);
				downloadBlob(blob, fileName);

				// Remove from pending after successful export
				setPendingPacks((prev) =>
					prev.filter(
						(p) => p.manifest.header.uuid !== pack.manifest.header.uuid,
					),
				);

				return {
					success: true,
					pack,
					message: `Successfully exported "${pack.manifest.header.name}"`,
				};
			} catch (err) {
				return {
					success: false,
					pack,
					message: `Failed to export: ${(err as Error).message}`,
				};
			} finally {
				setIsLoading(false);
			}
		},
		[],
	);

	const exportAllPacks = useCallback(async () => {
		if (pendingPacks.length === 0) return;

		setIsLoading(true);
		setExportResults([]);

		try {
			const blob = await createExportZip(pendingPacks);
			const fileName = generateExportFileName(pendingPacks);
			downloadBlob(blob, fileName);

			const results: ExportResult[] = pendingPacks.map((pack) => ({
				success: true,
				pack,
				message: `Successfully exported "${pack.manifest.header.name}"`,
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
		setPendingPacks((prev) =>
			prev.filter((p) => p.manifest.header.uuid !== uuid),
		);
	}, []);

	const reorderPendingPacks = useCallback((reorderedPacks: ParsedPack[]) => {
		setPendingPacks(reorderedPacks);
	}, []);

	return {
		isMounted,
		isLoading,
		error,
		pendingPacks,
		exportResults,
		importAddonFile,
		importAddonFiles,
		exportAllPacks,
		exportSinglePackAction,
		clearPendingPacks,
		clearError,
		removePendingPack,
		reorderPendingPacks,
	};
}
