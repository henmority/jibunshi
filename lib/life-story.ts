import type { QuestionSet } from '@/lib/initial-question-set';

export const TIMELINE_STORAGE_KEY = 'jibunshi-life-timeline-v3';
export const DIAGNOSIS_STORAGE_KEY = 'jibunshi-personality-diagnosis-v1';
export const STORY_STORAGE_KEY = 'jibunshi-story-draft-v1';
export const PUBLISHED_QUESTION_SET_KEY = 'jibunshi-published-question-set-v1';
export const QUESTION_EDITOR_STORAGE_KEY = 'jibunshi-question-editor-v1';

export type EpisodeTopic = 'school' | 'family' | 'friends' | 'home' | 'work' | 'health' | 'interest' | 'challenge' | 'other';

export type SchoolRecord = {
  id: string;
  type: string;
  name: string;
  startAge: string;
  endAge: string;
};

export type Episode = {
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

export type TimelineData = {
  schemaVersion: 3;
  subjectName: string;
  birthDate: string;
  eventsByAge: Record<string, string>;
  schools: SchoolRecord[];
  episodes: Episode[];
  undatedNotes: string;
  updatedAt: string;
};

export type AnswerValue = string | string[];

export type DiagnosisData = {
  schemaVersion: 1;
  questionSetId: string;
  questionSetVersion: string;
  answers: Record<string, AnswerValue>;
  updatedAt: string;
};

export type StoryDraft = {
  schemaVersion: 1;
  title: string;
  content: string;
  generatedAt: string;
  updatedAt: string;
  promptVersion: string;
  model: string;
};

export type LifeStoryBundle = {
  kind: 'jibunshi-life-story';
  schemaVersion: 1;
  exportedAt: string;
  timeline: TimelineData | null;
  diagnosis: DiagnosisData | null;
  questionSet: QuestionSet | null;
  story: StoryDraft | null;
};

const TOPICS = new Set<EpisodeTopic>(['school', 'family', 'friends', 'home', 'work', 'health', 'interest', 'challenge', 'other']);

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizedAnswer(value: unknown): AnswerValue | null {
  if (typeof value === 'string') return value.slice(0, 12000);
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string').slice(0, 30);
  return null;
}

export function normalizeTimelineData(value: unknown): TimelineData | null {
  const data = objectValue(value);
  if (!data || data.schemaVersion !== 3) return null;

  const eventsByAge: Record<string, string> = {};
  const rawEvents = objectValue(data.eventsByAge);
  if (rawEvents) {
    Object.entries(rawEvents).forEach(([age, note]) => {
      const numericAge = Number(age);
      if (Number.isInteger(numericAge) && numericAge >= 0 && numericAge <= 130 && typeof note === 'string') {
        eventsByAge[age] = note.slice(0, 12000);
      }
    });
  }

  const schools = Array.isArray(data.schools)
    ? data.schools.flatMap((value) => {
        const school = objectValue(value);
        if (!school) return [];
        return [{
          id: stringValue(school.id),
          type: stringValue(school.type),
          name: stringValue(school.name),
          startAge: stringValue(school.startAge),
          endAge: stringValue(school.endAge),
        }];
      }).slice(0, 50)
    : [];

  const episodes = Array.isArray(data.episodes)
    ? data.episodes.flatMap((value) => {
        const episode = objectValue(value);
        const age = Number(episode?.age);
        const topic = stringValue(episode?.topic) as EpisodeTopic;
        if (!episode || !Number.isInteger(age) || age < 0 || age > 130 || !TOPICS.has(topic)) return [];
        return [{
          id: stringValue(episode.id), age, topic,
          title: stringValue(episode.title),
          whenWhere: stringValue(episode.whenWhere),
          people: stringValue(episode.people),
          whatHappened: stringValue(episode.whatHappened).slice(0, 12000),
          scene: stringValue(episode.scene).slice(0, 12000),
          feeling: stringValue(episode.feeling).slice(0, 12000),
          reflection: stringValue(episode.reflection).slice(0, 12000),
          impact: stringValue(episode.impact).slice(0, 12000),
          createdAt: stringValue(episode.createdAt),
        }];
      }).slice(0, 300)
    : [];

  return {
    schemaVersion: 3,
    subjectName: stringValue(data.subjectName),
    birthDate: stringValue(data.birthDate),
    eventsByAge,
    schools,
    episodes,
    undatedNotes: stringValue(data.undatedNotes).slice(0, 12000),
    updatedAt: stringValue(data.updatedAt),
  };
}

export function normalizeDiagnosisData(value: unknown): DiagnosisData | null {
  const data = objectValue(value);
  if (!data || data.schemaVersion !== 1) return null;
  const answers: Record<string, AnswerValue> = {};
  const rawAnswers = objectValue(data.answers);
  if (rawAnswers) {
    Object.entries(rawAnswers).slice(0, 300).forEach(([questionId, answer]) => {
      const normalized = normalizedAnswer(answer);
      if (normalized !== null) answers[questionId] = normalized;
    });
  }
  return {
    schemaVersion: 1,
    questionSetId: stringValue(data.questionSetId),
    questionSetVersion: stringValue(data.questionSetVersion),
    answers,
    updatedAt: stringValue(data.updatedAt),
  };
}

export function normalizeStoryDraft(value: unknown): StoryDraft | null {
  const data = objectValue(value);
  if (!data || data.schemaVersion !== 1) return null;
  return {
    schemaVersion: 1,
    title: stringValue(data.title),
    content: stringValue(data.content).slice(0, 120000),
    generatedAt: stringValue(data.generatedAt),
    updatedAt: stringValue(data.updatedAt),
    promptVersion: stringValue(data.promptVersion),
    model: stringValue(data.model),
  };
}

export function normalizeQuestionSet(value: unknown): QuestionSet | null {
  const data = objectValue(value);
  if (!data || !Array.isArray(data.sections)) return null;
  return value as QuestionSet;
}

export function normalizeLifeStoryBundle(value: unknown): LifeStoryBundle | null {
  const data = objectValue(value);
  if (!data || data.kind !== 'jibunshi-life-story' || data.schemaVersion !== 1) return null;
  return {
    kind: 'jibunshi-life-story',
    schemaVersion: 1,
    exportedAt: stringValue(data.exportedAt),
    timeline: normalizeTimelineData(data.timeline),
    diagnosis: normalizeDiagnosisData(data.diagnosis),
    questionSet: normalizeQuestionSet(data.questionSet),
    story: normalizeStoryDraft(data.story),
  };
}

export function createLifeStoryBundle(input: {
  timeline: TimelineData | null;
  diagnosis: DiagnosisData | null;
  questionSet: QuestionSet | null;
  story: StoryDraft | null;
  exportedAt?: string;
}): LifeStoryBundle {
  const { exportedAt, ...data } = input;
  return {
    kind: 'jibunshi-life-story',
    schemaVersion: 1,
    exportedAt: exportedAt ?? input.story?.updatedAt ?? input.diagnosis?.updatedAt ?? input.timeline?.updatedAt ?? '',
    ...data,
  };
}

export function readStoredJson(key: string): unknown {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : null;
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
