import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";

import "./globals.css";

/*
  Archivo es la tipografia del proyecto, en todas sus variantes. Se carga con
  `next/font`, que la descarga en el build y la sirve desde el mismo dominio:
  sin peticion a Google en cada visita y sin salto de fuente al cargar.

  Es variable, asi que un solo archivo cubre los pesos 400 a 700 del sistema.
*/
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

const DESCRIPTION =
  "Not open yet. Already selling. A double bass case for two bows, 180 EUR, in fourteen colours. Shipped from Europe.";

export const metadata: Metadata = {
  metadataBase: new URL("https://nerowacases.com"),
  title: "Nerowa Cases",
  description: DESCRIPTION,
  openGraph: {
    title: "Nerowa Cases",
    description: DESCRIPTION,
    url: "https://nerowacases.com",
    siteName: "Nerowa Cases",
    locale: "en",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
