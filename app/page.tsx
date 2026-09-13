'use client';

import { useCallback, useEffect, useState } from 'react';

import { FlowHeader } from '@/app/components/flow-header';
import { BookPortrait, StepArtwork } from '@/app/components/edition-art';
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

  const startedStages = [progress.profileReady || progress.timelineCount > 0, progress.episodeCount > 0, progress.diagnosisCount > 0 || progress.diagnosisNotes > 0, progress.storyReady].filter(Boolean).length;

  return (
    <main className="flow-shell edition-home">
      <FlowHeader active="home" />
      <section className="edition-hero">
        <div className="edition-hero-copy">
          <p className="edition-eyebrow"><span />A LIFE, WELL REMEMBERED</p>
          <h1>あなたの人生は、<br /><em>一冊の宝物になる。</em></h1>
          <p className="edition-lead">何気ない日々も、忘れられない瞬間も。<br />思い出をたどることから、<br className="edition-mobile-break" />あなたの物語を残しませんか。</p>
          <div className="edition-hero-actions"><a className="button primary" href="/timeline">{progress.profileReady || progress.timelineCount ? '人生年表の続きを書く' : '人生年表をはじめる'}<span aria-hidden="true">↗</span></a><a className="edition-text-link" href="#flow-steps-title">つくり方を見る <span aria-hidden="true">↓</span></a></div>
          <p className="edition-hero-note">パスワード不要 <span>·</span> 途中でやめても、自動保存</p>
        </div>
        <BookPortrait />
      </section>

      <section className="edition-progress" aria-label="現在の進み具合">
        <div className="edition-progress-intro"><span className="edition-progress-symbol" aria-hidden="true">✦</span><div><span className="edition-eyebrow">YOUR STORY IN PROGRESS</span><h2>{startedStages ? '少しずつ、物語になっています。' : '最初の一行から、はじめましょう。'}</h2></div></div>
        <div className="edition-progress-meter"><span>記録・原稿の進み具合<strong>{startedStages}<small> / 4</small></strong></span><div role="progressbar" aria-label="着手済みの段階" aria-valuenow={startedStages} aria-valuemin={0} aria-valuemax={4}><i style={{ width: `${startedStages * 25}%` }} /></div></div>
        <a className="edition-text-link" href={progress.storyReady ? '/book' : '/timeline'}>{progress.storyReady ? '一冊のかたちを見る' : '年表を開く'} <span aria-hidden="true">↗</span></a>
      </section>

      <section className="flow-steps" aria-labelledby="flow-steps-title">
        <div className="flow-section-heading">
          <div><p className="edition-eyebrow">FROM MEMORIES TO A BOOK</p><h2 id="flow-steps-title">思い出が、かたちになるまで。</h2></div>
          <p>5つのステップで、あなたの一冊へ。<br />思い出したところから、あなたのペースで。</p>
        </div>
        <div className="flow-step-list">
          {STEPS.map((step, index) => {
            const status = statusFor(index);
            const isStarted = !['未入力', '未作成', '原稿作成後'].includes(status);
            return (
              <a className={`flow-step-card edition-step-${step.number}`} href={step.href} key={step.number}>
                <span className="edition-step-top"><span className="flow-step-number">0{step.number}</span><StepArtwork step={index + 1} /></span>
                <div className="edition-step-copy"><small>{step.eyebrow}</small><h3>{step.title}</h3><p>{step.description}</p></div>
                <span className={`flow-step-status ${isStarted ? 'started' : ''}`}>{status}</span>
                <b className="edition-card-arrow" aria-hidden="true">↗</b>
              </a>
            );
          })}
        </div>
      </section>

      <section className="edition-closing">
        <span className="edition-closing-mark" aria-hidden="true">史</span><p className="edition-eyebrow">EVERY LIFE HAS A STORY</p>
        <h2>特別な出来事だけが、<br />あなたの物語ではないから。</h2>
        <p>いつもの食卓。誰かがくれた言葉。小さな決心。<br />あなたが覚えていることから、ひとつずつ。</p>
        <a className="edition-text-link" href="/timeline">思い出をひとつ、書いてみる <span aria-hidden="true">↗</span></a>
      </section>

      <footer className="flow-footer">
        <div><strong>わたしの自分史</strong><p>入力内容はこのブラウザに保存されます。端末の変更やバックアップには、原稿作成画面からJSONを書き出してください。</p></div>
        <a href="/admin">管理者はこちら（設問編集・AI出力確認）</a>
      </footer>
    </main>
  );
}
