'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

import { FlowHeader } from '@/app/components/flow-header';
import { initialQuestionSet, type QuestionSet } from '@/lib/initial-question-set';
import { personalityAnswerCount, personalityNoteCount, upgradePersonalityQuestions } from '@/lib/personality';
import {
  DIAGNOSIS_STORAGE_KEY,
  PUBLISHED_QUESTION_SET_KEY,
  STORY_STORAGE_KEY,
  TIMELINE_STORAGE_KEY,
  createLifeStoryBundle,
  downloadJson,
  normalizeDiagnosisData,
  normalizeLifeStoryBundle,
  normalizeQuestionSet,
  normalizeStoryDraft,
  normalizeTimelineData,
  readStoredJson,
  type DiagnosisData,
  type LifeStoryBundle,
  type StoryDraft,
  type TimelineData,
} from '@/lib/life-story';

type GenerateResponse = { text?: string; model?: string; promptVersion?: string; error?: string; writingSettings?: StoryDraft['writingSettings']; editorialWarnings?: string[] };

function titleFromStory(text: string, fallback: string) {
  const heading = text.split('\n').find((line) => line.startsWith('# '));
  return heading?.replace(/^#\s+/, '').trim() || fallback;
}

export default function StoryPage() {
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisData | null>(null);
  const [questionSet, setQuestionSet] = useState<QuestionSet>(initialQuestionSet);
  const [story, setStory] = useState<StoryDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [consent, setConsent] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setTimeline(normalizeTimelineData(readStoredJson(TIMELINE_STORAGE_KEY)));
        setDiagnosis(normalizeDiagnosisData(readStoredJson(DIAGNOSIS_STORAGE_KEY)));
        setStory(normalizeStoryDraft(readStoredJson(STORY_STORAGE_KEY)));
        setQuestionSet(upgradePersonalityQuestions(normalizeQuestionSet(readStoredJson(PUBLISHED_QUESTION_SET_KEY)) ?? initialQuestionSet));
      } catch {
        setError('保存データを読み込めませんでした。JSONファイルがあれば読み込み直せます。');
      } finally {
        setHydrated(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated || !story) return;
    const timer = window.setTimeout(() => localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(story)), 250);
    return () => window.clearTimeout(timer);
  }, [hydrated, story]);

  const bundle = useMemo(() => createLifeStoryBundle({ timeline, diagnosis, questionSet, story }), [diagnosis, questionSet, story, timeline]);
  const eventCount = timeline ? Object.values(timeline.eventsByAge).filter((value) => value.trim()).length : 0;
  const episodeCount = timeline?.episodes.length ?? 0;
  const diagnosisCount = diagnosis ? personalityAnswerCount(questionSet, diagnosis.answers) : 0;
  const diagnosisNotes = personalityNoteCount(questionSet, diagnosis);
  const canGenerate = Boolean(timeline && (eventCount || episodeCount));

  function persistImported(imported: LifeStoryBundle) {
    if (imported.timeline) {
      setTimeline(imported.timeline);
      localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(imported.timeline));
    }
    if (imported.diagnosis) {
      setDiagnosis(imported.diagnosis);
      localStorage.setItem(DIAGNOSIS_STORAGE_KEY, JSON.stringify(imported.diagnosis));
    }
    if (imported.questionSet) {
      setQuestionSet(imported.questionSet);
      localStorage.setItem(PUBLISHED_QUESTION_SET_KEY, JSON.stringify(imported.questionSet));
    }
    if (imported.story) {
      setStory(imported.story);
      localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(imported.story));
    }
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        const importedBundle = normalizeLifeStoryBundle(raw);
        if (importedBundle) {
          persistImported(importedBundle);
        } else {
          const importedTimeline = normalizeTimelineData(raw);
          if (!importedTimeline) throw new Error('invalid');
          setTimeline(importedTimeline);
          localStorage.setItem(TIMELINE_STORAGE_KEY, JSON.stringify(importedTimeline));
        }
        setError('');
        setNotice('JSONファイルを読み込みました。内容を確認してください。');
      } catch {
        setError('このJSONファイルは読み込めません。人生年表または自分史データのファイルを選んでください。');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  async function generateStory() {
    if (!canGenerate || !consent || generating) return;
    setGenerating(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle }),
      });
      const result = await response.json() as GenerateResponse;
      if (!response.ok || !result.text) throw new Error(result.error || 'AI原稿を作成できませんでした。');
      const now = new Date().toISOString();
      const nextStory: StoryDraft = {
        schemaVersion: 1,
        title: titleFromStory(result.text, `${timeline?.subjectName || 'わたし'}の人生史`),
        content: result.text,
        generatedAt: now,
        updatedAt: now,
        promptVersion: result.promptVersion ?? '',
        model: result.model ?? '',
        writingSettings: result.writingSettings,
        editorialWarnings: result.editorialWarnings,
      };
      setStory(nextStory);
      localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(nextStory));
      setNotice('人生史の下書きを作成しました。内容を読み、必要なところを修正してください。');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI原稿を作成できませんでした。');
    } finally {
      setGenerating(false);
    }
  }

  function updateStory(patch: Partial<StoryDraft>) {
    setStory((current) => current ? { ...current, ...patch, updatedAt: new Date().toISOString() } : current);
  }

  return (
    <main className="flow-shell subpage-shell">
      <FlowHeader active="story" />
      <section className="subpage-hero story-hero">
        <div><p className="flow-eyebrow">手順 4 ／ AIと原稿をまとめる</p><h1>入力した事実から、<br />人生史の下書きを作る。</h1><p>AIへ送信するのは、ここに表示される年表・エピソード・診断回答です。生成後の文章は自由に修正できます。</p></div>
        <div className="story-source-summary">
          <span>AIへ渡す資料</span>
          <div><strong>{eventCount}<small>件</small><em>年齢メモ</em></strong><strong>{episodeCount}<small>件</small><em>エピソード</em></strong><strong>{diagnosisCount}<small>問</small><em>診断回答</em></strong></div>
        </div>
      </section>

      <section className="story-workspace">
        <aside className="story-data-panel">
          <div><p className="flow-eyebrow">原稿の材料</p><h2>入力データを確認</h2><p>送信前に、含まれる内容を確認できます。</p></div>
          <div className="story-readiness-list">
            <a className={timeline?.subjectName && timeline.birthDate ? 'ready' : ''} href="/timeline"><span>{timeline?.subjectName && timeline.birthDate ? '✓' : '1'}</span><div><strong>基本情報</strong><small>{timeline?.subjectName || '名前が未入力'}</small></div><b>›</b></a>
            <a className={eventCount || episodeCount ? 'ready' : ''} href="/timeline"><span>{eventCount || episodeCount ? '✓' : '2'}</span><div><strong>年表・エピソード</strong><small>{eventCount + episodeCount}件の記録</small></div><b>›</b></a>
            <a className={diagnosisCount || diagnosisNotes ? 'ready' : ''} href="/diagnosis"><span>{diagnosisCount || diagnosisNotes ? '✓' : '3'}</span><div><strong>性格・考え方</strong><small>{diagnosisCount}問回答・自由記述{diagnosisNotes}件</small></div><b>›</b></a>
          </div>
          <details className="json-preview"><summary>AIへ送るJSONを見る</summary><pre>{JSON.stringify(bundle, null, 2)}</pre></details>
          <div className="story-data-actions">
            <button className="button secondary" onClick={() => downloadJson(`jibunshi-${timeline?.subjectName || 'data'}.json`, { ...bundle, exportedAt: new Date().toISOString() })}>統合JSONを書き出す</button>
            <button className="button secondary" onClick={() => fileInputRef.current?.click()}>JSONを読み込む</button>
            <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={handleImport} />
          </div>
        </aside>

        <div className="story-editor-panel">
          {notice ? <p className="inline-notice success">✓ {notice}</p> : null}
          {error ? <p className="inline-notice error" role="alert">! {error}</p> : null}
          {story?.editorialWarnings?.length ? <section className="writing-review" aria-label="原稿の確認事項"><h2>原稿を読むときに確認してください</h2><ul>{story.editorialWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section> : null}

          {story ? (
            <div className="story-editor">
              <div className="story-editor-heading"><div><p className="flow-eyebrow">原稿を整える</p><h2>人生史の下書き</h2></div><span>自由に修正できます</span></div>
              <label><span>題名</span><input value={story.title} onChange={(event) => updateStory({ title: event.target.value })} /></label>
              <label><span>本文</span><textarea rows={28} value={story.content} onChange={(event) => updateStory({ content: event.target.value })} /></label>
              <label className="ai-consent story-regenerate-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>再生成のため、表示中のデータをAIへ送ることに同意します</strong><small>編集済みの原稿は、再生成すると新しい下書きに置き換わります。</small></span></label>
              <div className="story-editor-actions"><button className="button secondary" disabled={!consent || generating} onClick={generateStory}>{generating ? '作り直しています…' : 'AIでもう一度作る'}</button><a className="button primary" href="/book">A4印刷の確認へ　›</a></div>
            </div>
          ) : (
            <div className="story-generate-card">
              <span className="story-generate-mark" aria-hidden="true">文</span>
              <p className="flow-eyebrow">原稿の作成</p>
              <h2>人生史の下書きを作成</h2>
              <p>AIは入力されていない事実を補わず、情報量に合わせて文章をまとめます。生成後は必ずご本人が内容を確認してください。</p>
              {!canGenerate ? <p className="story-missing">年表の出来事、または深掘りエピソードを1件以上入力してください。</p> : null}
              <label className="ai-consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} /><span><strong>表示中のデータをAIへ送ることに同意します</strong><small>名前、年月日、出来事、診断回答が送信されます。</small></span></label>
              <button className="button primary large" disabled={!canGenerate || !consent || generating} onClick={generateStory}>{generating ? '人生史を書いています…' : 'AIで人生史を作成する'}</button>
              <small className="generation-wait">内容量により、1〜2分ほどかかる場合があります。</small>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
