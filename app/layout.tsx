import type { Metadata, Viewport } from "next";
import "./globals.css";

const basePath = process.env.BASE_PATH?.replace(/\/$/, "") || "";

export const metadata: Metadata = {
  title: "練歌 · 日文歌詞背誦",
  description:
    "用學習、遮蔽填空與單句循環三種模式背誦日文歌詞（繁體中文翻譯）",
  applicationName: "練歌",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "練歌",
  },
  icons: {
    icon: [
      {
        url: `${basePath}/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: `${basePath}/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [{ url: `${basePath}/apple-touch-icon.png`, sizes: "180x180" }],
  },
  manifest: `${basePath}/manifest.webmanifest`,
};

export const viewport: Viewport = {
  themeColor: "#0c0e12",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-Hant" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
