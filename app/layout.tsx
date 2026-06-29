import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Painel Comercial PSA",
  description: "Performance comercial — B2B, B2C e Farmers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-brand-bg text-brand-text min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
