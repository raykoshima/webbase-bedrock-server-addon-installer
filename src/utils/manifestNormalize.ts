import type {
	ManifestModule,
	ManifestSubpack,
	PackManifest,
	PackVersion,
} from "@/types";

/**
 * Normalize a manifest version to a [major, minor, patch] triple.
 *
 * format_version 1/2 write an array; format_version 3 writes "1.0.88". The
 * export registration JSONs (world_*_packs.json) must carry the array form, so
 * every version is converted once at parse time.
 */
export function normalizeVersion(value: unknown): PackVersion | undefined {
	if (Array.isArray(value)) {
		const parts = value.slice(0, 3).map((part) => {
			const num = typeof part === "number" ? part : Number.parseInt(String(part), 10);
			return Number.isFinite(num) ? num : 0;
		});
		while (parts.length < 3) parts.push(0);
		return parts as PackVersion;
	}

	if (typeof value === "string") {
		const parts = value
			.trim()
			.split(".")
			.map((part) => {
				const num = Number.parseInt(part, 10);
				return Number.isFinite(num) ? num : 0;
			});
		if (parts.length === 0 || value.trim() === "") return undefined;
		while (parts.length < 3) parts.push(0);
		return parts.slice(0, 3) as PackVersion;
	}

	if (typeof value === "number" && Number.isFinite(value)) {
		return [value, 0, 0];
	}

	return undefined;
}

function normalizeModule(module: ManifestModule): ManifestModule {
	const version = normalizeVersion(module.version);
	return version ? { ...module, version } : module;
}

function normalizeSubpack(subpack: ManifestSubpack): ManifestSubpack {
	// Expose both spellings so consumers can read either one
	const tier = subpack.memory_tier ?? subpack.memory_performance_tier;
	return tier === undefined
		? subpack
		: { ...subpack, memory_tier: tier, memory_performance_tier: tier };
}

/**
 * Return a copy of the manifest with versions coerced to arrays and subpack
 * memory tiers unified across format_version spellings.
 */
export function normalizeManifest(manifest: PackManifest): PackManifest {
	const header = manifest.header;
	const normalizedHeader = header
		? {
				...header,
				version: normalizeVersion(header.version) ?? [0, 0, 0],
				...(normalizeVersion(header.min_engine_version)
					? { min_engine_version: normalizeVersion(header.min_engine_version) }
					: {}),
			}
		: header;

	return {
		...manifest,
		header: normalizedHeader,
		modules: Array.isArray(manifest.modules)
			? manifest.modules.map(normalizeModule)
			: manifest.modules,
		...(Array.isArray(manifest.subpacks)
			? { subpacks: manifest.subpacks.map(normalizeSubpack) }
			: {}),
	};
}
