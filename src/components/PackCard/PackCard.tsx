'use client';

import { useState, useEffect } from 'react';
import { usePackIcon } from '@/hooks';
import type { ParsedPack, InstalledPack, PackType } from '@/types';
import styles from './PackCard.module.css';

interface PackCardProps {
    pack: ParsedPack | InstalledPack;
    variant: 'pending' | 'installed';
    onRemove?: () => void;
    onInstall?: () => void;
    isInstalling?: boolean;
    installStatus?: 'success' | 'error' | 'exists' | null;
    installMessage?: string;
}

function isParsedPack(pack: ParsedPack | InstalledPack): pack is ParsedPack {
    return 'manifest' in pack;
}

export function PackCard({
    pack,
    variant,
    onRemove,
    onInstall,
    isInstalling,
    installStatus,
    installMessage
}: PackCardProps) {
    const iconBlob = isParsedPack(pack) ? pack.iconBlob : pack.iconBlob;
    const { iconUrl } = usePackIcon(iconBlob);

    const name = isParsedPack(pack) ? pack.manifest.header.name : pack.name;
    const version = isParsedPack(pack) ? pack.manifest.header.version : pack.version;
    const packType: PackType = isParsedPack(pack) ? pack.packType : pack.packType;
    const description = isParsedPack(pack)
        ? pack.manifest.header.description
        : pack.description;

    const versionString = Array.isArray(version) ? version.join('.') : version;

    return (
        <div className={`${styles.card} ${styles[variant]} ${installStatus ? styles[installStatus] : ''}`}>
            <div className={styles.iconContainer}>
                {iconUrl ? (
                    <img
                        src={iconUrl}
                        alt={`${name} icon`}
                        className={styles.icon}
                    />
                ) : (
                    <div className={styles.fallbackIcon}>
                        <span className={styles.fallbackIconText}>
                            {packType === 'behavior' ? 'BP' : 'RP'}
                        </span>
                    </div>
                )}
            </div>

            <div className={styles.info}>
                <h3 className={styles.name}>{name}</h3>
                <div className={styles.meta}>
                    <span className={`${styles.type} ${styles[packType]}`}>
                        {packType === 'behavior' ? 'Behavior Pack' : 'Resource Pack'}
                    </span>
                    <span className={styles.version}>v{versionString}</span>
                </div>
                {description && (
                    <p className={styles.description}>{description}</p>
                )}
                {installMessage && (
                    <p className={`${styles.statusMessage} ${styles[installStatus || '']}`}>
                        {installMessage}
                    </p>
                )}
            </div>

            <div className={styles.actions}>
                {variant === 'pending' && onInstall && !installStatus && (
                    <button
                        className={styles.installButton}
                        onClick={onInstall}
                        disabled={isInstalling}
                    >
                        {isInstalling ? (
                            <span className={styles.spinner}></span>
                        ) : (
                            'Install'
                        )}
                    </button>
                )}
                {variant === 'pending' && onRemove && !installStatus && (
                    <button
                        className={styles.removeButton}
                        onClick={onRemove}
                        aria-label="Remove from queue"
                    >
                        ×
                    </button>
                )}
                {installStatus === 'success' && (
                    <span className={styles.successIcon}>✓</span>
                )}
                {installStatus === 'error' && (
                    <span className={styles.errorIcon}>✗</span>
                )}
                {installStatus === 'exists' && (
                    <span className={styles.existsIcon}>≡</span>
                )}
            </div>
        </div>
    );
}

export default PackCard;
