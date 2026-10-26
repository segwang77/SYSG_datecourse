import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/useAuth";
import Header from "@/components/Header";
import { SITE, faviconHref } from "@/lib/site";

// 탭 이름·파비콘은 src/lib/site.ts 한 곳에서 관리한다. 이 레이아웃이 모든 페이지를 감싸므로 전체에 적용된다.
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: SITE.title,
  description: SITE.description,
  icons: { icon: faviconHref(), apple: SITE.favicon.startsWith("/") ? SITE.favicon : undefined },
  openGraph: { title: SITE.title, description: SITE.description, images: [SITE.shareImage] },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      </head>
      <body>
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
