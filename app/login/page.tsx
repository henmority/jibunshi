import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: '管理者ログイン｜設問編集室',
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error, next } = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-mark" aria-hidden="true">史</div>
        <p className="eyebrow">JIBUNSHI STUDIO</p>
        <h1 id="login-title">設問編集室へログイン</h1>
        <p className="login-description">管理者用パスワードを入力してください。</p>

        {error === '1' ? (
          <p className="login-error" role="alert">パスワードが一致しません。もう一度お試しください。</p>
        ) : null}

        <form className="login-form" action="/api/auth/login" method="post">
          <input type="hidden" name="next" value={next?.startsWith('/') && !next.startsWith('//') ? next : '/admin'} />
          <label htmlFor="password">管理者パスワード</label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={16}
            required
            autoFocus
          />
          <button type="submit">ログイン</button>
        </form>

        <p className="login-note">ログイン状態はこのブラウザで12時間保持されます。</p>
        <Link className="login-user-link" href="/">← パスワード不要の利用者画面へ戻る</Link>
      </section>
    </main>
  );
}
