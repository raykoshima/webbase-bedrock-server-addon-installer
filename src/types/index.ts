// Core types for the Bedrock Addon Installer

/**
 * Manifest versions are `[major, minor, patch]` in format_version 1/2 and a
 * "1.2.3" string in format_version 3. Parsing normalizes both to a triple so
 * the export registration JSONs always carry the array Bedrock requires.
 */
export type PackVersion = [number, number, number];

export interface ManifestHeader {
	uuid: string;
	version: PackVersion;
	name: string;
	description?: string;
	min_engine_version?: PackVersion;
}

/** Known module types; packs in the wild also carry others, so the field stays open */
export type KnownModuleType =
	| "data"
	| "resources"
	| "client_data"
	| "script"
	| "javascript"
	| "interface"
	| "world_template"
	| "skin_pack";

export interface ManifestModule {
	type: KnownModuleType | (string & {});
	uuid?: string;
	version?: PackVersion;
	description?: string;
}

export interface ManifestDependency {
	uuid?: string;
	module_name?: string;
	version: [number, number, number] | string;
}

export interface ManifestSubpack {
	folder_name: string;
	name: string;
	/** format_version 1/2 spelling */
	memory_tier?: number;
	/** format_version 3 spelling */
	memory_performance_tier?: number;
}

export interface PackManifest {
	format_version: number;
	header: ManifestHeader;
	modules: ManifestModule[];
	dependencies?: ManifestDependency[];
	subpacks?: ManifestSubpack[];
}

export type PackType = "behavior" | "resource";

export interface ParsedPack {
	manifest: PackManifest;
	packType: PackType;
	folderName: string;
	originalFileName: string;
	displayName?: string; // Preferred UI name (e.g. pack folder name from an exported archive)
	files: Map<string, Uint8Array>;
	iconBlob?: Blob;
	relativePath: string; // Path within the archive where manifest was found
	selectedSubpack?: string;
}

export interface InstalledPack {
	uuid: string;
	name: string;
	version: [number, number, number];
	packType: PackType;
	folderName: string;
	iconBlob?: Blob;
	description?: string;
}

export interface WorldPackEntry {
	pack_id: string;
	version: [number, number, number];
	subpack?: string;
}

export interface AddonMetadata {
	uuid: string;
	originalFileName: string;
	installTimestamp: number;
	packName: string;
	packType: PackType;
}

export interface InstallationResult {
	success: boolean;
	pack: ParsedPack;
	message: string;
	alreadyExists?: boolean;
}

// File System Access API types (extending built-in types)
export interface FileSystemPermissionDescriptor {
	mode: "read" | "readwrite";
}

declare global {
	interface FileSystemHandle {
		queryPermission(
			descriptor: FileSystemPermissionDescriptor,
		): Promise<PermissionState>;
		requestPermission(
			descriptor: FileSystemPermissionDescriptor,
		): Promise<PermissionState>;
	}

	interface FileSystemDirectoryHandle {
		values(): AsyncIterableIterator<FileSystemHandle>;
		getDirectoryHandle(
			name: string,
			options?: { create?: boolean },
		): Promise<FileSystemDirectoryHandle>;
		getFileHandle(
			name: string,
			options?: { create?: boolean },
		): Promise<FileSystemFileHandle>;
	}

	interface FileSystemFileHandle {
		getFile(): Promise<File>;
		createWritable(): Promise<FileSystemWritableFileStream>;
	}

	interface FileSystemWritableFileStream extends WritableStream {
		write(data: BufferSource | Blob | string): Promise<void>;
		close(): Promise<void>;
	}

	interface Window {
		showDirectoryPicker(options?: {
			mode?: "read" | "readwrite";
		}): Promise<FileSystemDirectoryHandle>;
	}
}
