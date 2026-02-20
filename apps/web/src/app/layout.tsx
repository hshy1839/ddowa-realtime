import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '또와 AI - 전화 응대 AI 상담원',
  description: '전화 응대 및 예약 자동화를 위한 AI 상담원 플랫폼',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
