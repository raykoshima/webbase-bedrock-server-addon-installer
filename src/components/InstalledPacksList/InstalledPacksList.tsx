"use client";

import { PackCard } from "@/components/PackCard";
import type { InstalledPack } from "@/types";
import styles from "./InstalledPacksList.module.css";

interface InstalledPacksListProps {
	packs: InstalledPack[];
	isLoading?: boolean;
	onRefresh?: () => void;
}

export function InstalledPacksList({
	packs,
	isLoading,
	onRefresh,
}: InstalledPacksListProps) {
	const behaviorPacks = packs.filter((p) => p.packType === "behavior");
	const resourcePacks = packs.filter((p) => p.packType === "resource");

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2 className={styles.title}>
					<span className={styles.titleIcon}>📦</span>
					Installed Addons
				</h2>
				{onRefresh && (
					<button
						type="button"
						className={styles.refreshButton}
						onClick={onRefresh}
						disabled={isLoading}
						title="Refresh installed addons"
					>
						<svg
							className={`${styles.refreshIcon} ${isLoading ? styles.spinning : ""}`}
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							aria-label="Refresh icon"
						>
							<path d="M23 4v6h-6M1 20v-6h6" />
							<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
						</svg>
					</button>
				)}
			</div>

			{packs.length === 0 ? (
				<div className={styles.emptyState}>
					<div className={styles.emptyIcon}>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							aria-label="Empty box icon"
						>
							<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
						</svg>
					</div>
					<p className={styles.emptyText}>No addons installed yet</p>
					<p className={styles.emptyHint}>
						Import and install addons to see them here
					</p>
				</div>
			) : (
				<div className={styles.sections}>
					{behaviorPacks.length > 0 && (
						<div className={styles.section}>
							<h3 className={styles.sectionTitle}>
								<span className={`${styles.sectionBadge} ${styles.behavior}`}>
									{behaviorPacks.length}
								</span>
								Behavior Packs
							</h3>
							<div className={styles.packsList}>
								{behaviorPacks.map((pack) => (
									<PackCard key={pack.uuid} pack={pack} variant="installed" />
								))}
							</div>
						</div>
					)}

					{resourcePacks.length > 0 && (
						<div className={styles.section}>
							<h3 className={styles.sectionTitle}>
								<span className={`${styles.sectionBadge} ${styles.resource}`}>
									{resourcePacks.length}
								</span>
								Resource Packs
							</h3>
							<div className={styles.packsList}>
								{resourcePacks.map((pack) => (
									<PackCard key={pack.uuid} pack={pack} variant="installed" />
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export default InstalledPacksList;
