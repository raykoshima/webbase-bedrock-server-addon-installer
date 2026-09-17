import JSZip from "jszip";

const BLOCK_SIZE = 512;
const GZIP_MAGIC = [0x1f, 0x8b] as const;

const HEADER = {
	name: { offset: 0, length: 100 },
	size: { offset: 124, length: 12 },
	typeFlag: { offset: 156, length: 1 },
	magic: { offset: 257, length: 6 },
	prefix: { offset: 345, length: 155 },
} as const;

const TYPE_FLAG = {
	regular: "0",
	regularLegacy: "\0",
	directory: "5",
	gnuLongName: "L",
	gnuLongLink: "K",
	paxExtended: "x",
	paxGlobal: "g",
} as const;

export interface TarEntry {
	path: string;
	data: Uint8Array;
}

const textDecoder = new TextDecoder("utf-8");

function isGzip(bytes: Uint8Array): boolean {
	return bytes[0] === GZIP_MAGIC[0] && bytes[1] === GZIP_MAGIC[1];
}

/**
 * Decompress gzip bytes using the browser-native DecompressionStream.
 * Plain (uncompressed) tar bytes are returned as-is.
 */
export async function gunzip(buffer: ArrayBuffer): Promise<Uint8Array> {
	const bytes = new Uint8Array(buffer);
	if (!isGzip(bytes)) {
		return bytes;
	}
	if (typeof DecompressionStream === "undefined") {
		throw new Error("เบราว์เซอร์นี้ไม่รองรับการแตกไฟล์ .tar.gz");
	}
	const stream = new Blob([bytes])
		.stream()
		.pipeThrough(new DecompressionStream("gzip"));
	const decompressed = await new Response(stream).arrayBuffer();
	return new Uint8Array(decompressed);
}

function readString(bytes: Uint8Array, offset: number, length: number): string {
	const slice = bytes.subarray(offset, offset + length);
	const nulIndex = slice.indexOf(0);
	const trimmed = nulIndex === -1 ? slice : slice.subarray(0, nulIndex);
	return textDecoder.decode(trimmed);
}

/**
 * Tar sizes are octal ASCII, but GNU tar uses base-256 (high bit set) for files > 8GB
 */
function readSize(bytes: Uint8Array, offset: number, length: number): number {
	if (bytes[offset] & 0x80) {
		let value = bytes[offset] & 0x7f;
		for (let i = 1; i < length; i++) {
			value = value * 256 + bytes[offset + i];
		}
		return value;
	}
	const text = readString(bytes, offset, length).trim();
	return text === "" ? 0 : Number.parseInt(text, 8);
}

function isZeroBlock(bytes: Uint8Array, offset: number): boolean {
	const block = bytes.subarray(offset, offset + BLOCK_SIZE);
	return block.every((byte) => byte === 0);
}

function roundUpToBlock(size: number): number {
	return Math.ceil(size / BLOCK_SIZE) * BLOCK_SIZE;
}

/**
 * Parse PAX extended header records ("<len> <key>=<value>\n") and return the path override if present
 */
function readPaxPath(data: Uint8Array): string | undefined {
	const text = textDecoder.decode(data);
	const match = text.match(/^\d+ path=(.*)$/m);
	return match ? match[1] : undefined;
}

/**
 * Strip leading "./" and "/" and reject entries containing ".." segments (path traversal)
 */
function normalizePath(path: string): string {
	const cleaned = path.replace(/^(\.\/)+/, "").replace(/^\/+/, "");
	const hasTraversal = cleaned.split("/").some((segment) => segment === "..");
	return hasTraversal ? "" : cleaned;
}

/**
 * Parse a (decompressed) ustar/GNU/PAX tar archive into file entries.
 * Directories and non-file entries are skipped.
 */
export function parseTar(bytes: Uint8Array): TarEntry[] {
	const entries: TarEntry[] = [];
	let offset = 0;
	let pendingLongName: string | undefined;

	while (offset + BLOCK_SIZE <= bytes.length) {
		if (isZeroBlock(bytes, offset)) {
			break;
		}

		const name = readString(
			bytes,
			offset + HEADER.name.offset,
			HEADER.name.length,
		);
		const size = readSize(
			bytes,
			offset + HEADER.size.offset,
			HEADER.size.length,
		);
		const typeFlag =
			readString(
				bytes,
				offset + HEADER.typeFlag.offset,
				HEADER.typeFlag.length,
			) || TYPE_FLAG.regularLegacy;
		const magic = readString(
			bytes,
			offset + HEADER.magic.offset,
			HEADER.magic.length,
		);
		const prefix = magic.startsWith("ustar")
			? readString(bytes, offset + HEADER.prefix.offset, HEADER.prefix.length)
			: "";

		const dataStart = offset + BLOCK_SIZE;
		const dataEnd = Math.min(dataStart + size, bytes.length);
		const data = bytes.subarray(dataStart, dataEnd);
		offset = dataStart + roundUpToBlock(size);

		if (typeFlag === TYPE_FLAG.gnuLongName) {
			pendingLongName = readString(data, 0, data.length);
			continue;
		}
		if (typeFlag === TYPE_FLAG.paxExtended) {
			pendingLongName = readPaxPath(data) ?? pendingLongName;
			continue;
		}
		if (
			typeFlag === TYPE_FLAG.gnuLongLink ||
			typeFlag === TYPE_FLAG.paxGlobal
		) {
			continue;
		}

		const rawPath = pendingLongName ?? (prefix ? `${prefix}/${name}` : name);
		pendingLongName = undefined;

		const isFile =
			typeFlag === TYPE_FLAG.regular || typeFlag === TYPE_FLAG.regularLegacy;
		if (!isFile) {
			continue;
		}

		const path = normalizePath(rawPath);
		if (path === "") {
			continue;
		}

		entries.push({ path, data: new Uint8Array(data) });
	}

	return entries;
}

/**
 * Load a .tar.gz / .tgz buffer into an in-memory JSZip so the rest of the
 * pipeline can treat it exactly like a .zip archive.
 */
export async function loadTarGzAsZip(buffer: ArrayBuffer): Promise<JSZip> {
	const tarBytes = await gunzip(buffer);
	const entries = parseTar(tarBytes);
	if (entries.length === 0) {
		throw new Error("ไม่พบไฟล์ใน archive");
	}

	const zip = new JSZip();
	for (const entry of entries) {
		zip.file(entry.path, entry.data);
	}
	return zip;
}
