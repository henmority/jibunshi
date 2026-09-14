import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Run the shipped pure TS modules without requiring a browser or adding a test dependency.
const episodeModule = moduleUrl('../lib/episode-guide.ts');
const wordingModule = moduleUrl('../lib/question-wording.ts');
const writingModule = moduleUrl('../lib/ai/writing-settings.ts');
const reviewModule = moduleUrl('../lib/ai/source-review.ts');
const personalityModule = moduleUrl('../lib/personality.ts', { './episode-guide': episodeModule, './question-wording': wordingModule });
const { createPersonalitySection, summarizePersonality, upgradePersonalityQuestions, ratingValue, personalityAnswerCount, personalityNoteCount, questionRatingLabels, normalizeComparison } = await import(personalityModule);
const section = createPersonalitySection();
const set = { questionSetId: 'standard-life-story', version: '7.0.0', sections: [section] };
const answersFor = (value) => Object.fromEntries(section.questions.map((q) => [q.id, value(q)]));

test('20 unique items, five per dimension with both scoring directions', () => {
  assert.equal(section.questions.length, 20);
  assert.equal(new Set(section.questions.map((q) => q.id)).size, 20);
  for (const axis of summarizePersonality(set, {}).axes) {
    const questions = section.questions.filter((q) => q.preference.axis === axis.id);
    assert.equal(questions.length, 5);
    assert.deepEqual(new Set(questions.map((q) => q.preference.direction)), new Set([-1, 1]));
  }
});
test('reverse scoring reaches the correct ends, independently of item wording direction', () => {
  for (const [direction, expected] of [[1, 100], [-1, 0]]) {
    const result = summarizePersonality(set, answersFor((q) => q.preference.direction === direction ? '7' : '1'));
    assert.ok(result.axes.every((axis) => axis.complete && axis.position === expected));
  }
});
test('neutral is balanced; skipped, malformed, or incomplete answers are not scored as neutral', () => {
  assert.ok(summarizePersonality(set, answersFor(() => '4')).axes.every((axis) => axis.position === 50 && axis.summary === '今回の回答では、はっきりした偏りは見られません'));
  assert.ok(summarizePersonality(set, {}).axes.every((axis) => axis.position === null));
  for (const invalid of ['', '0', '8', '4.5', ['4'], null, 4]) assert.equal(ratingValue(invalid), null);
  const answers = answersFor(() => '7'); delete answers['preference-v3-01'];
  assert.equal(summarizePersonality(set, answers).axes[0].complete, false);
  assert.equal(personalityAnswerCount(set, { ...answers, 'old-answer': '古い回答' }), 19);
});
test('disabled/changed answer types and invalid metadata do not silently contribute', () => {
  const modified = structuredClone(set);
  modified.sections[0].questions[0].answerType = 'long_text';
  assert.equal(summarizePersonality(modified, answersFor(() => '7')).axes[0].complete, false);
  modified.sections[0].enabled = false;
  assert.equal(personalityAnswerCount(modified, answersFor(() => '7')), 0);
});
test('migration preserves edits and archived items and is idempotent after administrator changes', () => {
  const old = { questionSetId: 'standard-life-story', version: '4.0.0', sections: [
    { id: 'profile', kind: 'theme', enabled: true, title: '編集した題名', questions: [] },
    { id: 'personality-values', kind: 'personality', enabled: true, title: '人柄', questions: [{ id: 'old', text: '編集した設問' }] },
  ] };
  const migrated = upgradePersonalityQuestions(old);
  assert.deepEqual(migrated.sections[0], old.sections[0]);
  assert.equal(migrated.sections[1].enabled, false);
  assert.equal(migrated.sections[1].questions[0].text, '編集した設問');
  assert.equal(old.sections[1].enabled, true);
  migrated.sections.find((s) => s.id === 'personality-preferences-v3').questions.pop();
  assert.equal(upgradePersonalityQuestions(migrated), migrated);
  assert.equal(upgradePersonalityQuestions({ ...old, questionSetId: 'custom' }).version, '4.0.0');
});

function moduleUrl(path, dependencies = {}) {
  const raw = readFileSync(new URL(path, import.meta.url), 'utf8');
  let compiled = ts.transpileModule(raw, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [specifier, url] of Object.entries(dependencies)) compiled = compiled.replaceAll(`'${specifier}'`, JSON.stringify(url));
  return `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
}
const loadModule = (path, dependencies) => import(moduleUrl(path, dependencies));

test('JSON roundtrip preserves explanations, and AI receives the scenario, alternatives and correct comparison meaning', async () => {
  const { createLifeStoryBundle, normalizeLifeStoryBundle } = await loadModule('../lib/life-story.ts', { './personality': personalityModule, './ai/writing-settings': writingModule });
  const initialModule = `data:text/javascript;base64,${Buffer.from(`export const initialQuestionSet = ${JSON.stringify(set)};`).toString('base64')}`;
  const { buildStorySource } = await loadModule('../lib/ai/story-prompt.ts', {
    '@/lib/personality': personalityModule, '@/lib/initial-question-set': initialModule,
    './writing-settings': writingModule, './source-review': reviewModule,
  });
  const bundle = createLifeStoryBundle({ timeline: null, story: null, questionSet: set,
    diagnosis: { schemaVersion: 1, questionSetId: set.questionSetId, questionSetVersion: set.version, answers: answersFor(() => '1'), answerNotes: { 'preference-v3-01': '仕事のあとには一人で過ごしたい。' }, selfDescription: '昔よりも自分の時間を大切にしています。', updatedAt: '' },
  });
  const restored = normalizeLifeStoryBundle({ ...JSON.parse(JSON.stringify(bundle)), personalityProfile: { fabricated: true } });
  assert.deepEqual(restored.personalityProfile, bundle.personalityProfile);
  const ai = buildStorySource(restored);
  assert.equal(ai.personalityAnswers.length, 20);
  assert.equal(ai.personalityAnswers[0].question, section.questions[0].text);
  assert.equal(ai.personalityAnswers[0].responseMeaning, 'Aにとても近い');
  assert.deepEqual(ai.personalityAnswers[0].comparison, section.questions[0].comparison);
  assert.equal(ai.personalityAnswers[0].reasoning, bundle.diagnosis.answerNotes['preference-v3-01']);
  assert.equal(ai.selfDescription, bundle.diagnosis.selfDescription);
  assert.deepEqual(restored.diagnosis.answerNotes, bundle.diagnosis.answerNotes);
  assert.deepEqual(ai.personalityProfile, bundle.personalityProfile);
  restored.diagnosis.answers = {};
  restored.diagnosis.answerNotes['old-note'] = '旧設問の回答';
  const notesOnly = buildStorySource(restored);
  assert.equal(notesOnly.personalityAnswers.length, 1);
  assert.equal(notesOnly.personalityAnswers[0].responseMeaning, '選択回答なし（自由記述のみ）');
  assert.ok(notesOnly.personalityProfile.axes.every((a) => a.position === null));
  assert.equal(personalityNoteCount(set, restored.diagnosis), 2);
});

test('unsure is counted as reviewed but excluded from scores, with at least three valid answers required', () => {
  const answers = answersFor(() => 'unsure');
  assert.equal(personalityAnswerCount(set, answers), 20);
  assert.ok(summarizePersonality(set, answers).axes.every((a) => !a.complete && a.position === null && a.skipped === 5));
  for (const id of ['01', '02', '03']) answers[`preference-v3-${id}`] = '4';
  const energy = summarizePersonality(set, answers).axes[0];
  assert.equal(energy.answered, 3);
  assert.equal(energy.skipped, 2);
  assert.equal(energy.position, 50);
});

test('version 5 migration archives old answers and preserves administrator wording, IDs and deletions', () => {
  const old = { questionSetId: 'standard-life-story', version: '5.0.0', sections: [
    { id: 'custom-section', kind: 'theme', questions: [{ id: 'custom', text: '管理者が編集した質問', helpText: '独自の補足', enabled: false }] },
    { id: 'personality-preferences', title: '旧性格', kind: 'personality', enabled: true, questions: [{ id: 'preference-01', text: '旧質問' }] },
  ] };
  const migrated = upgradePersonalityQuestions(old);
  assert.equal(migrated.version, '7.0.0');
  assert.deepEqual(migrated.sections[0], old.sections[0]);
  assert.equal(migrated.sections[1].questions[0].text, '旧質問');
  assert.equal(migrated.sections[1].enabled, false);
  assert.equal(personalityAnswerCount(migrated, { 'preference-01': '7' }), 0);
  const guide = migrated.sections.find((s) => s.id === 'episode-guide');
  guide.questions.pop(); guide.enabled = false;
  assert.equal(upgradePersonalityQuestions(migrated), migrated);
});

test('episode fields use the published editable wording, order, and visibility', async () => {
  const { createEpisodeSection, episodeGuideFields, episodeGuideQuestion } = await import(episodeModule);
  const guide = createEpisodeSection();
  const edited = { ...set, sections: [guide] };
  const q = guide.questions.find((q) => q.id === 'episode-field-scene');
  q.text = 'ご自身はどんなことをしましたか？'; q.helpText = '編集した補足'; q.order = 1;
  assert.equal(episodeGuideFields(edited)[0].question.text, q.text);
  assert.equal(episodeGuideFields(edited)[0].question.helpText, q.helpText);
  q.enabled = false;
  assert.ok(!episodeGuideFields(edited).some((f) => f.key === 'scene'));
  guide.enabled = false;
  assert.equal(episodeGuideQuestion(edited, 'episode-topic-work'), undefined);
  assert.equal(episodeGuideFields(edited).length, 0);
});

test('standard revisions soften memory demands without replacing custom edits', async () => {
  const { refineStandardWording } = await import(wordingModule);
  assert.equal(refineStandardWording('大切な人と初めて会った日のことを一つ教えてください。'), '大切な人と知り合ったころのことで、覚えている場面はありますか？');
  assert.equal(refineStandardWording('独自の質問'), '独自の質問');
});

test('all new scenarios have two distinct alternatives, while legacy rating labels remain unchanged', () => {
  for (const question of section.questions) {
    assert.ok(normalizeComparison(question.comparison));
    assert.notEqual(question.comparison.left, question.comparison.right);
    assert.equal(questionRatingLabels(question)[6], 'Bにとても近い');
  }
  assert.equal(questionRatingLabels({ ...section.questions[0], comparison: undefined })[0], 'まったく思わない');
  assert.equal(normalizeComparison({ left: ' ', right: 'B' }), undefined);
});

test('version 6 migration archives all previous personality items without reusing old answers', () => {
  const old = { ...set, version: '6.0.0', sections: [{ ...section, id: 'personality-preferences-v2', questions: [{ ...section.questions[0], id: 'preference-v2-01', text: '編集済みの旧質問' }] }] };
  const migrated = upgradePersonalityQuestions(old);
  assert.equal(migrated.sections[0].enabled, false);
  assert.equal(migrated.sections[0].questions[0].text, '編集済みの旧質問');
  assert.equal(personalityAnswerCount(migrated, { 'preference-v2-01': '7' }), 0);
  assert.equal(upgradePersonalityQuestions(migrated), migrated);
});

test('free text normalizes safely and old exports remain readable', async () => {
  const { normalizeDiagnosisData } = await loadModule('../lib/life-story.ts', { './personality': personalityModule, './ai/writing-settings': writingModule });
  const old = normalizeDiagnosisData({ schemaVersion: 1, answers: { old: '7' } });
  assert.deepEqual(old.answerNotes, {});
  assert.equal(old.selfDescription, '');
  const data = normalizeDiagnosisData({ schemaVersion: 1, answerNotes: { good: 'あ'.repeat(4500), bad: 12 }, selfDescription: 'い'.repeat(13000) });
  assert.equal(data.answerNotes.good.length, 4000);
  assert.equal(data.answerNotes.bad, undefined);
  assert.equal(data.selfDescription.length, 12000);
});
