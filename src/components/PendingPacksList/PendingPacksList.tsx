'use client';

import { useState } from 'react';
import { PackCard } from '@/components/PackCard';
import type { ParsedPack } from '@/types';
import styles from './PendingPacksList.module.css';

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
    exportResults: ExportResult[];
    isExporting: boolean;
}

export function PendingPacksList({
    packs,
    onRemovePack,
    onExportPack,
    onExportAll,
    onClearAll,
    exportResults,
    isExporting
}: PendingPacksListProps) {
    const [exportingPackId, setExportingPackId] = useState<string | null>(null);

    const handleExportSingle = async (pack: ParsedPack) => {
        setExportingPackId(pack.manifest.header.uuid);
        await onExportPack(pack);
        setExportingPackId(null);
    };

    const getPackStatus = (uuid: string) => {
        const result = exportResults.find(r => r.pack?.manifest.header.uuid === uuid);
        if (!result) return null;

        if (result.success) return 'success';
        return 'error';
    };

    const getPackMessage = (uuid: string) => {
        const result = exportResults.find(r => r.pack?.manifest.header.uuid === uuid);
        return result?.message;
    };

    if (packs.length === 0) {
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>
                    <span className={styles.titleIcon}>📦</span>
                    Ready to Export
                    <span className={styles.count}>{packs.length}</span>
                </h2>
                <div className={styles.actions}>
                    <button
                        className={styles.clearButton}
                        onClick={onClearAll}
                        disabled={isExporting}
                    >
                        Clear All
                    </button>
                    <button
                        className={styles.installAllButton}
                        onClick={onExportAll}
                        disabled={isExporting}
                    >
                        {isExporting ? (
                            <>
                                <span className={styles.spinner}></span>
                                Exporting...
                            </>
                        ) : (
                            <>
                                <svg className={styles.installIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Export All as ZIP
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className={styles.packsList}>
                {packs.map(pack => (
                    <PackCard
                        key={pack.manifest.header.uuid}
                        pack={pack}
                        variant="pending"
                        onRemove={() => onRemovePack(pack.manifest.header.uuid)}
                        onExport={() => handleExportSingle(pack)}
                        isExporting={exportingPackId === pack.manifest.header.uuid || isExporting}
                        exportStatus={getPackStatus(pack.manifest.header.uuid)}
                        exportMessage={getPackMessage(pack.manifest.header.uuid)}
                    />
                ))}
            </div>

            <div className={styles.exportInfo}>
                <svg className={styles.infoIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <p>The exported ZIP contains pack folders and JSON configuration files. Extract and copy to your world folder to install.</p>
            </div>
        </div>
    );
}

export default PendingPacksList;
