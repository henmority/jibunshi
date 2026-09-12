'use client';

import { useState } from 'react';
import type { QuestionSet } from '@/lib/initial-question-set';
import type { Episode } from '@/lib/life-story';
import { episodeGuideFields, type EpisodeField } from '@/lib/episode-guide';

export function EpisodeInterview({ episode, questionSet, onChange }: {
  episode: Episode; questionSet: QuestionSet; onChange: (patch: Partial<Episode>) => void;
}) {
  const [step, setStep] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const fields = episodeGuideFields(questionSet);
  const main = fields.find((f) => f.key === 'whatHappened');
  const extra = fields.filter((f) => f.key !== 'whatHappened');
  const current = extra[step];
  const filled = extra.filter((f) => episode[f.key].trim()).length;

  function input(field: typeof fields[number]) {
    const id = `episode-answer-${field.key}`;
    return <div className="episode-interview-field">
      <label htmlFor={id}>{field.question.text}</label>
      <p id={`${id}-help`}>{field.question.helpText}</p>
      {field.short
        ? <input id={id} aria-describedby={`${id}-help`} value={episode[field.key]} onChange={(e) => onChange({ [field.key]: e.target.value } as Partial<Record<EpisodeField, string>>)} />
        : <textarea id={id} aria-describedby={`${id}-help`} rows={4} value={episode[field.key]} onChange={(e) => onChange({ [field.key]: e.target.value } as Partial<Record<EpisodeField, string>>)} />}
    </div>;
  }

  return <>
    <div className="episode-form-section">
      <div className="episode-section-title"><span>1</span><div><strong>まずは短いメモから</strong><small>すべて任意です。このメモだけで年表に戻れます</small></div></div>
      {main ? input(main) : <p>出来事メモの設問は管理者が非表示にしています。以前の入力内容は保持されます。</p>}
    </div>
    {extra.length ? <div className="episode-form-section">
      <button type="button" className="button secondary" aria-expanded={expanded} aria-controls="episode-optional-questions" onClick={() => setExpanded(!expanded)}>
        {expanded ? '追加の質問を閉じる' : 'もう少し書き足す（任意）'}{filled ? `・${filled}項目入力済み` : ''}
      </button>
      {expanded ? <div id="episode-optional-questions" className="episode-optional-questions">
        <p>一問ずつ、思い出せるところだけで構いません。飛ばしても入力済みの文章は消えません。</p>
        {current ? <>
          <p className="episode-step-indicator" aria-live="polite">追加の質問 {step + 1} / {extra.length}：{current.question.text}</p>
          {input(current)}
          <div className="episode-step-actions">
            <button type="button" className="button secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>前の質問</button>
            <button type="button" className="button primary" onClick={() => setStep(step + 1)}>{step === extra.length - 1 ? 'ここまで確認した' : '次の質問'}</button>
          </div>
          <div className="episode-skip-actions"><span>答えなくても進めます：</span>
            <button type="button" onClick={() => setStep(step + 1)}>覚えていない</button>
            <button type="button" onClick={() => setStep(step + 1)}>今回は書かない</button>
          </div>
        </> : <div className="episode-interview-complete" role="status"><h3>書き足しはここまでです</h3><p>入力内容は自動保存されます。意味や教訓を無理にまとめる必要はありません。</p><button type="button" className="button secondary" onClick={() => setStep(0)}>追加の質問を見直す</button></div>}
      </div> : null}
    </div> : null}
  </>;
}
