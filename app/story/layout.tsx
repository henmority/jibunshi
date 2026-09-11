import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AIで人生史を作る｜わたしの自分史',
  description: '年表、エピソード、性格・考え方を確認し、AIで人生史の下書きを作ります。',
};

export default function StoryLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
