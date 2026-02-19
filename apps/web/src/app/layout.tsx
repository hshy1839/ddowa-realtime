import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ddowa - AI-Powered Realtime Consultation Platform',
  description: 'Real-time AI consultation and booking platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
