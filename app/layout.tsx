import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["600", "700"],
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "FClab — FC 온라인 데이터 분석 플랫폼",
  description:
    "넥슨 FC 온라인 Open API 및 공식 데이터센터 기반 선수 검색, 스쿼드 최적화, 카드 가성비 효율, 플레이 스타일 프로파일링, 실시간 전적 분석 통합 플랫폼",
  openGraph: {
    title: "FClab — FC 온라인 데이터 분석 플랫폼",
    description:
      "넥슨 FC 온라인 Open API 및 공식 데이터센터 기반 선수 검색, 스쿼드 최적화, 카드 가성비 효율, 플레이 스타일 프로파일링, 실시간 전적 분석 통합 플랫폼",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FClab — FC 온라인 데이터 분석 플랫폼",
    description:
      "넥슨 FC 온라인 Open API 및 공식 데이터센터 기반 선수 검색, 스쿼드 최적화, 카드 가성비 효율, 플레이 스타일 프로파일링, 실시간 전적 분석 통합 플랫폼",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      className={`${outfit.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} dark`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#0B0F17] text-slate-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200 font-sans min-h-screen"
      >
        {children}
      </body>
    </html>
  );
}
