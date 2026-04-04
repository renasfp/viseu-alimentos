import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Base de Dados de Alimentos - Supermercados Viseu",
  description:
    "Base de dados de alimentos dos supermercados de Viseu, Portugal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
