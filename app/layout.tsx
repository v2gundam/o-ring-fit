import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "O-Ring Fit — 오링 및 글랜드 설계 도우미",
  description: "허용 공간에 맞는 AS568 오링을 찾고 글랜드 형상과 DXF를 설계합니다.",
  openGraph: {
    title: "O-Ring Fit",
    description: "오링과 글랜드 설계 도우미",
    type: "website",
    images: [{
      url: "/o-ring-fit-social-preview.png",
      width: 1729,
      height: 910,
      alt: "O-Ring Fit 오링과 글랜드 설계 도우미",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "O-Ring Fit",
    description: "오링과 글랜드 설계 도우미",
    images: ["/o-ring-fit-social-preview.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
