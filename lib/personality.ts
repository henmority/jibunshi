import type { QuestionSet, Section } from './initial-question-set';

export const RATING_LABELS = ['まったく思わない', '思わない', 'あまり思わない', 'どちらともいえない', 'やや思う', '思う', 'かなり思う'] as const;
export const PERSONALITY_VERSION = 'life-preferences-v1';
export const AXES = [
  { id: 'energy', title: '人との関わり', left: '一人でじっくり整える', right: '人と関わりながら整える' },
  { id: 'information', title: '情報の受け取り方', left: '具体的な事実・経験を手がかりにする', right: '全体像・可能性を手がかりにする' },
  { id: 'decision', title: '判断で重視すること', left: '筋道・共通の基準を重視する', right: '気持ち・個別の事情を重視する' },
  { id: 'approach', title: '物事の進め方', left: '見通しを立てて進める', right: '状況に合わせて調整する' },
] as const;
export type PreferenceAxis = typeof AXES[number]['id'];
export type Preference = { axis: PreferenceAxis; direction: -1 | 1 };

// 各軸5問。左寄り・右寄りを混在させ、同意の多さをそのまま一方の傾向にしない。
const ITEMS: Array<[PreferenceAxis, -1 | 1, string]> = [
  ['energy', 1, '気の合う人と話したあとは、もう少し何かをしたくなるほど元気が出る。'],
  ['information', -1, '初めてのことを教わるときは、具体的な例を見せてもらうと理解しやすい。'],
  ['decision', -1, '意見が分かれたときは、誰の案かよりも、理由に筋が通っているかを重視する。'],
  ['approach', -1, '旅行に行くときは、出発前に大まかな行程を決めておくと落ち着く。'],
  ['energy', -1, '楽しい集まりであっても、そのあとは一人で静かに過ごす時間がほしくなる。'],
  ['information', 1, '新しい話を聞くと、「これが実現したら何が変わるだろう」と可能性を考える。'],
  ['decision', 1, '誰かに改善してほしいことを伝えるときは、その人がどう受け止めるかを先に考える。'],
  ['approach', 1, '自由に使える休日は、予定を決めず、そのときの気分で過ごしたい。'],
  ['energy', 1, '考えがまとまらないときは、誰かと話しながら整理するほうが自然だ。'],
  ['information', -1, '大切な判断の材料には、実際に確かめた事実や過去の経験を使いたい。'],
  ['decision', -1, '頼まれごとを引き受けるか迷うときは、必要な時間や負担を比べて決めたい。'],
  ['approach', -1, '締め切りがある用事は、途中の進め方を決めて少しずつ終わらせたい。'],
  ['energy', -1, '話し合いでは、発言する前に自分の考えを頭の中で整理したい。'],
  ['information', 1, '新しい作業を始めるときは、細かな手順よりも、全体の目的を先につかみたい。'],
  ['decision', 1, '同じ決まりを当てはめるか迷うときは、その人の事情に応じた対応を大切にしたい。'],
  ['approach', 1, 'もっとよい方法を見つけたら、進めている途中でも計画を組み替えたい。'],
  ['energy', 1, '初対面の人がいる場では、自分から話しかけて知り合うことを楽しめる。'],
  ['information', 1, '別々の出来事を聞くと、その背後に共通する意味やつながりを考える。'],
  ['decision', -1, '複数の人に関わる判断では、あらかじめ決めた共通の基準を大切にしたい。'],
  ['approach', -1, 'やることがいくつかあるときは、優先順位を決めてから取りかかりたい。'],
];

export function createPersonalitySection(): Section {
  return {
    id: 'personality-preferences', title: '性格・考え方（20問）', kind: 'personality', order: 70, enabled: true,
    description: '普段の自然な行動を7段階で振り返る、4つの観点の設問シート。',
    questions: ITEMS.map(([axis, direction, text], index) => ({
      id: `preference-${String(index + 1).padStart(2, '0')}`, text, helpText: '', answerType: 'rating',
      required: false, order: (index + 1) * 10, tags: ['考え方', AXES.find((item) => item.id === axis)!.title],
      enabled: true, source: 'manual', reviewStatus: 'reviewed', preference: { axis, direction },
      intent: '普段の選好を振り返る独自設問。能力や優劣、固定的な性格タイプは判定しない。',
    })),
  };
}

export function normalizePreference(value: unknown): Preference | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const p = value as Preference;
  return AXES.some((axis) => axis.id === p.axis) && (p.direction === -1 || p.direction === 1)
    ? { axis: p.axis, direction: p.direction } : undefined;
}

export function ratingValue(value: unknown): number | null {
  return typeof value === 'string' && /^[1-7]$/.test(value) ? Number(value) : null;
}

export function personalityQuestions(set: QuestionSet) {
  return set.sections.filter((section) => section.enabled && section.kind === 'personality')
    .sort((a, b) => a.order - b.order)
    .flatMap((section) => section.questions.filter((q) => q.enabled).sort((a, b) => a.order - b.order));
}

export function summarizePersonality(set: QuestionSet, answers: Record<string, unknown>) {
  const questions = personalityQuestions(set);
  return {
    method: PERSONALITY_VERSION,
    description: 'MBTIの4観点を参考にした独自の自己理解シート。正式なMBTI検査や医学的診断ではない。数値は回答の位置であり、能力・確率ではない。',
    scale: RATING_LABELS,
    axes: AXES.map((axis) => {
      const items = questions.filter((q) => q.answerType === 'rating' && normalizePreference(q.preference)?.axis === axis.id);
      const scores = items.flatMap((q) => {
        const n = ratingValue(answers[q.id]);
        return n === null ? [] : [(n - 4) * q.preference!.direction];
      });
      // 5問未満や未回答がある軸を確定した結果として見せない。
      const complete = items.length >= 5 && scores.length === items.length;
      const average = complete ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
      return { ...axis, answered: scores.length, total: items.length, complete,
        position: average === null ? null : Math.round((average + 3) / 6 * 100),
        summary: average === null ? (items.length < 5 ? '集計にはこの観点の設問が5問以上必要です' : '回答がそろうと表示します') : Math.abs(average) <= 0.5
          ? '両方の傾向が見られます' : `${average < 0 ? axis.left : axis.right}傾向`,
      };
    }),
  };
}

export function personalityAnswerCount(set: QuestionSet, answers: Record<string, unknown>) {
  return personalityQuestions(set).filter((q) => {
    const value = answers[q.id];
    return q.answerType === 'rating' ? ratingValue(value) !== null
      : Array.isArray(value) ? value.length > 0 : typeof value === 'string' && Boolean(value.trim());
  }).length;
}

export function upgradePersonalityQuestions(set: QuestionSet): QuestionSet {
  if (set.questionSetId !== 'standard-life-story' || !['1.0.0', '2.0.0', '3.0.0', '4.0.0'].includes(set.version)) return set;
  // 旧設問と管理者の編集をアーカイブに残す。5版以降の削除・非表示は復活させない。
  return { ...set, version: '5.0.0', updatedAt: '2026-09-12T00:00:00.000Z', sections: [
    ...set.sections.map((section) => section.kind === 'personality'
      ? { ...section, enabled: false, title: `${section.title}（旧版・保存用）` } : section),
    createPersonalitySection(),
  ] };
}
