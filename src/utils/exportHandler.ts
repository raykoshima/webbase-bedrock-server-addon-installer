import JSZip from "jszip";
import type { ParsedPack } from "@/types";

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
 * Create an export zip file containing all packs ready for installation
 * The zip structure follows the Bedrock server pack format
 */
export async function createExportZip(packs: ParsedPack[]): Promise<Blob> {
	const zip = new JSZip();

	// Separate packs by type
	const behaviorPacks = packs.filter((p) => p.packType === "behavior");
	const resourcePacks = packs.filter((p) => p.packType === "resource");

	// Add behavior packs
	if (behaviorPacks.length > 0) {
		const behaviorFolder = zip.folder("behavior_packs");
		for (const pack of behaviorPacks) {
			const packFolder = behaviorFolder?.folder(pack.folderName);
			if (packFolder) {
				for (const [relativePath, data] of pack.files) {
					packFolder.file(relativePath, data);
				}
			}
		}

		// Create world_behavior_packs.json
		const behaviorEntries = behaviorPacks.map((pack) => ({
			pack_id: pack.manifest.header.uuid,
			version: pack.manifest.header.version,
		}));
		zip.file(
			"world_behavior_packs.json",
			JSON.stringify(behaviorEntries, null, 2),
		);
	}

	// Add resource packs
	if (resourcePacks.length > 0) {
		const resourceFolder = zip.folder("resource_packs");
		for (const pack of resourcePacks) {
			const packFolder = resourceFolder?.folder(pack.folderName);
			if (packFolder) {
				for (const [relativePath, data] of pack.files) {
					packFolder.file(relativePath, data);
				}
			}
		}

		// Create world_resource_packs.json
		const resourceEntries = resourcePacks.map((pack) => ({
			pack_id: pack.manifest.header.uuid,
			version: pack.manifest.header.version,
		}));
		zip.file(
			"world_resource_packs.json",
			JSON.stringify(resourceEntries, null, 2),
		);
	}

	// Create a README.txt with installation instructions
	const readme = `Bedrock Addon Export
======================

ไฟล์นี้ประกอบด้วย addon ดังต่อไปนี้:

Behavior Packs (${behaviorPacks.length}):
${behaviorPacks.map((p) => `  - ${p.manifest.header.name} v${formatVersion(p.manifest.header.version)}`).join("\n") || "  ไม่มี"}

Resource Packs (${resourcePacks.length}):
${resourcePacks.map((p) => `  - ${p.manifest.header.name} v${formatVersion(p.manifest.header.version)}`).join("\n") || "  ไม่มี"}

คำแนะนำการติดตั้ง:
==========================

1. แตกไฟล์ zip นี้

2. คัดลอกโฟลเดอร์ไปยังโฟลเดอร์เวิลด์ของคุณ:
   - คัดลอกโฟลเดอร์ "behavior_packs" ไปยังโฟลเดอร์เวิลด์
   - คัดลอกโฟลเดอร์ "resource_packs" ไปยังโฟลเดอร์เวิลด์

3. อัพเดตการลงทะเบียน pack:
   - ถ้าเวิลด์ของคุณมีไฟล์ world_behavior_packs.json หรือ world_resource_packs.json อยู่แล้ว
     ให้รวมเนื้อหาจากไฟล์นี้เข้ากับไฟล์เหล่านั้น
   - ถ้าไม่มี ให้คัดลอกไฟล์ JSON ไปยังโฟลเดอร์เวิลด์

4. รีสตาร์ทเซิร์ฟเวอร์หรือโหลดเวิลด์ใหม่

หมายเหตุ: โฟลเดอร์เวิลด์โดยทั่วไปจะอยู่ที่:
  - Windows: %localappdata%\\Packages\\Microsoft.MinecraftUWP_8wekyb3d8bbwe\\LocalState\\games\\com.mojang\\minecraftWorlds\\[world_name]
  - Bedrock Dedicated Server: ./worlds/[world_name]

สร้างโดย Bedrock Addon Installer
`;

	zip.file("README.txt", readme);

	// Generate the zip file
	return await zip.generateAsync({
		type: "blob",
		compression: "DEFLATE",
		compressionOptions: { level: 9 },
	});
}

/**
 * Export a single pack as a zip
 */
export async function exportSinglePack(pack: ParsedPack): Promise<Blob> {
	return createExportZip([pack]);
}

/**
 * Trigger download of a blob
 */
export function downloadBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = fileName;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Generate a filename for the export
 */
export function generateExportFileName(packs: ParsedPack[]): string {
	if (packs.length === 1) {
		const pack = packs[0];
		const name = pack.manifest.header.name
			.replace(/[<>:"/\\|?*]/g, "")
			.replace(/\s+/g, "_")
			.trim();
		const version = formatVersion(pack.manifest.header.version);
		return `${name}_v${version}_export.zip`;
	}

	const timestamp = new Date().toISOString().slice(0, 10);
	return `bedrock_addons_export_${timestamp}.zip`;
}
