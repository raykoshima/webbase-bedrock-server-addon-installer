"use client";

import { useState } from "react";
import { PackCard } from "@/components/PackCard";
import type { ParsedPack } from "@/types";
import styles from "./PendingPacksList.module.css";

export interface ExportResult {
	success: boolean;
	pack?: ParsedPack;
	message: string;
}

interface PendingPacksListProps {
	packs: ParsedPack[];
	onRemovePack: (uuid: string) => void;
	onExportPack: (pack: ParsedPack) => Promise<ExportResult>;
	onExportAll: () => void;
	onClearAll: () => void;
	onReorderPacks: (reorderedPacks: ParsedPack[]) => void;
	exportResults: ExportResult[];
	isExporting: boolean;
}

export function PendingPacksList({
	packs,
	onRemovePack,
	onExportAll,
	onClearAll,
	onReorderPacks,
	exportResults,
	isExporting,
}: PendingPacksListProps) {
	const [draggedPack, setDraggedPack] = useState<ParsedPack | null>(null);
	const [draggedOverPack, setDraggedOverPack] = useState<ParsedPack | null>(
		null,
	);

	// Separate packs by type
	const behaviorPacks = packs.filter((p) => p.packType === "behavior");
	const resourcePacks = packs.filter((p) => p.packType === "resource");

	const getPackStatus = (uuid: string) => {
		const result = exportResults.find(
			(r) => r.pack?.manifest.header.uuid === uuid,
		);
		if (!result) return null;

		if (result.success) return "success";
		return "error";
	};

	const getPackMessage = (uuid: string) => {
		const result = exportResults.find(
			(r) => r.pack?.manifest.header.uuid === uuid,
		);
		return result?.message;
	};

	// Drag and drop handlers
	const handleDragStart = (pack: ParsedPack) => {
		setDraggedPack(pack);
	};

	const handleDragEnd = () => {
		setDraggedPack(null);
		setDraggedOverPack(null);
	};

	const handleDragOver = (e: React.DragEvent, pack: ParsedPack) => {
		e.preventDefault();
		if (draggedPack && draggedPack.packType === pack.packType) {
			setDraggedOverPack(pack);
		}
	};

	const handleDrop = (e: React.DragEvent, targetPack: ParsedPack) => {
		e.preventDefault();
		if (!draggedPack || draggedPack.packType !== targetPack.packType) return;

		const packList =
			draggedPack.packType === "behavior" ? behaviorPacks : resourcePacks;
		const draggedIndex = packList.findIndex(
			(p) => p.manifest.header.uuid === draggedPack.manifest.header.uuid,
		);
		const targetIndex = packList.findIndex(
			(p) => p.manifest.header.uuid === targetPack.manifest.header.uuid,
		);

		if (draggedIndex === targetIndex) return;

		// Reorder within the same pack type
		const newPackList = [...packList];
		const [removed] = newPackList.splice(draggedIndex, 1);
		newPackList.splice(targetIndex, 0, removed);

		// Combine with the other pack type (Behavior first, then Resource)
		const otherPacks =
			draggedPack.packType === "behavior" ? resourcePacks : behaviorPacks;
		const reorderedPacks =
			draggedPack.packType === "behavior"
				? [...newPackList, ...otherPacks]
				: [...otherPacks, ...newPackList];

		onReorderPacks(reorderedPacks);
		setDraggedPack(null);
		setDraggedOverPack(null);
	};

	// Move pack up/down (for mobile drag handle buttons)
	const movePack = (pack: ParsedPack, direction: "up" | "down") => {
		const packList =
			pack.packType === "behavior" ? behaviorPacks : resourcePacks;
		const currentIndex = packList.findIndex(
			(p) => p.manifest.header.uuid === pack.manifest.header.uuid,
		);

		if (currentIndex === -1) return;

		const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

		if (newIndex < 0 || newIndex >= packList.length) return;

		const newPackList = [...packList];
		const [removed] = newPackList.splice(currentIndex, 1);
		newPackList.splice(newIndex, 0, removed);

		// Combine with the other pack type (Behavior first, then Resource)
		const otherPacks =
			pack.packType === "behavior" ? resourcePacks : behaviorPacks;
		const reorderedPacks =
			pack.packType === "behavior"
				? [...newPackList, ...otherPacks]
				: [...otherPacks, ...newPackList];

		onReorderPacks(reorderedPacks);
	};

	const renderPackSection = (
		sectionPacks: ParsedPack[],
		title: string,
		icon: string,
	) => {
		if (sectionPacks.length === 0) return null;

		return (
			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>
					<span className={styles.sectionIcon}>{icon}</span>
					{title}
					<span className={styles.sectionCount}>{sectionPacks.length}</span>
				</h3>
				<div className={styles.packsList}>
					{sectionPacks.map((pack, index) => (
						<div
							key={pack.manifest.header.uuid}
							draggable={!isExporting}
							onDragStart={() => handleDragStart(pack)}
							onDragEnd={handleDragEnd}
							onDragOver={(e) => handleDragOver(e, pack)}
							onDrop={(e) => handleDrop(e, pack)}
							className={`${styles.packItem} ${
								draggedPack?.manifest.header.uuid === pack.manifest.header.uuid
									? styles.dragging
									: ""
							} ${
								draggedOverPack?.manifest.header.uuid ===
									pack.manifest.header.uuid && draggedPack
									? styles.dragOver
									: ""
							}`}
						>
							{/* Mobile drag handle buttons */}
							<div className={styles.dragHandles}>
								<button
									type="button"
									className={styles.dragHandleButton}
									onClick={() => movePack(pack, "up")}
									disabled={index === 0 || isExporting}
									aria-label="Move up"
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										aria-label="Up arrow"
									>
										<polyline points="18 15 12 9 6 15" />
									</svg>
								</button>
								<button
									type="button"
									className={styles.dragHandleButton}
									onClick={() => movePack(pack, "down")}
									disabled={index === sectionPacks.length - 1 || isExporting}
									aria-label="Move down"
								>
									<svg
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										aria-label="Down arrow"
									>
										<polyline points="6 9 12 15 18 9" />
									</svg>
								</button>
							</div>

							<PackCard
								pack={pack}
								variant="pending"
								onRemove={() => onRemovePack(pack.manifest.header.uuid)}
								exportStatus={getPackStatus(pack.manifest.header.uuid)}
								exportMessage={getPackMessage(pack.manifest.header.uuid)}
							/>
						</div>
					))}
				</div>
			</div>
		);
	};

	if (packs.length === 0) {
		return null;
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h2 className={styles.title}>
					<span className={styles.titleIcon}>📦</span>
					พร้อม Export
					<span className={styles.count}>{packs.length}</span>
				</h2>
				<div className={styles.actions}>
					<button
						type="button"
						className={styles.clearButton}
						onClick={onClearAll}
						disabled={isExporting}
					>
						ล้างทั้งหมด
					</button>
					<button
						type="button"
						className={styles.installAllButton}
						onClick={onExportAll}
						disabled={isExporting}
					>
						{isExporting ? (
							<>
								<span className={styles.spinner}></span>
								กำลัง Export...
							</>
						) : (
							<>
								<svg
									className={styles.installIcon}
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="2"
									aria-label="Export icon"
								>
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="7 10 12 15 17 10" />
									<line x1="12" y1="15" x2="12" y2="3" />
								</svg>
								Export ทั้งหมดเป็น ZIP
							</>
						)}
					</button>
				</div>
			</div>

			<div className={styles.sections}>
				{renderPackSection(behaviorPacks, "Behavior Packs", "⚙️")}
				{renderPackSection(resourcePacks, "Resource Packs", "🎨")}
			</div>

			<div className={styles.exportInfo}>
				<svg
					className={styles.infoIcon}
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					aria-label="Info icon"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="16" x2="12" y2="12" />
					<line x1="12" y1="8" x2="12.01" y2="8" />
				</svg>
				<p>
					บนเดสก์ท็อป ลากเพื่อเรียงลำดับ pack บนมือถือ ใช้ปุ่มลูกศร ไฟล์ ZIP ที่ export
					จะประกอบด้วยโฟลเดอร์ pack และไฟล์ JSON ที่ต้องใช้
				</p>
			</div>
		</div>
	);
}

export default PendingPacksList;
