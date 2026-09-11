'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { TIMELINE_STORAGE_KEY } from '@/lib/life-story';

type SchoolType = 'kindergarten' | 'nursery' | 'elementary' | 'juniorHigh' | 'highSchool' | 'university' | 'graduate' | 'other';

type SchoolRecord = {
  id: string;
  type: SchoolType;
  name: string;
  startAge: string;
  endAge: string;
};

type EpisodeTopic = 'school' | 'family' | 'friends' | 'home' | 'work' | 'health' | 'interest' | 'challenge' | 'other';

type Episode = {
  id: string;
  age: number;
  topic: EpisodeTopic;
  title: string;
  whenWhere: string;
  people: string;
  whatHappened: string;
  scene: string;
  feeling: string;
  reflection: string;
  impact: string;
  createdAt: string;
};

type TimelineData = {
  schemaVersion: 3;
  subjectName: string;
  birthDate: string;
  eventsByAge: Record<string, string>;
  schools: SchoolRecord[];
  episodes: Episode[];
  undatedNotes: string;
  updatedAt: string;
};

type SaveState = 'saved' | 'saving' | 'failed';

type SchoolMarker = {
  id: string;
  label: string;
  stage: '入学' | '在籍' | '卒業';
  dateLabel: string;
};

type AgeTimelineRowProps = {
  age: number;
  period: string;
  note: string;
  markers: SchoolMarker[];
  episodes: Episode[];
  isCurrent: boolean;
  onNoteChange: (age: number, value: string) => void;
  onChooseTopic: (age: number) => void;
  onSelectEpisode: (episodeId: string) => void;
};

const STORAGE_KEY = TIMELINE_STORAGE_KEY;
const PREVIOUS_STORAGE_KEY = 'jibunshi-life-timeline-v2';
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
const EMPTY_EPISODES: Episode[] = [];

const TOPIC_DEFINITIONS: Record<EpisodeTopic, { label: string; icon: string; hint: string; prompt: string }> = {
  school: { label: '学校・学び', icon: '学', hint: '先生、授業、行事、進路', prompt: '先生や授業、学校行事、進路など、心に残っている出来事は何ですか？' },
  family: { label: '家族', icon: '家', hint: '両親、きょうだい、親戚', prompt: '家族との時間で、今も覚えている場面や言葉は何ですか？' },
  friends: { label: '友人・出会い', icon: '友', hint: '友達、恩人、別れ', prompt: 'その人とどのように出会い、どんな出来事を一緒に経験しましたか？' },
  home: { label: '暮らし・場所', icon: '暮', hint: '家、町、引っ越し、日常', prompt: '当時の家や町、毎日の暮らしで、よく覚えていることは何ですか？' },
  work: { label: '仕事', icon: '仕', hint: '就職、職場、役割、成果', prompt: '仕事で任されたこと、苦労したこと、誇りに思ったことは何ですか？' },
  health: { label: '健康・病気', icon: '健', hint: '体調、療養、回復、支え', prompt: '体や心の変化と、その時に支えになった人や出来事を教えてください。' },
  interest: { label: '趣味・夢', icon: '好', hint: '好きなこと、習い事、目標', prompt: '夢中になったことは何で、どのように始まりましたか？' },
  challenge: { label: '挑戦・転機', icon: '転', hint: '決断、成功、失敗、変化', prompt: '何を決め、何が変わりましたか？決断のきっかけも思い出してください。' },
  other: { label: 'その他', icon: '他', hint: '自由な話題', prompt: 'この年齢を語るうえで欠かせない出来事を、自由に記録してください。' },
};

const TOPIC_TYPES = Object.keys(TOPIC_DEFINITIONS) as EpisodeTopic[];

const emptyTimeline: TimelineData = {
  schemaVersion: 3,
  subjectName: '',
  birthDate: '',
  eventsByAge: {},
  schools: [],
  episodes: [],
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
  if (data.schemaVersion !== 3) return null;

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

  const episodes = Array.isArray(data.episodes)
    ? data.episodes.flatMap((rawEpisode) => {
        if (!rawEpisode || typeof rawEpisode !== 'object') return [];
        const episode = rawEpisode as Partial<Episode>;
        const age = validAge(episode.age);
        const topic = String(episode.topic) as EpisodeTopic;
        if (age === null || !Object.hasOwn(TOPIC_DEFINITIONS, topic)) return [];
        return [{
          id: stringValue(episode.id) || crypto.randomUUID(),
          age,
          topic,
          title: stringValue(episode.title),
          whenWhere: stringValue(episode.whenWhere),
          people: stringValue(episode.people),
          whatHappened: stringValue(episode.whatHappened),
          scene: stringValue(episode.scene),
          feeling: stringValue(episode.feeling),
          reflection: stringValue(episode.reflection),
          impact: stringValue(episode.impact),
          createdAt: stringValue(episode.createdAt),
        }];
      })
    : [];

  return {
    schemaVersion: 3,
    subjectName: stringValue(data.subjectName),
    birthDate: stringValue(data.birthDate),
    eventsByAge,
    schools,
    episodes,
    undatedNotes: stringValue(data.undatedNotes),
    updatedAt: stringValue(data.updatedAt),
  };
}

function migratePreviousTimeline(value: unknown): TimelineData | null {
  if (!value || typeof value !== 'object') return null;
  const previous = value as Record<string, unknown>;
  if (previous.schemaVersion !== 2) return null;
  return normalizeTimeline({ ...previous, schemaVersion: 3, episodes: [] });
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

function formatAgePeriod(birthDate: string, age: number) {
  const [yearText, monthText] = birthDate.split('-');
  const birthYear = Number(yearText);
  const birthMonth = Number(monthText);
  if (!birthYear || !birthMonth) return '';
  const startYear = birthYear + age;
  const endYear = birthMonth === 1 ? startYear : startYear + 1;
  const endMonth = birthMonth === 1 ? 12 : birthMonth - 1;
  return `${startYear}年${birthMonth}月〜${endYear}年${endMonth}月`;
}

function schoolBoundaryYear(birthDate: string, age: number) {
  const [yearText, monthText, dayText] = birthDate.split('-');
  const birthYear = Number(yearText);
  const birthMonth = Number(monthText);
  const birthDay = Number(dayText);
  if (!birthYear || !birthMonth || !birthDay) return null;
  const isBornAfterSchoolCutoff = birthMonth > 4 || (birthMonth === 4 && birthDay >= 2);
  return birthYear + age + (isBornAfterSchoolCutoff ? 1 : 0);
}

function formatSchoolPeriod(birthDate: string, school: SchoolRecord) {
  if (!birthDate) return '生年月日を入力すると、入学・卒業年月を表示します。';
  const startAge = validAge(school.startAge);
  const endAge = validAge(school.endAge);
  if (startAge === null || endAge === null) return '入学・卒業年齢を入力してください。';
  if (endAge < startAge) return '卒業年齢は、入学年齢以上にしてください。';
  const startYear = schoolBoundaryYear(birthDate, startAge);
  const endYear = schoolBoundaryYear(birthDate, endAge);
  if (startYear === null || endYear === null) return '生年月日を確認してください。';
  return `${startYear}年4月 入学・入所　〜　${endYear}年3月 卒業・退所`;
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

function createEpisode(age: number, topic: EpisodeTopic): Episode {
  return {
    id: crypto.randomUUID(),
    age,
    topic,
    title: '',
    whenWhere: '',
    people: '',
    whatHappened: '',
    scene: '',
    feeling: '',
    reflection: '',
    impact: '',
    createdAt: new Date().toISOString(),
  };
}

function episodeHeading(episode: Episode) {
  if (episode.title.trim()) return episode.title;
  if (episode.whatHappened.trim()) {
    const summary = episode.whatHappened.trim();
    return summary.length > 34 ? `${summary.slice(0, 34)}…` : summary;
  }
  return `${TOPIC_DEFINITIONS[episode.topic].label}のエピソード`;
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

const AgeTimelineRow = memo(function AgeTimelineRow({ age, period, note, markers, episodes, isCurrent, onNoteChange, onChooseTopic, onSelectEpisode }: AgeTimelineRowProps) {
  return (
    <div className={`age-timeline-row ${isCurrent ? 'current' : ''} ${note.trim() || episodes.length ? 'filled' : ''}`} id={isCurrent ? 'current-age-row' : undefined}>
      <div className="age-year-cell">
        <strong>{age}<small>歳</small></strong>
        <span>{period}</span>
        {isCurrent ? <em>現在</em> : null}
      </div>
      <div className="age-school-cell">
        {markers.length ? markers.map((marker) => (
          <span className="school-marker" key={`${marker.id}-${marker.stage}`}>
            {marker.dateLabel ? <small>{marker.dateLabel}</small> : null}<b>{marker.stage}</b><span>{marker.label}</span>
          </span>
        )) : <span className="school-empty">—</span>}
      </div>
      <div className="age-event-cell">
        <label className="age-note-field">
          <span className="sr-only">{age}歳の出来事</span>
          <textarea
            rows={2}
            value={note}
            onChange={(event) => onNoteChange(age, event.target.value)}
            placeholder={`${age}歳ごろの出来事を、短いメモで残せます`}
          />
        </label>
        {episodes.length ? (
          <div className="age-episode-list" aria-label={`${age}歳の深掘りエピソード`}>
            {episodes.map((episode) => {
              const topic = TOPIC_DEFINITIONS[episode.topic];
              return (
                <button key={episode.id} onClick={() => onSelectEpisode(episode.id)}>
                  <span className={`episode-topic-badge ${episode.topic}`}><i>{topic.icon}</i>{topic.label}</span>
                  <strong>{episodeHeading(episode)}</strong><b aria-hidden="true">›</b>
                </button>
              );
            })}
          </div>
        ) : null}
        <button className="choose-topic-button" onClick={() => onChooseTopic(age)}>＋ 話題を選んで深掘りする</button>
      </div>
    </div>
  );
});

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineData>(emptyTimeline);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [schoolPickerOpen, setSchoolPickerOpen] = useState(false);
  const [pendingSchoolTypes, setPendingSchoolTypes] = useState<SchoolType[]>([]);
  const [topicPickerAge, setTopicPickerAge] = useState<number | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const normalized = stored ? normalizeTimeline(JSON.parse(stored)) : null;
        if (normalized) {
          setTimeline(normalized);
        } else {
          const previousStored = localStorage.getItem(PREVIOUS_STORAGE_KEY);
          const previous = previousStored ? migratePreviousTimeline(JSON.parse(previousStored)) : null;
          if (previous) {
            setTimeline(previous);
            setNotice('保存済みの年表へ、エピソードの深掘り機能を追加しました。');
          } else {
            const legacyStored = localStorage.getItem(LEGACY_STORAGE_KEY);
            const migrated = legacyStored ? migrateLegacyTimeline(JSON.parse(legacyStored)) : null;
            if (migrated) {
              setTimeline(migrated);
              setNotice('以前の年表を、年齢ごとの新しい形式へ引き継ぎました。');
            }
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
  const selectedEpisode = timeline.episodes.find((episode) => episode.id === selectedEpisodeId) ?? null;
  const selectedEpisodeTopic = selectedEpisode ? TOPIC_DEFINITIONS[selectedEpisode.topic] : null;

  const maxDisplayedAge = useMemo(() => {
    const savedAges = Object.keys(timeline.eventsByAge).map(Number).filter((age) => validAge(age) !== null);
    const schoolAges = timeline.schools
      .flatMap((school) => [validAge(school.startAge), validAge(school.endAge)])
      .filter((age): age is number => age !== null);
    const episodeAges = timeline.episodes.map((episode) => episode.age);
    return Math.min(MAX_AGE, Math.max(currentAge ?? 0, ...savedAges, ...schoolAges, ...episodeAges));
  }, [currentAge, timeline.episodes, timeline.eventsByAge, timeline.schools]);

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
        const boundaryYear = stage === '入学'
          ? schoolBoundaryYear(timeline.birthDate, startAge)
          : stage === '卒業'
            ? schoolBoundaryYear(timeline.birthDate, endAge)
            : null;
        const marker: SchoolMarker = {
          id: school.id,
          label: school.name.trim() || SCHOOL_LABELS[school.type],
          stage,
          dateLabel: boundaryYear === null ? '' : `${boundaryYear}年${stage === '入学' ? '4月' : '3月'}`,
        };
        markers.set(age, [...(markers.get(age) ?? []), marker]);
      }
    });
    return markers;
  }, [timeline.birthDate, timeline.schools]);

  const ageRows = useMemo(() => Array.from({ length: maxDisplayedAge + 1 }, (_, age) => age), [maxDisplayedAge]);
  const existingSchoolTypes = useMemo(() => new Set(timeline.schools.map((school) => school.type)), [timeline.schools]);
  const episodesByAge = useMemo(() => {
    const episodes = new Map<number, Episode[]>();
    timeline.episodes.forEach((episode) => {
      episodes.set(episode.age, [...(episodes.get(episode.age) ?? []), episode]);
    });
    return episodes;
  }, [timeline.episodes]);

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

  const openTopicPicker = useCallback((age: number) => {
    setTopicPickerAge(age);
  }, []);

  const openEpisode = useCallback((episodeId: string) => {
    setSelectedEpisodeId(episodeId);
  }, []);

  function addEpisode(topic: EpisodeTopic) {
    if (topicPickerAge === null) return;
    const episode = createEpisode(topicPickerAge, topic);
    setTimeline((current) => ({
      ...current,
      episodes: [...current.episodes, episode],
      updatedAt: new Date().toISOString(),
    }));
    setTopicPickerAge(null);
    setSelectedEpisodeId(episode.id);
  }

  function updateEpisode(patch: Partial<Episode>) {
    if (!selectedEpisode) return;
    setTimeline((current) => ({
      ...current,
      episodes: current.episodes.map((episode) => episode.id === selectedEpisode.id ? { ...episode, ...patch } : episode),
      updatedAt: new Date().toISOString(),
    }));
  }

  function removeEpisode() {
    if (!selectedEpisode) return;
    if (!window.confirm(`「${episodeHeading(selectedEpisode)}」を削除しますか？`)) return;
    setTimeline((current) => ({
      ...current,
      episodes: current.episodes.filter((episode) => episode.id !== selectedEpisode.id),
      updatedAt: new Date().toISOString(),
    }));
    setSelectedEpisodeId('');
    setNotice('エピソードを削除しました。');
  }

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
        <Link className="timeline-brand" href="/" aria-label="自分史づくりの進行画面へ戻る">
          <span aria-hidden="true">史</span>
          <div><small>JIBUNSHI STUDIO</small><strong>人生年表</strong></div>
        </Link>
        <nav className="studio-nav" aria-label="自分史づくりの手順">
          <Link href="/">進み具合</Link>
          <span className="active">人生年表</span>
          <Link href="/diagnosis">性格・考え方</Link>
          <Link href="/story">AI原稿</Link>
          <Link href="/book">印刷</Link>
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
          <p>生年月日から年齢ごとの期間を並べ、学校年度は4月から翌年3月として表示します。覚えているところから出来事を入力してください。</p>
        </div>
        <div className="timeline-profile">
          <label><span>お名前</span><input value={timeline.subjectName} onChange={(event) => updateTimeline({ subjectName: event.target.value })} placeholder="人生史を書く人の名前" /></label>
          <label><span>生年月日</span><input type="date" value={timeline.birthDate} onChange={(event) => updateTimeline({ birthDate: event.target.value })} /></label>
        </div>
      </section>

      <div className="age-timeline-main">
        <section className="timeline-summary" aria-label="年表の概要">
          <div><span>現在の年齢</span><strong>{currentAge === null ? '—' : `${currentAge}歳`}</strong></div>
          <div><span>年齢メモ</span><strong>{completedEventCount}<small>件</small></strong></div>
          <div><span>深掘りエピソード</span><strong>{timeline.episodes.length}<small>件</small></strong></div>
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
                  <p className="school-period-preview">{formatSchoolPeriod(timeline.birthDate, school)}</p>
                  <p>日本の一般的な学校年度（4月〜翌年3月）で計算します。年齢は実際に通った時期に合わせて修正できます。</p>
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
              <p>入力すると、0歳から現在までの年齢と、その年齢だった期間が自動で表示されます。</p>
            </div>
          ) : (
            <div className="age-timeline-table">
              <div className="age-timeline-head" aria-hidden="true"><span>年齢・その期間</span><span>学校年度</span><span>出来事・思い出</span></div>
              {ageRows.map((age) => (
                <AgeTimelineRow
                  age={age}
                  period={formatAgePeriod(timeline.birthDate, age)}
                  note={timeline.eventsByAge[String(age)] ?? ''}
                  markers={schoolMarkersByAge.get(age) ?? EMPTY_SCHOOL_MARKERS}
                  episodes={episodesByAge.get(age) ?? EMPTY_EPISODES}
                  isCurrent={age === currentAge}
                  key={age}
                  onNoteChange={updateEventNote}
                  onChooseTopic={openTopicPicker}
                  onSelectEpisode={openEpisode}
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

        <section className="flow-next-card">
          <div><small>STEP 3</small><h2>年表の次は、性格・考え方へ</h2><p>選択式と具体的な経験から、人生史に表れる人柄を整理します。</p></div>
          <Link className="button primary" href="/diagnosis">性格・考え方を入力する　›</Link>
        </section>
      </div>

      {topicPickerAge !== null ? (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-labelledby="topic-picker-title">
          <div className="topic-picker-modal">
            <div className="utility-heading">
              <div>
                <p className="label">CHOOSE A TOPIC</p>
                <h2 id="topic-picker-title">{topicPickerAge}歳の話題を選ぶ</h2>
              </div>
              <button className="modal-close" onClick={() => setTopicPickerAge(null)} aria-label="話題選択を閉じる">×</button>
            </div>
            <p className="topic-picker-lead">具体的に思い出したい話題をタップしてください。選ぶと、個別のエピソードを深掘りする画面が開きます。</p>
            <div className="episode-topic-grid">
              {TOPIC_TYPES.map((topic) => {
                const definition = TOPIC_DEFINITIONS[topic];
                return (
                  <button key={topic} onClick={() => addEpisode(topic)}>
                    <span className={`topic-icon ${topic}`}>{definition.icon}</span>
                    <strong>{definition.label}</strong>
                    <small>{definition.hint}</small>
                    <b aria-hidden="true">›</b>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {selectedEpisode && selectedEpisodeTopic ? (
        <div className="modal-layer episode-modal-layer" role="dialog" aria-modal="true" aria-labelledby="episode-editor-title">
          <div className="episode-editor-modal">
            <div className="episode-editor-header">
              <div>
                <p className="label">DEEPEN THE STORY</p>
                <h2 id="episode-editor-title">{selectedEpisode.age}歳のエピソード</h2>
                <span>{formatAgePeriod(timeline.birthDate, selectedEpisode.age)}</span>
              </div>
              <button className="modal-close" onClick={() => setSelectedEpisodeId('')} aria-label="エピソード編集を閉じる">×</button>
            </div>
            <div className="episode-editor-scroll">
              <div className="episode-guide">
                <span className={`topic-icon ${selectedEpisode.topic}`}>{selectedEpisodeTopic.icon}</span>
                <div><strong>{selectedEpisodeTopic.label}</strong><p>{selectedEpisodeTopic.prompt}</p></div>
              </div>

              <div className="episode-form-section">
                <div className="episode-section-title"><span>1</span><div><strong>出来事を特定する</strong><small>まず、誰とどこで何があったかを整理します</small></div></div>
                <label><span>エピソードの見出し</span><input value={selectedEpisode.title} onChange={(event) => updateEpisode({ title: event.target.value })} placeholder="例：運動会で初めてリレーの選手になった" /></label>
                <div className="episode-field-grid">
                  <label><span>いつ・どこで</span><input value={selectedEpisode.whenWhere} onChange={(event) => updateEpisode({ whenWhere: event.target.value })} placeholder="季節、学年、場所など" /></label>
                  <label><span>一緒にいた人</span><input value={selectedEpisode.people} onChange={(event) => updateEpisode({ people: event.target.value })} placeholder="名前やご自身との関係" /></label>
                </div>
                <label><span>何が起きましたか？</span><textarea rows={5} value={selectedEpisode.whatHappened} onChange={(event) => updateEpisode({ whatHappened: event.target.value })} placeholder="出来事を、起きた順番に沿って書いてください。" /></label>
              </div>

              <div className="episode-form-section">
                <div className="episode-section-title"><span>2</span><div><strong>その場面を思い出す</strong><small>人柄が伝わる具体的な記憶を残します</small></div></div>
                <label><span>目に浮かぶ場面や言葉</span><textarea rows={4} value={selectedEpisode.scene} onChange={(event) => updateEpisode({ scene: event.target.value })} placeholder="景色、音、表情、誰かが言った言葉など" /></label>
                <label><span>そのとき、どう感じましたか？</span><textarea rows={3} value={selectedEpisode.feeling} onChange={(event) => updateEpisode({ feeling: event.target.value })} placeholder="うれしい、悔しい、怖い、ほっとした、など当時の気持ち" /></label>
              </div>

              <div className="episode-form-section reflection">
                <div className="episode-section-title"><span>3</span><div><strong>人生の中での意味を考える</strong><small>今の自分につながる部分を見つけます</small></div></div>
                <label><span>今振り返ると、どう思いますか？</span><textarea rows={3} value={selectedEpisode.reflection} onChange={(event) => updateEpisode({ reflection: event.target.value })} placeholder="当時は分からなかったこと、今だから思うこと" /></label>
                <label><span>その後に影響したこと</span><textarea rows={3} value={selectedEpisode.impact} onChange={(event) => updateEpisode({ impact: event.target.value })} placeholder="考え方、進路、人との関わり、今も続く習慣など" /></label>
              </div>
            </div>
            <div className="episode-editor-footer">
              <button className="button danger" onClick={removeEpisode}>このエピソードを削除</button>
              <div><span className={`save-state ${saveState}`}><i />{saveState === 'saved' ? '保存済み' : saveState === 'saving' ? '保存中…' : '保存失敗'}</span><button className="button primary" onClick={() => setSelectedEpisodeId('')}>年表に戻る</button></div>
            </div>
          </div>
        </div>
      ) : null}

      {notice ? <div className="toast success" role="status"><span>✓</span>{notice}<button onClick={() => setNotice('')} aria-label="通知を閉じる">×</button></div> : null}
    </main>
  );
}
