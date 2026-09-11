'use client';

import { useEffect, useMemo, useState } from 'react';

import { FlowHeader } from '@/app/components/flow-header';
import {
  STORY_STORAGE_KEY,
  TIMELINE_STORAGE_KEY,
  normalizeStoryDraft,
  normalizeTimelineData,
  readStoredJson,
  type StoryDraft,
  type TimelineData,
} from '@/lib/life-story';

type StorySection = { title: string; paragraphs: string[] };

function parseStory(content: string): StorySection[] {
  const sections: StorySection[] = [];
  let current: StorySection = { title: 'はじめに', paragraphs: [] };
  let paragraph: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    current.paragraphs.push(paragraph.join('\n'));
    paragraph = [];
  }

  function flushSection() {
    flushParagraph();
    if (current.paragraphs.length) sections.push(current);
  }

  content.split('\n').forEach((line) => {
    if (line.startsWith('# ')) return;
    if (line.startsWith('## ')) {
      flushSection();
      current = { title: line.replace(/^##\s+/, '').trim(), paragraphs: [] };
      return;
    }
    if (!line.trim()) {
      flushParagraph();
      return;
    }
    paragraph.push(line.replace(/^[-*]\s+/, '').replace(/\*\*/g, ''));
  });
  flushSection();
  return sections;
}

function japaneseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [year, month, day] = value.split('-').map(Number);
  return `${year}年${month}月${day}日生まれ`;
}

function japaneseDay(value: string) {
  const date = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '—';
  const [year, month, day] = date.split('-').map(Number);
  return `${year}年${month}月${day}日`;
}

export default function BookPage() {
  const [story, setStory] = useState<StoryDraft | null>(null);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [fontSize, setFontSize] = useState<'compact' | 'standard' | 'large'>('standard');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setStory(normalizeStoryDraft(readStoredJson(STORY_STORAGE_KEY)));
        setTimeline(normalizeTimelineData(readStoredJson(TIMELINE_STORAGE_KEY)));
      } catch {
        setStory(null);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const sections = useMemo(() => parseStory(story?.content ?? ''), [story?.content]);

  return (
    <main className="flow-shell subpage-shell book-shell">
      <div className="no-print"><FlowHeader active="book" /></div>
      <section className="book-toolbar no-print">
        <div><p className="flow-eyebrow">STEP 5 — PRINT & PDF</p><h1>A4印刷の仕上がりを確認</h1><p>文章を直す場合は「原稿を編集」へ戻ってください。印刷画面で「PDFに保存」を選ぶこともできます。</p></div>
        <div className="book-toolbar-actions">
          <div className="book-font-switch" aria-label="本文の文字サイズ"><span>文字サイズ</span><button className={fontSize === 'compact' ? 'active' : ''} onClick={() => setFontSize('compact')}>小</button><button className={fontSize === 'standard' ? 'active' : ''} onClick={() => setFontSize('standard')}>中</button><button className={fontSize === 'large' ? 'active' : ''} onClick={() => setFontSize('large')}>大</button></div>
          <a className="button secondary" href="/story">原稿を編集</a>
          <button className="button primary large" disabled={!story?.content.trim()} onClick={() => window.print()}>印刷・PDF保存</button>
        </div>
      </section>

      {story?.content.trim() ? (
        <div className={`book-preview ${fontSize}`}>
          <article className="print-book">
            <section className="book-cover">
              <p>MY LIFE STORY</p>
              <div className="book-cover-mark">史</div>
              <h1>{story.title || 'わたしの人生史'}</h1>
              <span />
              <h2>{timeline?.subjectName || 'お名前'}</h2>
              {timeline?.birthDate ? <p>{japaneseDate(timeline.birthDate)}</p> : null}
              <small>人生の記憶と大切な物語</small>
            </section>

            <section className="book-title-page">
              <p>人生史</p><h1>{story.title || 'わたしの人生史'}</h1><strong>{timeline?.subjectName || ''}</strong>
            </section>

            {sections.map((section, index) => (
              <section className="book-chapter" key={`${section.title}-${index}`}>
                <header><span>{String(index + 1).padStart(2, '0')}</span><div><small>CHAPTER</small><h2>{section.title}</h2></div></header>
                <div>{section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}</div>
              </section>
            ))}

            <section className="book-colophon">
              <h2>{story.title || 'わたしの人生史'}</h2>
              <dl><div><dt>著者</dt><dd>{timeline?.subjectName || '—'}</dd></div><div><dt>作成日</dt><dd>{japaneseDay(story.updatedAt || story.generatedAt)}</dd></div></dl>
              <p>本書は、ご本人が入力した記憶をもとにAIが作成した下書きを、ご本人または編集者が確認・編集したものです。</p>
            </section>
          </article>
        </div>
      ) : (
        <section className="book-empty no-print"><span aria-hidden="true">冊</span><h2>印刷する原稿がまだありません</h2><p>年表と性格・考え方を入力し、AI原稿を作成すると、ここにA4の仕上がりが表示されます。</p><a className="button primary" href="/story">AI原稿の作成へ</a></section>
      )}
    </main>
  );
}
