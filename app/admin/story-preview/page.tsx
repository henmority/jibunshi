'use client';

/* eslint-disable @next/next/no-html-link-for-pages -- Vinext production navigation crashes when next/link initializes RSC prefetch. */

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_WRITING_SETTINGS, normalizeWritingSettings, WRITING_SETTINGS_KEY } from '@/lib/ai/writing-settings';
import { buildStoryInstructions } from '@/lib/ai/story-prompt';
import { hasEpisodeContent, reviewStorySource } from '@/lib/ai/source-review';

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

type GenerateResponse = { text?: string; model?: string; promptVersion?: string; error?: string; writingSettings?: StoryDraft['writingSettings']; editorialWarnings?: string[] };

export default function AdminStoryPreviewPage() {
  const [bundle, setBundle] = useState<LifeStoryBundle | null>(null);
  const [fileName, setFileName] = useState('');
  const [instruction, setInstruction] = useState('');
  const [draft, setDraft] = useState<StoryDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [writingSettings, setWritingSettings] = useState({ ...DEFAULT_WRITING_SETTINGS });
  const [settingsNotice, setSettingsNotice] = useState('');
  const [lastInstruction, setLastInstruction] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settingsInputRef = useRef<HTMLInputElement>(null);
  const sourceReview = useMemo(() => bundle ? reviewStorySource(bundle) : null, [bundle]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
    try {
      const saved = localStorage.getItem(WRITING_SETTINGS_KEY);
      if (saved) {
        const config = JSON.parse(saved);
        setWritingSettings(normalizeWritingSettings(config.writingSettings));
        setInstruction(typeof config.instruction === 'string' ? config.instruction.slice(0, 4000) : '');
        setSettingsNotice('このブラウザに保存した試作用設定を読み込みました。');
      }
    } catch { setSettingsNotice('保存した設定を読み込めなかったため、標準設定を使っています。'); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function settingsFile() {
    return { kind: 'jibunshi-writing-settings', schemaVersion: 1, writingSettings, instruction };
  }
  function saveSettings() {
    try { localStorage.setItem(WRITING_SETTINGS_KEY, JSON.stringify(settingsFile())); setSettingsNotice('このブラウザに試作用設定を保存しました。利用者全体の設定は変わりません。'); }
    catch { setSettingsNotice('設定を保存できませんでした。設定JSONを書き出して保管してください。'); }
  }
  async function importSettings(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > 100_000) throw new Error('size');
      const config = JSON.parse(await file.text());
      if (config.kind !== 'jibunshi-writing-settings' || config.schemaVersion !== 1) throw new Error('format');
      setWritingSettings(normalizeWritingSettings(config.writingSettings));
      setInstruction(typeof config.instruction === 'string' ? config.instruction.slice(0, 4000) : '');
      setSettingsNotice('設定を読み込みました。必要なら「この設定を保存」を押してください。');
    } catch { setSettingsNotice('設定JSONを読み込めませんでした。専用の設定JSONを選んでください。'); }
  }

  const counts = useMemo(() => ({
    events: bundle?.timeline ? Object.values(bundle.timeline.eventsByAge).filter((value) => value.trim()).length : 0,
    episodes: bundle?.timeline?.episodes.filter(hasEpisodeContent).length ?? 0,
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
        setLastInstruction('');
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
        body: JSON.stringify({ bundle, instruction, writingSettings }),
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
        writingSettings: result.writingSettings,
        editorialWarnings: result.editorialWarnings,
      });
      setLastInstruction(instruction);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'AI原稿を作成できませんでした。');
    } finally {
      setGenerating(false);
    }
  }

  function exportReviewed() {
    if (!bundle || !draft) return;
    downloadJson(`reviewed-${fileName || 'jibunshi'}`, { ...bundle, story: draft, editorialReview: { instruction: lastInstruction, writingSettings: draft.writingSettings, warnings: draft.editorialWarnings }, exportedAt: new Date().toISOString() });
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
        <button className="button primary large" disabled={generating} onClick={() => fileInputRef.current?.click()}>JSONファイルを選択</button>
        <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={handleImport} />
      </section>

      <section className="admin-preview-workspace">
        <aside className="admin-preview-source">
          <div className="admin-file-card"><span>{bundle ? '✓' : 'JSON'}</span><div><strong>{fileName || 'ファイルが未選択です'}</strong><small>{bundle?.timeline?.subjectName || '利用者の統合JSONを読み込んでください'}</small></div></div>
          {bundle ? <div className="admin-source-counts"><div><strong>{counts.events}</strong><span>年齢メモ</span></div><div><strong>{counts.episodes}</strong><span>エピソード</span></div><div><strong>{counts.answers}</strong><span>選択回答・自由記述{counts.notes}件</span></div></div> : null}
          {sourceReview?.warnings.length ? <section className="writing-review" aria-label="資料の要確認事項"><h2>生成前に確認すること</h2><ul>{sourceReview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></section> : null}
          <fieldset className="writing-settings" disabled={generating}>
            <legend>文章づくりの設定</legend>
            <p>この画面での試作に使います。事実を創作しないルールは変更できません。</p>
            <label>文字数の目安<input type="number" min={800} max={5000} step={100} value={writingSettings.targetCharacters} onChange={(event) => setWritingSettings((current) => normalizeWritingSettings({ ...current, targetCharacters: event.target.valueAsNumber }))} /><small>800〜5,000字。資料が少ない場合は短くします。</small></label>
            <label>語り手<select value={writingSettings.voice} onChange={(event) => setWritingSettings((current) => normalizeWritingSettings({ ...current, voice: event.target.value }))}><option value="third">三人称（氏名・姓）</option><option value="first">一人称（私）</option></select></label>
            <label>文体<select value={writingSettings.tone} onChange={(event) => setWritingSettings((current) => normalizeWritingSettings({ ...current, tone: event.target.value }))}><option value="warm">温かく落ち着いた読み物</option><option value="plain">簡潔で率直な記録</option></select></label>
            <label>書き出し<select value={writingSettings.opening} onChange={(event) => setWritingSettings((current) => normalizeWritingSettings({ ...current, opening: event.target.value }))}><option value="episode">印象的な出来事・本人の言葉から</option><option value="chronological">年代順に始める</option></select></label>
            <label>重点<select value={writingSettings.emphasis} onChange={(event) => setWritingSettings((current) => normalizeWritingSettings({ ...current, emphasis: event.target.value }))}><option value="balanced">全体のバランスと資料の具体性</option><option value="family">家族・人との関わり</option><option value="work">仕事・役割・挑戦</option></select></label>
            <label>性格・考え方<select value={writingSettings.personality} onChange={(event) => setWritingSettings((current) => normalizeWritingSettings({ ...current, personality: event.target.value }))}><option value="woven">本人の説明を短く織り込む</option><option value="section">独立した短い章で伝える</option><option value="omit">人柄の解説を含めない</option></select></label>
            <label>本人の言葉の引用<select value={writingSettings.quotations} onChange={(event) => setWritingSettings((current) => normalizeWritingSettings({ ...current, quotations: event.target.value }))}><option value="selective">印象的な言葉だけ引用する</option><option value="none">引用せず意味を伝える</option></select></label>
            <label>表現の揺らぎ（temperature）<input type="number" min={0} max={0.7} step={0.05} value={writingSettings.temperature} onChange={(event) => setWritingSettings((current) => normalizeWritingSettings({ ...current, temperature: event.target.valueAsNumber }))} /><small>標準0.35。高くしても文章の品質や事実の正確さが上がるわけではありません。</small></label>
            <label className="admin-instruction"><span>追加の編集指示</span><textarea rows={5} maxLength={4000} value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="例：ブログを始めた際の考えと現在の振り返りを厚めに。家族の節目は省略しない。" /></label>
            <div className="writing-setting-actions"><button type="button" className="button secondary" onClick={saveSettings}>この設定を保存</button><button type="button" className="button secondary" onClick={() => downloadJson('jibunshi-writing-settings.json', settingsFile())}>設定JSONを書き出す</button><button type="button" className="button secondary" onClick={() => settingsInputRef.current?.click()}>設定JSONを読み込む</button><button type="button" className="button secondary" onClick={() => { setWritingSettings({ ...DEFAULT_WRITING_SETTINGS }); setInstruction(''); setSettingsNotice('標準設定に戻しました。保存すると次回にも適用されます。'); }}>標準設定に戻す</button></div>
            <input hidden type="file" accept="application/json,.json" ref={settingsInputRef} onChange={importSettings} />
            <p role="status">{settingsNotice}</p>
            <small>全利用者への適用は、開発者が writing-settings.ts の標準値を変更して公開します。</small>
          </fieldset>
          <details className="json-preview"><summary>実際にAIへ渡す執筆指示を見る</summary><pre>{buildStoryInstructions(instruction, writingSettings)}</pre></details>
          {sourceReview?.followUpQuestions.length ? <details className="writing-review"><summary>文章を豊かにする追加取材のヒント</summary><ul>{sourceReview.followUpQuestions.map((question) => <li key={question}>{question}</li>)}</ul><p>回答は元の年表・エピソードへ追記して、JSONを再読み込みしてください。</p></details> : null}
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
              {draft.writingSettings ? <details className="json-preview"><summary>この原稿を生成した設定</summary><pre>{JSON.stringify(draft.writingSettings, null, 2)}</pre></details> : null}
              {draft.editorialWarnings?.length ? <section className="writing-review"><h2>原稿の確認事項</h2><ul>{draft.editorialWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul><p>機械的な簡易点検です。指摘がなくても、事実の正確さを保証するものではありません。</p></section> : null}
            </>
          ) : (
            <div className="admin-result-empty"><span aria-hidden="true">文</span><h2>AIの出力がここに表示されます</h2><p>左側でJSONの内容と追加指示を確認してから、原稿を作成してください。</p></div>
          )}
        </section>
      </section>
    </main>
  );
}
