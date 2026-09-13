import type { Metadata } from 'next';
import './globals.css';
// Editorial screen design; the A4 print stylesheet remains unchanged.
import './journal.css';

const title = 'わたしの自分史｜人生を一冊の物語へ';
const description = '人生年表、エピソード、性格・考え方を入力し、AIと一緒に印刷できる自分史を作るサービス。';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? 'http://localhost:3001'),
  title,
  description,
  openGraph: {
    title,
    description,
    type: 'website',
    locale: 'ja_JP',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: '設問編集室 — 自分史を、問いから丁寧に。' }],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
