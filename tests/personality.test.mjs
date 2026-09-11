import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Pure scoring/migration logic has only type imports, so run the shipped TS without a browser.
const source = readFileSync(new URL('../lib/personality.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const personalityModule = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
const { createPersonalitySection, summarizePersonality, upgradePersonalityQuestions, ratingValue, personalityAnswerCount } = await import(personalityModule);
const section = createPersonalitySection();
const set = { questionSetId: 'standard-life-story', version: '5.0.0', sections: [section] };
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
  assert.ok(summarizePersonality(set, answersFor(() => '4')).axes.every((axis) => axis.position === 50 && axis.summary === '両方の傾向が見られます'));
  assert.ok(summarizePersonality(set, {}).axes.every((axis) => axis.position === null));
  for (const invalid of ['', '0', '8', '4.5', ['4'], null, 4]) assert.equal(ratingValue(invalid), null);
  const answers = answersFor(() => '7'); delete answers['preference-01'];
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
  migrated.sections[2].questions.pop();
  assert.equal(upgradePersonalityQuestions(migrated), migrated);
  assert.equal(upgradePersonalityQuestions({ ...old, questionSetId: 'custom' }).version, '4.0.0');
});

async function loadModule(path, dependencies) {
  const raw = readFileSync(new URL(path, import.meta.url), 'utf8');
  let compiled = ts.transpileModule(raw, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  for (const [specifier, url] of Object.entries(dependencies)) compiled = compiled.replaceAll(`'${specifier}'`, JSON.stringify(url));
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
}

test('JSON roundtrip recomputes profile, and AI receives question wording plus disagreement meaning', async () => {
  const { createLifeStoryBundle, normalizeLifeStoryBundle } = await loadModule('../lib/life-story.ts', { './personality': personalityModule });
  const initialModule = `data:text/javascript;base64,${Buffer.from(`export const initialQuestionSet = ${JSON.stringify(set)};`).toString('base64')}`;
  const { buildStorySource } = await loadModule('../lib/ai/story-prompt.ts', {
    '@/lib/personality': personalityModule, '@/lib/initial-question-set': initialModule,
  });
  const bundle = createLifeStoryBundle({ timeline: null, story: null, questionSet: set,
    diagnosis: { schemaVersion: 1, questionSetId: set.questionSetId, questionSetVersion: set.version, answers: answersFor(() => '1'), updatedAt: '' },
  });
  const restored = normalizeLifeStoryBundle({ ...JSON.parse(JSON.stringify(bundle)), personalityProfile: { fabricated: true } });
  assert.deepEqual(restored.personalityProfile, bundle.personalityProfile);
  const ai = buildStorySource(restored);
  assert.equal(ai.personalityAnswers.length, 20);
  assert.equal(ai.personalityAnswers[0].question, section.questions[0].text);
  assert.equal(ai.personalityAnswers[0].responseMeaning, 'まったく思わない');
  assert.deepEqual(ai.personalityProfile, bundle.personalityProfile);
});
