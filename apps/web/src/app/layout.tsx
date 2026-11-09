import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/providers';
import { ShellLayout } from '@/components/layout/shell-layout';

export const metadata: Metadata = {
  title: 'Edgi — Opportunity Intelligence Platform',
  description: 'Private, personal opportunity intelligence platform for cybersecurity and software development.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground selection:bg-primary/20">
        <Providers>
          <ShellLayout>{children}</ShellLayout>
        </Providers>
      </body>
    </html>
  );
}
