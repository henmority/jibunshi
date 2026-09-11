import { env } from 'cloudflare:workers';
import { NextResponse } from 'next/server';
import {
  AUTH_COOKIE_NAME,
  AUTH_SESSION_SECONDS,
  createSessionToken,
  timingSafeEqual,
} from '@/lib/auth';

type AuthBindings = {
  ADMIN_PASSWORD?: string;
  AUTH_COOKIE_SECRET?: string;
};

export async function POST(request: Request) {
  const bindings = env as unknown as AuthBindings;
  const password = bindings.ADMIN_PASSWORD;
  const cookieSecret = bindings.AUTH_COOKIE_SECRET;

  if (!password || !cookieSecret) {
    return new Response('管理画面の認証設定が完了していません。', {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const formData = await request.formData();
  const candidate = formData.get('password');
  const requestedNext = formData.get('next');

  if (typeof candidate !== 'string' || !timingSafeEqual(candidate, password)) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('error', '1');
    if (typeof requestedNext === 'string' && requestedNext.startsWith('/') && !requestedNext.startsWith('//')) {
      loginUrl.searchParams.set('next', requestedNext);
    }
    return NextResponse.redirect(loginUrl, 303);
  }

  const nextPath = typeof requestedNext === 'string' && requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/admin';
  const response = NextResponse.redirect(new URL(nextPath, request.url), 303);
  response.cookies.set(AUTH_COOKIE_NAME, await createSessionToken(cookieSecret), {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/',
    maxAge: AUTH_SESSION_SECONDS,
  });
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
