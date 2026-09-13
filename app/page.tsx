'use client';

import { useCallback, useEffect, useState } from 'react';

import { FlowHeader } from '@/app/components/flow-header';
import { initialQuestionSet } from '@/lib/initial-question-set';
import { personalityAnswerCount, personalityNoteCount, upgradePersonalityQuestions } from '@/lib/personality';
import {
  DIAGNOSIS_STORAGE_KEY,
  PUBLISHED_QUESTION_SET_KEY,
  normalizeQuestionSet,
  STORY_STORAGE_KEY,
  TIMELINE_STORAGE_KEY,
  normalizeDiagnosisData,
  normalizeStoryDraft,
  normalizeTimelineData,
  readStoredJson,
} from '@/lib/life-story';

type ProgressState = {
  profileReady: boolean;
  timelineCount: number;
  episodeCount: number;
  diagnosisCount: number;
  diagnosisNotes: number;
  storyReady: boolean;
};

const EMPTY_PROGRESS: ProgressState = {
  profileReady: false,
  timelineCount: 0,
  episodeCount: 0,
  diagnosisCount: 0,
  diagnosisNotes: 0,
  storyReady: false,
};

const STEPS = [
  {
    number: '1', title: '年表をつくる',
    description: '名前と生年月日を入力し、学校歴や年齢ごとの出来事を並べます。', href: '/timeline',
  },
  {
    number: '2', title: '出来事を掘り下げる',
    description: '家族、学校、仕事、転機などの話題を選び、場面や気持ちを詳しく残します。', href: '/timeline',
  },
  {
    number: '3', title: '自分の考え方を知る',
    description: '20の場面を7段階で比べ、自分の考えや理由も自由に書き残します。', href: '/diagnosis',
  },
  {
    number: '4', title: 'AIと原稿をまとめる',
    description: '入力内容をJSONで確認してから、事実に沿った人生史の下書きを作ります。', href: '/story',
  },
  {
    number: '5', title: '印刷して、一冊にする',
    description: '生成した原稿を編集し、読みやすい冊子レイアウトで印刷します。', href: '/book',
  },
] as const;

export default function UserHomePage() {
  const [progress, setProgress] = useState<ProgressState>(EMPTY_PROGRESS);

  const refreshProgress = useCallback(() => {
    try {
      const timeline = normalizeTimelineData(readStoredJson(TIMELINE_STORAGE_KEY));
      const diagnosis = normalizeDiagnosisData(readStoredJson(DIAGNOSIS_STORAGE_KEY));
      const story = normalizeStoryDraft(readStoredJson(STORY_STORAGE_KEY));
      const questionSet = upgradePersonalityQuestions(normalizeQuestionSet(readStoredJson(PUBLISHED_QUESTION_SET_KEY)) ?? initialQuestionSet);
      setProgress({
        profileReady: Boolean(timeline?.subjectName.trim() && timeline.birthDate),
        timelineCount: timeline ? Object.values(timeline.eventsByAge).filter((value) => value.trim()).length : 0,
        episodeCount: timeline?.episodes.length ?? 0,
        diagnosisCount: diagnosis ? personalityAnswerCount(questionSet, diagnosis.answers) : 0,
        diagnosisNotes: personalityNoteCount(questionSet, diagnosis),
        storyReady: Boolean(story?.content.trim()),
      });
    } catch {
      setProgress(EMPTY_PROGRESS);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(refreshProgress, 0);
    window.addEventListener('focus', refreshProgress);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('focus', refreshProgress);
    };
  }, [refreshProgress]);

  function statusFor(index: number) {
    if (index === 0) return progress.timelineCount ? `${progress.timelineCount}件入力` : progress.profileReady ? '基本情報を入力済み' : '未入力';
    if (index === 1) return progress.episodeCount ? `${progress.episodeCount}件入力` : '未入力';
    if (index === 2) return progress.diagnosisCount || progress.diagnosisNotes ? `${progress.diagnosisCount}問回答・自由記述${progress.diagnosisNotes}件` : '未入力';
    if (index === 3) return progress.storyReady ? '原稿あり' : '未作成';
    return progress.storyReady ? '印刷できます' : '原稿作成後';
  }

  const startedStages = [progress.profileReady || progress.timelineCount > 0, progress.episodeCount > 0, progress.diagnosisCount > 0 || progress.diagnosisNotes > 0, progress.storyReady].filter(Boolean).length;

  return (
    <main className="flow-shell journal-home">
      <FlowHeader active="home" />
      <section className="journal-intro">
        <div className="journal-intro-heading"><span>人生の記録を、一冊に。</span><span>はじめに</span></div>
        <div className="journal-hero-grid">
        <div className="journal-hero-copy">
          <h1>わたしを、<br />書き残す。</h1>
          <p className="journal-lead">どこで暮らし、誰と出会い、何を考えたか。<br />忘れたくないことを、ひとつずつ。<br />年表からはじめる、自分史づくり。</p>
          <a className="journal-start" href="/timeline">{progress.profileReady || progress.timelineCount ? '年表の続きを書く' : '年表を書きはじめる'}<span aria-hidden="true">→</span></a>
          <p className="journal-entry-note">パスワード不要。入力内容はこのブラウザに自動保存。</p>
        </div>
        <figure className="journal-specimen">
          <figcaption><span>記録の見本</span><span>架空の記入例</span></figcaption>
          <div className="journal-specimen-heading"><span>十八歳</span><h2>はじめて、<br />家を離れた日。</h2></div>
          <dl className="journal-record">
            <div><dt>出来事</dt><dd>進学のため、実家を出て一人暮らしを始めた。</dd></div>
            <div><dt>覚えている場面</dt><dd>引っ越しのあと、母が置いていった弁当を、新しい部屋で食べた。</dd></div>
            <div><dt>そのときの気持ち</dt><dd>自由になれたうれしさと、少しの心細さ。</dd></div>
          </dl>
          <p className="journal-specimen-foot">短いメモから、その日のことをたどれます。</p>
        </figure>
        </div>
      </section>

      <section className="journal-progress" aria-label="現在の進み具合">
        <span className="journal-small-heading">現在の記録</span>
        <p>{startedStages ? '保存した内容から、いつでも再開できます。' : 'まずは、お名前と生年月日から。'}</p>
        <span className="journal-progress-count">記録・原稿 <strong>{startedStages}</strong> / 4段階に着手</span>
        <a href="#flow-steps-title">手順と進み具合を見る <span aria-hidden="true">↓</span></a>
      </section>

      <section className="journal-contents" aria-labelledby="flow-steps-title">
        <div className="journal-contents-heading">
          <p className="journal-small-heading">自分史づくりの手順</p><h2 id="flow-steps-title">書く。振り返る。<br />一冊にまとめる。</h2>
          <p>すべてを順番に埋める必要はありません。<br />思い出したところから進めてください。</p>
        </div>
        <ol className="journal-step-list">
          {STEPS.map((step, index) => {
            const status = statusFor(index);
            const isStarted = !['未入力', '未作成', '原稿作成後'].includes(status);
            return (
              <li key={step.number}><a href={step.href}>
                <span className="journal-step-number">0{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.description}</p><span className={`journal-step-status ${isStarted ? 'started' : ''}`}>{status}</span></div>
                <span className="journal-step-arrow" aria-hidden="true">→</span>
              </a></li>
            );
          })}
        </ol>
      </section>

      <section className="journal-guidance" aria-labelledby="journal-guidance-title">
        <h2 id="journal-guidance-title">書きはじめる前に</h2>
        <div><h3>うまく書こうとしなくて大丈夫です。</h3><p>単語や短いメモでも構いません。はっきり覚えていないこと、書きたくないことは、そのまま空欄にできます。</p></div>
        <div><h3>大切な記録は、手元にも。</h3><p>入力内容はこのブラウザに保存されます。端末の変更やバックアップには、原稿作成画面の「統合JSONを書き出す」をお使いください。</p></div>
      </section>

      <footer className="journal-footer">
        <strong>わたしの自分史</strong><a href="/admin">管理者用：設問編集・AI出力確認</a>
      </footer>
    </main>
  );
}
