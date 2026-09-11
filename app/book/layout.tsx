import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '印刷・PDF｜わたしの自分史',
  description: '人生史をA4用紙に合わせて確認し、印刷またはPDF保存します。',
};

export default function BookLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
