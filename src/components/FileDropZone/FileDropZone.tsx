'use client';

import { useRef } from 'react';
import { useDragDrop } from '@/hooks';
import styles from './FileDropZone.module.css';

interface FileDropZoneProps {
    onFileSelect: (file: File) => void;
    disabled?: boolean;
    accept?: string;
}

export function FileDropZone({ onFileSelect, disabled, accept = '.mcpack,.mcaddon' }: FileDropZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop } = useDragDrop();

    const handleClick = () => {
        if (!disabled) {
            inputRef.current?.click();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
            // Reset input so same file can be selected again
            e.target.value = '';
        }
    };

    return (
        <div
            className={`${styles.dropZone} ${isDragging ? styles.dragging : ''} ${disabled ? styles.disabled : ''}`}
            onClick={handleClick}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, onFileSelect)}
            role="button"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
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
            />

            <div className={styles.content}>
                <div className={styles.iconWrapper}>
                    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                </div>

                <div className={styles.text}>
                    <p className={styles.primary}>
                        {isDragging ? 'Drop addon file here' : 'Drag & drop addon file'}
                    </p>
                    <p className={styles.secondary}>
                        or click to browse
                    </p>
                </div>

                <div className={styles.formats}>
                    <span className={styles.format}>.mcpack</span>
                    <span className={styles.format}>.mcaddon</span>
                </div>
            </div>

            <div className={styles.glowEffect}></div>
        </div>
    );
}

export default FileDropZone;
