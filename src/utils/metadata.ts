import type { AddonMetadata, ParsedPack } from "@/types";

const METADATA_KEY = "bedrock_addon_metadata";

/**
 * Get all stored addon metadata from localStorage
 */
export function getAllMetadata(): Map<string, AddonMetadata> {
	try {
		const stored = localStorage.getItem(METADATA_KEY);
		if (stored) {
			const parsed = JSON.parse(stored);
			return new Map(Object.entries(parsed));
		}
	} catch (error) {
		console.error("Error reading metadata from localStorage:", error);
	}
	return new Map();
}

/**
 * Get metadata for a specific pack by UUID
 */
export function getMetadata(uuid: string): AddonMetadata | undefined {
	const allMetadata = getAllMetadata();
	return allMetadata.get(uuid);
}

/**
 * Store metadata for an installed pack
 */
export function storeMetadata(pack: ParsedPack): void {
	try {
		const allMetadata = getAllMetadata();

		const metadata: AddonMetadata = {
			uuid: pack.manifest.header.uuid,
			originalFileName: pack.originalFileName,
			installTimestamp: Date.now(),
			packName: pack.manifest.header.name,
			packType: pack.packType,
		};

		allMetadata.set(metadata.uuid, metadata);

		const obj = Object.fromEntries(allMetadata);
		localStorage.setItem(METADATA_KEY, JSON.stringify(obj));
	} catch (error) {
		console.error("Error storing metadata to localStorage:", error);
	}
}

/**
 * Remove metadata for a pack
 */
export function removeMetadata(uuid: string): void {
	try {
		const allMetadata = getAllMetadata();
		allMetadata.delete(uuid);

		const obj = Object.fromEntries(allMetadata);
		localStorage.setItem(METADATA_KEY, JSON.stringify(obj));
	} catch (error) {
		console.error("Error removing metadata from localStorage:", error);
	}
}

/**
 * Clear all metadata
 */
export function clearAllMetadata(): void {
	try {
		localStorage.removeItem(METADATA_KEY);
	} catch (error) {
		console.error("Error clearing metadata from localStorage:", error);
	}
}

/**
 * Format install timestamp to readable string
 */
export function formatInstallDate(timestamp: number): string {
	const date = new Date(timestamp);
	return date.toLocaleDateString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}
