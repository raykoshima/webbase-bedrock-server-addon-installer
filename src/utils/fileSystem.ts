import type {
	InstalledPack,
	PackManifest,
	PackType,
	ParsedPack,
	WorldPackEntry,
} from "@/types";

/**
 * Safely format version to string (handles both array and string formats)
 */
function formatVersion(
	version: [number, number, number] | string | number[],
): string {
	if (Array.isArray(version)) {
		return version.join(".");
	}
	return String(version);
}

/**
 * Strip JavaScript-style comments from JSON content
 * Minecraft Bedrock manifests often contain comments which are not valid JSON
 */
function stripJsonComments(content: string): string {
	let result = "";
	let inString = false;
	let inSingleLineComment = false;
	let inMultiLineComment = false;
	let i = 0;

	while (i < content.length) {
		const char = content[i];
		const nextChar = content[i + 1];

		if (inSingleLineComment) {
			if (char === "\n") {
				inSingleLineComment = false;
				result += char;
			}
			i++;
			continue;
		}

		if (inMultiLineComment) {
			if (char === "*" && nextChar === "/") {
				inMultiLineComment = false;
				i += 2;
				continue;
			}
			i++;
			continue;
		}

		if (inString) {
			result += char;
			if (char === "\\" && i + 1 < content.length) {
				result += nextChar;
				i += 2;
				continue;
			}
			if (char === '"') {
				inString = false;
			}
			i++;
			continue;
		}

		if (char === '"') {
			inString = true;
			result += char;
			i++;
			continue;
		}

		if (char === "/" && nextChar === "/") {
			inSingleLineComment = true;
			i += 2;
			continue;
		}

		if (char === "/" && nextChar === "*") {
			inMultiLineComment = true;
			i += 2;
			continue;
		}

		result += char;
		i++;
	}

	return result;
}

/**
 * Request directory access from the user
 */
export async function requestDirectoryAccess(): Promise<FileSystemDirectoryHandle | null> {
	try {
		// Check if File System Access API is supported
		if (!("showDirectoryPicker" in window)) {
			throw new Error(
				"File System Access API is not supported in this browser. Please use Chrome, Edge, or another Chromium-based browser.",
			);
		}

		const handle = await window.showDirectoryPicker({
			mode: "readwrite",
		});

		return handle;
	} catch (error) {
		if ((error as Error).name === "AbortError") {
			// User cancelled the picker
			return null;
		}
		throw error;
	}
}

/**
 * Verify the directory has the expected Bedrock server structure
 */
export async function verifyBedrockWorldDirectory(
	dirHandle: FileSystemDirectoryHandle,
): Promise<{ valid: boolean; message: string }> {
	try {
		// Check for behavior_packs and resource_packs directories
		let hasBehaviorPacks = false;
		let hasResourcePacks = false;

		for await (const entry of dirHandle.values()) {
			if (entry.kind === "directory") {
				if (entry.name === "behavior_packs") hasBehaviorPacks = true;
				if (entry.name === "resource_packs") hasResourcePacks = true;
			}
		}

		// If directories don't exist, we'll create them during installation
		if (!hasBehaviorPacks || !hasResourcePacks) {
			return {
				valid: true,
				message: "Pack directories will be created during installation.",
			};
		}

		return {
			valid: true,
			message: "Valid Bedrock world directory detected.",
		};
	} catch (error) {
		return {
			valid: false,
			message: `Error verifying directory: ${(error as Error).message}`,
		};
	}
}

/**
 * Get or create a directory handle
 */
async function getOrCreateDirectory(
	parentHandle: FileSystemDirectoryHandle,
	name: string,
): Promise<FileSystemDirectoryHandle> {
	return await parentHandle.getDirectoryHandle(name, { create: true });
}

/**
 * Write a file to the specified directory
 */
async function writeFile(
	dirHandle: FileSystemDirectoryHandle,
	fileName: string,
	data: Uint8Array,
): Promise<void> {
	const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
	const writable = await fileHandle.createWritable();
	// Type assertion needed due to TypeScript's strict ArrayBuffer typing
	await writable.write(new Blob([data as unknown as BlobPart]));
	await writable.close();
}

/**
 * Read a file as text from the specified directory
 */
async function readFileAsText(
	dirHandle: FileSystemDirectoryHandle,
	fileName: string,
): Promise<string | null> {
	try {
		const fileHandle = await dirHandle.getFileHandle(fileName);
		const file = await fileHandle.getFile();
		return await file.text();
	} catch {
		return null;
	}
}

/**
 * Read a file as blob from the specified directory
 */
async function readFileAsBlob(
	dirHandle: FileSystemDirectoryHandle,
	fileName: string,
): Promise<Blob | null> {
	try {
		const fileHandle = await dirHandle.getFileHandle(fileName);
		const file = await fileHandle.getFile();
		return file;
	} catch {
		return null;
	}
}

/**
 * Install a pack to the world directory
 */
export async function installPack(
	worldDirHandle: FileSystemDirectoryHandle,
	pack: ParsedPack,
): Promise<{ success: boolean; message: string; alreadyExists?: boolean }> {
	try {
		// Determine target directory
		const targetDirName =
			pack.packType === "behavior" ? "behavior_packs" : "resource_packs";
		const packsDir = await getOrCreateDirectory(worldDirHandle, targetDirName);

		// Check if pack already exists
		let packExists = false;
		try {
			await packsDir.getDirectoryHandle(pack.folderName);
			packExists = true;
		} catch {
			// Directory doesn't exist, which is fine
		}

		if (packExists) {
			// Check if it's the same version
			const existingManifest = await readManifestFromDirectory(
				packsDir,
				pack.folderName,
			);
			if (
				existingManifest &&
				existingManifest.header.uuid === pack.manifest.header.uuid
			) {
				const existingVersion = formatVersion(existingManifest.header.version);
				const newVersion = formatVersion(pack.manifest.header.version);

				if (existingVersion === newVersion) {
					return {
						success: false,
						message: `Pack "${pack.manifest.header.name}" v${newVersion} is already installed.`,
						alreadyExists: true,
					};
				}
			}
		}

		// Create pack directory
		const packDir = await getOrCreateDirectory(packsDir, pack.folderName);

		// Write all pack files
		for (const [relativePath, data] of pack.files) {
			if (relativePath.includes("/")) {
				// Handle nested directories
				const pathParts = relativePath.split("/");
				const fileName = pathParts.pop()!;
				let currentDir = packDir;

				for (const dirName of pathParts) {
					currentDir = await getOrCreateDirectory(currentDir, dirName);
				}

				await writeFile(currentDir, fileName, data);
			} else {
				await writeFile(packDir, relativePath, data);
			}
		}

		// Update world pack registration
		await registerPackInWorld(worldDirHandle, pack);

		return {
			success: true,
			message: `Successfully installed "${pack.manifest.header.name}" v${formatVersion(pack.manifest.header.version)}`,
		};
	} catch (error) {
		return {
			success: false,
			message: `Failed to install pack: ${(error as Error).message}`,
		};
	}
}

/**
 * Read manifest from an existing pack directory
 */
async function readManifestFromDirectory(
	packsDir: FileSystemDirectoryHandle,
	folderName: string,
): Promise<PackManifest | null> {
	try {
		const packDir = await packsDir.getDirectoryHandle(folderName);
		const manifestContent = await readFileAsText(packDir, "manifest.json");
		if (manifestContent) {
			return JSON.parse(stripJsonComments(manifestContent));
		}
	} catch {
		// Ignore errors
	}
	return null;
}

/**
 * Register pack in world JSON files
 */
async function registerPackInWorld(
	worldDirHandle: FileSystemDirectoryHandle,
	pack: ParsedPack,
): Promise<void> {
	const jsonFileName =
		pack.packType === "behavior"
			? "world_behavior_packs.json"
			: "world_resource_packs.json";

	// Read existing entries
	let entries: WorldPackEntry[] = [];
	const existingContent = await readFileAsText(worldDirHandle, jsonFileName);

	if (existingContent) {
		try {
			// Create backup
			const backupName = `${jsonFileName}.backup`;
			const encoder = new TextEncoder();
			await writeFile(
				worldDirHandle,
				backupName,
				encoder.encode(existingContent),
			);

			entries = JSON.parse(stripJsonComments(existingContent));
		} catch {
			entries = [];
		}
	}

	// Check for duplicate UUID
	const existingIndex = entries.findIndex(
		(e) => e.pack_id === pack.manifest.header.uuid,
	);

	const newEntry: WorldPackEntry = {
		pack_id: pack.manifest.header.uuid,
		version: pack.manifest.header.version,
	};

	if (existingIndex >= 0) {
		// Update existing entry
		entries[existingIndex] = newEntry;
	} else {
		// Add new entry
		entries.push(newEntry);
	}

	// Write updated entries
	const encoder = new TextEncoder();
	await writeFile(
		worldDirHandle,
		jsonFileName,
		encoder.encode(JSON.stringify(entries, null, 2)),
	);
}

/**
 * Scan for installed packs in the world directory
 */
export async function scanInstalledPacks(
	worldDirHandle: FileSystemDirectoryHandle,
): Promise<InstalledPack[]> {
	const installedPacks: InstalledPack[] = [];

	// Scan both behavior_packs and resource_packs directories
	const packDirs: { name: string; type: PackType }[] = [
		{ name: "behavior_packs", type: "behavior" },
		{ name: "resource_packs", type: "resource" },
	];

	for (const { name, type } of packDirs) {
		try {
			const packsDir = await worldDirHandle.getDirectoryHandle(name);

			for await (const entry of packsDir.values()) {
				if (entry.kind === "directory") {
					try {
						const packDir = await packsDir.getDirectoryHandle(entry.name);
						const manifestContent = await readFileAsText(
							packDir,
							"manifest.json",
						);

						if (manifestContent) {
							const manifest: PackManifest = JSON.parse(
								stripJsonComments(manifestContent),
							);

							// Try to load icon
							const iconBlob = await readFileAsBlob(packDir, "pack_icon.png");

							installedPacks.push({
								uuid: manifest.header.uuid,
								name: manifest.header.name,
								version: manifest.header.version,
								packType: type,
								folderName: entry.name,
								iconBlob: iconBlob || undefined,
								description: manifest.header.description,
							});
						}
					} catch (error) {
						console.error(`Error reading pack from ${entry.name}:`, error);
					}
				}
			}
		} catch {
			// Directory doesn't exist, skip
		}
	}

	return installedPacks;
}

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported(): boolean {
	return "showDirectoryPicker" in window;
}
