'use client';

/* eslint-disable @next/next/no-html-link-for-pages -- Vinext production navigation crashes when next/link initializes RSC prefetch. */

import { ChangeEvent, useMemo, useRef, useState } from 'react';

import { initialQuestionSet } from '@/lib/initial-question-set';
import { personalityAnswerCount, personalityNoteCount } from '@/lib/personality';
import {
  createLifeStoryBundle,
  downloadJson,
  normalizeLifeStoryBundle,
  normalizeTimelineData,
  type LifeStoryBundle,
  type StoryDraft,
} from '@/lib/life-story';

type GenerateResponse = { text?: string; model?: string; promptVersion?: string; error?: string };

export default function AdminStoryPreviewPage() {
  const [bundle, setBundle] = useState<LifeStoryBundle | null>(null);
  const [fileName, setFileName] = useState('');
  const [instruction, setInstruction] = useState('');
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => ({
    events: bundle?.timeline ? Object.values(bundle.timeline.eventsByAge).filter((value) => value.trim()).length : 0,
    episodes: bundle?.timeline?.episodes.length ?? 0,
    answers: bundle?.diagnosis ? personalityAnswerCount(bundle.questionSet ?? initialQuestionSet, bundle.diagnosis.answers) : 0,
    notes: personalityNoteCount(bundle?.questionSet ?? initialQuestionSet, bundle?.diagnosis),
  }), [bundle]);

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result));
        const integrated = normalizeLifeStoryBundle(raw);
        const timeline = integrated ? null : normalizeTimelineData(raw);
        const imported = integrated ?? (timeline ? createLifeStoryBundle({ timeline, diagnosis: null, questionSet: initialQuestionSet, story: null }) : null);
        if (!imported?.timeline) throw new Error('invalid');
        setBundle(imported);
        setDraft(imported.story);
        setFileName(file.name);
        setError('');
      } catch {
        setBundle(null);
        setDraft(null);
        setFileName('');
        setError('読み込めないJSONです。利用者画面から書き出した統合JSONまたは人生年表JSONを選んでください。');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  async function generatePreview() {
    if (!bundle || generating) return;
    setGenerating(true);
    setError('');
    try {
      const response = await fetch('/api/story/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundle, instruction }),
      });
      const result = await response.json() as GenerateResponse;
      if (!response.ok || !result.text) throw new Error(result.error || 'AI原稿を作成できませんでした。');
      const now = new Date().toISOString();
      setDraft({
        schemaVersion: 1,
        title: result.text.split('\n').find((line) => line.startsWith('# '))?.slice(2).trim() || '人生史',
        content: result.text,
        generatedAt: now,
        updatedAt: now,
        promptVersion: result.promptVersion ?? '',
        model: result.model ?? '',
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI原稿を作成できませんでした。');
    } finally {
      setGenerating(false);
    }
  }

  function exportReviewed() {
    if (!bundle || !draft) return;
    downloadJson(`reviewed-${fileName || 'jibunshi'}`, { ...bundle, story: draft, exportedAt: new Date().toISOString() });
  }

  return (
    <main className="admin-tool-shell">
      <header className="admin-tool-header">
        <a className="flow-brand" href="/admin"><span aria-hidden="true">史</span><div><small>JIBUNSHI STUDIO</small><strong>AI原稿確認</strong></div></a>
        <nav><a href="/admin">設問編集</a><span>AI原稿確認</span><a href="/">利用者画面</a></nav>
        <form action="/api/auth/logout" method="post"><button className="button secondary" type="submit">ログアウト</button></form>
      </header>

      <section className="admin-tool-hero">
        <div><p className="flow-eyebrow">ADMIN STORY REVIEW</p><h1>利用者のJSONから、<br />AI原稿を確認する。</h1><p>利用者画面と同じ生成処理を使い、追加の編集指示を加えて結果を比較できます。</p></div>
        <button className="button primary large" onClick={() => fileInputRef.current?.click()}>JSONファイルを選択</button>
        <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={handleImport} />
      </section>

      <section className="admin-preview-workspace">
        <aside className="admin-preview-source">
          <div className="admin-file-card"><span>{bundle ? '✓' : 'JSON'}</span><div><strong>{fileName || 'ファイルが未選択です'}</strong><small>{bundle?.timeline?.subjectName || '利用者の統合JSONを読み込んでください'}</small></div></div>
          {bundle ? <div className="admin-source-counts"><div><strong>{counts.events}</strong><span>年齢メモ</span></div><div><strong>{counts.episodes}</strong><span>エピソード</span></div><div><strong>{counts.answers}</strong><span>選択回答・自由記述{counts.notes}件</span></div></div> : null}
          <label className="admin-instruction"><span>今回だけ追加する指示</span><textarea rows={7} value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="例：仕事の章を短くし、家族とのエピソードを中心に構成する" /><small>共通の安全ルールや「事実を作らない」という指示は自動で適用されます。</small></label>
          <button className="button primary" disabled={!bundle || generating} onClick={generatePreview}>{generating ? 'AIが原稿を作成しています…' : 'このJSONからAI原稿を作る'}</button>
          {bundle ? <details className="json-preview admin-json"><summary>読み込んだJSONを確認</summary><pre>{JSON.stringify(bundle, null, 2)}</pre></details> : null}
        </aside>

        <section className="admin-preview-result">
          {error ? <p className="inline-notice error" role="alert">! {error}</p> : null}
          {draft ? (
            <>
              <div className="admin-result-heading"><div><p className="flow-eyebrow">GENERATED DRAFT</p><h2>出力内容</h2></div><button className="button secondary" onClick={exportReviewed}>確認結果をJSONで保存</button></div>
              <label><span>題名</span><input value={draft.title} onChange={(event) => setDraft((current) => current ? { ...current, title: event.target.value, updatedAt: new Date().toISOString() } : current)} /></label>
              <label><span>本文</span><textarea rows={32} value={draft.content} onChange={(event) => setDraft((current) => current ? { ...current, content: event.target.value, updatedAt: new Date().toISOString() } : current)} /></label>
              <div className="admin-model-note">モデル: {draft.model || '—'}　指示バージョン: {draft.promptVersion || '—'}</div>
            </>
          ) : (
            <div className="admin-result-empty"><span aria-hidden="true">文</span><h2>AIの出力がここに表示されます</h2><p>左側でJSONの内容と追加指示を確認してから、原稿を作成してください。</p></div>
          )}
        </section>
      </section>
    </main>
  );
}
