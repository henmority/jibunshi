import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '性格・考え方｜わたしの自分史',
  description: '選択式と具体的な経験から、人柄や大切にしてきた価値観を整理します。',
};

export default function DiagnosisLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
