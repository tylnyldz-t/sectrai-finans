// SECTRAI owner-only gate — shared Vercel Edge Middleware contract.
// ADMIN_GATE_EMAIL, ADMIN_GATE_PASSWORD and ADMIN_GATE_SECRET are required.
// Credential rotation invalidates existing sessions; no credential is exposed
// to the browser beyond the authenticated administrator's display email.

export const config = { matcher: '/:path*' };

const COOKIE_NAME = 'sectrai_admin_session';
const COOKIE_VERSION = 'v2';
const SESSION_DAYS = 30;
const SESSION_SECONDS = SESSION_DAYS * 24 * 60 * 60;

type EdgeEnvironment = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(data),
  );
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function sessionPayload(
  expiresRaw: string,
  email: string,
  password: string,
): string {
  return `${COOKIE_VERSION}\0${expiresRaw}\0${email}\0${password}`;
}

async function createSession(
  email: string,
  password: string,
  secret: string,
): Promise<string> {
  const expiresRaw = String(Date.now() + SESSION_SECONDS * 1000);
  const signature = await hmac(
    secret,
    sessionPayload(expiresRaw, email, password),
  );
  return `${COOKIE_VERSION}.${expiresRaw}.${signature}`;
}

async function validSession(
  cookieValue: string | undefined,
  email: string,
  password: string,
  secret: string,
): Promise<boolean> {
  if (!cookieValue) return false;
  const [version, expiresRaw, signature, extra] = cookieValue.split('.');
  if (
    version !== COOKIE_VERSION
    || !expiresRaw
    || !signature
    || extra !== undefined
  ) {
    return false;
  }
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
  const expected = await hmac(
    secret,
    sessionPayload(expiresRaw, email, password),
  );
  return timingSafeEqual(signature, expected);
}

function readCookie(request: Request): string | undefined {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`),
  );
  return match?.[1];
}

function clearSessionCookie(response: Response): void {
  response.headers.append(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  );
}

function noStoreHeaders(contentType: string): Record<string, string> {
  return {
    'cache-control': 'no-store, max-age=0',
    'content-type': contentType,
    'referrer-policy': 'no-referrer',
  };
}

function loginPage(error?: string): string {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>SECTRAI — Yönetici Girişi</title>
<style>
  :root{color-scheme:dark light}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0a10;color:#e8e6f0;font:15px/1.5 system-ui,sans-serif}
  form{width:min(360px,90vw);padding:28px;border:1px solid #2a2735;border-radius:14px;background:#141220}
  h1{font-size:16px;margin:0 0 18px;font-weight:600;color:#c9c2ff}
  label{display:block;font-size:12px;color:#9a94b3;margin:14px 0 6px}
  input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #38344a;background:#0e0c16;color:#e8e6f0;font-size:14px}
  button{width:100%;margin-top:20px;padding:11px;border:0;border-radius:8px;background:linear-gradient(90deg,#7c5cff,#4fd3c4);color:#0b0a10;font-weight:700;cursor:pointer}
  .err{margin-top:14px;padding:10px 12px;border-radius:8px;background:#3a1520;color:#ffb4c2;font-size:13px}
</style></head><body>
<form method="POST" action="/__admin-login">
  <h1>Bu alan yalnızca sahip için — giriş yapın</h1>
  <label for="admin-email">E-posta</label>
  <input id="admin-email" type="email" name="email" required autocomplete="username"/>
  <label for="admin-password">Şifre</label>
  <input id="admin-password" type="password" name="password" required autocomplete="current-password"/>
  <button type="submit">Giriş yap</button>
  ${error ? `<div class="err">${error}</div>` : ''}
</form></body></html>`;
}

function loginResponse(error?: string): Response {
  return new Response(loginPage(error), {
    status: 401,
    headers: noStoreHeaders('text/html; charset=utf-8'),
  });
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const environment = (globalThis as EdgeEnvironment).process?.env ?? {};
  const email = environment.ADMIN_GATE_EMAIL ?? '';
  const password = environment.ADMIN_GATE_PASSWORD ?? '';
  const secret = environment.ADMIN_GATE_SECRET ?? '';

  if (!email || !password || !secret) {
    return new Response('Admin gate misconfigured — access denied.', {
      status: 503,
      headers: noStoreHeaders('text/plain; charset=utf-8'),
    });
  }

  if (url.pathname === '/__admin-login' && request.method === 'POST') {
    const form = await request.formData();
    const submittedEmail = String(form.get('email') ?? '');
    const submittedPassword = String(form.get('password') ?? '');
    if (
      timingSafeEqual(submittedEmail, email)
      && timingSafeEqual(submittedPassword, password)
    ) {
      const session = await createSession(email, password, secret);
      const response = new Response(null, {
        status: 303,
        headers: { Location: '/' },
      });
      response.headers.append(
        'Set-Cookie',
        `${COOKIE_NAME}=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`,
      );
      return response;
    }
    return loginResponse('E-posta veya şifre yanlış.');
  }

  if (url.pathname === '/__admin-logout') {
    if (request.method !== 'POST') {
      return new Response(null, {
        status: 405,
        headers: {
          Allow: 'POST',
          'cache-control': 'no-store, max-age=0',
        },
      });
    }
    const response = new Response(null, {
      status: 303,
      headers: { Location: '/' },
    });
    clearSessionCookie(response);
    return response;
  }

  const authenticated = await validSession(
    readCookie(request),
    email,
    password,
    secret,
  );

  if (url.pathname === '/__admin-session') {
    if (request.method !== 'GET') {
      return new Response(null, {
        status: 405,
        headers: {
          Allow: 'GET',
          'cache-control': 'no-store, max-age=0',
        },
      });
    }
    if (!authenticated) {
      return Response.json(
        { authenticated: false },
        {
          status: 401,
          headers: noStoreHeaders('application/json; charset=utf-8'),
        },
      );
    }
    return Response.json(
      {
        authenticated: true,
        email,
        name: 'Sectrai Yönetici',
        platformRole: 'ADMIN',
      },
      { headers: noStoreHeaders('application/json; charset=utf-8') },
    );
  }

  if (authenticated) {
    return new Response(null, { headers: { 'x-middleware-next': '1' } });
  }

  return loginResponse();
}
