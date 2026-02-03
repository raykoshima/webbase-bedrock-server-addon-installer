'use client';

import styles from './DirectorySelector.module.css';

interface DirectorySelectorProps {
    directoryName: string | null;
    onSelect: () => void;
    isLoading?: boolean;
    isSupported: boolean;
}

export function DirectorySelector({
    directoryName,
    onSelect,
    isLoading,
    isSupported
}: DirectorySelectorProps) {
    if (!isSupported) {
        return (
            <div className={styles.container}>
                <div className={styles.unsupported}>
                    <div className={styles.unsupportedIcon}>⚠️</div>
                    <h3 className={styles.unsupportedTitle}>Browser Not Supported</h3>
                    <p className={styles.unsupportedText}>
                        This application requires the File System Access API, which is only available in
                        Chromium-based browsers (Chrome, Edge, Opera, Brave).
                    </p>
                    <p className={styles.unsupportedHint}>
                        Please switch to a supported browser to continue.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {directoryName ? (
                <div className={styles.selected}>
                    <div className={styles.folderIcon}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <div className={styles.selectedInfo}>
                        <span className={styles.selectedLabel}>World Directory</span>
                        <span className={styles.selectedName}>{directoryName}</span>
                    </div>
                    <button
                        className={styles.changeButton}
                        onClick={onSelect}
                        disabled={isLoading}
                    >
                        Change
                    </button>
                </div>
            ) : (
                <button
                    className={styles.selectButton}
                    onClick={onSelect}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <span className={styles.spinner}></span>
                            Loading...
                        </>
                    ) : (
                        <>
                            <svg className={styles.buttonIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                            Select World Folder
                        </>
                    )}
                </button>
            )}

            <p className={styles.hint}>
                {directoryName
                    ? 'You can now import addon files to install them.'
                    : 'Select your Minecraft Bedrock Dedicated Server world folder to get started.'}
            </p>
        </div>
    );
}

export default DirectorySelector;
