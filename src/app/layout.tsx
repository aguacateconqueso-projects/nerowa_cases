import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nerowacases.com"),
  title: "Nerowa Cases",
  description:
    "A case for two double bass bows. One model, fourteen colours. Shipping from Vilnius across the EU and the UK.",
  openGraph: {
    title: "Nerowa Cases",
    description:
      "A case for two double bass bows. One model, fourteen colours. Shipping from Vilnius across the EU and the UK.",
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
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
