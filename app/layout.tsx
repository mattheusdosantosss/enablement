import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const psaFont = localFont({
  src: "./fonts/brutaprocompressed-extrabold.otf",
  variable: "--font-psa",
  display: "swap",
  weight: "800",
});

export const metadata: Metadata = {
  title: "Comercial · PSA",
  description: "Painel comercial PSA — B2B, B2C e Farmers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,500;0,700;1,400&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={psaFont.variable}>
        <div className="topglow" />
        {children}
      </body>
    </html>
  );
}
