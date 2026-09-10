'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

type SchoolType = 'kindergarten' | 'nursery' | 'elementary' | 'juniorHigh' | 'highSchool' | 'university' | 'graduate' | 'other';

type SchoolRecord = {
  id: string;
  type: SchoolType;
  name: string;
  startAge: string;
  endAge: string;
};

type TimelineData = {
  schemaVersion: 2;
  subjectName: string;
  birthDate: string;
  eventsByAge: Record<string, string>;
  schools: SchoolRecord[];
  undatedNotes: string;
  updatedAt: string;
};

type SaveState = 'saved' | 'saving' | 'failed';

type SchoolMarker = {
  id: string;
  label: string;
  stage: '入学' | '在籍' | '卒業';
};

type AgeTimelineRowProps = {
  age: number;
  year: number;
  note: string;
  markers: SchoolMarker[];
  isCurrent: boolean;
  onNoteChange: (age: number, value: string) => void;
};

const STORAGE_KEY = 'jibunshi-life-timeline-v2';
const LEGACY_STORAGE_KEY = 'jibunshi-life-timeline-v1';
const MAX_AGE = 130;

const SCHOOL_LABELS: Record<SchoolType, string> = {
  kindergarten: '幼稚園',
  nursery: '保育所',
  elementary: '小学校',
  juniorHigh: '中学校',
  highSchool: '高校',
  university: '大学',
  graduate: '大学院',
  other: 'その他',
};

const SCHOOL_DEFAULT_AGES: Record<SchoolType, [number, number]> = {
  kindergarten: [3, 6],
  nursery: [0, 6],
  elementary: [6, 12],
  juniorHigh: [12, 15],
  highSchool: [15, 18],
  university: [18, 22],
  graduate: [22, 24],
  other: [18, 20],
};

const SCHOOL_TYPES = Object.keys(SCHOOL_LABELS) as SchoolType[];
const EMPTY_SCHOOL_MARKERS: SchoolMarker[] = [];

const emptyTimeline: TimelineData = {
  schemaVersion: 2,
  subjectName: '',
  birthDate: '',
  eventsByAge: {},
  schools: [],
  undatedNotes: '',
  updatedAt: '2026-09-10T00:00:00.000Z',
};

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function validAge(value: unknown) {
  if (value === '' || value === null || value === undefined) return null;
  const age = Number(value);
  return Number.isInteger(age) && age >= 0 && age <= MAX_AGE ? age : null;
}

function normalizeTimeline(value: unknown): TimelineData | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<TimelineData>;
  if (data.schemaVersion !== 2) return null;

  const eventsByAge: Record<string, string> = {};
  if (data.eventsByAge && typeof data.eventsByAge === 'object') {
    Object.entries(data.eventsByAge).forEach(([age, note]) => {
      if (validAge(age) !== null && typeof note === 'string' && note.trim()) eventsByAge[age] = note;
    });
  }

  const schools = Array.isArray(data.schools)
    ? data.schools.flatMap((rawSchool) => {
        if (!rawSchool || typeof rawSchool !== 'object') return [];
        const school = rawSchool as Partial<SchoolRecord>;
        const type = String(school.type) as SchoolType;
        if (!Object.hasOwn(SCHOOL_LABELS, type)) return [];
        return [{
          id: stringValue(school.id) || crypto.randomUUID(),
          type,
          name: stringValue(school.name),
          startAge: stringValue(school.startAge),
          endAge: stringValue(school.endAge),
        }];
      })
    : [];

  return {
    schemaVersion: 2,
    subjectName: stringValue(data.subjectName),
    birthDate: stringValue(data.birthDate),
    eventsByAge,
    schools,
    undatedNotes: stringValue(data.undatedNotes),
    updatedAt: stringValue(data.updatedAt),
  };
}

function ageAtEvent(birthDate: string, yearValue: unknown, monthValue: unknown) {
  if (!birthDate) return null;
  const [birthYearText, birthMonthText] = birthDate.split('-');
  const birthYear = Number(birthYearText);
  const birthMonth = Number(birthMonthText);
  const eventYear = Number(yearValue);
  const eventMonth = Number(monthValue);
  if (!birthYear || !eventYear || eventYear < birthYear) return null;
  let age = eventYear - birthYear;
  if (eventMonth && eventMonth < birthMonth) age -= 1;
  return validAge(age);
}

function migrateLegacyTimeline(value: unknown): TimelineData | null {
  if (!value || typeof value !== 'object') return null;
  const legacy = value as { subjectName?: unknown; birthDate?: unknown; entries?: unknown };
  if (!Array.isArray(legacy.entries)) return null;

  const birthDate = stringValue(legacy.birthDate);
  const eventsByAge: Record<string, string> = {};
  const undated: string[] = [];

  legacy.entries.forEach((rawEntry) => {
    if (!rawEntry || typeof rawEntry !== 'object') return;
    const entry = rawEntry as Record<string, unknown>;
    const details = [
      stringValue(entry.title),
      stringValue(entry.organization),
      stringValue(entry.place),
      stringValue(entry.fact),
      stringValue(entry.scene),
      stringValue(entry.feeling),
      stringValue(entry.impact),
    ].filter(Boolean).join('\n');
    if (!details) return;
    const age = ageAtEvent(birthDate, entry.year, entry.month);
    if (age === null) {
      undated.push(details);
      return;
    }
    eventsByAge[String(age)] = [eventsByAge[String(age)], details].filter(Boolean).join('\n\n');
  });

  return {
    ...emptyTimeline,
    subjectName: stringValue(legacy.subjectName),
    birthDate,
    eventsByAge,
    undatedNotes: undated.join('\n\n---\n\n'),
    updatedAt: new Date().toISOString(),
  };
}

function calculateCurrentAge(birthDate: string) {
  const [yearText, monthText, dayText] = birthDate.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return null;
  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return validAge(age);
}

function createSchool(type: SchoolType): SchoolRecord {
  const [startAge, endAge] = SCHOOL_DEFAULT_AGES[type];
  return {
    id: crypto.randomUUID(),
    type,
    name: '',
    startAge: String(startAge),
    endAge: String(endAge),
  };
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

const AgeTimelineRow = memo(function AgeTimelineRow({ age, year, note, markers, isCurrent, onNoteChange }: AgeTimelineRowProps) {
  return (
    <div className={`age-timeline-row ${isCurrent ? 'current' : ''} ${note.trim() ? 'filled' : ''}`} id={isCurrent ? 'current-age-row' : undefined}>
      <div className="age-year-cell">
        <strong>{age}<small>歳</small></strong>
        <span>{year}年</span>
        {isCurrent ? <em>現在</em> : null}
      </div>
      <div className="age-school-cell">
        {markers.length ? markers.map((marker) => (
          <span className="school-marker" key={`${marker.id}-${marker.stage}`}>
            <b>{marker.stage}</b>{marker.label}
          </span>
        )) : <span className="school-empty">—</span>}
      </div>
      <label className="age-event-cell">
        <span className="sr-only">{age}歳の出来事</span>
        <textarea
          rows={2}
          value={note}
          onChange={(event) => onNoteChange(age, event.target.value)}
          placeholder={`${age}歳ごろの出来事、思い出、出会いなど`}
        />
      </label>
    </div>
  );
});

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineData>(emptyTimeline);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [pendingSchoolTypes, setPendingSchoolTypes] = useState<SchoolType[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const normalized = stored ? normalizeTimeline(JSON.parse(stored)) : null;
        if (normalized) {
          setTimeline(normalized);
        } else {
          const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
          const migrated = legacyStored ? migrateLegacyTimeline(JSON.parse(legacyStored)) : null;
          if (migrated) {
            setTimeline(migrated);
            setNotice('以前の年表を、年齢ごとの新しい形式へ引き継ぎました。');
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

  const birthYear = Number(timeline.birthDate.slice(0, 4)) || null;
  const currentAge = calculateCurrentAge(timeline.birthDate);
  const completedEventCount = Object.values(timeline.eventsByAge).filter((note) => note.trim()).length;

  const maxDisplayedAge = useMemo(() => {
    const savedAges = Object.keys(timeline.eventsByAge).map(Number).filter((age) => validAge(age) !== null);
    const schoolAges = timeline.schools
      .flatMap((school) => [validAge(school.startAge), validAge(school.endAge)])
      .filter((age): age is number => age !== null);
    return Math.min(MAX_AGE, Math.max(currentAge ?? 0, ...savedAges, ...schoolAges));
  }, [currentAge, timeline.eventsByAge, timeline.schools]);

  const schoolMarkersByAge = useMemo(() => {
    const markers = new Map<number, SchoolMarker[]>();
    timeline.schools.forEach((school) => {
      const startValue = validAge(school.startAge);
      const endValue = validAge(school.endAge);
      if (startValue === null || endValue === null) return;
      const startAge = Math.min(startValue, endValue);
      const endAge = Math.max(startValue, endValue);
      for (let age = startAge; age <= endAge; age += 1) {
        const stage = age === startAge ? '入学' : age === endAge ? '卒業' : '在籍';
        const marker: SchoolMarker = {
          id: school.id,
          label: school.name.trim() || SCHOOL_LABELS[school.type],
          stage,
        };
        markers.set(age, [...(markers.get(age) ?? []), marker]);
      }
    });
    return markers;
  }, [timeline.schools]);

  const ageRows = useMemo(() => Array.from({ length: maxDisplayedAge + 1 }, (_, age) => age), [maxDisplayedAge]);
  const existingSchoolTypes = useMemo(() => new Set(timeline.schools.map((school) => school.type)), [timeline.schools]);

  function updateTimeline(patch: Partial<TimelineData>) {
    setTimeline((current) => ({ ...current, ...patch, updatedAt: new Date().toISOString() }));
  }

  const updateEventNote = useCallback((age: number, value: string) => {
    setTimeline((current) => {
      const eventsByAge = { ...current.eventsByAge };
      if (value) eventsByAge[String(age)] = value;
      else delete eventsByAge[String(age)];
      return { ...current, eventsByAge, updatedAt: new Date().toISOString() };
    });
  }, []);

  function toggleSchoolType(type: SchoolType) {
    setPendingSchoolTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  }

  function addSelectedSchools() {
    const typesToAdd = pendingSchoolTypes.filter((type) => !existingSchoolTypes.has(type));
    if (!typesToAdd.length) return;
    setTimeline((current) => ({
      ...current,
      schools: [...current.schools, ...typesToAdd.map(createSchool)],
      updatedAt: new Date().toISOString(),
    }));
    setPendingSchoolTypes([]);
    setSchoolPickerOpen(false);
    setNotice('学校入力欄を追加しました。学校名と年齢を確認してください。');
  }

  function updateSchool(id: string, patch: Partial<SchoolRecord>) {
    setTimeline((current) => ({
      ...current,
      schools: current.schools.map((school) => school.id === id ? { ...school, ...patch } : school),
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeSchool(school: SchoolRecord) {
    if (!window.confirm(`${SCHOOL_LABELS[school.type]}の入力欄を削除しますか？`)) return;
    setTimeline((current) => ({
      ...current,
      schools: current.schools.filter((item) => item.id !== school.id),
      updatedAt: new Date().toISOString(),
    }));
    setNotice(`${SCHOOL_LABELS[school.type]}の入力欄を削除しました。`);
  }

  function scrollToCurrentAge() {
    document.getElementById('current-age-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

      <section className="timeline-hero age-timeline-hero">
        <div>
          <p className="label">LIFE TIMELINE</p>
          <h1>年齢に沿って、人生を思い出す</h1>
          <p>生年月日から年齢と西暦を並べます。覚えているところから、右側の欄へ出来事を入力してください。</p>
        </div>
        <div className="timeline-profile">
          <label><span>お名前</span><input value={timeline.subjectName} onChange={(event) => updateTimeline({ subjectName: event.target.value })} placeholder="人生史を書く人の名前" /></label>
          <label><span>生年月日</span><input type="date" value={timeline.birthDate} onChange={(event) => updateTimeline({ birthDate: event.target.value })} /></label>
        </div>
      </section>

      <div className="age-timeline-main">
        <section className="timeline-summary" aria-label="年表の概要">
          <div><span>現在の年齢</span><strong>{currentAge === null ? '—' : `${currentAge}歳`}</strong></div>
          <div><span>出来事を記入</span><strong>{completedEventCount}<small>件</small></strong></div>
          <div><span>学校欄</span><strong>{timeline.schools.length}<small>件</small></strong></div>
          <p>入力内容は、このブラウザへ自動保存されます。</p>
        </section>

        <section className="school-history-card">
          <div className="school-history-heading">
            <div>
              <p className="label">SCHOOL HISTORY</p>
              <h2>学校歴</h2>
              <p>通った学校だけを選び、学校名と当時の年齢を入力します。</p>
            </div>
            <button
              className="button primary"
              aria-expanded={schoolPickerOpen}
              aria-controls="school-picker"
              onClick={() => setSchoolPickerOpen((open) => !open)}
            >
              {schoolPickerOpen ? '学校選択を閉じる' : '＋ 学校入力欄を表示'}
            </button>
          </div>

          {schoolPickerOpen ? (
            <div className="school-picker" id="school-picker">
              <div className="school-checkboxes">
                {SCHOOL_TYPES.map((type) => {
                  const added = existingSchoolTypes.has(type);
                  return (
                    <label className={added ? 'added' : ''} key={type}>
                      <input
                        type="checkbox"
                        checked={added || pendingSchoolTypes.includes(type)}
                        disabled={added}
                        onChange={() => toggleSchoolType(type)}
                      />
                      <span><strong>{SCHOOL_LABELS[type]}</strong><small>{added ? '追加済み' : `目安 ${SCHOOL_DEFAULT_AGES[type][0]}〜${SCHOOL_DEFAULT_AGES[type][1]}歳`}</small></span>
                    </label>
                  );
                })}
              </div>
              <div className="school-picker-actions">
                <p>年齢は追加後に自由に変更できます。</p>
                <button className="button primary" disabled={!pendingSchoolTypes.length} onClick={addSelectedSchools}>選んだ学校欄を追加</button>
              </div>
            </div>
          ) : null}

          {timeline.schools.length ? (
            <div className="school-record-list">
              {timeline.schools.map((school) => (
                <article className="school-record" key={school.id}>
                  <div className="school-record-title">
                    <span>{SCHOOL_LABELS[school.type]}</span>
                    <button onClick={() => removeSchool(school)} aria-label={`${SCHOOL_LABELS[school.type]}の入力欄を削除`}>欄を削除</button>
                  </div>
                  <label className="school-name-field"><span>学校名</span><input value={school.name} onChange={(event) => updateSchool(school.id, { name: event.target.value })} placeholder={`例：〇〇${SCHOOL_LABELS[school.type]}`} /></label>
                  <div className="school-age-fields">
                    <label><span>入学・入所年齢</span><div><input type="number" min="0" max={MAX_AGE} inputMode="numeric" value={school.startAge} onChange={(event) => updateSchool(school.id, { startAge: event.target.value })} /><b>歳</b></div></label>
                    <span aria-hidden="true">〜</span>
                    <label><span>卒業・退所年齢</span><div><input type="number" min="0" max={MAX_AGE} inputMode="numeric" value={school.endAge} onChange={(event) => updateSchool(school.id, { endAge: event.target.value })} /><b>歳</b></div></label>
                  </div>
                  <p>自動入力された年齢は、実際に通った時期に合わせて修正できます。</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="school-record-empty">「学校入力欄を表示」から、通った学校の種類を選んでください。</div>
          )}
        </section>

        <section className="age-timeline-card">
          <div className="age-timeline-heading">
            <div><p className="label">CHRONOLOGY</p><h2>年齢ごとの出来事</h2></div>
            {currentAge !== null ? <button className="button secondary" onClick={scrollToCurrentAge}>現在の年齢へ移動</button> : null}
          </div>

          {birthYear === null ? (
            <div className="age-timeline-empty">
              <span aria-hidden="true">年</span>
              <h3>生年月日を入力してください</h3>
              <p>入力すると、0歳から現在までの年齢と西暦が自動で表示されます。</p>
            </div>
          ) : (
            <div className="age-timeline-table">
              <div className="age-timeline-head" aria-hidden="true"><span>年齢・西暦</span><span>学校</span><span>出来事・思い出</span></div>
              {ageRows.map((age) => (
                <AgeTimelineRow
                  age={age}
                  year={birthYear + age}
                  note={timeline.eventsByAge[String(age)] ?? ''}
                  markers={schoolMarkersByAge.get(age) ?? EMPTY_SCHOOL_MARKERS}
                  isCurrent={age === currentAge}
                  key={age}
                  onNoteChange={updateEventNote}
                />
              ))}
            </div>
          )}
        </section>

        {timeline.undatedNotes ? (
          <section className="undated-notes-card">
            <div><p className="label">UNPLACED NOTES</p><h2>時期が決まっていない以前のメモ</h2></div>
            <textarea rows={6} value={timeline.undatedNotes} onChange={(event) => updateTimeline({ undatedNotes: event.target.value })} />
          </section>
        ) : null}
      </div>

      {notice ? <div className="toast success" role="status"><span>✓</span>{notice}<button onClick={() => setNotice('')} aria-label="通知を閉じる">×</button></div> : null}
    </main>
  );
}
