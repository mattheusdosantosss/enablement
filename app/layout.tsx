import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/*
 * Fonte local PSA.
 * Coloque o arquivo em app/fonts/ e ajuste o campo `src` abaixo.
 * Enquanto o arquivo não existir, o CSS faz fallback para Archivo via Google Fonts.
 *
 * Exemplos de src:
 *   "./fonts/MinhaFonte.woff2"
 *   "./fonts/MinhaFonte-Regular.ttf"
 *
 * Se a fonte tiver múltiplos pesos, use array:
 *   src: [
 *     { path: "./fonts/MinhaFonte-Regular.woff2", weight: "400" },
 *     { path: "./fonts/MinhaFonte-Bold.woff2",    weight: "700" },
 *     { path: "./fonts/MinhaFonte-Black.woff2",   weight: "900" },
 *   ]
 */

// ── descomente e ajuste quando colocar o arquivo na pasta ──────────────────
// const psaFont = localFont({
//   src: "./fonts/SuaFonte.woff2",
//   variable: "--font-psa",
//   display: "swap",
// });
// ──────────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Comercial · PSA",
  description: "Painel comercial PSA — B2B, B2C e Farmers",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <head>
        {/* Google Fonts — fallback enquanto fonte local não estiver configurada */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800;900&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      {/* adicione className={psaFont.variable} no body quando ativar a fonte local */}
      <body>
        <div className="topglow" />
        {children}
      </body>
    </html>
  );
}
