"use client";

import Image from "next/image";
import { usePackIcon } from "@/hooks";
import type { InstalledPack, PackType, ParsedPack } from "@/types";
import styles from "./PackCard.module.css";

interface PackCardProps {
	pack: ParsedPack | InstalledPack;
	variant: "pending" | "installed";
	onRemove?: () => void;
	onExport?: () => void;
	isExporting?: boolean;
	exportStatus?: "success" | "error" | null;
	exportMessage?: string;
}

function isParsedPack(pack: ParsedPack | InstalledPack): pack is ParsedPack {
	return "manifest" in pack;
}

export function PackCard({
	pack,
	variant,
	onRemove,
	onExport,
	isExporting,
	exportStatus,
	exportMessage,
}: PackCardProps) {
	const iconBlob = isParsedPack(pack) ? pack.iconBlob : pack.iconBlob;
	const { iconUrl } = usePackIcon(iconBlob);

	// For pending packs, show filename without extension; for installed, show manifest name
	const name = isParsedPack(pack)
		? pack.originalFileName.replace(/\.(mcpack|mcaddon)$/i, "")
		: pack.name;
	const version = isParsedPack(pack)
		? pack.manifest.header.version
		: pack.version;
	const packType: PackType = isParsedPack(pack) ? pack.packType : pack.packType;
	const description = isParsedPack(pack)
		? pack.manifest.header.description
		: pack.description;

	const versionString = Array.isArray(version) ? version.join(".") : version;

	return (
		<div
			className={`${styles.card} ${styles[variant]} ${exportStatus ? styles[exportStatus] : ""}`}
		>
			<div className={styles.iconContainer}>
				{iconUrl ? (
					<Image
						src={iconUrl}
						alt={`${name} icon`}
						className={styles.icon}
						width={64}
						height={64}
						unoptimized
					/>
				) : (
					<div className={styles.fallbackIcon}>
						<span className={styles.fallbackIconText}>
							{packType === "behavior" ? "BP" : "RP"}
						</span>
					</div>
				)}
			</div>

			<div className={styles.info}>
				<h3 className={styles.name}>{name}</h3>
				<div className={styles.meta}>
					<span className={`${styles.type} ${styles[packType]}`}>
						{packType === "behavior" ? "Behavior Pack" : "Resource Pack"}
					</span>
					<span className={styles.version}>v{versionString}</span>
				</div>
				{description && <p className={styles.description}>{description}</p>}
				{exportMessage && (
					<p
						className={`${styles.statusMessage} ${styles[exportStatus || ""]}`}
					>
						{exportMessage}
					</p>
				)}
			</div>

			<div className={styles.actions}>
				{variant === "pending" && onExport && !exportStatus && (
					<button
						type="button"
						className={styles.installButton}
						onClick={onExport}
						disabled={isExporting}
						title="Export this pack as ZIP"
					>
						{isExporting ? (
							<span className={styles.spinner}></span>
						) : (
							<>
								<svg
									className={styles.exportIcon}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									width="14"
									height="14"
									aria-label="Export icon"
								>
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="7 10 12 15 17 10" />
									<line x1="12" y1="15" x2="12" y2="3" />
								</svg>
								Export
							</>
						)}
					</button>
				)}
				{variant === "pending" && onRemove && !exportStatus && (
					<button
						type="button"
						className={styles.removeButton}
						onClick={onRemove}
						aria-label="Remove from queue"
					>
						×
					</button>
				)}
				{exportStatus === "success" && (
					<span className={styles.successIcon}>✓</span>
				)}
				{exportStatus === "error" && (
					<span className={styles.errorIcon}>✗</span>
				)}
			</div>
		</div>
	);
}

export default PackCard;
