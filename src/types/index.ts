// Core types for the Bedrock Addon Installer

export interface ManifestHeader {
    uuid: string;
    version: [number, number, number];
    name: string;
    description?: string;
    min_engine_version?: [number, number, number];
}

export interface ManifestModule {
    type: 'data' | 'resources' | 'client_data' | 'script' | 'world_template';
    uuid: string;
    version: [number, number, number];
    description?: string;
}

export interface ManifestDependency {
    uuid?: string;
    module_name?: string;
    version: [number, number, number] | string;
}

export interface PackManifest {
    format_version: number;
    header: ManifestHeader;
    modules: ManifestModule[];
    dependencies?: ManifestDependency[];
}

export type PackType = 'behavior' | 'resource';

export interface ParsedPack {
    manifest: PackManifest;
    packType: PackType;
    folderName: string;
    originalFileName: string;
    files: Map<string, Uint8Array>;
    iconBlob?: Blob;
    relativePath: string; // Path within the archive where manifest was found
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
    mode: 'read' | 'readwrite';
}

declare global {
    interface FileSystemHandle {
        queryPermission(descriptor: FileSystemPermissionDescriptor): Promise<PermissionState>;
        requestPermission(descriptor: FileSystemPermissionDescriptor): Promise<PermissionState>;
    }
}
