import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompteur Pro",
  description: "Prompteur pour vidéos et présentations, synchronisé sur la musique.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="dark">{children}</body>
    </html>
  );
}
