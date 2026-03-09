import type { Metadata } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Laser DXF-Maker",
  description:
    "Browser-Tool zum Aufbereiten von DXF-Dateien fuer Laser-Schneidmaschinen",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
