import type { QuestionSet, Section } from './initial-question-set';

export const EPISODE_SECTION_ID = 'episode-guide';
export const EPISODE_TOPICS = {
  school: { label: '学校・学び', icon: '学', hint: '先生、授業、行事、進路', prompt: '学校や学びの場で、覚えている出来事を一つ教えてください。' },
  family: { label: '家族', icon: '家', hint: '家族、親戚、身近な人', prompt: '家族や身近な人と過ごした時間で、思い出せる場面を一つ教えてください。' },
  friends: { label: '友人・出会い', icon: '友', hint: '友達、恩人、別れ', prompt: 'その人と知り合ったころや、一緒に過ごした時間で覚えている場面はありますか？' },
  home: { label: '暮らし・場所', icon: '暮', hint: '家、町、引っ越し、日常', prompt: 'このころの家や町で、よくしていたことを一つ教えてください。' },
  work: { label: '仕事・役割', icon: '仕', hint: '仕事、家事、介護、地域活動', prompt: '当時、普段どんな仕事や役割をしていましたか？' },
  health: { label: '健康・病気', icon: '健', hint: '体調、療養、日々の過ごし方', prompt: '体調の変化があったころ、日々の過ごし方で変わったことはありますか？ 書ける範囲だけで構いません。' },
  interest: { label: '趣味・好きなこと', icon: '好', hint: '楽しみ、習い事、目標', prompt: 'このころ、好きでよくしていたことは何ですか？' },
  challenge: { label: '挑戦・転機', icon: '転', hint: '選択、予定外のこと、変化', prompt: 'このころ、生活や取り組んでいたことに変化はありましたか？ 自分で決めたことでなくても構いません。' },
  other: { label: 'その他', icon: '他', hint: 'いつもの日常も、自由に', prompt: 'このころのことで、思い出せることを一つ教えてください。いつもの日常でも構いません。' },
} as const;

export const EPISODE_FIELDS = [
  { key: 'whatHappened', text: 'どんなことがありましたか？', help: '短いメモや箇条書きで十分です。いつもの日常でも構いません。', short: false },
  { key: 'whenWhere', text: 'いつごろ、どこでのことですか？', help: '「小学校の高学年ごろ、近所の公園」など。正確な年月日でなくて構いません。', short: true },
  { key: 'people', text: '関わっていた人はいますか？', help: '名前が分からなければ「近所の友人」など関係だけでも。一人での出来事なら空欄で構いません。', short: true },
  { key: 'scene', text: 'その場面で、ご自身は何をしましたか？', help: '覚えている行動を一つ。周りの反応や言葉も、思い出せれば添えてください。言葉は正確でなく内容だけで十分です。', short: false },
  { key: 'feeling', text: 'そのときの気持ちで、覚えていることはありますか？', help: 'うれしい、戸惑った、ほっとしたなど、複数でも構いません。覚えていなければ飛ばせます。', short: false },
  { key: 'reflection', text: '当時と今で、この出来事の受け止め方に違いはありますか？', help: '変わらなくても、まだ分からなくても構いません。書きたいことがあるときだけどうぞ。', short: false },
  { key: 'impact', text: 'この出来事のあと、始めたこと・やめたこと・変えたことはありますか？', help: '思い当たるものを一つ。特に変化がなければ空欄で構いません。', short: false },
  { key: 'title', text: '見出しをつけるなら、どんな言葉にしますか？', help: '例：放課後の寄り道。見出しなしでも保存できます。', short: true },
] as const;
export type EpisodeField = typeof EPISODE_FIELDS[number]['key'];

export function createEpisodeSection(): Section {
  const items = [
    ...Object.entries(EPISODE_TOPICS).map(([id, topic]) => ({ id: `episode-topic-${id}`, text: topic.prompt, help: `${topic.label}を選んだときの案内文です。`, short: true })),
    ...EPISODE_FIELDS.map((field) => ({ ...field, id: `episode-field-${field.key.toLowerCase()}` })),
  ];
  return { id: EPISODE_SECTION_ID, title: '年表・エピソードの質問', kind: 'theme', order: 65, enabled: true,
    description: '年表の話題案内と追加質問。文言・補足・表示順・表示／非表示を編集できます。入力欄の対応を保つためIDは変えないでください。',
    questions: items.map((item, index) => ({ id: item.id, text: item.text, helpText: item.help, answerType: item.short ? 'short_text' : 'long_text',
      required: false, enabled: true, order: (index + 1) * 10, tags: ['年表'], source: 'manual', reviewStatus: 'reviewed' })),
  };
}

export function episodeGuideQuestion(set: QuestionSet, id: string) {
  const section = set.sections.find((s) => s.id === EPISODE_SECTION_ID);
  if (!section?.enabled) return undefined;
  return section.questions.find((q) => q.id === id && q.enabled);
}

export function episodeGuideFields(set: QuestionSet) {
  return EPISODE_FIELDS.flatMap((field) => {
    const question = episodeGuideQuestion(set, `episode-field-${field.key.toLowerCase()}`);
    return question ? [{ ...field, question }] : [];
  }).sort((a, b) => a.question.order - b.question.order);
}
