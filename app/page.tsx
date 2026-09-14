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
    <main className="flow-shell refined-home washi-home">
      <FlowHeader active="home" />
      <section className="flow-hero washi-hero">
        <div className="washi-hero-copy">
          <p className="flow-eyebrow"><span className="washi-seal" aria-hidden="true">綴</span>あなたの歩みを、あなたの言葉で。</p>
          <h1>思い出をたどり、<br />一冊の人生史へ。</h1>
          <p className="home-lead">うまく書こうとしなくて、大丈夫。<br />懐かしい場所、大切な人、いつもの日々。<br />思い出をひとつずつ、あなたの言葉で残しませんか。</p>
          <a className="button primary home-start" href="/timeline">{progress.profileReady || progress.timelineCount ? '年表の続きを書く' : '年表づくりを始める'}<span aria-hidden="true">→</span></a>
          <p className="home-entry-note">パスワード不要・このブラウザに自動保存</p>
        </div>
        <figure className="washi-hero-art">
          {/* eslint-disable-next-line @next/next/no-img-element -- next/image triggers an invalid-hook-call in the current Vinext runtime. Serve this static asset directly. */}
          <img src="/life-memories-washi.png" width={1536} height={1024} alt="" fetchPriority="high" decoding="async" />
          <figcaption>出会いも、寄り道も。<br />あなたの大切な一頁。</figcaption>
        </figure>
      </section>
      <section className="washi-progress-wrap" aria-label="保存した記録">
        <div className="flow-progress-card" role="region" aria-label="現在の進み具合">
          <span>あなたの自分史づくり</span>
          <strong>{startedStages}<small> / 4 段階に着手</small></strong>
          <div><i style={{ width: `${startedStages * 25}%` }} /></div>
          <p>{progress.profileReady ? '基本情報は入力済みです。続きから始められます。' : 'まずは名前と生年月日から始めましょう。'}</p>
          <a className="home-progress-link" href="#flow-steps-title">各手順の記録を見る <span aria-hidden="true">↓</span></a>
        </div>
      </section>

      <section className="flow-steps" aria-labelledby="flow-steps-title">
        <div className="flow-section-heading">
          <div><p className="flow-eyebrow">少しずつ、かたちに。</p><h2 id="flow-steps-title">自分史ができるまで<span className="washi-heading-dot" aria-hidden="true">。</span></h2></div>
          <p>順番どおりでなくても大丈夫。<br />思い出したところから進めてください。</p>
        </div>
        <ol className="flow-step-list">
          {STEPS.map((step, index) => {
            const status = statusFor(index);
            const isStarted = !['未入力', '未作成', '原稿作成後'].includes(status);
            return (
              <li key={step.number}><a className="flow-step-card" href={step.href}>
                <span className="flow-step-number">{step.number}</span>
                <div><h3>{step.title}</h3><p>{step.description}</p></div>
                <span className={`flow-step-status ${isStarted ? 'started' : ''}`}>{status}</span>
                <b aria-hidden="true">›</b>
              </a></li>
            );
          })}
        </ol>
      </section>

      <section className="washi-writing-note" aria-labelledby="writing-note-title">
        <span className="washi-note-mark" aria-hidden="true">ひとこと</span>
        <div><h2 id="writing-note-title">小さな思い出から、はじめましょう。</h2><p>「よく歩いた帰り道」「家族の口ぐせ」「夢中になったこと」。<br />短いメモでも構いません。書きたくないことは、空欄のままで大丈夫です。</p></div>
        <a href="/timeline">年表を開く <span aria-hidden="true">→</span></a>
      </section>

      <footer className="flow-footer">
        <p>入力内容はこのブラウザに保存されます。端末の変更やバックアップには、原稿作成画面からJSONを書き出してください。</p>
        <a href="/admin">管理者はこちら（設問編集・AI出力確認）</a>
      </footer>
    </main>
  );
}
