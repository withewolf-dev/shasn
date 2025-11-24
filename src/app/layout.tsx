import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

import { SiteHeader } from '@/components/layout/site-header';
import { createServerSupabaseClient } from '@/lib/supabase/server-client';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'SHASN Command',
  description: 'Digital command center for the SHASN political strategy experience.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileName: string | null = null;

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .maybeSingle();
    profileName = data?.display_name ?? null;
  }

  return (
    <html lang="en" className="bg-zinc-100">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 antialiased`}>
        <SiteHeader profileName={profileName} userEmail={user?.email ?? null} />
        {children}
      </body>
    </html>
  );
}
