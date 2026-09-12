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
    number: '1', eyebrow: 'LIFE TIMELINE', title: '人生年表に出来事を入力',
    description: '名前と生年月日を入力し、学校歴や年齢ごとの出来事を並べます。', href: '/timeline',
  },
  {
    number: '2', eyebrow: 'DEEPEN STORIES', title: '大切なエピソードを深掘り',
    description: '家族、学校、仕事、転機などの話題を選び、場面や気持ちを詳しく残します。', href: '/timeline',
  },
  {
    number: '3', eyebrow: 'PERSONALITY', title: '性格・考え方を入力',
    description: '20の場面を7段階で比べ、自分の考えや理由も自由に書き残します。', href: '/diagnosis',
  },
  {
    number: '4', eyebrow: 'AI DRAFT', title: 'AIで人生史の原稿を作成',
    description: '入力内容をJSONで確認してから、事実に沿った人生史の下書きを作ります。', href: '/story',
  },
  {
    number: '5', eyebrow: 'PRINT & PDF', title: 'A4で印刷・PDF保存',
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
    if (index === 0) return progress.profileReady || progress.timelineCount ? `${progress.timelineCount}件入力` : '未入力';
    if (index === 1) return progress.episodeCount ? `${progress.episodeCount}件入力` : '未入力';
    if (index === 2) return progress.diagnosisCount || progress.diagnosisNotes ? `${progress.diagnosisCount}問回答・自由記述${progress.diagnosisNotes}件` : '未入力';
    if (index === 3) return progress.storyReady ? '原稿あり' : '未作成';
    return progress.storyReady ? '印刷できます' : '原稿作成後';
  }

  return (
    <main className="flow-shell">
      <FlowHeader active="home" />
      <section className="flow-hero">
        <div>
          <p className="flow-eyebrow">人生史 利用者用 · パスワード不要</p>
          <h1>思い出をたどり、<br />一冊の人生史へ。</h1>
          <p>そのまま年表づくりを始められます。覚えているところから少しずつ入力でき、内容はこのブラウザへ自動保存されます。</p>
        </div>
        <div className="flow-progress-card">
          <span>現在の進み具合</span>
          <strong>{[progress.timelineCount > 0, progress.episodeCount > 0, progress.diagnosisCount > 0 || progress.diagnosisNotes > 0, progress.storyReady].filter(Boolean).length}<small> / 4 段階</small></strong>
          <div><i style={{ width: `${[progress.timelineCount > 0, progress.episodeCount > 0, progress.diagnosisCount > 0 || progress.diagnosisNotes > 0, progress.storyReady].filter(Boolean).length * 25}%` }} /></div>
          <p>{progress.profileReady ? '基本情報は入力済みです。続きから始められます。' : 'まずは名前と生年月日から始めましょう。'}</p>
        </div>
      </section>

      <section className="flow-steps" aria-labelledby="flow-steps-title">
        <div className="flow-section-heading">
          <div><p className="flow-eyebrow">5 STEPS</p><h2 id="flow-steps-title">自分史ができるまで</h2></div>
          <p>順番に進めても、思い出したところから始めても構いません。</p>
        </div>
        <div className="flow-step-list">
          {STEPS.map((step, index) => {
            const status = statusFor(index);
            const isStarted = !['未入力', '未作成', '原稿作成後'].includes(status);
            return (
              <a className="flow-step-card" href={step.href} key={step.number}>
                <span className="flow-step-number">{step.number}</span>
                <div><small>{step.eyebrow}</small><h3>{step.title}</h3><p>{step.description}</p></div>
                <span className={`flow-step-status ${isStarted ? 'started' : ''}`}>{status}</span>
                <b aria-hidden="true">›</b>
              </a>
            );
          })}
        </div>
      </section>

      <footer className="flow-footer">
        <p>入力内容は利用中のブラウザに保存されます。端末を変える場合は、原稿作成画面からJSONを書き出してください。</p>
        <a href="/admin">管理者はこちら（設問編集・AI出力確認）</a>
      </footer>
    </main>
  );
}
