import type { Question, QuestionSet, Section } from './initial-question-set';
import { createEpisodeSection } from './episode-guide';
import { refineStandardWording } from './question-wording';

export const RATING_LABELS = ['まったく思わない', '思わない', 'あまり思わない', 'どちらともいえない', 'やや思う', '思う', 'かなり思う'] as const;
export const COMPARISON_LABELS = ['Aにとても近い', 'Aに近い', 'ややAに近い', 'どちらも同じくらい', 'ややBに近い', 'Bに近い', 'Bにとても近い'] as const;
export const PERSONALITY_VERSION = 'life-preferences-v3';
export type Comparison = { left: string; right: string };
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

// 各観点5問。A/Bどちらも選べる状況を示し、良し悪しではなく選好を比較する。
// directionは「Bに近い」が集計軸の左右どちらへ寄るか。設問ごとに向きを混在させる。
const ITEMS: Array<[PreferenceAxis, -1 | 1, string, string, string]> = [
  ['energy', 1, '用事がなく、自由に過ごせる休日。今の自分が自然に選ぶのは？', '一人の時間を楽しむ', '気の合う人と一緒に過ごす'],
  ['energy', -1, '考えがまだまとまらない話題について、誰かと相談するときは？', '話しながら自分の考えを見つける', '自分の中で考えをまとめてから話す'],
  ['energy', -1, '気の合う人たちとの楽しい集まりが終わったあと、過ごしたいのは？', 'もう少し誰かと話す時間', '一人で余韻を味わう時間'],
  ['energy', 1, '好きなことが共通する人たちの集まりに参加したとき、心地よいのは？', '少人数と落ち着いて話すこと', 'いろいろな人と次々に話すこと'],
  ['energy', 1, 'うれしいことがあったとき、まずしたくなるのは？', '自分の中でじっくり喜びを味わう', '誰かに話して喜びを分かち合う'],
  ['information', 1, '初めて使う道具の説明を聞くとき、先に知りたいのは？', '実際の使い方や、操作する順番', 'どういう仕組みで、何に使えるのか'],
  ['information', -1, '新しい取り組みの話を聞いたとき、最初に気になるのは？', 'これからどんな可能性が広がるか', 'これまでにどんな実績や具体例があるか'],
  ['information', 1, '誰かの体験談を聞いたあと、頭に残りやすいのは？', 'その人が実際にしたことや言った言葉', 'その話から感じた意味や、ほかの出来事とのつながり'],
  ['information', -1, '慣れた作業を工夫するとき、まず考えやすいのは？', '今までと違うやり方を試すこと', 'うまくいった方法を少しずつ改良すること'],
  ['information', 1, '自分が知っていることを人に説明するとき、自然に話し始めるのは？', '具体的な例や、一つひとつの出来事から', '全体の要点や、たとえ話から'],
  ['decision', 1, '身近な人から悩みを打ち明けられたとき、まず頭に浮かぶのは？', '何が問題で、どんな方法が使えそうか', 'その人は今、どんな気持ちでいるのか'],
  ['decision', -1, 'みんなで決めることについて、効率のよい案と、一人の強い希望がぶつかったら？', 'その人の希望をくみ取れる案を探す', '全体にとっての利点を基準に案を比べる'],
  ['decision', 1, '特別な事情のある人に、いつもの決まりを当てはめるか迷ったときは？', 'ほかの人と同じ基準で扱うことを重視する', 'その人の事情に合わせて扱うことを重視する'],
  ['decision', -1, '大切な人と意見が違ったとき、先に確かめたくなるのは？', '相手が何を大切にして、その考えに至ったのか', 'それぞれの考えを支える理由や事実は何か'],
  ['decision', 1, '頼まれごとを断る必要があるとき、伝え方を考える出発点は？', 'できない理由と、できる範囲をはっきり伝えること', '相手がどう受け止めるかを考えて言葉を選ぶこと'],
  ['approach', 1, '自由に決められる休日の過ごし方は、どちらが落ち着きますか？', '先に予定を決めて、その流れで過ごす', 'その日になってから、したいことを選ぶ'],
  ['approach', -1, '何日かかける作業を、自分のやり方で進められるときは？', '手を動かしながら、次にすることを決める', '先に作業の順番を決めて、順に取りかかる'],
  ['approach', 1, '締め切りまで余裕のある用事に取り組むとき、普段に近いのは？', '終える日を決めて、予定に沿って進める', 'その日の状況を見ながら、進める量を決める'],
  ['approach', -1, '予定のある日に、別の魅力的な誘いが来たとき、気持ちが向くのは？', '予定を組み替えて、新しい誘いを取り入れる', '先に決めた予定を大切にして、別の機会を探す'],
  ['approach', 1, 'どちらもよさそうな候補があり、決めるまでまだ時間があるときは？', '早めに一つに決めて、準備に移る', 'しばらく候補を残して、判断する材料を増やす'],
];

export function createPersonalitySection(): Section {
  return {
    id: 'personality-preferences-v3', title: '性格・考え方（場面比較20問）', kind: 'personality', order: 70, enabled: true,
    description: '同じ場面のA/Bを7段階で比較し、選んだ理由も自由に記録します。',
    questions: ITEMS.map(([axis, direction, text, left, right], index) => ({
      id: `preference-v3-${String(index + 1).padStart(2, '0')}`, text, helpText: '', answerType: 'rating', comparison: { left, right },
      required: false, order: (index + 1) * 10, tags: ['考え方', AXES.find((item) => item.id === axis)!.title],
      enabled: true, source: 'manual', reviewStatus: 'reviewed', preference: { axis, direction },
      intent: '普段の選好を振り返る独自設問。能力や優劣、固定的な性格タイプは判定しない。',
    })),
  };
}

export function normalizeComparison(value: unknown): Comparison | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const c = value as Comparison;
  return typeof c.left === 'string' && c.left.trim() && typeof c.right === 'string' && c.right.trim()
    ? { left: c.left.slice(0, 160), right: c.right.slice(0, 160) } : undefined;
}

export function questionRatingLabels(question: Question) {
  return question.answerType === 'rating' && normalizeComparison(question.comparison) ? COMPARISON_LABELS : RATING_LABELS;
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
    scale: '設問ごとの回答ラベルを参照。A/B比較は1=A、4=同程度、7=B。旧形式は1=不同意、7=同意。',
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

export function personalityNoteCount(set: QuestionSet, diagnosis: { answerNotes?: Record<string, string>; selfDescription?: string } | null | undefined) {
  return personalityQuestions(set).filter((q) => diagnosis?.answerNotes?.[q.id]?.trim()).length + (diagnosis?.selfDescription?.trim() ? 1 : 0);
}

export function upgradePersonalityQuestions(set: QuestionSet): QuestionSet {
  if (set.questionSetId !== 'standard-life-story' || !['1.0.0', '2.0.0', '3.0.0', '4.0.0', '5.0.0', '6.0.0'].includes(set.version)) return set;
  // 旧回答を新しい質問への回答に読み替えない。旧設問・編集内容は非表示で残す。
  return { ...set, version: '7.0.0', updatedAt: '2026-09-12T00:00:00.000Z', sections: [
    ...set.sections.map((section) => section.kind === 'personality'
      ? { ...section, enabled: false, title: section.title.includes('旧版・保存用') ? section.title : `${section.title}（旧版・保存用）` }
      : { ...section, questions: section.questions.map((q) => ({ ...q, text: refineStandardWording(q.text), helpText: refineStandardWording(q.helpText) })) }),
    ...(set.sections.some((s) => s.id === 'episode-guide') ? [] : [createEpisodeSection()]),
    createPersonalitySection(),
  ] };
}
