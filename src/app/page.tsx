'use client';

import { useAddonInstaller } from '@/hooks';
import {
  DirectorySelector,
  FileDropZone,
  PendingPacksList,
  InstalledPacksList,
  ErrorNotification
} from '@/components';
import styles from './page.module.css';

export default function Home() {
  const {
    isSupported,
    worldDirectory,
    directoryName,
    isLoading,
    error,
    pendingPacks,
    installedPacks,
    installationResults,
    selectWorldDirectory,
    importAddonFile,
    installAllPacks,
    installSinglePack,
    refreshInstalledPacks,
    clearPendingPacks,
    clearError,
    removePendingPack
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
              <p className={styles.subtitle}>Browser-powered addon management for Bedrock servers</p>
            </div>
          </div>
        </header>

        {/* Error Notification */}
        {error && (
          <ErrorNotification
            message={error}
            onDismiss={clearError}
          />
        )}

        {/* Step 1: Directory Selection */}
        <section className={styles.section}>
          <div className={styles.stepHeader}>
            <span className={styles.stepNumber}>1</span>
            <h2 className={styles.stepTitle}>Select World Folder</h2>
          </div>
          <DirectorySelector
            directoryName={directoryName}
            onSelect={selectWorldDirectory}
            isLoading={isLoading}
            isSupported={isSupported}
          />
        </section>

        {/* Step 2: Import Addons (only show when directory is selected) */}
        {worldDirectory && (
          <section className={styles.section}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>2</span>
              <h2 className={styles.stepTitle}>Import Addon Files</h2>
            </div>
            <FileDropZone
              onFileSelect={importAddonFile}
              disabled={isLoading}
            />
          </section>
        )}

        {/* Step 3: Review and Install Pending Packs */}
        {worldDirectory && pendingPacks.length > 0 && (
          <section className={styles.section}>
            <div className={styles.stepHeader}>
              <span className={styles.stepNumber}>3</span>
              <h2 className={styles.stepTitle}>Review & Install</h2>
            </div>
            <PendingPacksList
              packs={pendingPacks}
              onRemovePack={removePendingPack}
              onInstallPack={installSinglePack}
              onInstallAll={installAllPacks}
              onClearAll={clearPendingPacks}
              installationResults={installationResults}
              isInstalling={isLoading}
            />
          </section>
        )}

        {/* Installed Addons List */}
        {worldDirectory && (
          <section className={styles.section}>
            <InstalledPacksList
              packs={installedPacks}
              isLoading={isLoading}
              onRefresh={refreshInstalledPacks}
            />
          </section>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            All processing happens in your browser. No files are uploaded to any server.
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
