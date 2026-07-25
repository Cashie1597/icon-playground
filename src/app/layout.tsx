import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Icon Playground",
  description: "Canonical editable playground for the Recto icon set — preview, style, and export SVG/PNG.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
