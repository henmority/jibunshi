/* eslint-disable @next/next/no-html-link-for-pages -- Vinext production navigation crashes when next/link initializes RSC prefetch. */

import type { ReactNode } from 'react';

type FlowStep = 'home' | 'timeline' | 'diagnosis' | 'story' | 'book';

const FLOW_LINKS: Array<{ id: Exclude<FlowStep, 'home'>; number: string; label: string; href: string }> = [
  { id: 'timeline', number: '1・2', label: '人生年表', href: '/timeline' },
  { id: 'diagnosis', number: '3', label: '性格・考え方', href: '/diagnosis' },
  { id: 'story', number: '4', label: 'AIで原稿作成', href: '/story' },
  { id: 'book', number: '5', label: '印刷・PDF', href: '/book' },
];

export function FlowHeader({ active, actions }: { active: FlowStep; actions?: ReactNode }) {
  return (
    <header className="flow-header">
      <a className="flow-brand" href="/" aria-label="自分史づくりの進行画面へ戻る">
        <span aria-hidden="true">史</span>
        <div><small>人生の記録</small><strong>わたしの自分史</strong></div>
      </a>
      <nav className="flow-nav" aria-label="自分史づくりの手順">
        {FLOW_LINKS.map((step) => (
          <a className={active === step.id ? 'active' : ''} aria-current={active === step.id ? 'page' : undefined} href={step.href} key={step.id}>
            <small>{step.number}</small><span>{step.label}</span>
          </a>
        ))}
      </nav>
      {actions ? <div className="flow-header-actions">{actions}</div> : <a className="flow-home-link" href={active === 'home' ? '/admin' : '/'}>
        {active === 'home' ? '管理者はこちら' : '進み具合を見る'}
      </a>}
    </header>
  );
}
