'use client';

import { useEffect, useMemo, useState } from 'react';

import { FlowHeader } from '@/app/components/flow-header';
import { initialQuestionSet, type Question, type QuestionSet } from '@/lib/initial-question-set';
import { AXES, personalityQuestions, personalityAnswerCount, ratingValue, questionRatingLabels, normalizeComparison, summarizePersonality, upgradePersonalityQuestions, UNSURE_ANSWER, UNSURE_LABEL } from '@/lib/personality';
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
  const hasPreviousAnswers = Object.keys(diagnosis.answers).some((id) => id.startsWith('preference-') && !id.startsWith('preference-v3-') && isAnswered(diagnosis.answers[id]));
  const noteCount = questions.filter((q) => diagnosis.answerNotes?.[q.id]?.trim()).length;
  const profile = useMemo(() => summarizePersonality(questionSet, diagnosis.answers), [questionSet, diagnosis.answers]);

  function updateDiagnosis(patch: Partial<DiagnosisData>) {
    const next: DiagnosisData = {
      ...diagnosis,
      questionSetId: questionSet.questionSetId,
      questionSetVersion: questionSet.version,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    setDiagnosis(next);
    // 通常のページ移動をすぐ行っても、最後の選択を失わないよう同期保存する。
    try { localStorage.setItem(DIAGNOSIS_STORAGE_KEY, JSON.stringify(next)); setSaveState('saved'); }
    catch { setSaveState('failed'); }
  }

  function updateAnswer(questionId: string, value: AnswerValue) {
    updateDiagnosis({ answers: { ...diagnosis.answers, [questionId]: value } });
  }

  function toggleOption(question: Question, option: string) {
    const current = diagnosis.answers[question.id];
    const selected = Array.isArray(current) ? current : [];
    updateAnswer(question.id, selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  }

  function renderAnswer(question: Question) {
    if (question.answerType === 'rating') {
      const selected = ratingValue(diagnosis.answers[question.id]);
      const labels = questionRatingLabels(question);
      const comparison = normalizeComparison(question.comparison);
      return <fieldset className="preference-scale" disabled={!hydrated}>
        <legend className="sr-only">{question.text}への回答</legend>
        {comparison ? <div className="preference-comparison"><p><b>A</b>{comparison.left}</p><p><b>B</b>{comparison.right}</p></div> : null}
        <div className="preference-scale-endpoints" aria-hidden="true"><span>{comparison ? 'Aに近い' : 'まったく思わない'}</span><span>{comparison ? 'Bに近い' : 'かなり思う'}</span></div>
        <div className="preference-scale-options">{labels.map((label, index) => (
          <label key={label} className={selected === index + 1 ? 'selected' : ''}>
            <input type="radio" aria-label={label} name={question.id} value={index + 1} checked={selected === index + 1} onChange={() => updateAnswer(question.id, String(index + 1))} />
            <span className="scale-dot" aria-hidden="true">{index + 1}</span><span className="scale-wording">{label}</span>
          </label>
        ))}</div>
        <label className="preference-unsure"><input type="radio" name={question.id} value={UNSURE_ANSWER} checked={diagnosis.answers[question.id] === UNSURE_ANSWER} onChange={() => updateAnswer(question.id, UNSURE_ANSWER)} /><span>{UNSURE_LABEL}</span></label>
        <div className="preference-scale-caption"><span>{selected ? `選択中：${labels[selected - 1]}` : diagnosis.answers[question.id] === UNSURE_ANSWER ? '判断保留（点数には含めません）' : '近いものを一つ選んでください'}</span>
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
        <div><p className="flow-eyebrow">STEP 3 — PERSONALITY & VALUES</p><h1>あなたなら、<br />どう考えますか。</h1><p>{questions.length}の場面から、自然に選ぶ考え方を振り返ります。7段階の選択と、自分の言葉の両方で残せます。</p></div>
        <div className="diagnosis-progress"><span>回答済み</span><strong>{answeredCount}<small> / {questions.length}問</small></strong><div><i style={{ width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%` }} /></div><p className={`save-state ${saveState}`}><i />{saveState === 'saved' ? '保存済み' : saveState === 'saving' ? '保存中…' : '保存失敗'}</p></div>
      </section>

      <section className="diagnosis-main">
        <div className="diagnosis-intro"><span>答え方</span><p>AとBのどちらも選べるとしたら、今の自分はどちらに近いでしょうか。1「Aにとても近い」〜7「Bにとても近い」で選んでください。4は「どちらも同じくらい」。どちらも合わない・経験がない場合は「判断できない・経験がない」を選び、理由だけ書くこともできます。正解や望ましい答えはありません。</p></div>
        {questions.some((q) => q.answerType === 'rating' && !normalizeComparison(q.comparison)) ? <p className="preference-note">A/Bの表示がない設問は、1「まったく思わない」〜7「かなり思う」で回答します。</p> : null}
        {hasPreviousAnswers ? <p className="preference-note">質問を改訂しました。以前の回答は保存したまま、新しい20問には改めて回答できます。旧回答は今回の集計には含めません。</p> : null}
        <p className="preference-note">MBTIの4つの観点を参考にした独自の自己理解シートです。正式な検査・検証済みの尺度ではなく、16タイプや能力の優劣は判定しません。</p>
        <p className="preference-note" role="status">選択回答 {answeredCount}問・理由のメモ {noteCount}問{diagnosis.selfDescription?.trim() ? '・自由記述あり' : ''}。文章だけでも保存できます。</p>
        <div className="diagnosis-question-list">
          {questions.map((question, index) => (
            <article className={`diagnosis-question ${isAnswered(diagnosis.answers[question.id]) ? 'answered' : ''}`} key={question.id}>
              <div className="diagnosis-question-number"><span>{String(index + 1).padStart(2, '0')}</span>{isAnswered(diagnosis.answers[question.id]) ? <b>回答済み</b> : null}</div>
              <div className="diagnosis-question-body">
                {question.preference ? <span className="preference-axis-label">{AXES.find((axis) => axis.id === question.preference?.axis)?.title}</span> : null}
                <h2>{question.text}</h2>{question.helpText ? <p>{question.helpText}</p> : null}{renderAnswer(question)}
                <details className="preference-reason"><summary>自分の考えや理由を書く（任意）{diagnosis.answerNotes?.[question.id]?.trim() ? '・記入済み' : ''}</summary>
                  <label htmlFor={`reason-${question.id}`}>この場面で、あなたはどう考えますか？</label>
                  <p id={`reason-help-${question.id}`}>選んだ理由、場面による違い、思い当たる経験などを自由に。「仕事ではA、家ではB」など短い言葉でも構いません。</p>
                  <textarea id={`reason-${question.id}`} aria-describedby={`reason-help-${question.id}`} disabled={!hydrated} rows={4} maxLength={4000} value={diagnosis.answerNotes?.[question.id] ?? ''} onChange={(e) => updateDiagnosis({ answerNotes: { ...diagnosis.answerNotes, [question.id]: e.target.value } })} />
                </details>
              </div>
            </article>
          ))}
        </div>
        <section className="preference-free-writing" aria-labelledby="free-writing-title">
          <p className="flow-eyebrow">IN YOUR OWN WORDS</p><h2 id="free-writing-title">選択肢では伝えきれない、あなたの考え</h2>
          <p id="self-description-help">人と意見が違うときに大切にすること、昔と今で変わった考え方、自分らしいと思う行動など。書きたいことだけで構いません。</p>
          <label htmlFor="self-description">自分の考え方・性格について自由に書いてください（任意）</label>
          <textarea id="self-description" aria-describedby="self-description-help" disabled={!hydrated} rows={6} maxLength={12000} value={diagnosis.selfDescription ?? ''} onChange={(e) => updateDiagnosis({ selfDescription: e.target.value })} />
          <p className="preference-note">文章は点数には換算しません。人生史を作るAIには、選択回答と一緒に本人の説明として渡します。</p>
        </section>
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
