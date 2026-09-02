import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '人生年表｜自分史作成サポート',
  description: '年月に沿って人生の出来事とストーリーを記録する、自分史のための人生年表。',
};

export default function TimelineLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
