import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AniFind — Common PTW Finder",
  description: "Find anime that appear in multiple users' planning-to-watch lists",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
