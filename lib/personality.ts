import type { QuestionSet, Section } from './initial-question-set';
import { createEpisodeSection } from './episode-guide';
import { refineStandardWording } from './question-wording';

export const RATING_LABELS = ['まったく思わない', '思わない', 'あまり思わない', 'どちらともいえない', 'やや思う', '思う', 'かなり思う'] as const;
export const PERSONALITY_VERSION = 'life-preferences-v2';
export const UNSURE_ANSWER = 'unsure';
export const UNSURE_LABEL = '判断できない・経験がない';
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
  ['energy', 1, '気分転換したいときは、誰かと話すことを選ぶことが多い。'],
  ['information', -1, '初めての作業を教わるときは、まず具体的なやり方の例を確かめることが多い。'],
  ['decision', -1, '話し合いで意見が分かれたとき、まずそれぞれの案の理由を比べることが多い。'],
  ['approach', -1, '出かけるときは、出発前に大まかな行程を決めることが多い。'],
  ['energy', -1, '楽しい集まりであっても、そのあとは一人で静かに過ごす時間がほしくなる。'],
  ['information', 1, '新しいアイデアを聞くと、実現したらどんなことができるか考えることが多い。'],
  ['decision', 1, '誰かに改善してほしいことを伝えるときは、その人がどう受け止めるかを先に考える。'],
  ['approach', 1, '自由に使える時間は、予定を決めず、そのときにしたいことを選ぶことが多い。'],
  ['energy', 1, '考えがまとまらないときは、誰かと話しながら整理するほうが自然だ。'],
  ['information', -1, 'やり方に迷うと、以前に似たことをしたときの経験を思い出すことが多い。'],
  ['decision', -1, '頼まれごとを引き受けるか迷うときは、まず必要な時間を見積もることが多い。'],
  ['approach', -1, '締め切りがある用事は、いつ何をするか決めて進めることが多い。'],
  ['energy', -1, '話し合いでは、発言する前に頭の中で考えをまとめることが多い。'],
  ['information', 1, '新しい作業を始めるときは、細かな手順よりも全体の目的を先に確かめることが多い。'],
  ['decision', 1, '決まりをそのまま当てはめるか迷うときは、まず相手の事情を聞くことが多い。'],
  ['approach', 1, '進め方を途中で変えられるよう、計画に決めずにおく部分を残すことが多い。'],
  ['energy', 1, '初対面の人がいる場では、自分から話しかけることが多い。'],
  ['information', 1, '別々の人から似た困りごとを聞くと、共通する原因がないか考えることが多い。'],
  ['decision', -1, '複数の人に関わることを決めるときは、まず全員に共通する判断の基準を考えることが多い。'],
  ['approach', -1, 'やることがいくつかあるときは、取りかかる前に順番を決めることが多い。'],
];

export function createPersonalitySection(): Section {
  return {
    id: 'personality-preferences-v2', title: '性格・考え方（20問・改訂版）', kind: 'personality', order: 70, enabled: true,
    description: '普段の自然な行動を7段階で振り返る、4つの観点の設問シート。',
    questions: ITEMS.map(([axis, direction, text], index) => ({
      id: `preference-v2-${String(index + 1).padStart(2, '0')}`, text, helpText: '', answerType: 'rating',
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
      const skipped = items.filter((q) => answers[q.id] === UNSURE_ANSWER).length;
      // 判断保留を中立に換算しない。全項目を確認済みかつ有効回答3問以上で目安を表示。
      const complete = items.length >= 5 && scores.length >= 3 && scores.length + skipped === items.length;
      const average = complete ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null;
      return { ...axis, answered: scores.length, skipped, total: items.length, complete,
        position: average === null ? null : Math.round((average + 3) / 6 * 100),
        summary: average === null ? (items.length < 5 ? '集計にはこの観点の設問が5問以上必要です' : scores.length + skipped === items.length ? '判断できる回答が少ないため、傾向は表示しません' : '回答がそろうと表示します') : Math.abs(average) <= 0.5
          ? '今回の回答では、はっきりした偏りは見られません' : `${average < 0 ? axis.left : axis.right}傾向`,
      };
    }),
  };
}

export function personalityAnswerCount(set: QuestionSet, answers: Record<string, unknown>) {
  return personalityQuestions(set).filter((q) => {
    const value = answers[q.id];
    return q.answerType === 'rating' ? ratingValue(value) !== null || value === UNSURE_ANSWER
      : Array.isArray(value) ? value.length > 0 : typeof value === 'string' && Boolean(value.trim());
  }).length;
}

export function upgradePersonalityQuestions(set: QuestionSet): QuestionSet {
  if (set.questionSetId !== 'standard-life-story' || !['1.0.0', '2.0.0', '3.0.0', '4.0.0', '5.0.0'].includes(set.version)) return set;
  // 旧回答を新しい質問への回答に読み替えない。旧設問・編集内容は非表示で残す。
  return { ...set, version: '6.0.0', updatedAt: '2026-09-12T00:00:00.000Z', sections: [
    ...set.sections.map((section) => section.kind === 'personality'
      ? { ...section, enabled: false, title: section.title.includes('旧版・保存用') ? section.title : `${section.title}（旧版・保存用）` }
      : { ...section, questions: section.questions.map((q) => ({ ...q, text: refineStandardWording(q.text), helpText: refineStandardWording(q.helpText) })) }),
    ...(set.sections.some((s) => s.id === 'episode-guide') ? [] : [createEpisodeSection()]),
    createPersonalitySection(),
  ] };
}
