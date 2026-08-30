import type { Metadata } from 'next';
import './globals.css';

const title = '設問編集室｜自分史作成サポート';
const description = 'AIで作られた自分史の設問を、確認・編集・検証して安全に公開するためのローカル編集ツール。';

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
