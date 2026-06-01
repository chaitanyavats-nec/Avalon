import type { Metadata } from 'next';
import { MedievalSharp, EB_Garamond } from 'next/font/google';
import './globals.css';

const medieval = MedievalSharp({ 
  subsets: ['latin'], 
  weight: '400', 
  variable: '--font-medieval',
  display: 'swap',
});

const garamond = EB_Garamond({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600'], 
  variable: '--font-garamond',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Avalon — The Board Game Companion',
  description: 'A digital companion for the Arthurian social deduction game. Assign roles, track quests, and uncover traitors.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${medieval.variable} ${garamond.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
