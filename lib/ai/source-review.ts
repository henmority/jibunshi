import type { Episode, LifeStoryBundle } from '../life-story';

export function hasEpisodeContent(episode: Episode) {
  return [episode.title, episode.whenWhere, episode.people, episode.whatHappened, episode.scene, episode.feeling, episode.reflection, episode.impact].some((text) => text.trim());
}

// A conservative check of Japanese explicit dates, not a universal date parser.
// Dates mentioned in a recollection may refer to another event: ask, never mutate.
export function checkEventDates(text: string, age: number, birthDate: string) {
  const birth = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  if (!birth) return [];
  const [, by, bm, bd] = birth.map(Number);
  const references = [...text.matchAll(/(\d{4})年(?:\s*(\d{1,2})月)?(?:\s*(\d{1,2})日)?/g)].flatMap((match) => {
    const year = Number(match[1]), month = Number(match[2]) || null, day = Number(match[3]) || null;
    if (year < 1800 || year > 2200 || (month !== null && (month < 1 || month > 12)) || (day !== null && (day < 1 || day > new Date(Date.UTC(year, (month ?? 1), 0)).getUTCDate()))) return [];
    let minAge = year - by - 1, maxAge = year - by;
    if (month !== null) {
      if (month < bm) maxAge = minAge;
      else if (month > bm) minAge = maxAge;
      else if (day !== null) { if (day < bd) maxAge = minAge; else minAge = maxAge; }
    }
    return [{ statedDate: match[0], minAge, maxAge, conflictsWithEnteredAge: age < minAge || age > maxAge }];
  });
  return references.filter((reference, index) => references.findIndex((other) => other.statedDate === reference.statedDate) === index);
}

export function reviewStorySource(bundle: LifeStoryBundle) {
  const warnings: string[] = [];
  const timeline = bundle.timeline;
  if (!timeline) return { warnings, followUpQuestions: [] as string[] };
  const check = (text: string, age: number, label: string) => {
    for (const reference of checkEventDates(text, age, timeline.birthDate)) {
      if (reference.conflictsWithEnteredAge) warnings.push(`${label}：入力は${age}歳ですが、本文の${reference.statedDate}は生年月日から${reference.minAge === reference.maxAge ? reference.minAge : `${reference.minAge}〜${reference.maxAge}`}歳に相当します。どちらが出来事の時期か確認してください。原稿ではこの年齢を断定しません。`);
    }
  };
  Object.entries(timeline.eventsByAge).forEach(([age, text]) => check(text, Number(age), `${age}歳の年齢メモ`));
  const episodes = timeline.episodes.filter(hasEpisodeContent);
  episodes.forEach((episode) => check(`${episode.whenWhere}\n${episode.whatHappened}`, episode.age, episode.title || `${episode.age}歳のエピソード`));
  const emptyCount = timeline.episodes.length - episodes.length;
  if (emptyCount) warnings.push(`内容が空のエピソード${emptyCount}件は、生成資料から除きます。元のJSONは変更しません。`);
  const followUpQuestions = episodes.slice().sort((a, b) => Number(Boolean(b.feeling || b.reflection || b.impact)) - Number(Boolean(a.feeling || a.reflection || a.impact))).slice(0, 3).flatMap((episode) => {
    const label = episode.title || `${episode.age}歳の出来事`;
    const questions: string[] = [];
    if (!episode.scene.trim()) questions.push(`「${label}」について、そのとき実際にしたことや、目の前にあったものを一つ覚えていますか？ 覚えている範囲だけで構いません。`);
    if (!episode.feeling.trim()) questions.push(`「${label}」のとき、気になっていたことはありましたか？ なければ空欄で構いません。`);
    if (!episode.impact.trim()) questions.push(`「${label}」の前後で、普段することに変化はありましたか？ 変化がなければ、そのままで構いません。`);
    return questions.slice(0, 2);
  });
  return { warnings, followUpQuestions };
}

export function reviewStoryOutput(text: string, finishReason?: string) {
  const warnings: string[] = [];
  if (finishReason === 'length') warnings.push('出力上限に達しました。原稿の末尾が途切れていないか確認してください。');
  if (/^\s*(?:[-*] |\d+[.．] )/m.test(text)) warnings.push('箇条書きが含まれています。読み物として段落にできないか確認してください。');
  if (/personalityProfile|personalityAnswers|回答[1-7]|記載がない|記載されていない|資料がない/.test(text)) warnings.push('回答番号や資料の説明が本文に残っている可能性があります。');
  return warnings;
}
