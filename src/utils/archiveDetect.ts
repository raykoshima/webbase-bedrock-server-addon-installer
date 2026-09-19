/**
 * Archive detection helpers.
 *
 * A nested entry inside an addon archive can be any container format users
 * happen to have: .mcpack / .mcaddon / .zip, or a tarball. Filenames in the wild
 * are unreliable (`Spells.mcaddon.zip`, `pack (1) (1).zip`), so extensions only
 * decide *how* to try opening an entry — magic-byte sniffing decides *whether*
 * an entry is an archive at all.
 */

/**
 * ZIP-family containers (all are ZIPs with a different extension).
 *
 * World containers (.mcworld / .mctemplate) are deliberately excluded: they are
 * whole worlds, not addons, so they are neither accepted as input nor recursed
 * into when found inside another archive.
 */
const ZIP_ARCHIVE_EXTENSIONS = [".mcpack", ".mcaddon", ".zip"] as const;

/** Tar-family containers */
const TAR_ARCHIVE_EXTENSIONS = [".tar.gz", ".tgz", ".tar"] as const;

export const NESTED_ARCHIVE_EXTENSIONS = [
	...ZIP_ARCHIVE_EXTENSIONS,
	...TAR_ARCHIVE_EXTENSIONS,
] as const;

export type ArchiveKind = "zip" | "tar";

const ZIP_MAGIC = [0x50, 0x4b] as const; // "PK"
const GZIP_MAGIC = [0x1f, 0x8b] as const;
const TAR_MAGIC = "ustar";
const TAR_MAGIC_OFFSET = 257;

function hasExtension(
	fileName: string,
	extensions: readonly string[],
): boolean {
	const lower = fileName.toLowerCase();
	return extensions.some((ext) => lower.endsWith(ext));
}

/** Does the name look like a ZIP-family container? */
export function hasZipExtension(fileName: string): boolean {
	return hasExtension(fileName, ZIP_ARCHIVE_EXTENSIONS);
}

/** Does the name look like a tar-family container? */
export function hasTarExtension(fileName: string): boolean {
	return hasExtension(fileName, TAR_ARCHIVE_EXTENSIONS);
}

/** Does the name look like any supported nested container? */
export function hasArchiveExtension(fileName: string): boolean {
	return hasExtension(fileName, NESTED_ARCHIVE_EXTENSIONS);
}

/**
 * Sniff the container format from the leading bytes.
 * Returns undefined when the bytes are not a recognised archive, which lets
 * callers skip files that merely *look* like archives by name.
 */
export function sniffArchiveKind(bytes: Uint8Array): ArchiveKind | undefined {
	if (bytes.length >= 2) {
		if (bytes[0] === ZIP_MAGIC[0] && bytes[1] === ZIP_MAGIC[1]) {
			return "zip";
		}
		if (bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1]) {
			return "tar";
		}
	}
	if (bytes.length >= TAR_MAGIC_OFFSET + TAR_MAGIC.length) {
		const magic = String.fromCharCode(
			...bytes.subarray(TAR_MAGIC_OFFSET, TAR_MAGIC_OFFSET + TAR_MAGIC.length),
		);
		if (magic === TAR_MAGIC) {
			return "tar";
		}
	}
	return undefined;
}
