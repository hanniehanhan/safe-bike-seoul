import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Safe Bike Seoul",
  description: "서울의 안전한 자전거 라이딩을 위한 프로젝트",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
