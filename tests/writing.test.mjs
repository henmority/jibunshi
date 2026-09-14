import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

function moduleUrl(path, dependencies = {}) {
  let code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [specifier, url] of Object.entries(dependencies)) code = code.replaceAll(`'${specifier}'`, JSON.stringify(url));
  return `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
}
const settingsUrl = moduleUrl('../lib/ai/writing-settings.ts');
const reviewUrl = moduleUrl('../lib/ai/source-review.ts');
const { normalizeWritingSettings, DEFAULT_WRITING_SETTINGS } = await import(settingsUrl);
const { checkEventDates, hasEpisodeContent, reviewStorySource, reviewStoryOutput } = await import(reviewUrl);
const personalityUrl = moduleUrl('../lib/personality.ts', { './episode-guide': moduleUrl('../lib/episode-guide.ts'), './question-wording': moduleUrl('../lib/question-wording.ts') });
const initialUrl = `data:text/javascript;base64,${Buffer.from('export const initialQuestionSet = {sections: []};').toString('base64')}`;
const { buildStoryInstructions, buildStorySource } = await import(moduleUrl('../lib/ai/story-prompt.ts', { './writing-settings': settingsUrl, './source-review': reviewUrl, '@/lib/personality': personalityUrl, '@/lib/initial-question-set': initialUrl }));
const { normalizeStoryDraft } = await import(moduleUrl('../lib/life-story.ts', { './personality': personalityUrl, './ai/writing-settings': settingsUrl }));
const emptyEpisode = { id: 'empty', age: 4, topic: 'friends', title: '', whenWhere: '', people: '', whatHappened: '', scene: '', feeling: '', reflection: '', impact: '', createdAt: '' };
// Synthetic fixture only. No personal JSON is committed or sent to a model.
const bundle = { timeline: { birthDate: '1980-04-12', subjectName: '試験用の人物', schools: [], eventsByAge: { 29: '2009年10月11日、子どもが生まれた。' }, episodes: [emptyEpisode, { ...emptyEpisode, id: 'blog', age: 35, title: '記録を始めた', whenWhere: '2013年9月', feeling: '自分も試したいと思った。', reflection: '続けてよかった。' }], undatedNotes: '' }, diagnosis: null, questionSet: { sections: [] }, story: { content: '古い原稿の架空の事実' } };

test('settings accept only supported values and bound numeric cost controls', () => {
  assert.deepEqual(normalizeWritingSettings(null), DEFAULT_WRITING_SETTINGS);
  assert.deepEqual(normalizeWritingSettings([]), DEFAULT_WRITING_SETTINGS);
  const value = normalizeWritingSettings({ voice: 'invent', targetCharacters: 999999, temperature: -1 });
  assert.equal(value.voice, 'third'); assert.equal(value.targetCharacters, 5000); assert.equal(value.temperature, 0);
  assert.equal(normalizeWritingSettings({ temperature: NaN }).temperature, 0.35);
});
test('date checks respect birthday, month precision and year precision', () => {
  assert.equal(checkEventDates('2013年9月', 35, '1980-04-12')[0].minAge, 33);
  assert.equal(checkEventDates('2013年4月11日', 32, '1980-04-12')[0].conflictsWithEnteredAge, false);
  assert.equal(checkEventDates('2013年4月12日', 33, '1980-04-12')[0].conflictsWithEnteredAge, false);
  assert.equal(checkEventDates('2013年4月', 32, '1980-04-12')[0].conflictsWithEnteredAge, false);
  assert.equal(checkEventDates('2013年', 33, '1980-04-12')[0].conflictsWithEnteredAge, false);
  assert.deepEqual(checkEventDates('9月', 35, '1980-04-12'), []);
  assert.deepEqual(checkEventDates('2013年2月31日', 32, '1980-04-12'), []);
});
test('source checks exclude blank episodes, retain timeline events and never use old AI prose', () => {
  const before = JSON.stringify(bundle);
  assert.equal(hasEpisodeContent(emptyEpisode), false);
  assert.equal(hasEpisodeContent({ ...emptyEpisode, title: '一つの事実' }), true);
  const source = buildStorySource(bundle);
  assert.equal(source.episodes.length, 1);
  assert.equal(source.timelineEvents.length, 1);
  assert.equal(source.episodes[0].dateCheck[0].conflictsWithEnteredAge, true);
  assert.ok(!JSON.stringify(source).includes('古い原稿の架空の事実'));
  assert.equal(JSON.stringify(bundle), before);
  const review = reviewStorySource(bundle);
  assert.equal(review.warnings.length, 2);
  assert.match(review.warnings[0], /33歳/);
  assert.ok(review.followUpQuestions.length > 0);
});
test('every narrative control affects instructions and factual guardrails remain fixed', () => {
  const standard = buildStoryInstructions();
  for (const [key, value] of Object.entries({ voice: 'first', tone: 'plain', opening: 'chronological', emphasis: 'family', personality: 'omit', quotations: 'none', targetCharacters: 3500 })) {
    const edited = buildStoryInstructions('', { [key]: value });
    assert.notEqual(edited, standard);
    assert.match(edited, /資料にない出来事、年月、地名、人名、会話、感情を創作しない/);
  }
  assert.match(standard, /timelineEventsとepisodesの両方/);
  assert.match(standard, /作業過程は出力しない/);
  assert.match(standard, /回答番号・点数を出さない/);
});
test('draft settings and warnings survive JSON export and legacy drafts remain valid', () => {
  const draft = normalizeStoryDraft(JSON.parse(JSON.stringify({ schemaVersion: 1, content: '本文', writingSettings: { voice: 'first' }, editorialWarnings: ['要確認', null, 42] })));
  assert.equal(draft.writingSettings.voice, 'first'); assert.deepEqual(draft.editorialWarnings, ['要確認']);
  assert.equal(normalizeStoryDraft({ schemaVersion: 1, content: '以前の原稿' }).writingSettings, undefined);
});
test('simple output review flags lists, leaked source labels and truncation, not clean prose', () => {
  assert.deepEqual(reviewStoryOutput('# 記録\n\n試験用の本文です。', 'stop'), []);
  assert.equal(reviewStoryOutput('- 回答5 personalityProfile', 'length').length, 3);
});
