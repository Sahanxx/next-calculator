// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Next Calculator',
  description: 'A simple calculator built with Next.js + Tailwind CSS',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}