import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '設問編集室｜自分史作成サポート',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
