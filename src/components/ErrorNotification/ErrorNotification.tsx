"use client";

import { useEffect } from "react";
import styles from "./ErrorNotification.module.css";

interface ErrorNotificationProps {
	message: string;
	onDismiss: () => void;
	autoHide?: boolean;
	autoHideDelay?: number;
}

export function ErrorNotification({
	message,
	onDismiss,
	autoHide = true,
	autoHideDelay = 5000,
}: ErrorNotificationProps) {
	useEffect(() => {
		if (autoHide) {
			const timer = setTimeout(onDismiss, autoHideDelay);
			return () => clearTimeout(timer);
		}
	}, [autoHide, autoHideDelay, onDismiss]);

	return (
		<div className={styles.notification}>
			<div className={styles.icon}>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					aria-label="Error icon"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="12" y1="8" x2="12" y2="12" />
					<line x1="12" y1="16" x2="12.01" y2="16" />
				</svg>
			</div>
			<p className={styles.message}>{message}</p>
			<button
				type="button"
				className={styles.closeButton}
				onClick={onDismiss}
				aria-label="Dismiss"
			>
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					aria-label="Close icon"
				>
					<line x1="18" y1="6" x2="6" y2="18" />
					<line x1="6" y1="6" x2="18" y2="18" />
				</svg>
			</button>
		</div>
	);
}

export default ErrorNotification;
