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
							<h1 className={styles.title}>ติดตั้ง Addon สำหรับ Bedrock</h1>
							<p className={styles.subtitle}>
								อัพโหลด addon และ export เป็นไฟล์พร้อมติดตั้ง
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
						<h2 className={styles.stepTitle}>อัพโหลดไฟล์ Addon</h2>
					</div>
					<FileDropZone onFilesSelect={importAddonFiles} disabled={isLoading} />
				</section>

				{/* Step 2: Review and Export Packs */}
				{pendingPacks.length > 0 && (
					<section className={styles.section}>
						<div className={styles.stepHeader}>
							<span className={styles.stepNumber}>2</span>
							<h2 className={styles.stepTitle}>ตรวจสอบและ Export</h2>
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

				{/* Footer */}
				<footer className={styles.footer}>
					<p className={styles.footerText}>
						ทุกอย่างทำงานในเบราว์เซอร์ของคุณ ไม่มีการอัพโหลดไฟล์ไปยังเซิร์ฟเวอร์ใดๆ
					</p>
					<p className={styles.footerLinks}>
						<span className={styles.footerBadge}>ปลอดภัย</span>
						<span className={styles.footerBadge}>ไม่อัพโหลด</span>
						<span className={styles.footerBadge}>โอเพนซอร์ส</span>
					</p>
				</footer>
			</div>
		</main>
	);
}
