import type { Metadata, Viewport } from "../node_modules/next/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "CFB Schedule",
  description: "College Football Schedule & Predictions",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CFB Schedule",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0B0F19",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0B0F19] text-white antialiased selection:bg-blue-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}