"use client";

import {
	ErrorNotification,
	FileDropZone,
	PendingPacksList,
} from "@/components";
import { useAddonInstaller } from "@/hooks";
import styles from "./page.module.css";

export default function Home() {
	const {
		isLoading,
		error,
		pendingPacks,
		exportResults,
		importAddonFiles,
		exportAllPacks,
		exportSinglePackAction,
		clearPendingPacks,
		clearError,
		removePendingPack,
		reorderPendingPacks,
	} = useAddonInstaller();

	return (
		<main className={styles.main}>
			<div className={styles.container}>
				{/* Header */}
				<header className={styles.header}>
					<div className={styles.logo}>
						<span className={styles.logoIcon}>⚡</span>
						<div className={styles.logoText}>
							<h1 className={styles.title}>Bedrock Addon Installer</h1>
							<p className={styles.subtitle}>
								Upload addons and export as ready-to-install packages
							</p>
						</div>
					</div>
				</header>

				{/* Error Notification */}
				{error && <ErrorNotification message={error} onDismiss={clearError} />}

				{/* Step 1: Import Addons */}
				<section className={styles.section}>
					<div className={styles.stepHeader}>
						<span className={styles.stepNumber}>1</span>
						<h2 className={styles.stepTitle}>Upload Addon Files</h2>
					</div>
					<FileDropZone onFilesSelect={importAddonFiles} disabled={isLoading} />
				</section>

				{/* Step 2: Review and Export Packs */}
				{pendingPacks.length > 0 && (
					<section className={styles.section}>
						<div className={styles.stepHeader}>
							<span className={styles.stepNumber}>2</span>
							<h2 className={styles.stepTitle}>Review & Export</h2>
						</div>
						<PendingPacksList
							packs={pendingPacks}
							onRemovePack={removePendingPack}
							onExportPack={exportSinglePackAction}
							onExportAll={exportAllPacks}
							onClearAll={clearPendingPacks}
							onReorderPacks={reorderPendingPacks}
							exportResults={exportResults}
							isExporting={isLoading}
						/>
					</section>
				)}

				{/* Success Message */}
				{exportResults.length > 0 && pendingPacks.length === 0 && (
					<section className={styles.section}>
						<div className={styles.successMessage}>
							<span className={styles.successIcon}>✅</span>
							<div className={styles.successText}>
								<h3>Export Complete!</h3>
								<p>
									Your addon package has been downloaded. Extract the zip and
									follow the included instructions to install.
								</p>
							</div>
						</div>
					</section>
				)}

				{/* Footer */}
				<footer className={styles.footer}>
					<p className={styles.footerText}>
						All processing happens in your browser. No files are uploaded to any
						server.
					</p>
					<p className={styles.footerLinks}>
						<span className={styles.footerBadge}>Privacy First</span>
						<span className={styles.footerBadge}>Zero Upload</span>
						<span className={styles.footerBadge}>Open Source</span>
					</p>
				</footer>
			</div>
		</main>
	);
}
