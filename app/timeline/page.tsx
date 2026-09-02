'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type TimelineCategory = 'home' | 'school' | 'work' | 'family' | 'meeting' | 'turning' | 'other';

type TimelineEntry = {
  id: string;
  year: string;
  month: string;
  endYear: string;
  endMonth: string;
  dateNote: string;
  category: TimelineCategory;
  title: string;
  place: string;
  organization: string;
  people: string;
  fact: string;
  scene: string;
  feeling: string;
  impact: string;
};

type TimelineData = {
  schemaVersion: 1;
  subjectName: string;
  birthDate: string;
  updatedAt: string;
  entries: TimelineEntry[];
};

type SaveState = 'saved' | 'saving' | 'failed';

const STORAGE_KEY = 'jibunshi-life-timeline-v1';

const CATEGORY_LABELS: Record<TimelineCategory, string> = {
  home: '暮らし・移動',
  school: '学校・学び',
  work: '仕事',
  family: '家族',
  meeting: '出会い',
  turning: '転機',
  other: 'その他',
};

const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS) as [TimelineCategory, string][];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

const emptyTimeline: TimelineData = {
  schemaVersion: 1,
  subjectName: '',
  birthDate: '',
  updatedAt: '2026-09-02T00:00:00.000Z',
  entries: [],
};

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function normalizeTimeline(value: unknown): TimelineData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<TimelineData>;
  if (!Array.isArray(data.entries)) return null;

  return {
    schemaVersion: 1,
    subjectName: stringValue(data.subjectName),
    birthDate: stringValue(data.birthDate),
    updatedAt: stringValue(data.updatedAt),
    entries: data.entries.flatMap((rawEntry) => {
      if (!rawEntry || typeof rawEntry !== 'object') return [];
      const entry = rawEntry as Partial<TimelineEntry>;
      const category = String(entry.category) as TimelineCategory;
      return [{
        id: stringValue(entry.id) || crypto.randomUUID(),
        year: stringValue(entry.year),
        month: stringValue(entry.month),
        endYear: stringValue(entry.endYear),
        endMonth: stringValue(entry.endMonth),
        dateNote: stringValue(entry.dateNote),
        category: Object.hasOwn(CATEGORY_LABELS, category) ? category : 'other',
        title: stringValue(entry.title) || '名称未入力の出来事',
        place: stringValue(entry.place),
        organization: stringValue(entry.organization),
        people: stringValue(entry.people),
        fact: stringValue(entry.fact),
        scene: stringValue(entry.scene),
        feeling: stringValue(entry.feeling),
        impact: stringValue(entry.impact),
      }];
    }),
  };
}

function createEntry(): TimelineEntry {
  return {
    id: crypto.randomUUID(),
    year: '',
    month: '',
    endYear: '',
    endMonth: '',
    dateNote: '',
    category: 'turning',
    title: '新しい出来事',
    place: '',
    organization: '',
    people: '',
    fact: '',
    scene: '',
    feeling: '',
    impact: '',
  };
}

function entrySortValue(entry: TimelineEntry) {
  const year = Number(entry.year);
  if (!Number.isFinite(year) || year <= 0) return Number.MAX_SAFE_INTEGER;
  return year * 100 + (Number(entry.month) || 0);
}

function formatPeriod(entry: TimelineEntry) {
  const start = entry.year
    ? `${entry.year}年${entry.month ? `${Number(entry.month)}月` : ''}`
    : '時期未入力';
  if (!entry.endYear) return start;
  const end = `${entry.endYear}年${entry.endMonth ? `${Number(entry.endMonth)}月` : ''}`;
  return `${start}〜${end}`;
}

function approximateAge(birthDate: string, entry: TimelineEntry) {
  if (!birthDate || !entry.year) return '';
  const [birthYearText, birthMonthText] = birthDate.split('-');
  const birthYear = Number(birthYearText);
  const eventYear = Number(entry.year);
  if (!birthYear || !eventYear || eventYear < birthYear) return '';
  let age = eventYear - birthYear;
  if (entry.month && Number(entry.month) < Number(birthMonthText)) age -= 1;
  return age >= 0 ? `約${age}歳` : '';
}

function downloadTimeline(timeline: TimelineData) {
  const blob = new Blob([JSON.stringify(timeline, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `jibunshi-timeline-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineData>(emptyTimeline);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TimelineCategory>('all');
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const normalized = normalizeTimeline(JSON.parse(stored));
          if (normalized) {
            setTimeline(normalized);
            setSelectedEntryId(normalized.entries[0]?.id ?? '');
          }
        }
      } catch {
        setNotice('保存されていた年表を読み込めなかったため、新しい年表を表示しています。');
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(timeline));
        setSaveState('saved');
      } catch {
        setSaveState('failed');
      }
    }, 250);
    return () => {
      window.clearTimeout(savingTimer);
      window.clearTimeout(persistTimer);
    };
  }, [hydrated, timeline]);

  const selectedEntry = timeline.entries.find((entry) => entry.id === selectedEntryId) ?? null;

  const visibleEntries = useMemo(() => {
    const searchText = search.trim().toLocaleLowerCase('ja');
    return timeline.entries
      .filter((entry) => categoryFilter === 'all' || entry.category === categoryFilter)
      .filter((entry) => {
        if (!searchText) return true;
        return [entry.title, entry.place, entry.organization, entry.people, entry.fact, entry.scene]
          .some((value) => value.toLocaleLowerCase('ja').includes(searchText));
      })
      .sort((first, second) => entrySortValue(first) - entrySortValue(second));
  }, [categoryFilter, search, timeline.entries]);

  const yearRange = useMemo(() => {
    const years = timeline.entries.map((entry) => Number(entry.year)).filter((year) => year > 0);
    if (!years.length) return '—';
    const first = Math.min(...years);
    const last = Math.max(...years);
    return first === last ? `${first}年` : `${first}〜${last}年`;
  }, [timeline.entries]);

  const storyCount = timeline.entries.filter((entry) => entry.scene.trim() || entry.feeling.trim() || entry.impact.trim()).length;

  function updateTimeline(patch: Partial<TimelineData>) {
    setTimeline((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  }

  function updateEntry(patch: Partial<TimelineEntry>) {
    if (!selectedEntry) return;
    setTimeline((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      entries: current.entries.map((entry) => entry.id === selectedEntry.id ? { ...entry, ...patch } : entry),
    }));
  }

  function addEntry() {
    const entry = createEntry();
    setTimeline((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      entries: [...current.entries, entry],
    }));
    setSelectedEntryId(entry.id);
    setCategoryFilter('all');
    setSearch('');
    setNotice('新しい出来事を追加しました。まず年と見出しを入力してください。');
  }

  function deleteEntry() {
    if (!selectedEntry) return;
    const currentIndex = timeline.entries.findIndex((entry) => entry.id === selectedEntry.id);
    const remaining = timeline.entries.filter((entry) => entry.id !== selectedEntry.id);
    const nextEntry = remaining[Math.min(currentIndex, remaining.length - 1)];
    const deletedTitle = selectedEntry.title;
    setTimeline((current) => ({
      ...current,
      updatedAt: new Date().toISOString(),
      entries: current.entries.filter((entry) => entry.id !== selectedEntry.id),
    }));
    setSelectedEntryId(nextEntry?.id ?? '');
    setDeleteOpen(false);
    setNotice(`「${deletedTitle}」を年表から削除しました。`);
  }

  return (
    <main className="timeline-shell">
      <header className="timeline-topbar">
        <Link className="timeline-brand" href="/" aria-label="設問編集室へ戻る">
          <span aria-hidden="true">史</span>
          <div><small>JIBUNSHI STUDIO</small><strong>人生年表</strong></div>
        </Link>
        <nav className="studio-nav" aria-label="機能を切り替える">
          <Link href="/">設問編集</Link>
          <span className="active">人生年表</span>
        </nav>
        <div className="timeline-header-actions">
          <span className={`save-state ${saveState}`}><i />{saveState === 'saved' ? '保存済み' : saveState === 'saving' ? '保存中…' : '保存失敗'}</span>
          <button className="button secondary" onClick={() => downloadTimeline(timeline)}>JSONで保存</button>
          <form className="logout-form" action="/api/auth/logout" method="post">
            <button className="button secondary" type="submit">ログアウト</button>
          </form>
        </div>
      </header>

      <section className="timeline-hero">
        <div>
          <p className="label">LIFE TIMELINE</p>
          <h1>出来事を並べて、人生の流れを見つける</h1>
          <p>年だけでも登録できます。事実を先に置き、思い出せる出来事から場面や気持ちを足してください。</p>
        </div>
        <div className="timeline-profile">
          <label><span>お名前</span><input value={timeline.subjectName} onChange={(event) => updateTimeline({ subjectName: event.target.value })} placeholder="人生史を書く人の名前" /></label>
          <label><span>生年月日</span><input type="date" value={timeline.birthDate} onChange={(event) => updateTimeline({ birthDate: event.target.value })} /></label>
        </div>
      </section>

      <section className="timeline-stats" aria-label="年表の概要">
        <div><strong>{timeline.entries.length}</strong><span>登録した出来事</span></div>
        <div><strong>{yearRange}</strong><span>年表の範囲</span></div>
        <div><strong>{storyCount}</strong><span>ストーリー記入済み</span></div>
        <p>この年表は設問セットとは別に、このブラウザへ自動保存されます。</p>
      </section>

      <div className="timeline-workspace">
        <section className="timeline-list-panel">
          <div className="timeline-toolbar">
            <div>
              <p className="label">CHRONOLOGY</p>
              <h2>人生の出来事</h2>
            </div>
            <button className="button primary" onClick={addEntry}>＋ 出来事を追加</button>
          </div>
          <div className="timeline-filters">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="場所・人物・出来事を検索" aria-label="年表を検索" />
            <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as 'all' | TimelineCategory)} aria-label="分類で絞り込む">
              <option value="all">すべての分類</option>
              {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          {visibleEntries.length ? (
            <div className="timeline-list">
              {visibleEntries.map((entry) => {
                const age = approximateAge(timeline.birthDate, entry);
                return (
                  <article className={`timeline-entry-card ${entry.id === selectedEntryId ? 'selected' : ''}`} key={entry.id}>
                    <div className="timeline-point" aria-hidden="true"><i /></div>
                    <button onClick={() => setSelectedEntryId(entry.id)}>
                      <div className="timeline-entry-period"><strong>{formatPeriod(entry)}</strong>{age && <span>{age}</span>}</div>
                      <div className="timeline-entry-copy">
                        <span className={`timeline-category ${entry.category}`}>{CATEGORY_LABELS[entry.category]}</span>
                        <h3>{entry.title}</h3>
                        {(entry.place || entry.organization) && <p>{[entry.place, entry.organization].filter(Boolean).join('・')}</p>}
                        {entry.fact && <p className="timeline-fact-preview">{entry.fact}</p>}
                      </div>
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="timeline-empty">
              <span aria-hidden="true">＋</span>
              <h3>{timeline.entries.length ? '条件に合う出来事がありません' : '最初の出来事を登録しましょう'}</h3>
              <p>{timeline.entries.length ? '検索や分類を変更してください。' : '生まれた年、入学、就職、引っ越しなど、年月が分かる出来事から始められます。'}</p>
              {!timeline.entries.length && <button className="button primary" onClick={addEntry}>出来事を追加</button>}
            </div>
          )}
        </section>

        <aside className={`timeline-editor ${selectedEntry ? 'open' : ''}`}>
          {selectedEntry ? (
            <>
              <div className="timeline-editor-heading">
                <div><p className="label">EDIT EVENT</p><h2>出来事を編集</h2></div>
                <div className="timeline-editor-heading-actions">
                  <button className="timeline-editor-close" onClick={() => setSelectedEntryId('')} aria-label="年表に戻る">×</button>
                  <button className="timeline-delete-icon" onClick={() => setDeleteOpen(true)} aria-label="この出来事を削除">⌫</button>
                </div>
              </div>
              <div className="timeline-editor-scroll">
                <div className="timeline-form-section">
                  <h3><span>1</span>いつ・どこで</h3>
                  <div className="timeline-date-grid">
                    <label><span>開始年</span><input type="number" inputMode="numeric" min="1800" max="2200" value={selectedEntry.year} onChange={(event) => updateEntry({ year: event.target.value })} placeholder="例：1985" /></label>
                    <label><span>月（任意）</span><select value={selectedEntry.month} onChange={(event) => updateEntry({ month: event.target.value })}><option value="">不明</option>{MONTH_OPTIONS.map((month) => <option key={month} value={String(month)}>{month}月</option>)}</select></label>
                    <label><span>終了年（任意）</span><input type="number" inputMode="numeric" min="1800" max="2200" value={selectedEntry.endYear} onChange={(event) => updateEntry({ endYear: event.target.value })} /></label>
                    <label><span>終了月（任意）</span><select value={selectedEntry.endMonth} onChange={(event) => updateEntry({ endMonth: event.target.value })}><option value="">不明</option>{MONTH_OPTIONS.map((month) => <option key={month} value={String(month)}>{month}月</option>)}</select></label>
                  </div>
                  <label><span>時期の補足</span><input value={selectedEntry.dateNote} onChange={(event) => updateEntry({ dateNote: event.target.value })} placeholder="例：小学3年生の夏、昭和の終わりごろ" /></label>
                  <label><span>分類</span><select value={selectedEntry.category} onChange={(event) => updateEntry({ category: event.target.value as TimelineCategory })}>{CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                </div>

                <div className="timeline-form-section">
                  <h3><span>2</span>事実を記録</h3>
                  <label><span>出来事の見出し</span><input value={selectedEntry.title} onChange={(event) => updateEntry({ title: event.target.value })} placeholder="例：〇〇株式会社へ入社" /></label>
                  <label><span>場所</span><input value={selectedEntry.place} onChange={(event) => updateEntry({ place: event.target.value })} placeholder="市区町村、建物、住所など" /></label>
                  <label><span>学校・会社・団体名</span><input value={selectedEntry.organization} onChange={(event) => updateEntry({ organization: event.target.value })} placeholder="固有名詞を正式名称で入力" /></label>
                  <label><span>関わった人</span><input value={selectedEntry.people} onChange={(event) => updateEntry({ people: event.target.value })} placeholder="名前やご自身との関係" /></label>
                  <label><span>何が起きたか</span><textarea rows={4} value={selectedEntry.fact} onChange={(event) => updateEntry({ fact: event.target.value })} placeholder="まず事実だけを、起きた順に書いてください。" /></label>
                </div>

                <div className="timeline-form-section story">
                  <h3><span>3</span>ストーリーを残す <small>すべて任意</small></h3>
                  <label><span>目に浮かぶ場面・会話</span><textarea rows={4} value={selectedEntry.scene} onChange={(event) => updateEntry({ scene: event.target.value })} placeholder="その場の景色、音、誰かが言った言葉など" /></label>
                  <label><span>そのときの気持ち</span><textarea rows={3} value={selectedEntry.feeling} onChange={(event) => updateEntry({ feeling: event.target.value })} placeholder="当時の言葉で、短くても構いません。" /></label>
                  <label><span>その後に変わったこと</span><textarea rows={3} value={selectedEntry.impact} onChange={(event) => updateEntry({ impact: event.target.value })} placeholder="暮らし、考え方、人との関係など。なければ空欄で構いません。" /></label>
                </div>
              </div>
            </>
          ) : (
            <div className="timeline-editor-empty"><span aria-hidden="true">年</span><h3>出来事を選択してください</h3><p>左の年表から選ぶか、新しい出来事を追加すると編集できます。</p></div>
          )}
        </aside>
      </div>

      {notice && <div className="toast success" role="status"><span>✓</span>{notice}<button onClick={() => setNotice('')} aria-label="通知を閉じる">×</button></div>}

      {deleteOpen && selectedEntry && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="出来事の削除確認">
          <div className="utility-modal delete-modal">
            <div className="utility-heading"><div><p className="label">DELETE EVENT</p><h2>この出来事を削除しますか？</h2></div><button className="modal-close" onClick={() => setDeleteOpen(false)} aria-label="削除確認を閉じる">×</button></div>
            <p className="delete-question-text">{formatPeriod(selectedEntry)}　{selectedEntry.title}</p>
            <p className="utility-lead">年表から完全に削除されます。この操作は取り消せません。</p>
            <div className="delete-modal-actions"><button className="button secondary" onClick={() => setDeleteOpen(false)}>キャンセル</button><button className="button destructive" onClick={deleteEntry}>出来事を削除する</button></div>
          </div>
        </div>
      )}
    </main>
  );
}
