'use client';

import { useState } from 'react';
import { PackCard } from '@/components/PackCard';
import type { ParsedPack, InstallationResult } from '@/types';
import styles from './PendingPacksList.module.css';

interface PendingPacksListProps {
    packs: ParsedPack[];
    onRemovePack: (uuid: string) => void;
    onInstallPack: (pack: ParsedPack) => Promise<InstallationResult>;
    onInstallAll: () => void;
    onClearAll: () => void;
    installationResults: InstallationResult[];
    isInstalling: boolean;
}

export function PendingPacksList({
    packs,
    onRemovePack,
    onInstallPack,
    onInstallAll,
    onClearAll,
    installationResults,
    isInstalling
}: PendingPacksListProps) {
    const [installingPackId, setInstallingPackId] = useState<string | null>(null);

    const handleInstallSingle = async (pack: ParsedPack) => {
        setInstallingPackId(pack.manifest.header.uuid);
        await onInstallPack(pack);
        setInstallingPackId(null);
    };

    const getPackStatus = (uuid: string) => {
        const result = installationResults.find(r => r.pack.manifest.header.uuid === uuid);
        if (!result) return null;

        if (result.success) return 'success';
        if (result.alreadyExists) return 'exists';
        return 'error';
    };

    const getPackMessage = (uuid: string) => {
        const result = installationResults.find(r => r.pack.manifest.header.uuid === uuid);
        return result?.message;
    };

    if (packs.length === 0) {
        return null;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>
                    <span className={styles.titleIcon}>📥</span>
                    Ready to Install
                    <span className={styles.count}>{packs.length}</span>
                </h2>
                <div className={styles.actions}>
                    <button
                        className={styles.clearButton}
                        onClick={onClearAll}
                        disabled={isInstalling}
                    >
                        Clear All
                    </button>
                    <button
                        className={styles.installAllButton}
                        onClick={onInstallAll}
                        disabled={isInstalling}
                    >
                        {isInstalling ? (
                            <>
                                <span className={styles.spinner}></span>
                                Installing...
                            </>
                        ) : (
                            <>
                                <svg className={styles.installIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                </svg>
                                Install All
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
                        onInstall={() => handleInstallSingle(pack)}
                        isInstalling={installingPackId === pack.manifest.header.uuid || isInstalling}
                        installStatus={getPackStatus(pack.manifest.header.uuid)}
                        installMessage={getPackMessage(pack.manifest.header.uuid)}
                    />
                ))}
            </div>
        </div>
    );
}

export default PendingPacksList;
