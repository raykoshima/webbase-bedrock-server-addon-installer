"use client";

import { useRef } from "react";
import { useDragDrop } from "@/hooks";
import styles from "./FileDropZone.module.css";

interface FileDropZoneProps {
	onFilesSelect: (files: File[]) => void;
	disabled?: boolean;
	accept?: string;
}

export function FileDropZone({
	onFilesSelect,
	disabled,
	accept = ".mcpack,.mcaddon,.zip",
}: FileDropZoneProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const {
		isDragging,
		handleDragEnter,
		handleDragLeave,
		handleDragOver,
		handleDrop,
	} = useDragDrop();

	const handleClick = () => {
		if (!disabled) {
			inputRef.current?.click();
		}
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const fileList = e.target.files;
		if (fileList && fileList.length > 0) {
			const files = Array.from(fileList);
			onFilesSelect(files);
			// Reset input so same files can be selected again
			e.target.value = "";
		}
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: Drag-and-drop zone requires div for proper event handling
		<div
			className={`${styles.dropZone} ${isDragging ? styles.dragging : ""} ${disabled ? styles.disabled : ""}`}
			onClick={handleClick}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={(e) => handleDrop(e, onFilesSelect)}
			role="button"
			tabIndex={disabled ? -1 : 0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					handleClick();
				}
			}}
		>
			<input
				ref={inputRef}
				type="file"
				accept={accept}
				onChange={handleFileChange}
				className={styles.hiddenInput}
				disabled={disabled}
				multiple
			/>

			<div className={styles.content}>
				<div className={styles.iconWrapper}>
					<svg
						className={styles.icon}
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
					>
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="17 8 12 3 7 8" />
						<line x1="12" y1="3" x2="12" y2="15" />
					</svg>
				</div>

				<div className={styles.text}>
					<p className={styles.primary}>
						{isDragging ? "Drop addon files here" : "Drag & drop addon files"}
					</p>
					<p className={styles.secondary}>
						or click to browse (multiple files supported)
					</p>
				</div>

				<div className={styles.formats}>
					<span className={styles.format}>.mcpack</span>
					<span className={styles.format}>.mcaddon</span>
					<span className={styles.format}>.zip</span>
				</div>
			</div>

			<div className={styles.glowEffect}></div>
		</div>
	);
}

export default FileDropZone;
