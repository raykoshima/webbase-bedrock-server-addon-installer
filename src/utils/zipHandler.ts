import JSZip from "jszip";
import type { PackManifest, PackType, ParsedPack } from "@/types";
import {
	type ArchiveKind,
	hasArchiveExtension,
	hasTarExtension,
	NESTED_ARCHIVE_EXTENSIONS,
	sniffArchiveKind,
} from "./archiveDetect";
import { parseLenientJson } from "./jsonComments";
import { normalizeManifest } from "./manifestNormalize";
import { loadTarGzAsZip } from "./tarHandler";

export const SUPPORTED_EXTENSIONS = NESTED_ARCHIVE_EXTENSIONS;

/**
 * Archives can nest arbitrarily (a .zip of .mcaddon of .mcpack). Cap the
 * recursion so a malformed or hostile archive cannot spin forever.
 */
const MAX_NESTING_DEPTH = 8;

/** Context threaded through the recursive walk */
interface ExtractContext {
	depth: number;
	/** Human-readable trail of the archives we descended through, outermost first */
	trail: string[];
}

function rootContext(fileName: string): ExtractContext {
	return { depth: 0, trail: [fileName] };
}

function descend(context: ExtractContext, entryName: string): ExtractContext {
	return {
		depth: context.depth + 1,
		trail: [...context.trail, entryName],
	};
}

/** The archive a pack came from, used as the pack's originalFileName */
function innermostArchive(context: ExtractContext): string {
	return context.trail[context.trail.length - 1];
}

/** "outer.zip › inner.mcaddon › pack.mcpack", for diagnostics */
function describeTrail(context: ExtractContext): string {
	return context.trail.join(" › ");
}

function stripArchiveExtension(fileName: string): string {
	return fileName.replace(
		/\.(mcpack|mcaddon|zip|tgz|tar|tar\.gz)$/i,
		"",
	);
}

function baseName(path: string): string {
	return path.split("/").pop() || path;
}

/**
 * Open a nested archive entry. Returns undefined when the bytes are not
 * actually an archive (e.g. a texture that happens to be named "foo.zip").
 */
async function openNestedArchive(
	data: Uint8Array,
	entryPath: string,
): Promise<JSZip | undefined> {
	const kind: ArchiveKind | undefined =
		sniffArchiveKind(data) ?? (hasTarExtension(entryPath) ? "tar" : undefined);
	if (!kind) {
		return undefined;
	}

	// Copy into a standalone buffer: JSZip entry data may be a view onto the
	// parent archive's buffer, and both loaders expect to own their input.
	const buffer = data.slice().buffer as ArrayBuffer;

	if (kind === "tar") {
		return loadTarGzAsZip(buffer);
	}
	return JSZip.loadAsync(buffer);
}

/**
 * Files that mark an archive as a Minecraft *world* rather than an addon.
 * A world's packs belong to that world, so worlds are skipped entirely — even
 * when renamed to .zip (e.g. "world (3).mcworld.zip"), which extension checks
 * alone would not catch.
 */
const WORLD_MARKER_FILES = ["level.dat", "levelname.txt", "level.dat_old"];

/**
 * Is this archive a world (.mcworld / .mctemplate, however it is named)?
 */
function isWorldArchive(zip: JSZip): boolean {
	return WORLD_MARKER_FILES.some((marker) => zip.file(marker) !== null);
}

/**
 * Check if a ZIP file has the exported structure
 * (behavior_packs/, resource_packs/, world_behavior_packs.json, world_resource_packs.json)
 */
function isExportedZipStructure(zip: JSZip): boolean {
	const files = Object.keys(zip.files);

	// Check for the presence of exported structure indicators
	const hasBehaviorPacks = files.some(
		(path) => path.startsWith("behavior_packs/") && !zip.files[path].dir,
	);
	const hasResourcePacks = files.some(
		(path) => path.startsWith("resource_packs/") && !zip.files[path].dir,
	);
	const hasWorldBehaviorJson = files.includes("world_behavior_packs.json");
	const hasWorldResourceJson = files.includes("world_resource_packs.json");

	// If it has at least behavior_packs or resource_packs folder with the JSON files, it's an exported zip
	return (
		(hasBehaviorPacks || hasResourcePacks) &&
		(hasWorldBehaviorJson || hasWorldResourceJson)
	);
}

/**
 * Extract packs from an exported ZIP structure.
 * behavior_packs/ and resource_packs/ may hold either unpacked pack folders or
 * zipped packs (some tools zip each pack individually), so both shapes are
 * handled here.
 */
async function extractFromExportedZip(
	zip: JSZip,
	context: ExtractContext,
): Promise<ParsedPack[]> {
	const parsedPacks: ParsedPack[] = [];

	// Pack folders (behavior_packs/<name>/...) and zipped packs
	// (behavior_packs/<name>.zip) found directly under the pack directories
	const packFolders = new Set<string>();
	const zippedPackPaths: string[] = [];

	zip.forEach((relativePath, zipEntry) => {
		if (zipEntry.dir) return;

		const match = relativePath.match(
			/^(behavior_packs|resource_packs)\/([^/]+)(\/?)/,
		);
		if (!match) return;

		const [, packDir, entryName, separator] = match;
		if (separator === "/") {
			packFolders.add(`${packDir}/${entryName}`);
		} else if (hasArchiveExtension(entryName)) {
			zippedPackPaths.push(relativePath);
		}
	});

	// Unpacked pack folders
	for (const packFolder of packFolders) {
		const folderPacks = await extractPackFromFolder(zip, packFolder, context);
		parsedPacks.push(...folderPacks);
	}

	// Zipped packs sitting directly inside behavior_packs/ or resource_packs/
	for (const zippedPackPath of zippedPackPaths) {
		const { packs } = await extractNestedArchive(zip, zippedPackPath, context);
		parsedPacks.push(...packs);
	}

	return parsedPacks;
}

/**
 * Read a single pack out of a known pack folder (exported-layout archives).
 * Returns an empty array when the folder holds no manifest.
 */
async function extractPackFromFolder(
	zip: JSZip,
	packFolder: string,
	context: ExtractContext,
): Promise<ParsedPack[]> {
	try {
		const manifestPath = `${packFolder}/manifest.json`;
		if (!zip.file(manifestPath)) {
			// Not every folder under behavior_packs/ is a pack (a zipped pack's
			// sibling folders, stray metadata, ...) — skip quietly.
			return [];
		}

		const manifest = await readManifest(zip, manifestPath, context);
		if (!manifest) {
			return [];
		}

		const folderName = baseName(packFolder);
		const { files, iconBlob } = await collectPackFiles(
			zip,
			`${packFolder}/`,
			() => true,
		);

		return [
			{
				manifest,
				packType: determinePackType(manifest),
				folderName,
				originalFileName: innermostArchive(context),
				displayName: folderName,
				files,
				iconBlob,
				relativePath: `${packFolder}/`,
				selectedSubpack: defaultSubpack(manifest),
			},
		];
	} catch (error) {
		console.error(
			`Error parsing pack at ${packFolder} in ${describeTrail(context)}:`,
			error,
		);
		return [];
	}
}

/**
 * Extract and parse an addon file
 * (.mcpack, .mcaddon, .zip, .tar.gz, .tgz, .tar).
 * Nested archives of any of those formats are extracted recursively.
 * World archives (.mcworld / .mctemplate) are skipped wherever they appear.
 */
export async function extractAddonFile(file: File): Promise<ParsedPack[]> {
	const arrayBuffer = await file.arrayBuffer();
	const bytes = new Uint8Array(arrayBuffer);
	const kind: ArchiveKind | undefined =
		sniffArchiveKind(bytes) ?? (hasTarExtension(file.name) ? "tar" : undefined);

	if (!kind) {
		throw new Error("ไฟล์นี้ไม่ใช่ archive ที่รองรับ (.zip, .mcpack, .tar.gz)");
	}

	const zip =
		kind === "tar"
			? await loadTarGzAsZip(arrayBuffer)
			: await JSZip.loadAsync(arrayBuffer);

	return extractFromArchive(zip, rootContext(file.name));
}

/**
 * Extract every pack reachable from an already-loaded archive.
 *
 * An archive may hold, in any combination:
 *  - the exported server layout (behavior_packs/, resource_packs/, world_*.json)
 *  - nested archives (.mcpack/.mcaddon/.zip/.tar.gz), recursively
 *  - loose pack folders, each with its own manifest.json
 * All three are collected, so a mixed archive never silently drops packs.
 * World archives are skipped: their packs belong to that world, not the server.
 */
async function extractFromArchive(
	zip: JSZip,
	context: ExtractContext,
): Promise<ParsedPack[]> {
	if (isWorldArchive(zip)) {
		console.warn(`Skipping world archive ${describeTrail(context)}`);
		return [];
	}

	if (isExportedZipStructure(zip)) {
		return extractFromExportedZip(zip, context);
	}

	const manifestPaths: string[] = [];
	const nestedArchivePaths: string[] = [];

	zip.forEach((relativePath, zipEntry) => {
		if (zipEntry.dir) return;

		const name = baseName(relativePath).toLowerCase();
		if (name === "manifest.json") {
			manifestPaths.push(relativePath);
		} else if (hasArchiveExtension(relativePath)) {
			nestedArchivePaths.push(relativePath);
		}
	});

	const parsedPacks: ParsedPack[] = [];

	// Paths that really were archives, so loose packs can exclude them without
	// also dropping a pack asset that merely happens to be named "*.zip"
	const consumedArchivePaths = new Set<string>();

	// Nested archives first, so their packs keep the order they appear in
	for (const nestedPath of nestedArchivePaths) {
		const { packs, wasArchive } = await extractNestedArchive(
			zip,
			nestedPath,
			context,
		);
		if (wasArchive) {
			consumedArchivePaths.add(nestedPath);
		}
		parsedPacks.push(...packs);
	}

	// Loose pack folders. Manifests that live *inside* a nested archive are not
	// listed here (they are not entries of this archive), so there is no overlap.
	const loosePacks = await extractLoosePacks(
		zip,
		manifestPaths,
		consumedArchivePaths,
		context,
	);
	parsedPacks.push(...loosePacks);

	return parsedPacks;
}

/** Outcome of descending into one nested entry */
interface NestedArchiveResult {
	packs: ParsedPack[];
	/** False when the entry was not actually an archive, so it stays a pack file */
	wasArchive: boolean;
}

/**
 * Open one nested archive entry and recurse into it.
 * Never throws: a single corrupt member must not fail the whole import.
 */
async function extractNestedArchive(
	zip: JSZip,
	entryPath: string,
	context: ExtractContext,
): Promise<NestedArchiveResult> {
	if (context.depth >= MAX_NESTING_DEPTH) {
		console.warn(
			`Nesting depth limit (${MAX_NESTING_DEPTH}) reached, skipping ${entryPath} in ${describeTrail(context)}`,
		);
		// Treat as consumed: we deliberately will not descend, and shipping a
		// deeply-nested archive as a pack asset would be wrong either way.
		return { packs: [], wasArchive: true };
	}

	try {
		const data = await zip.file(entryPath)?.async("uint8array");
		if (!data || data.length === 0) {
			return { packs: [], wasArchive: false };
		}

		const entryName = baseName(entryPath);
		const nestedZip = await openNestedArchive(data, entryPath);
		if (!nestedZip) {
			// Named like an archive but not one — e.g. a resource file called *.zip
			return { packs: [], wasArchive: false };
		}

		const packs = await extractFromArchive(
			nestedZip,
			descend(context, entryName),
		);
		return { packs, wasArchive: true };
	} catch (error) {
		console.error(
			`Error extracting nested archive ${entryPath} in ${describeTrail(context)}:`,
			error,
		);
		// It looked like an archive and failed to open; do not ship it as an asset
		return { packs: [], wasArchive: true };
	}
}

/**
 * Parse packs from manifests that sit directly in this archive (not inside a
 * nested archive). Each manifest's directory defines the pack's file set.
 */
async function extractLoosePacks(
	zip: JSZip,
	manifestPaths: string[],
	consumedArchivePaths: ReadonlySet<string>,
	context: ExtractContext,
): Promise<ParsedPack[]> {
	const parsedPacks: ParsedPack[] = [];

	// Directories that contain a manifest: used to keep a root-level manifest
	// from swallowing files that belong to a sibling pack in a subfolder.
	const manifestDirs = manifestPaths.map((path) =>
		path.substring(0, path.lastIndexOf("/") + 1),
	);

	for (const manifestPath of manifestPaths) {
		try {
			const manifest = await readManifest(zip, manifestPath, context);
			if (!manifest) continue;

			const manifestDir = manifestPath.substring(
				0,
				manifestPath.lastIndexOf("/") + 1,
			);

			// Files under a *deeper* manifest dir belong to that pack, not this one
			const otherPackDirs = manifestDirs.filter(
				(dir) => dir !== manifestDir && dir.startsWith(manifestDir),
			);

			const { files, iconBlob } = await collectPackFiles(
				zip,
				manifestDir,
				(relativePath) => {
					const fullPath = `${manifestDir}${relativePath}`;
					// Exclude entries already extracted as packs of their own; a file
					// merely *named* like an archive stays part of this pack.
					if (consumedArchivePaths.has(fullPath)) return false;
					return !otherPackDirs.some((dir) => fullPath.startsWith(dir));
				},
			);

			parsedPacks.push({
				manifest,
				packType: determinePackType(manifest),
				folderName: determineFolderName(manifestPath, manifest, context),
				originalFileName: innermostArchive(context),
				displayName: determineDisplayName(manifestPath, manifest, context),
				files,
				iconBlob,
				relativePath: manifestDir,
				selectedSubpack: defaultSubpack(manifest),
			});
		} catch (error) {
			console.error(
				`Error parsing manifest at ${manifestPath} in ${describeTrail(context)}:`,
				error,
			);
		}
	}

	return parsedPacks;
}

/**
 * Read every file under `prefix` into a pack file map, keyed by the path
 * relative to the pack root. `accept` filters out files owned by other packs.
 */
async function collectPackFiles(
	zip: JSZip,
	prefix: string,
	accept: (relativePath: string) => boolean,
): Promise<{ files: Map<string, Uint8Array>; iconBlob?: Blob }> {
	const files = new Map<string, Uint8Array>();
	let iconBlob: Blob | undefined;

	for (const [path, zipEntry] of Object.entries(zip.files)) {
		if (zipEntry.dir) continue;
		if (prefix && !path.startsWith(prefix)) continue;

		const relativePath = prefix ? path.substring(prefix.length) : path;
		if (relativePath === "" || !accept(relativePath)) continue;

		const data = await zipEntry.async("uint8array");
		files.set(relativePath, data);

		if (relativePath.toLowerCase() === "pack_icon.png") {
			// Copy so the Blob owns an ArrayBuffer of its own
			iconBlob = new Blob([new Uint8Array(data)], { type: "image/png" });
		}
	}

	return { files, iconBlob };
}

/**
 * Parse a manifest entry into a normalized manifest, or undefined when the file
 * is unparseable or not a usable pack manifest (skin packs and world templates
 * carry a manifest but no server-installable pack, as do stray manifest.json
 * files inside a pack's subfolders).
 */
async function readManifest(
	zip: JSZip,
	manifestPath: string,
	context: ExtractContext,
): Promise<PackManifest | undefined> {
	const content = await zip.file(manifestPath)?.async("string");
	if (!content) return undefined;

	let manifest: PackManifest;
	try {
		manifest = normalizeManifest(parseLenientJson<PackManifest>(content));
	} catch (error) {
		console.warn(
			`Unparseable manifest at ${manifestPath} in ${describeTrail(context)}:`,
			error,
		);
		return undefined;
	}

	if (!isUsablePackManifest(manifest)) {
		console.warn(
			`Skipping manifest without usable header/modules at ${manifestPath} in ${describeTrail(context)}`,
		);
		return undefined;
	}

	return manifest;
}

/**
 * A manifest is usable only when it carries the header UUID/version the export
 * registration JSONs need, plus at least one module to classify the pack by.
 * Versions are normalized before this runs, so an array is expected here.
 */
function isUsablePackManifest(manifest: PackManifest | undefined): boolean {
	return Boolean(
		manifest?.header?.uuid &&
			Array.isArray(manifest.header.version) &&
			Array.isArray(manifest.modules) &&
			manifest.modules.length > 0,
	);
}

/** Highest memory tier subpack is the default, matching Bedrock's behaviour */
function defaultSubpack(manifest: PackManifest): string | undefined {
	const subpacks = manifest.subpacks;
	return subpacks && subpacks.length > 0
		? subpacks[subpacks.length - 1].folder_name
		: undefined;
}

/**
 * Determine pack type based on module types in manifest
 */
function determinePackType(manifest: PackManifest): PackType {
	for (const module of manifest.modules) {
		if (module.type === "data" || module.type === "script") {
			return "behavior";
		}
		if (module.type === "resources" || module.type === "client_data") {
			return "resource";
		}
	}
	// Default to resource if unable to determine
	return "resource";
}

function sanitizeFolderName(name: string): string {
	return name
		.replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
		.replace(/\s+/g, "_")
		.trim();
}

/**
 * Determine the folder name for the pack.
 * Prefers the folder the manifest already lives in, then the enclosing archive
 * name (a .mcpack is itself the pack folder), then the manifest pack name.
 */
function determineFolderName(
	manifestPath: string,
	manifest: PackManifest,
	context: ExtractContext,
): string {
	const pathSegments = manifestPath.split("/").filter(Boolean);

	// If manifest is in a subfolder, use that folder name
	if (pathSegments.length > 1) {
		return pathSegments[0];
	}

	// Root-level manifest: the archive itself is the pack folder
	const archiveName = sanitizeFolderName(
		stripArchiveExtension(innermostArchive(context)),
	);
	if (archiveName) {
		return archiveName;
	}

	return sanitizeFolderName(manifest.header.name) || "unnamed_pack";
}

/**
 * UI label for the pack. Nested packs would otherwise all show the outermost
 * archive's name, so prefer the pack folder, then the enclosing archive.
 */
function determineDisplayName(
	manifestPath: string,
	manifest: PackManifest,
	context: ExtractContext,
): string {
	const pathSegments = manifestPath.split("/").filter(Boolean);
	if (pathSegments.length > 1) {
		return pathSegments[0];
	}
	return (
		stripArchiveExtension(innermostArchive(context)) ||
		manifest.header.name ||
		"unnamed_pack"
	);
}

/**
 * Validate if a file is a valid addon format
 */
export function isValidAddonFile(file: File): boolean {
	return hasArchiveExtension(file.name);
}
