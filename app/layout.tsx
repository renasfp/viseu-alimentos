import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Base de Dados de Alimentos",
  description: "Gestão da base de dados de alimentos do nutricionista",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt">
      <body>{children}</body>
    </html>
  );
}
