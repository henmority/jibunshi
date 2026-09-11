'use client';

import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import {
  initialQuestionSet,
  type AnswerType,
  type Question,
  type QuestionSet,
  type ReviewStatus,
  type Section,
  type SectionKind,
} from '@/lib/initial-question-set';
import { PUBLISHED_QUESTION_SET_KEY, QUESTION_EDITOR_STORAGE_KEY } from '@/lib/life-story';

type Notice = { tone: 'success' | 'warning' | 'neutral'; message: string } | null;

const STORAGE_KEY = QUESTION_EDITOR_STORAGE_KEY;
const BACKUP_KEY = 'jibunshi-question-editor-import-backup-v1';
const MIGRATION_BACKUP_KEY = 'jibunshi-question-editor-before-v3';

const ANSWER_LABELS: Record<AnswerType, string> = {
  single_choice: '単一選択',
  multiple_choice: '複数選択',
  short_text: '短い文章',
  long_text: '長い文章・音声',
  date: '年月日',
  year_month: '年または年月',
  rating: '評価段階',
};

const STATUS_LABELS: Record<ReviewStatus, string> = {
  unreviewed: '未確認',
  reviewed: '確認済み',
  needs_revision: '要修正',
};

const legacyInitialQuestionSet: QuestionSet = {
  schemaVersion: 1,
  questionSetId: 'standard-life-story',
  version: '1.0.0',
  title: '自分史 基本設問',
  updatedAt: '2026-08-31T08:00:00.000Z',
  sections: [
    {
      id: 'personality',
      title: '人物像',
      description: 'その人らしさや、大切にしてきた価値観を知る設問',
      kind: 'personality',
      order: 10,
      enabled: true,
      questions: [
        {
          id: 'personality-values',
          text: '人生の中で、ずっと大切にしてきたことは何ですか？',
          helpText: '人との関わり方や、仕事への向き合い方などからお考えください。',
          answerType: 'long_text',
          required: false,
          order: 10,
          tags: ['価値観'],
          enabled: true,
          source: 'manual',
          reviewStatus: 'reviewed',
          intent: '自分史全体の語り口へ反映する価値観を知る',
        },
        {
          id: 'personality-choice',
          text: '物事を決めるとき、どのような考え方をすることが多いですか？',
          helpText: '近いものをいくつでも選べます。',
          answerType: 'multiple_choice',
          required: false,
          order: 20,
          tags: ['性格'],
          enabled: true,
          source: 'ai',
          reviewStatus: 'unreviewed',
          options: ['直感を大切にする', 'よく調べてから決める', '周りの人に相談する', 'まず行動してみる'],
          intent: '意思決定の傾向を知る',
          aiOriginalText: 'あなたはどのような意思決定スタイルですか？',
        },
      ],
    },
    {
      id: 'childhood',
      title: '幼少期',
      description: '記憶の原風景や、家族との関わりをたずねる設問',
      kind: 'era',
      order: 20,
      enabled: true,
      questions: [
        {
          id: 'childhood-home',
          text: '子どものころ、どのような場所で暮らしていましたか？',
          helpText: '家の様子や周囲の風景など、覚えていることからお話しください。',
          answerType: 'long_text',
          required: false,
          order: 10,
          tags: ['暮らし', '場所'],
          enabled: true,
          source: 'ai',
          reviewStatus: 'reviewed',
          intent: '幼少期の情景を具体的に描くため',
          aiOriginalText: '幼少期はどこで暮らしていましたか？',
        },
        {
          id: 'childhood-play',
          text: '夢中になった遊びや、よく遊んだ場所を教えてください。',
          helpText: '一緒に遊んだ人や季節の記憶もあればお聞かせください。',
          answerType: 'long_text',
          required: false,
          order: 20,
          tags: ['遊び', '友人'],
          enabled: true,
          source: 'manual',
          reviewStatus: 'reviewed',
          intent: '子ども時代の日常と人間関係を知る',
        },
        {
          id: 'childhood-family',
          text: 'ご家族との思い出で、今も心に残っていることはありますか？',
          helpText: '答えにくい場合は、無理に回答する必要はありません。',
          answerType: 'long_text',
          required: false,
          order: 30,
          tags: ['家族', '思い出'],
          enabled: true,
          source: 'ai',
          reviewStatus: 'unreviewed',
          intent: '家族との関係を表すエピソードを集める',
          aiOriginalText: '家族との一番大切な思い出を教えてください。',
        },
        {
          id: 'childhood-character',
          text: '周りの人から、どのような子どもだと言われていましたか？',
          helpText: '当てはまるものをいくつでも選んでください。',
          answerType: 'multiple_choice',
          required: false,
          order: 40,
          tags: ['性格'],
          enabled: true,
          source: 'ai',
          reviewStatus: 'needs_revision',
          options: ['活発', 'おとなしい', '好奇心が強い', 'しっかり者', '負けず嫌い'],
          intent: '幼少期の人物像を補う',
          aiOriginalText: 'あなたは普通、どんな子供でしたか？',
          reviewMemo: '「普通」という誘導表現を削除済み。選択肢の偏りを再確認する。',
        },
      ],
    },
    {
      id: 'school',
      title: '学生時代',
      description: '学び、友人、挑戦から成長のきっかけを集める設問',
      kind: 'era',
      order: 30,
      enabled: true,
      questions: [
        {
          id: 'school-memory',
          text: '学生時代に、特に心に残っている出来事は何ですか？',
          helpText: '授業、部活動、行事、友人との出来事など、自由にお話しください。',
          answerType: 'long_text',
          required: false,
          order: 10,
          tags: ['学校', '思い出'],
          enabled: true,
          source: 'manual',
          reviewStatus: 'reviewed',
          intent: '学生時代を代表するエピソードを集める',
        },
        {
          id: 'school-influence',
          text: '考え方や進路に影響を与えた先生や友人はいましたか？',
          helpText: '',
          answerType: 'long_text',
          required: false,
          order: 20,
          tags: ['出会い'],
          enabled: true,
          source: 'ai',
          reviewStatus: 'reviewed',
          intent: '人生に影響した出会いを知る',
          aiOriginalText: '人生に影響した先生や友人について教えてください。',
        },
      ],
    },
    {
      id: 'career',
      title: '仕事・転機',
      description: '仕事への思いと、人生の節目を振り返る設問',
      kind: 'era',
      order: 40,
      enabled: true,
      questions: [
        {
          id: 'career-first',
          text: '最初の仕事を選んだきっかけを教えてください。',
          helpText: '当時の時代背景や周囲からの影響もあればお聞かせください。',
          answerType: 'long_text',
          required: false,
          order: 10,
          tags: ['仕事', '選択'],
          enabled: true,
          source: 'manual',
          reviewStatus: 'reviewed',
          intent: '職業人生の出発点を描く',
        },
        {
          id: 'career-turning-point',
          text: '仕事や暮らしの中で、大きな転機になった出来事はありますか？',
          helpText: '転職、独立、引っ越し、新しい役割などからお考えください。',
          answerType: 'long_text',
          required: false,
          order: 20,
          tags: ['転機'],
          enabled: true,
          source: 'ai',
          reviewStatus: 'unreviewed',
          intent: '章の核になる転機を見つける',
          aiOriginalText: '人生最大の転機は何ですか？',
        },
      ],
    },
    {
      id: 'family',
      title: '家族・暮らし',
      description: '日々の暮らしと、身近な人との思い出をたずねる設問',
      kind: 'theme',
      order: 50,
      enabled: true,
      questions: [
        {
          id: 'family-tradition',
          text: 'ご家庭で大切にしてきた習慣や行事はありますか？',
          helpText: '食事、季節の行事、休日の過ごし方などからお考えください。',
          answerType: 'long_text',
          required: false,
          order: 10,
          tags: ['家族', '習慣'],
          enabled: true,
          source: 'manual',
          reviewStatus: 'reviewed',
          intent: '家庭らしさが伝わる具体的な描写を集める',
        },
        {
          id: 'family-place',
          text: '長く暮らした土地や、心のふるさとと感じる場所はどこですか？',
          helpText: '',
          answerType: 'short_text',
          required: false,
          order: 20,
          tags: ['場所'],
          enabled: true,
          source: 'ai',
          reviewStatus: 'reviewed',
          intent: '自分史の舞台となる土地を知る',
          aiOriginalText: 'あなたのふるさとはどこですか？',
        },
      ],
    },
  ],
};

const STANDARD_MIGRATION_VERSIONS = [legacyInitialQuestionSet.version, '2.0.0'];

function addPersonalityDiagnosisQuestions(questionSet: QuestionSet) {
  const currentPersonality = initialQuestionSet.sections.find((section) => section.id === 'personality-values');
  const addedQuestions = currentPersonality?.questions.slice(0, 4) ?? [];
  const addedIds = new Set(addedQuestions.map((question) => question.id));
  return {
    ...questionSet,
    version: initialQuestionSet.version,
    updatedAt: new Date().toISOString(),
    sections: questionSet.sections.map((section) => {
      if (section.id !== 'personality-values') return section;
      const existingQuestions = section.questions.filter((question) => !addedIds.has(question.id));
      return {
        ...section,
        questions: [...addedQuestions, ...existingQuestions].map((question, index) => ({ ...question, order: (index + 1) * 10 })),
      };
    }),
  };
}

function slugPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u3040-\u30ff\u3400-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

function makeId(prefix: string, label: string) {
  return `${prefix}-${slugPart(label)}-${Date.now().toString(36).slice(-4)}`;
}

function issuesForQuestion(question: Question, section: Section) {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!question.text.trim()) errors.push('設問文が入力されていません。');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(question.id)) errors.push('IDは半角英数字とハイフンで入力してください。');
  if (['single_choice', 'multiple_choice'].includes(question.answerType)) {
    const options = (question.options ?? []).map((option) => option.trim()).filter(Boolean);
    if (options.length < 2) errors.push('選択式の設問には2つ以上の選択肢が必要です。');
    if (new Set(options).size !== options.length) errors.push('同じ選択肢が重複しています。');
  }
  if (question.text.length > 80) warnings.push('設問文が長いため、利用者画面で読みにくい可能性があります。');
  if (/(普通は|当然|必ず)/.test(question.text)) warnings.push('回答を誘導する表現が含まれている可能性があります。');
  if (/(病気|病歴|宗教|信条)/.test(question.text)) warnings.push('慎重な扱いが必要な内容が含まれています。');
  if (question.required) warnings.push('必須回答にする必要があるか確認してください。');
  const duplicates = section.questions.filter(
    (candidate) => candidate.id !== question.id && candidate.text.trim() === question.text.trim(),
  );
  if (duplicates.length) warnings.push('同じ設問文がこのセクション内にあります。');
  if (question.reviewStatus === 'unreviewed') warnings.push('AI生成後、まだ管理者が確認していません。');
  return { errors, warnings };
}

function publicQuestionSet(questionSet: QuestionSet) {
  return {
    schemaVersion: questionSet.schemaVersion,
    questionSetId: questionSet.questionSetId,
    version: questionSet.version,
    title: questionSet.title,
    updatedAt: questionSet.updatedAt,
    sections: questionSet.sections
      .filter((section) => section.enabled)
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        id: section.id,
        title: section.title,
        kind: section.kind,
        description: section.description,
        order: section.order,
        enabled: section.enabled,
        questions: section.questions
          .filter((question) => question.enabled)
          .sort((a, b) => a.order - b.order)
          .map((question) => ({
            id: question.id,
            text: question.text,
            helpText: question.helpText,
            answerType: question.answerType,
            required: question.required,
            order: question.order,
            tags: question.tags,
            enabled: question.enabled,
            ...(question.options ? { options: question.options } : {}),
          })),
      })),
  };
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeImportedData(value: unknown): QuestionSet | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Partial<QuestionSet>;
  if (!Array.isArray(data.sections)) return null;
  const now = new Date().toISOString();
  return {
    schemaVersion: Number(data.schemaVersion) || 1,
    questionSetId: String(data.questionSetId || `imported-${Date.now().toString(36)}`),
    version: String(data.version || '0.1.0'),
    title: String(data.title || '読み込んだ設問セット'),
    updatedAt: now,
    sections: data.sections.map((rawSection, sectionIndex) => {
      const section = rawSection as Partial<Section>;
      return {
        id: String(section.id || `section-${sectionIndex + 1}`),
        title: String(section.title || `セクション ${sectionIndex + 1}`),
        description: String(section.description || ''),
        kind: ['era', 'theme', 'personality'].includes(String(section.kind)) ? section.kind as SectionKind : 'theme',
        order: Number(section.order) || (sectionIndex + 1) * 10,
        enabled: section.enabled !== false,
        questions: Array.isArray(section.questions)
          ? section.questions.map((rawQuestion, questionIndex) => {
              const question = rawQuestion as Partial<Question>;
              const answerType = String(question.answerType) as AnswerType;
              return {
                id: String(question.id || `question-${sectionIndex + 1}-${questionIndex + 1}`),
                text: String(question.text || ''),
                helpText: String(question.helpText || ''),
                answerType: Object.keys(ANSWER_LABELS).includes(answerType) ? answerType : 'long_text',
                required: Boolean(question.required),
                order: Number(question.order) || (questionIndex + 1) * 10,
                tags: Array.isArray(question.tags) ? question.tags.map(String) : [],
                enabled: question.enabled !== false,
                source: question.source === 'manual' ? 'manual' : 'ai',
                reviewStatus: ['reviewed', 'needs_revision'].includes(String(question.reviewStatus))
                  ? question.reviewStatus as ReviewStatus
                  : 'unreviewed',
                options: Array.isArray(question.options) ? question.options.map(String) : undefined,
                intent: String(question.intent || ''),
                aiOriginalText: String(question.aiOriginalText || question.text || ''),
                reviewMemo: String(question.reviewMemo || ''),
              };
            })
          : [],
      };
    }),
  };
}

export default function Home() {
  const [questionSet, setQuestionSet] = useState<QuestionSet>(initialQuestionSet);
  const [selectedSectionId, setSelectedSectionId] = useState('profile');
  const [selectedQuestionId, setSelectedQuestionId] = useState('profile-name');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus | 'disabled'>('all');
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [editorTab, setEditorTab] = useState<'edit' | 'check' | 'diff'>('edit');
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'failed'>('saved');
  const [hydrated, setHydrated] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [importOpen, setImportOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteQuestionOpen, setDeleteQuestionOpen] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [historyState, setHistoryState] = useState({ undoCount: 0, redoCount: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<QuestionSet[]>([]);
  const futureRef = useRef<QuestionSet[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const normalized = normalizeImportedData(JSON.parse(stored));
          if (
            normalized
            && normalized.questionSetId === initialQuestionSet.questionSetId
            && STANDARD_MIGRATION_VERSIONS.includes(normalized.version)
          ) {
            localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify(normalized));
            setQuestionSet(initialQuestionSet);
            setSelectedSectionId('profile');
            setSelectedQuestionId('profile-name');
            setNotice({
              tone: 'success',
              message: '標準設問を、性格・考え方診断を含む第4版へ更新しました。以前の下書きはブラウザ内にバックアップしています。',
            });
          } else if (
            normalized
            && normalized.questionSetId === initialQuestionSet.questionSetId
            && normalized.version === '3.0.0'
          ) {
            localStorage.setItem(MIGRATION_BACKUP_KEY, JSON.stringify(normalized));
            const migrated = addPersonalityDiagnosisQuestions(normalized);
            setQuestionSet(migrated);
            setNotice({
              tone: 'success',
              message: 'これまでの編集内容を残したまま、性格・考え方の選択式設問を追加しました。',
            });
          } else if (normalized) {
            setQuestionSet(normalized);
          }
        }
      } catch {
        setNotice({ tone: 'warning', message: '保存データを読み込めなかったため、初期データを表示しています。' });
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(questionSet));
        setSaveState('saved');
      } catch {
        setSaveState('failed');
      }
    }, 320);
    return () => {
      window.clearTimeout(savingTimer);
      window.clearTimeout(persistTimer);
    };
  }, [questionSet, hydrated]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const selectedSection = questionSet.sections.find((section) => section.id === selectedSectionId)
    ?? questionSet.sections[0];
  const selectedQuestion = selectedSection?.questions.find((question) => question.id === selectedQuestionId)
    ?? selectedSection?.questions[0];

  const filteredQuestions = useMemo(() => {
    if (!selectedSection) return [];
    const query = search.trim().toLowerCase();
    return selectedSection.questions
      .filter((question) => {
        const matchesSearch = !query
          || question.text.toLowerCase().includes(query)
          || question.tags.some((tag) => tag.toLowerCase().includes(query))
          || question.id.toLowerCase().includes(query);
        const matchesStatus = statusFilter === 'all'
          || (statusFilter === 'disabled' ? !question.enabled : question.reviewStatus === statusFilter);
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => a.order - b.order);
  }, [selectedSection, search, statusFilter]);

  const allIssues = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    let unreviewed = 0;
    questionSet.sections.forEach((section) => {
      section.questions.filter((question) => question.enabled).forEach((question) => {
        const issues = issuesForQuestion(question, section);
        errors += issues.errors.length;
        warnings += issues.warnings.length;
        if (question.reviewStatus !== 'reviewed') unreviewed += 1;
      });
    });
    return { errors, warnings, unreviewed };
  }, [questionSet]);

  const selectedIssues = selectedQuestion && selectedSection
    ? issuesForQuestion(selectedQuestion, selectedSection)
    : { errors: [], warnings: [] };

  const activePreviewQuestions = (selectedSection?.questions ?? [])
    .filter((question) => question.enabled)
    .sort((a, b) => a.order - b.order);
  const previewQuestion = activePreviewQuestions[Math.min(previewIndex, Math.max(activePreviewQuestions.length - 1, 0))];

  function commit(updater: (current: QuestionSet) => QuestionSet, recordHistory = true) {
    setQuestionSet((current) => {
      if (recordHistory) {
        historyRef.current = [...historyRef.current.slice(-29), current];
        futureRef.current = [];
        setHistoryState({ undoCount: historyRef.current.length, redoCount: 0 });
      }
      const updated = updater(current);
      return { ...updated, updatedAt: new Date().toISOString() };
    });
  }

  function undo() {
    setQuestionSet((current) => {
      const previous = historyRef.current.at(-1);
      if (!previous) return current;
      historyRef.current = historyRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, current];
      setHistoryState({ undoCount: historyRef.current.length, redoCount: futureRef.current.length });
      return previous;
    });
  }

  function redo() {
    setQuestionSet((current) => {
      const next = futureRef.current.at(-1);
      if (!next) return current;
      futureRef.current = futureRef.current.slice(0, -1);
      historyRef.current = [...historyRef.current, current];
      setHistoryState({ undoCount: historyRef.current.length, redoCount: futureRef.current.length });
      return next;
    });
  }

  function updateSection(patch: Partial<Section>, recordHistory = true) {
    commit((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === selectedSectionId ? { ...section, ...patch } : section),
    }), recordHistory);
  }

  function updateQuestion(patch: Partial<Question>, recordHistory = true) {
    if (!selectedQuestion) return;
    commit((current) => ({
      ...current,
      sections: current.sections.map((section) => section.id === selectedSectionId
        ? {
            ...section,
            questions: section.questions.map((question) => question.id === selectedQuestion.id
              ? { ...question, ...patch }
              : question),
          }
        : section),
    }), recordHistory);
  }

  function addQuestion() {
    if (!selectedSection) return;
    const id = makeId(selectedSection.id, 'question');
    const nextOrder = Math.max(0, ...selectedSection.questions.map((question) => question.order)) + 10;
    const question: Question = {
      id,
      text: '新しい設問',
      helpText: '',
      answerType: 'long_text',
      required: false,
      order: nextOrder,
      tags: [],
      enabled: true,
      source: 'manual',
      reviewStatus: 'unreviewed',
      intent: '',
    };
    updateSection({ questions: [...selectedSection.questions, question] });
    setSelectedQuestionId(id);
    setEditorTab('edit');
    setNotice({ tone: 'success', message: '新しい設問を追加しました。' });
  }

  function duplicateQuestion() {
    if (!selectedQuestion || !selectedSection) return;
    const duplicate = {
      ...selectedQuestion,
      id: makeId(selectedSection.id, `${selectedQuestion.id}-copy`),
      text: `${selectedQuestion.text}（複製）`,
      order: Math.max(...selectedSection.questions.map((question) => question.order)) + 10,
      source: 'manual' as const,
      reviewStatus: 'unreviewed' as const,
      aiOriginalText: undefined,
    };
    updateSection({ questions: [...selectedSection.questions, duplicate] });
    setSelectedQuestionId(duplicate.id);
    setNotice({ tone: 'success', message: '設問を複製しました。' });
  }

  function deleteQuestion() {
    if (!selectedQuestion || !selectedSection) return;
    const selectedIndex = selectedSection.questions.findIndex(
      (question) => question.id === selectedQuestion.id,
    );
    const remainingQuestions = selectedSection.questions
      .filter((question) => question.id !== selectedQuestion.id)
      .map((question, index) => ({ ...question, order: (index + 1) * 10 }));
    const nextQuestion = remainingQuestions[Math.min(selectedIndex, remainingQuestions.length - 1)];
    const deletedQuestionText = selectedQuestion.text;

    updateSection({ questions: remainingQuestions });
    setSelectedQuestionId(nextQuestion?.id ?? '');
    setCheckedIds((current) => current.filter((id) => id !== selectedQuestion.id));
    setDeleteQuestionOpen(false);
    setEditorTab('edit');
    setNotice({
      tone: 'success',
      message: `「${deletedQuestionText}」を削除しました。上部の「元に戻す」で復元できます。`,
    });
  }

  function addSection() {
    const title = '新しいセクション';
    const id = makeId('section', title);
    const section: Section = {
      id,
      title,
      description: 'このセクションの目的を入力してください。',
      kind: 'theme',
      order: Math.max(0, ...questionSet.sections.map((item) => item.order)) + 10,
      enabled: true,
      questions: [],
    };
    commit((current) => ({ ...current, sections: [...current.sections, section] }));
    setSelectedSectionId(id);
    setSelectedQuestionId('');
    setNotice({ tone: 'success', message: 'セクションを追加しました。見出しを編集できます。' });
  }

  function selectSection(section: Section) {
    setSelectedSectionId(section.id);
    setSelectedQuestionId(section.questions[0]?.id ?? '');
    setCheckedIds([]);
  }

  function moveQuestion(questionId: string, direction: -1 | 1) {
    if (!selectedSection) return;
    const ordered = [...selectedSection.questions].sort((a, b) => a.order - b.order);
    const from = ordered.findIndex((question) => question.id === questionId);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= ordered.length) return;
    [ordered[from], ordered[to]] = [ordered[to], ordered[from]];
    const questions = ordered.map((question, index) => ({ ...question, order: (index + 1) * 10 }));
    updateSection({ questions });
  }

  function toggleChecked(questionId: string) {
    setCheckedIds((current) => current.includes(questionId)
      ? current.filter((id) => id !== questionId)
      : [...current, questionId]);
  }

  function bulkUpdate(patch: Partial<Question>) {
    if (!checkedIds.length || !selectedSection) return;
    updateSection({
      questions: selectedSection.questions.map((question) => checkedIds.includes(question.id)
        ? { ...question, ...patch }
        : question),
    });
    setNotice({ tone: 'success', message: `${checkedIds.length}件の設問を更新しました。` });
    setCheckedIds([]);
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = normalizeImportedData(JSON.parse(String(reader.result)));
        if (!imported) throw new Error('invalid');
        localStorage.setItem(BACKUP_KEY, JSON.stringify(questionSet));
        historyRef.current = [...historyRef.current, questionSet];
        futureRef.current = [];
        setQuestionSet(imported);
        setSelectedSectionId(imported.sections[0]?.id ?? '');
        setSelectedQuestionId(imported.sections[0]?.questions[0]?.id ?? '');
        setImportOpen(false);
        setHistoryState({ undoCount: historyRef.current.length, redoCount: 0 });
        setNotice({ tone: 'success', message: '現在の内容を退避し、新しい下書きとして読み込みました。' });
      } catch {
        setNotice({ tone: 'warning', message: 'JSONの形式を確認できませんでした。設問セットのファイルを選んでください。' });
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  function exportPublished() {
    if (allIssues.errors || allIssues.unreviewed) {
      setPublishOpen(true);
      return;
    }
    const published = publicQuestionSet(questionSet);
    localStorage.setItem(PUBLISHED_QUESTION_SET_KEY, JSON.stringify(published));
    downloadJson(`${questionSet.questionSetId}-${questionSet.version}.json`, published);
    setNotice({ tone: 'success', message: '公開用JSONを書き出し、このブラウザの利用者画面へ反映しました。' });
  }

  function restoreImportBackup() {
    try {
      const backup = localStorage.getItem(BACKUP_KEY);
      if (!backup) throw new Error('missing');
      const normalized = normalizeImportedData(JSON.parse(backup));
      if (!normalized) throw new Error('invalid');
      setQuestionSet(normalized);
      setSelectedSectionId(normalized.sections[0]?.id ?? '');
      setSelectedQuestionId(normalized.sections[0]?.questions[0]?.id ?? '');
      setImportOpen(false);
      setNotice({ tone: 'success', message: '読み込み前の下書きへ戻しました。' });
    } catch {
      setNotice({ tone: 'warning', message: '復元できる下書きがありません。' });
    }
  }

  function renderPreviewInput(question: Question) {
    if (question.answerType === 'single_choice' || question.answerType === 'multiple_choice') {
      return (
        <div className="preview-options">
          {(question.options ?? []).map((option) => (
            <label key={option}>
              <input type={question.answerType === 'single_choice' ? 'radio' : 'checkbox'} name="preview-answer" />
              <span>{option}</span>
            </label>
          ))}
        </div>
      );
    }
    if (question.answerType === 'date') return <input className="preview-text-input" type="date" />;
    if (question.answerType === 'year_month') return <input className="preview-text-input" type="month" />;
    if (question.answerType === 'rating') {
      return <div className="rating-row">{[1, 2, 3, 4, 5].map((number) => <button key={number}>{number}</button>)}</div>;
    }
    if (question.answerType === 'short_text') return <input className="preview-text-input" placeholder="ここに入力してください" />;
    return (
      <div className="voice-textarea">
        <textarea rows={7} placeholder="覚えていることから、自由にお話しください。" />
        <button className="voice-button" type="button"><span>●</span> 音声で入力</button>
      </div>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">史</div>
          <div>
            <p className="eyebrow">JIBUNSHI STUDIO</p>
            <p className="brand-name">設問編集室</p>
          </div>
        </div>

        <div className="set-summary">
          <label>
            <span>設問セット</span>
            <input
              value={questionSet.title}
              onChange={(event) => commit((current) => ({ ...current, title: event.target.value }), false)}
              aria-label="設問セット名"
            />
          </label>
          <span className="version-pill">下書き · v{questionSet.version}</span>
          <span className={`save-state ${saveState}`}>
            <i />{saveState === 'saved' ? '保存済み' : saveState === 'saving' ? '保存中…' : '保存失敗'}
          </span>
        </div>

        <div className="header-actions">
          <div className="history-actions" aria-label="編集履歴">
            <button onClick={undo} disabled={!historyState.undoCount} aria-label="元に戻す">↶</button>
            <button onClick={redo} disabled={!historyState.redoCount} aria-label="やり直す">↷</button>
          </div>
          <button className="button secondary" onClick={() => { setPreviewIndex(0); setPreviewOpen(true); }}>
            ◉ 利用者画面で確認
          </button>
          <Link className="button secondary timeline-button" href="/">利用者画面</Link>
          <Link className="button secondary" href="/admin/story-preview">AI原稿確認</Link>
          <button className="button secondary json-button" onClick={() => setImportOpen(true)}>JSON</button>
          <form className="logout-form" action="/api/auth/logout" method="post">
            <button className="button secondary logout-button" type="submit">ログアウト</button>
          </form>
          <button className="button primary" onClick={exportPublished}>公開用を書き出す</button>
        </div>
      </header>

      <div className="workspace">
        <aside className="section-panel">
          <div className="panel-heading">
            <div>
              <p className="label">構成</p>
              <h2>セクション</h2>
            </div>
            <button className="icon-button" onClick={addSection} aria-label="セクションを追加">＋</button>
          </div>
          <nav aria-label="設問セクション">
            {[...questionSet.sections].sort((a, b) => a.order - b.order).map((section) => {
              const pending = section.questions.filter((question) => question.reviewStatus !== 'reviewed' && question.enabled).length;
              return (
                <button
                  className={`section-row ${section.id === selectedSection?.id ? 'active' : ''} ${!section.enabled ? 'disabled' : ''}`}
                  key={section.id}
                  onClick={() => selectSection(section)}
                >
                  <span className="drag-handle" aria-hidden="true">⠿</span>
                  <span className="section-name">{section.title}</span>
                  {pending > 0 && <span className="pending-dot">{pending}</span>}
                  <span className="section-count">{section.questions.length}</span>
                </button>
              );
            })}
          </nav>
          <div className="set-health">
            <div><span className="health-value">{questionSet.sections.reduce((sum, section) => sum + section.questions.length, 0)}</span><span>全設問</span></div>
            <div><span className="health-value amber">{allIssues.unreviewed}</span><span>要確認</span></div>
            <div><span className={`health-value ${allIssues.errors ? 'red' : 'green'}`}>{allIssues.errors}</span><span>エラー</span></div>
          </div>
          <div className="structure-note">
            <span className="note-icon">i</span>
            <p>構造は「設問セット・セクション・設問」の3階層に固定されています。</p>
          </div>
        </aside>

        <section className="question-panel">
          {selectedSection ? (
            <>
              <div className="question-header">
                <div className="section-title-edit">
                  <div className="breadcrumb">{questionSet.title} <span>/</span> {selectedSection.title}</div>
                  <input
                    value={selectedSection.title}
                    onChange={(event) => updateSection({ title: event.target.value }, false)}
                    aria-label="セクション名"
                  />
                  <textarea
                    value={selectedSection.description}
                    onChange={(event) => updateSection({ description: event.target.value }, false)}
                    aria-label="セクションの説明"
                    rows={1}
                  />
                </div>
                <button className="button primary compact" onClick={addQuestion}>＋ 設問を追加</button>
              </div>

              <div className="toolbar">
                <label className="search-box">
                  <span aria-hidden="true">⌕</span>
                  <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="設問を検索" placeholder="設問文・タグ・IDを検索" />
                  {search && <button onClick={() => setSearch('')} aria-label="検索をクリア">×</button>}
                </label>
                <select className="filter-button" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="確認状態で絞り込む">
                  <option value="all">すべての状態</option>
                  <option value="unreviewed">未確認</option>
                  <option value="needs_revision">要修正</option>
                  <option value="reviewed">確認済み</option>
                  <option value="disabled">非表示</option>
                </select>
                <div className="result-count">{selectedSection.questions.length}件中 {filteredQuestions.length}件</div>
              </div>

              {checkedIds.length > 0 && (
                <div className="bulk-bar">
                  <strong>{checkedIds.length}件を選択中</strong>
                  <button onClick={() => bulkUpdate({ reviewStatus: 'reviewed' })}>確認済みにする</button>
                  <button onClick={() => bulkUpdate({ enabled: false })}>非表示にする</button>
                  <button onClick={() => setCheckedIds([])}>選択解除</button>
                </div>
              )}

              <div className="question-list">
                {filteredQuestions.map((question, index) => {
                  const issues = issuesForQuestion(question, selectedSection);
                  return (
                    <article className={`question-card ${selectedQuestion?.id === question.id ? 'selected' : ''} ${!question.enabled ? 'disabled' : ''}`} key={question.id}>
                      <label className="check-cell" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" checked={checkedIds.includes(question.id)} onChange={() => toggleChecked(question.id)} aria-label={`${question.text}を選択`} />
                      </label>
                      <span className="question-number">Q{String(index + 1).padStart(2, '0')}</span>
                      <button className="question-select" onClick={() => { setSelectedQuestionId(question.id); setEditorTab('edit'); }}>
                        <span className="question-copy">
                          <strong>{question.text || '（設問文がありません）'}</strong>
                          <span>{ANSWER_LABELS[question.answerType]}　・　{question.required ? '必須' : '任意'}　・　{question.tags.length ? question.tags.join(' / ') : 'タグなし'}</span>
                        </span>
                      </button>
                      <span className={`status ${question.reviewStatus}`}>
                        {STATUS_LABELS[question.reviewStatus]}
                      </span>
                      {(issues.errors.length > 0 || issues.warnings.length > 0) && (
                        <button className={`issue-count ${issues.errors.length ? 'error' : ''}`} onClick={() => { setSelectedQuestionId(question.id); setEditorTab('check'); }} aria-label="検証結果を表示">
                          {issues.errors.length ? '!' : '△'} {issues.errors.length + issues.warnings.length}
                        </button>
                      )}
                      <div className="move-actions">
                        <button onClick={() => moveQuestion(question.id, -1)} disabled={index === 0} aria-label="上へ移動">↑</button>
                        <button onClick={() => moveQuestion(question.id, 1)} disabled={index === filteredQuestions.length - 1} aria-label="下へ移動">↓</button>
                      </div>
                    </article>
                  );
                })}
                {!filteredQuestions.length && (
                  <div className="empty-list">
                    <span>⌕</span>
                    <h3>該当する設問はありません</h3>
                    <p>検索語や絞り込み条件を変えてください。</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-list"><h3>セクションを追加してください</h3></div>
          )}
        </section>

        <aside className="editor-panel">
          {selectedQuestion && selectedSection ? (
            <>
              <div className="editor-heading">
                <div>
                  <p className="label">設問を編集</p>
                  <p className="editor-id">ID: {selectedQuestion.id}</p>
                </div>
                <div className="editor-heading-actions">
                  <button onClick={duplicateQuestion} aria-label="設問を複製">⧉</button>
                  <button onClick={() => setSelectedQuestionId('')} aria-label="編集を閉じる">×</button>
                </div>
              </div>

              <div className="editor-tabs" role="tablist">
                <button className={editorTab === 'edit' ? 'active' : ''} onClick={() => setEditorTab('edit')}>編集</button>
                <button className={editorTab === 'check' ? 'active' : ''} onClick={() => setEditorTab('check')}>
                  検証 <span>{selectedIssues.errors.length + selectedIssues.warnings.length}</span>
                </button>
                <button className={editorTab === 'diff' ? 'active' : ''} onClick={() => setEditorTab('diff')} disabled={selectedQuestion.source !== 'ai'}>AI原文</button>
              </div>

              {editorTab === 'edit' && (
                <div className="editor-scroll">
                  {selectedQuestion.source === 'ai' && selectedQuestion.reviewStatus !== 'reviewed' && (
                    <div className="review-banner">
                      <span>AI</span>
                      <div><strong>AIが作成した設問です</strong><p>意図と回答形式を確認してください。</p></div>
                    </div>
                  )}

                  <div className="editor-form">
                    <label>
                      <span>設問文 <b>必須</b></span>
                      <textarea value={selectedQuestion.text} onChange={(event) => updateQuestion({ text: event.target.value }, false)} rows={4} />
                      <small className={selectedQuestion.text.length > 80 ? 'over' : ''}>{selectedQuestion.text.length} / 120</small>
                    </label>
                    <label>
                      <span>補足文・回答例</span>
                      <textarea value={selectedQuestion.helpText} onChange={(event) => updateQuestion({ helpText: event.target.value }, false)} rows={3} placeholder="利用者が答えやすくなる短い補足" />
                    </label>
                    <div className="field-grid">
                      <label>
                        <span>回答形式</span>
                        <select value={selectedQuestion.answerType} onChange={(event) => updateQuestion({ answerType: event.target.value as AnswerType })}>
                          {Object.entries(ANSWER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>回答設定</span>
                        <select value={selectedQuestion.required ? 'required' : 'optional'} onChange={(event) => updateQuestion({ required: event.target.value === 'required' })}>
                          <option value="optional">任意</option>
                          <option value="required">必須</option>
                        </select>
                      </label>
                    </div>

                    {['single_choice', 'multiple_choice'].includes(selectedQuestion.answerType) && (
                      <fieldset className="option-editor">
                        <legend>選択肢</legend>
                        {(selectedQuestion.options ?? []).map((option, optionIndex) => (
                          <div key={`${selectedQuestion.id}-option-${optionIndex}`}>
                            <span>{optionIndex + 1}</span>
                            <input
                              value={option}
                              onChange={(event) => {
                                const options = [...(selectedQuestion.options ?? [])];
                                options[optionIndex] = event.target.value;
                                updateQuestion({ options }, false);
                              }}
                            />
                            <button onClick={() => updateQuestion({ options: (selectedQuestion.options ?? []).filter((_, index) => index !== optionIndex) })} aria-label="選択肢を削除">×</button>
                          </div>
                        ))}
                        <button className="add-option" onClick={() => updateQuestion({ options: [...(selectedQuestion.options ?? []), '新しい選択肢'] })}>＋ 選択肢を追加</button>
                      </fieldset>
                    )}

                    <label>
                      <span>タグ <em>カンマで区切る</em></span>
                      <input value={selectedQuestion.tags.join(', ')} onChange={(event) => updateQuestion({ tags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) }, false)} placeholder="家族, 場所" />
                    </label>
                    <label>
                      <span>設問の意図 <em>管理者のみ</em></span>
                      <textarea value={selectedQuestion.intent ?? ''} onChange={(event) => updateQuestion({ intent: event.target.value }, false)} rows={2} placeholder="この設問で何を知りたいか" />
                    </label>
                    <label>
                      <span>確認メモ <em>管理者のみ</em></span>
                      <textarea value={selectedQuestion.reviewMemo ?? ''} onChange={(event) => updateQuestion({ reviewMemo: event.target.value }, false)} rows={2} placeholder="警告を許容した理由など" />
                    </label>
                    <label className="toggle-row">
                      <span><strong>利用者画面に表示</strong><small>オフにしても下書きには残ります</small></span>
                      <input type="checkbox" checked={selectedQuestion.enabled} onChange={(event) => updateQuestion({ enabled: event.target.checked })} />
                    </label>
                  </div>
                </div>
              )}

              {editorTab === 'check' && (
                <div className="editor-scroll check-panel">
                  <div className={`check-summary ${selectedIssues.errors.length ? 'has-error' : ''}`}>
                    <span>{selectedIssues.errors.length ? '!' : '✓'}</span>
                    <div>
                      <strong>{selectedIssues.errors.length ? '公開前に修正が必要です' : '重大なエラーはありません'}</strong>
                      <p>{selectedIssues.errors.length}件のエラー・{selectedIssues.warnings.length}件の警告</p>
                    </div>
                  </div>
                  {selectedIssues.errors.map((issue) => <div className="issue-card error" key={issue}><span>エラー</span><p>{issue}</p></div>)}
                  {selectedIssues.warnings.map((issue) => <div className="issue-card warning" key={issue}><span>警告</span><p>{issue}</p></div>)}
                  {!selectedIssues.errors.length && !selectedIssues.warnings.length && <p className="no-issues">この設問は公開できる状態です。</p>}
                  <div className="validation-guide">
                    <strong>確認の観点</strong>
                    <ul>
                      <li>一度に一つのことを尋ねているか</li>
                      <li>答えを誘導する表現がないか</li>
                      <li>回答形式が設問の意図に合っているか</li>
                      <li>答えにくい内容を必須にしていないか</li>
                    </ul>
                  </div>
                </div>
              )}

              {editorTab === 'diff' && (
                <div className="editor-scroll diff-panel">
                  <div className="diff-intro"><span>AI</span><p>AIが生成した原文と、現在の設問文を並べて確認できます。</p></div>
                  <div className="diff-block original"><span>AI原文</span><p>{selectedQuestion.aiOriginalText || '原文は保存されていません。'}</p></div>
                  <div className="diff-arrow">↓ 管理者が編集</div>
                  <div className="diff-block current"><span>現在</span><p>{selectedQuestion.text}</p></div>
                </div>
              )}

              <div className="editor-footer">
                <div className="editor-footer-actions">
                  <button className="button secondary danger" onClick={() => updateQuestion({ enabled: !selectedQuestion.enabled })}>
                    {selectedQuestion.enabled ? '非表示にする' : '表示に戻す'}
                  </button>
                  <button className="button destructive" onClick={() => setDeleteQuestionOpen(true)}>
                    設問を削除
                  </button>
                </div>
                <select value={selectedQuestion.reviewStatus} onChange={(event) => updateQuestion({ reviewStatus: event.target.value as ReviewStatus })} aria-label="確認状態">
                  <option value="unreviewed">未確認</option>
                  <option value="needs_revision">要修正</option>
                  <option value="reviewed">確認済み</option>
                </select>
              </div>
            </>
          ) : (
            <div className="editor-empty"><span>✎</span><p>中央の一覧から<br />編集する設問を選んでください。</p></div>
          )}
        </aside>
      </div>

      {notice && <div className={`toast ${notice.tone}`} role="status"><span>{notice.tone === 'success' ? '✓' : notice.tone === 'warning' ? '!' : 'i'}</span>{notice.message}</div>}

      {previewOpen && previewQuestion && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="利用者画面プレビュー">
          <div className="preview-modal">
            <div className="preview-toolbar">
              <div><p className="label">LIVE PREVIEW</p><strong>利用者画面の確認</strong></div>
              <div className="device-switch" aria-label="表示幅">
                <button className={previewMode === 'desktop' ? 'active' : ''} onClick={() => setPreviewMode('desktop')}>▱ デスクトップ</button>
                <button className={previewMode === 'mobile' ? 'active' : ''} onClick={() => setPreviewMode('mobile')}>▯ スマートフォン</button>
              </div>
              <button className="modal-close" onClick={() => setPreviewOpen(false)} aria-label="プレビューを閉じる">×</button>
            </div>
            <div className="preview-stage">
              <div className={`preview-device ${previewMode}`}>
                <header>
                  <div className="preview-brand"><span>史</span>わたしの自分史</div>
                  <span className="preview-saved">● 保存済み</span>
                </header>
                <div className="preview-progress"><span style={{ width: `${((previewIndex + 1) / activePreviewQuestions.length) * 100}%` }} /></div>
                <div className="preview-content">
                  <p className="preview-step">{selectedSection.title}　{previewIndex + 1} / {activePreviewQuestions.length}</p>
                  <h2>{previewQuestion.text}{previewQuestion.required && <em>必須</em>}</h2>
                  {previewQuestion.helpText && <p className="preview-help">{previewQuestion.helpText}</p>}
                  {renderPreviewInput(previewQuestion)}
                  <div className="preview-navigation">
                    <button onClick={() => setPreviewIndex((value) => Math.max(0, value - 1))} disabled={previewIndex === 0}>← 前の設問</button>
                    <button onClick={() => setPreviewIndex((value) => Math.min(activePreviewQuestions.length - 1, value + 1))} disabled={previewIndex === activePreviewQuestions.length - 1}>次の設問 →</button>
                  </div>
                  {!previewQuestion.required && <button className="skip-button">この設問はスキップする</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {importOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="JSONデータ管理">
          <div className="utility-modal">
            <div className="utility-heading"><div><p className="label">DATA</p><h2>JSONデータ管理</h2></div><button className="modal-close" onClick={() => setImportOpen(false)}>×</button></div>
            <p className="utility-lead">AI生成案や作業中の設問セットを安全に読み込み、必要な形式で書き出します。</p>
            <div className="utility-card import">
              <div className="utility-icon">↓</div>
              <div><strong>JSONを新しい下書きとして読み込む</strong><p>現在の内容は退避され、上書きされません。</p></div>
              <button className="button primary" onClick={() => fileInputRef.current?.click()}>ファイルを選択</button>
              <input ref={fileInputRef} hidden type="file" accept="application/json,.json" onChange={handleImport} />
            </div>
            <div className="utility-card">
              <div className="utility-icon">↥</div>
              <div><strong>作業用JSONを書き出す</strong><p>管理者メモ、AI原文、確認状態を含みます。</p></div>
              <button className="button secondary" onClick={() => downloadJson(`${questionSet.questionSetId}-workspace.json`, questionSet)}>書き出す</button>
            </div>
            <div className="utility-card">
              <div className="utility-icon">↶</div>
              <div><strong>読み込み前の下書きへ戻す</strong><p>直前にJSONを読み込んだときの内容を復元します。</p></div>
              <button className="button secondary" onClick={restoreImportBackup}>復元する</button>
            </div>
          </div>
        </div>
      )}

      {publishOpen && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="公開前の確認">
          <div className="utility-modal publish-modal">
            <div className="utility-heading"><div><p className="label">PUBLISH CHECK</p><h2>まだ公開用に書き出せません</h2></div><button className="modal-close" onClick={() => setPublishOpen(false)}>×</button></div>
            <p className="utility-lead">利用者へ渡す前に、次の項目を確認してください。</p>
            <div className="publish-stats">
              <div className={allIssues.errors ? 'problem' : ''}><strong>{allIssues.errors}</strong><span>エラー</span></div>
              <div className={allIssues.unreviewed ? 'problem' : ''}><strong>{allIssues.unreviewed}</strong><span>未確認・要修正</span></div>
              <div><strong>{allIssues.warnings}</strong><span>警告</span></div>
            </div>
            <p className="publish-note">エラーと未確認項目が0になると、公開用JSONから管理者情報を除いて書き出せます。警告は確認メモを残したうえで許容できます。</p>
            <button className="button primary modal-primary" onClick={() => setPublishOpen(false)}>編集に戻る</button>
          </div>
        </div>
      )}

      {deleteQuestionOpen && selectedQuestion && (
        <div className="modal-layer" role="dialog" aria-modal="true" aria-label="設問の削除確認">
          <div className="utility-modal delete-modal">
            <div className="utility-heading">
              <div><p className="label">DELETE QUESTION</p><h2>この設問を削除しますか？</h2></div>
              <button className="modal-close" onClick={() => setDeleteQuestionOpen(false)} aria-label="削除確認を閉じる">×</button>
            </div>
            <p className="delete-question-text">{selectedQuestion.text}</p>
            <p className="utility-lead">設問セットから完全に削除されます。削除後でも、画面上部の「元に戻す」で復元できます。</p>
            <div className="delete-modal-actions">
              <button className="button secondary" onClick={() => setDeleteQuestionOpen(false)}>キャンセル</button>
              <button className="button destructive" onClick={deleteQuestion}>設問を削除する</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
