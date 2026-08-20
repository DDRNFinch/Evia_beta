import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./evia-selfobs.css";

export const metadata: Metadata = {
  title: "Evia — Apprentice Vocational Assistant",
  description: "A simple self-observation apprenticeship assistant: one job, one photo and one short explanation at a time.",
  applicationName: "Evia",
  manifest: "./manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Evia",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "codex-preview": "development",
    "mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "./icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "./icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "./icon-192.png",
    apple: [{ url: "./apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f6f6f8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
