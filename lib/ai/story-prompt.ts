import type { LifeStoryBundle } from '@/lib/life-story';
import { initialQuestionSet } from '@/lib/initial-question-set';
import { personalityQuestions, ratingValue, normalizeComparison, questionRatingLabels, summarizePersonality, UNSURE_ANSWER, UNSURE_LABEL } from '@/lib/personality';

export const STORY_PROMPT_VERSION = 'japanese-life-story-v4-scenario-reflection';
export const STORY_MODEL = '@cf/openai/gpt-oss-120b';

const TOPIC_LABELS: Record<string, string> = {
  school: '学校・学び', family: '家族', friends: '友人・出会い', home: '暮らし・場所',
  work: '仕事', health: '健康・病気', interest: '趣味・夢', challenge: '挑戦・転機', other: 'その他',
};

export function buildStorySource(bundle: LifeStoryBundle) {
  const set = bundle.questionSet ?? initialQuestionSet;
  const personalityAnswers = personalityQuestions(set).flatMap((question) => {
    const answer = bundle.diagnosis?.answers[question.id] ?? '';
    const reasoning = bundle.diagnosis?.answerNotes?.[question.id]?.trim() ?? '';
    if (!(Array.isArray(answer) ? answer.length : answer.trim()) && !reasoning) return [];
    const score = question.answerType === 'rating' ? ratingValue(answer) : null;
    const comparison = normalizeComparison(question.comparison);
    return [{ questionId: question.id, question: question.text, answer, reasoning,
      ...(question.answerType === 'rating' ? { comparison,
        responseMeaning: answer === UNSURE_ANSWER ? `${UNSURE_LABEL}。選択回答から性格を解釈しない。` : answer === '' ? '選択回答なし（自由記述のみ）' : score === null ? '無効な評価。解釈しない。' : questionRatingLabels(question)[score - 1],
        scale: comparison ? '1=Aにとても近い、4=どちらも同じくらい、7=Bにとても近い' : '1=まったく思わない、4=どちらともいえない、7=かなり思う' } : {}),
    }];
  });

  return {
    profile: {
      name: bundle.timeline?.subjectName ?? '',
      birthDate: bundle.timeline?.birthDate ?? '',
    },
    schools: bundle.timeline?.schools.map((school) => ({
      type: school.type,
      name: school.name,
      startAge: school.startAge,
      endAge: school.endAge,
    })) ?? [],
    timelineEvents: Object.entries(bundle.timeline?.eventsByAge ?? {})
      .map(([age, event]) => ({ age: Number(age), event }))
      .sort((a, b) => a.age - b.age),
    episodes: bundle.timeline?.episodes
      .map((episode) => ({
        age: episode.age,
        topic: TOPIC_LABELS[episode.topic] ?? episode.topic,
        title: episode.title,
        whenWhere: episode.whenWhere,
        people: episode.people,
        whatHappened: episode.whatHappened,
        scene: episode.scene,
        feeling: episode.feeling,
        reflection: episode.reflection,
        impact: episode.impact,
      }))
      .sort((a, b) => a.age - b.age) ?? [],
    undatedNotes: bundle.timeline?.undatedNotes ?? '',
    personalityAnswers,
    selfDescription: bundle.diagnosis?.selfDescription ?? '',
    personalityProfile: summarizePersonality(set, bundle.diagnosis?.answers ?? {}),
  };
}

export function buildStoryInstructions(additionalInstruction = '') {
  return `あなたは、日本語の人生史を執筆する熟練した編集者です。提供された資料だけを使い、本人や家族が読み返せる、温かく具体的な人生史の下書きを作成してください。

絶対に守ること:
- 資料にない出来事、年月、地名、人名、会話、感情を創作しない。
- 不明な内容をもっともらしく補わない。必要なら曖昧さを保った表現にする。
- 感情、性格、成長、その後への影響は、資料に本人の回答がある場合だけ書く。回答がない項目を推測しない。
- 一つの時期の行動から「幼い頃から」「いつも」「その後も」と生涯の傾向へ広げない。
- personalityAnswersのquestionは質問文であり、事実ではない。answerに書かれていない「ありがとうと言われた」などを、質問文から事実として取り出さない。
- 別々の回答やエピソードの間に、資料で明記されていない因果関係や時間的なつながりを作らない。
- 「今でも続いている」「土台になった」「学んだ」「自信が芽生えた」「今後も〜だろう」などは、本人の回答に同じ内容がある場合だけ使う。
- 性格や価値観は診断名として断定せず、本人の回答や行動が伝わる描写として反映する。
- 7段階は各設問のscaleとresponseMeaningに従う。comparisonがある設問はA/Bの比較で、1はA、7はBに近い。質問やA/Bの例文そのものは本人の経験ではない。旧形式の同意尺度と混同しない。
- reasoningとselfDescriptionは本人の自由記述。選択回答だけで断定せず、場面による違いや本人の説明を尊重する。数値と文章が異なる場合も勝手に矛盾を解消しない。自由記述のみの回答を無視せず、文章を数値化しない。
- personalityProfileは独自の自己理解シートの集計。正式なMBTIのタイプや確定した人格ではない。未完了の軸は解釈しない。数値を能力や確率として扱わず、今の傾向を過去の全時期に当てはめない。
- 「判断できない・経験がない」（unsure）や空欄から性格を推測しない。中央付近は偏りが明確でないだけで、両方の特性を持つとは断定しない。
- 記憶が曖昧な年月や会話を正確な日付・直接引用に変えない。成長・教訓・支えてくれた人・出来事の影響を、書かれていないのに補わない。普段の日常も大切な記録として扱う。
- 病気、家族関係、後悔などの繊細な内容を扇情的に扱わない。
- 同じ出来事を複数章で繰り返さない。
- 日本語の自然な一人称または三人称で統一する。資料から判断できなければ三人称を使う。

出力形式:
- Markdown形式。
- 先頭に「# 人生史の題名」。
- 続けて120〜220字程度の「はじめに」。
- 年代や人生の転機に沿って3〜8章に分け、各章を「## 章題」にする。
- 深掘りエピソードは、場面、人物、当時の感情、現在からの振り返りが自然につながるように書く。
- 本文は箇条書きや項目一覧にせず、読み物として自然な段落で書く。
- 最後に「## おわりに」を置き、その人らしさと未来へ残したいことを簡潔に結ぶ。
- 「おわりに」でも、本人が入力していない将来の目標や行動を提案しない。
- 人柄の選択回答は「本人は〜に近いと回答している」の範囲で紹介し、別の出来事の原因や結果にしない。
- 情報が少ない場合は短くまとめ、内容を水増ししない。
${additionalInstruction.trim() ? `\n管理者からの追加指示:\n${additionalInstruction.trim().slice(0, 4000)}` : ''}`;
}

export function buildStoryPrompt(bundle: LifeStoryBundle) {
  return `以下は人生史作成のために本人が入力した資料です。このJSONだけを根拠に、人生史の下書きを作成してください。\n\n${JSON.stringify(buildStorySource(bundle), null, 2)}`;
}
