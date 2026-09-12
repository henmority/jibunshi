'use client';

import { useEffect, useMemo, useState } from 'react';

import { FlowHeader } from '@/app/components/flow-header';
import { initialQuestionSet, type Question, type QuestionSet } from '@/lib/initial-question-set';
import { personalityQuestions, personalityAnswerCount, ratingValue, RATING_LABELS, summarizePersonality, upgradePersonalityQuestions, UNSURE_ANSWER, UNSURE_LABEL } from '@/lib/personality';
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
        const selectedSet = upgradePersonalityQuestions(published ?? initialQuestionSet);
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
  const answeredCount = personalityAnswerCount(questionSet, diagnosis.answers);
  const hasPreviousAnswers = Object.keys(diagnosis.answers).some((id) => id.startsWith('preference-') && !id.startsWith('preference-v2-') && isAnswered(diagnosis.answers[id]));
  const profile = useMemo(() => summarizePersonality(questionSet, diagnosis.answers), [questionSet, diagnosis.answers]);

  function updateAnswer(questionId: string, value: AnswerValue) {
    const next: DiagnosisData = {
      ...diagnosis,
      questionSetId: questionSet.questionSetId,
      questionSetVersion: questionSet.version,
      answers: { ...diagnosis.answers, [questionId]: value },
      updatedAt: new Date().toISOString(),
    };
    setDiagnosis(next);
    // 通常のページ移動をすぐ行っても、最後の選択を失わないよう同期保存する。
    try { localStorage.setItem(DIAGNOSIS_STORAGE_KEY, JSON.stringify(next)); setSaveState('saved'); }
    catch { setSaveState('failed'); }
  }

  function toggleOption(question: Question, option: string) {
    const current = diagnosis.answers[question.id];
    const selected = Array.isArray(current) ? current : [];
    updateAnswer(question.id, selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }

  function renderAnswer(question: Question) {
    if (question.answerType === 'rating') {
      const selected = ratingValue(diagnosis.answers[question.id]);
      return <fieldset className="preference-scale" disabled={!hydrated}>
        <legend className="sr-only">{question.text}への回答</legend>
        <div className="preference-scale-endpoints" aria-hidden="true"><span>まったく思わない</span><span>かなり思う</span></div>
        <div className="preference-scale-options">{RATING_LABELS.map((label, index) => (
          <label key={label} className={selected === index + 1 ? 'selected' : ''}>
            <input type="radio" aria-label={label} name={question.id} value={index + 1} checked={selected === index + 1} onChange={() => updateAnswer(question.id, String(index + 1))} />
            <span className="scale-dot" aria-hidden="true">{index + 1}</span><span className="scale-wording">{label}</span>
          </label>
        ))}</div>
        <label className="preference-unsure"><input type="radio" name={question.id} value={UNSURE_ANSWER} checked={diagnosis.answers[question.id] === UNSURE_ANSWER} onChange={() => updateAnswer(question.id, UNSURE_ANSWER)} /><span>{UNSURE_LABEL}</span></label>
        <div className="preference-scale-caption"><span>{selected ? `選択中：${RATING_LABELS[selected - 1]}` : diagnosis.answers[question.id] === UNSURE_ANSWER ? '判断保留（点数には含めません）' : '近いものを一つ選んでください'}</span>
          {isAnswered(diagnosis.answers[question.id]) ? <button type="button" onClick={() => updateAnswer(question.id, '')}>回答を取り消す</button> : null}</div>
      </fieldset>;
    }
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
        <div><p className="flow-eyebrow">STEP 3 — PERSONALITY & VALUES</p><h1>いつもの選び方に、<br />あなたらしさがある。</h1><p>{questions.length}問の短い設問から、人との関わり、情報の受け取り方、判断の基準、物事の進め方を振り返ります。</p></div>
        <div className="diagnosis-progress"><span>回答済み</span><strong>{answeredCount}<small> / {questions.length}問</small></strong><div><i style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} /></div><p className={`save-state ${saveState}`}><i />{saveState === 'saved' ? '保存済み' : saveState === 'saving' ? '保存中…' : '保存失敗'}</p></div>
      </section>

      <section className="diagnosis-main">
        <div className="diagnosis-intro"><span>答え方</span><p>ここ数年の普段の自分を思い浮かべ、「そうありたい姿」よりも、無理なく自然にとる行動で答えてください。1「まったく思わない」から7「かなり思う」の7段階です。場面によって違うときは4「どちらともいえない」、経験がなく選べないときは「判断できない・経験がない」を選べます。</p></div>
        {hasPreviousAnswers ? <p className="preference-note">質問を改訂しました。以前の回答は保存したまま、新しい20問には改めて回答できます。旧回答は今回の集計には含めません。</p> : null}
        <p className="preference-note">MBTIの4つの観点を参考にした独自の設問です。正式なMBTI検査ではなく、16タイプや能力の優劣は判定しません。</p>
        <div className="diagnosis-question-list">
          {questions.map((question, index) => (
            <article className={`diagnosis-question ${isAnswered(diagnosis.answers[question.id]) ? 'answered' : ''}`} key={question.id}>
              <div className="diagnosis-question-number"><span>{String(index + 1).padStart(2, '0')}</span>{isAnswered(diagnosis.answers[question.id]) ? <b>回答済み</b> : null}</div>
              <div className="diagnosis-question-body"><h2>{question.text}</h2>{question.helpText ? <p>{question.helpText}</p> : null}{renderAnswer(question)}</div>
            </article>
          ))}
        </div>
        <section className="preference-results" aria-labelledby="preference-results-title">
          <p className="flow-eyebrow">YOUR PREFERENCES</p><h2 id="preference-results-title">回答から見える、4つの傾向</h2>
          <p>各観点の項目をすべて確認し、7段階で答えたものが3問以上あれば目安を表示します。「判断できない」は点数に含めません。どちらがよいという違いではなく、今の自己認識の目安です。</p>
          <div className="preference-result-grid">{profile.axes.map((axis) => <article key={axis.id}>
            <div className="preference-result-heading"><h3>{axis.title}</h3><small>回答 {axis.answered} / {axis.total}問{axis.skipped ? `・判断保留 ${axis.skipped}問` : ''}</small></div>
            <strong>{axis.summary}</strong>
            <div className="preference-track" aria-hidden="true"><span />{axis.position !== null ? <i style={{ left: `${axis.position}%` }} /> : null}</div>
            <div className="preference-poles"><span>{axis.left}</span><span>{axis.right}</span></div>
          </article>)}</div>
          <p className="preference-note">人生史では、これらを本人が感じる傾向として扱います。実際のエピソードと異なる場合は、その場面での行動や気持ちを大切にします。</p>
          <p>思い当たる出来事があれば、年表から一つ選んで書き足せます。結果と違う行動をした場面も、その人らしさの一部です。</p>
          <a className="button secondary" href="/timeline">年表でエピソードを書き足す</a>
        </section>
        <section className="flow-next-card">
          <div><small>STEP 4</small><h2>入力内容から、人生史の原稿へ</h2><p>年表・エピソード・性格や考え方を一つのJSONにまとめ、AIへ送る前に確認できます。</p></div>
          <a className="button primary" href="/story">AI原稿の作成へ進む　›</a>
        </section>
      </section>
    </main>
  );
}
