'use client';

import { useEffect, useMemo, useState } from 'react';

import { FlowHeader } from '@/app/components/flow-header';
import { initialQuestionSet, type Question, type QuestionSet } from '@/lib/initial-question-set';
import {
  DIAGNOSIS_STORAGE_KEY,
  PUBLISHED_QUESTION_SET_KEY,
  type AnswerValue,
  type DiagnosisData,
  normalizeDiagnosisData,
  normalizeQuestionSet,
  readStoredJson,
} from '@/lib/life-story';

type SaveState = 'saved' | 'saving' | 'failed';

function personalityQuestions(questionSet: QuestionSet) {
  return questionSet.sections
    .filter((section) => section.enabled && section.kind === 'personality')
    .sort((a, b) => a.order - b.order)
    .flatMap((section) => section.questions.filter((question) => question.enabled).sort((a, b) => a.order - b.order));
}

function isAnswered(value: AnswerValue | undefined) {
  return Array.isArray(value) ? value.length > 0 : Boolean(value?.trim());
}

export default function DiagnosisPage() {
  const [questionSet, setQuestionSet] = useState<QuestionSet>(initialQuestionSet);
  const [diagnosis, setDiagnosis] = useState<DiagnosisData>({
    schemaVersion: 1,
    questionSetId: initialQuestionSet.questionSetId,
    questionSetVersion: initialQuestionSet.version,
    answers: {},
    updatedAt: initialQuestionSet.updatedAt,
  });
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const published = normalizeQuestionSet(readStoredJson(PUBLISHED_QUESTION_SET_KEY));
        const selectedSet = published ?? initialQuestionSet;
        const saved = normalizeDiagnosisData(readStoredJson(DIAGNOSIS_STORAGE_KEY));
        setQuestionSet(selectedSet);
        setDiagnosis(saved ?? {
          schemaVersion: 1,
          questionSetId: selectedSet.questionSetId,
          questionSetVersion: selectedSet.version,
          answers: {},
          updatedAt: new Date().toISOString(),
        });
      } catch {
        setQuestionSet(initialQuestionSet);
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const savingTimer = window.setTimeout(() => setSaveState('saving'), 0);
    const persistTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(DIAGNOSIS_STORAGE_KEY, JSON.stringify(diagnosis));
        setSaveState('saved');
      } catch {
        setSaveState('failed');
      }
    }, 250);
    return () => {
      window.clearTimeout(savingTimer);
      window.clearTimeout(persistTimer);
    };
  }, [diagnosis, hydrated]);

  const questions = useMemo(() => personalityQuestions(questionSet), [questionSet]);
  const answeredCount = questions.filter((question) => isAnswered(diagnosis.answers[question.id])).length;

  function updateAnswer(questionId: string, value: AnswerValue) {
    setDiagnosis((current) => ({
      ...current,
      questionSetId: questionSet.questionSetId,
      questionSetVersion: questionSet.version,
      answers: { ...current.answers, [questionId]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function toggleOption(question: Question, option: string) {
    const current = diagnosis.answers[question.id];
    const selected = Array.isArray(current) ? current : [];
    updateAnswer(question.id, selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }

  function renderAnswer(question: Question) {
    if (question.answerType === 'multiple_choice') {
      const selected = Array.isArray(diagnosis.answers[question.id]) ? diagnosis.answers[question.id] as string[] : [];
      return (
        <div className="diagnosis-options">
          {(question.options ?? []).map((option) => (
            <label className={selected.includes(option) ? 'selected' : ''} key={option}>
              <input type="checkbox" checked={selected.includes(option)} onChange={() => toggleOption(question, option)} />
              <span>{selected.includes(option) ? '✓' : ''}</span><strong>{option}</strong>
            </label>
          ))}
        </div>
      );
    }
    if (question.answerType === 'single_choice') {
      const selected = typeof diagnosis.answers[question.id] === 'string' ? diagnosis.answers[question.id] as string : '';
      return (
        <div className="diagnosis-options single">
          {(question.options ?? []).map((option) => (
            <label className={selected === option ? 'selected' : ''} key={option}>
              <input type="radio" name={question.id} checked={selected === option} onChange={() => updateAnswer(question.id, option)} />
              <span>{selected === option ? '●' : ''}</span><strong>{option}</strong>
            </label>
          ))}
        </div>
      );
    }
    const value = typeof diagnosis.answers[question.id] === 'string' ? diagnosis.answers[question.id] as string : '';
    return question.answerType === 'short_text' ? (
      <input className="diagnosis-text-input" value={value} onChange={(event) => updateAnswer(question.id, event.target.value)} />
    ) : (
      <textarea className="diagnosis-textarea" rows={5} value={value} onChange={(event) => updateAnswer(question.id, event.target.value)} placeholder="思い出せる場面から、自由に入力してください。" />
    );
  }

  return (
    <main className="flow-shell subpage-shell">
      <FlowHeader active="diagnosis" />
      <section className="subpage-hero diagnosis-hero">
        <div><p className="flow-eyebrow">STEP 3 — PERSONALITY & VALUES</p><h1>性格・考え方を、<br />経験から見つける。</h1><p>性格を決めつける診断ではありません。普段の傾向と実際の出来事の両方から、人生史に表れる人柄を整理します。</p></div>
        <div className="diagnosis-progress"><span>回答済み</span><strong>{answeredCount}<small> / {questions.length}問</small></strong><div><i style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} /></div><p className={`save-state ${saveState}`}><i />{saveState === 'saved' ? '保存済み' : saveState === 'saving' ? '保存中…' : '保存失敗'}</p></div>
      </section>

      <section className="diagnosis-main">
        <div className="diagnosis-intro"><span>答え方</span><p>選択式は近いものを複数選べます。文章の質問は、きれいにまとめず、実際にあった一場面を書くだけで十分です。答えにくい質問は空欄のまま進められます。</p></div>
        <div className="diagnosis-question-list">
          {questions.map((question, index) => (
            <article className={`diagnosis-question ${isAnswered(diagnosis.answers[question.id]) ? 'answered' : ''}`} key={question.id}>
              <div className="diagnosis-question-number"><span>{String(index + 1).padStart(2, '0')}</span>{isAnswered(diagnosis.answers[question.id]) ? <b>回答済み</b> : null}</div>
              <div className="diagnosis-question-body"><h2>{question.text}</h2>{question.helpText ? <p>{question.helpText}</p> : null}{renderAnswer(question)}</div>
            </article>
          ))}
        </div>
        <section className="flow-next-card">
          <div><small>STEP 4</small><h2>入力内容から、人生史の原稿へ</h2><p>年表・エピソード・性格や考え方を一つのJSONにまとめ、AIへ送る前に確認できます。</p></div>
          <a className="button primary" href="/story">AI原稿の作成へ進む　›</a>
        </section>
      </section>
    </main>
  );
}
