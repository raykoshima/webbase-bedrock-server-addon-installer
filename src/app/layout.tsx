import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-inter",
});

export const metadata: Metadata = {
	title: "Bedrock Addon Installer | Browser-Powered Server Addon Manager",
	description:
		"A privacy-first, zero-upload tool for installing Minecraft Bedrock addons to your dedicated server. Works entirely in your browser using the File System Access API.",
	keywords: [
		"Minecraft",
		"Bedrock",
		"Addon",
		"Installer",
		"Server",
		"mcpack",
		"mcaddon",
		"Dedicated Server",
	],
	authors: [{ name: "Bedrock Addon Installer" }],
	robots: "index, follow",
	openGraph: {
		title: "Bedrock Addon Installer",
		description:
			"Browser-powered addon management for Minecraft Bedrock Dedicated Servers",
		type: "website",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	themeColor: "#0a0a0f",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" className={inter.variable}>
			<body>{children}</body>
		</html>
	);
}
