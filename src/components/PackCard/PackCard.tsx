"use client";

import Image from "next/image";
import { usePackIcon } from "@/hooks";
import type { InstalledPack, PackType, ParsedPack } from "@/types";
import styles from "./PackCard.module.css";

interface PackCardProps {
	pack: ParsedPack | InstalledPack;
	variant: "pending" | "installed";
	onRemove?: () => void;
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
				{exportStatus === "success" && (
					<span className={styles.successIcon}>✓</span>
				)}
				{exportStatus === "error" && (
					<span className={styles.errorIcon}>✗</span>
				)}
				{variant === "pending" && onRemove && (
					<button
						type="button"
						className={styles.removeButton}
						onClick={onRemove}
						aria-label="Remove from queue"
					>
						×
					</button>
				)}
			</div>
		</div>
	);
}

export default PackCard;
