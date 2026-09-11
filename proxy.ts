import { env } from 'cloudflare:workers';
import { NextResponse, type NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth';

type AuthBindings = {
  ADMIN_PASSWORD?: string;
  AUTH_COOKIE_SECRET?: string;
};

function isLocalRequest(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isAdminPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  // 利用者向けの5画面とAI生成APIは、パスワードなしで利用できます。
  // 設問編集とJSON確認を置く /admin 以下だけを管理者認証で保護します。
  if (!isAdminPath(pathname)) return NextResponse.next();

  const bindings = env as unknown as AuthBindings;
  const cookieSecret = bindings.AUTH_COOKIE_SECRET;
  const password = bindings.ADMIN_PASSWORD;

  if (!cookieSecret || !password) {
    if (isLocalRequest(request)) return NextResponse.next();
    return new Response('管理画面の認証設定が完了していません。', {
      status: 503,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (await verifySessionToken(token, cookieSecret)) {
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'private, no-store');
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return response;
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  const response = NextResponse.redirect(loginUrl);
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}

export const config = {
  matcher: '/:path*',
};
