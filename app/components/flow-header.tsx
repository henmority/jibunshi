import Link from 'next/link';

type FlowStep = 'home' | 'timeline' | 'diagnosis' | 'story' | 'book';

const FLOW_LINKS: Array<{ id: Exclude<FlowStep, 'home'>; number: string; label: string; href: string }> = [
  { id: 'timeline', number: '1・2', label: '人生年表', href: '/timeline' },
  { id: 'diagnosis', number: '3', label: '性格・考え方', href: '/diagnosis' },
  { id: 'story', number: '4', label: 'AIで原稿作成', href: '/story' },
  { id: 'book', number: '5', label: '印刷・PDF', href: '/book' },
];

export function FlowHeader({ active }: { active: FlowStep }) {
  return (
    <header className="flow-header">
      <Link className="flow-brand" href="/" aria-label="自分史づくりの進行画面へ戻る">
        <span aria-hidden="true">史</span>
        <div><small>JIBUNSHI STUDIO</small><strong>わたしの自分史</strong></div>
      </Link>
      <nav className="flow-nav" aria-label="自分史づくりの手順">
        {FLOW_LINKS.map((step) => (
          <Link className={active === step.id ? 'active' : ''} href={step.href} key={step.id}>
            <small>STEP {step.number}</small><span>{step.label}</span>
          </Link>
        ))}
      </nav>
      <Link className="flow-home-link" href={active === 'home' ? '/admin' : '/'}>
        {active === 'home' ? '管理者はこちら' : '進み具合を見る'}
      </Link>
    </header>
  );
}
