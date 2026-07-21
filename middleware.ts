// SECTRAI admin-only gate — Vercel Edge Middleware, framework-agnostic.
export const config = { matcher: '/:path*' }

const COOKIE_NAME = 'sectrai_admin_session'
const SESSION_DAYS = 30
type EdgeEnvironment = typeof globalThis & { process?: { env?: Record<string, string | undefined> } }

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data))
  return Array.from(new Uint8Array(signature)).map((value) => value.toString(16).padStart(2, '0')).join('')
}

function timingSafeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let difference = 0
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  return difference === 0
}

async function validSession(value: string | undefined, secret: string): Promise<boolean> {
  if (!value) return false
  const [expiresRaw, signature] = value.split('.')
  const expires = Number(expiresRaw)
  if (!expiresRaw || !signature || !Number.isFinite(expires) || Date.now() > expires) return false
  return timingSafeEqual(signature, await hmac(secret, expiresRaw))
}

function loginPage(error?: string): string {
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>SECTRAI — Yönetici Girişi</title><style>:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0e16;color:#e7edf7;font:15px/1.5 system-ui,sans-serif}form{width:min(360px,90vw);padding:28px;border:1px solid #293246;border-radius:14px;background:#131a28}h1{font-size:16px;margin:0 0 18px;color:#9bb5ff}label{display:block;font-size:12px;color:#b4c0d4;margin:14px 0 6px}input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:8px;border:1px solid #3b4861;background:#0d1320;color:#e7edf7;font-size:14px}button{width:100%;margin-top:20px;padding:11px;border:0;border-radius:8px;background:linear-gradient(90deg,#709cff,#57c5b6);color:#08101d;font-weight:700;cursor:pointer}.err{margin-top:14px;padding:10px 12px;border-radius:8px;background:#3b1b25;color:#ffc0ca;font-size:13px}</style></head><body><form method="POST" action="/__admin-login"><h1>Bu alan yalnızca sahip için — giriş yapın</h1><label>E-posta</label><input type="email" name="email" required autocomplete="username"/><label>Şifre</label><input type="password" name="password" required autocomplete="current-password"/><button type="submit">Giriş yap</button>${error ? `<div class="err">${error}</div>` : ''}</form></body></html>`
}

export default async function middleware(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const environment = (globalThis as EdgeEnvironment).process?.env ?? {}
  const email = environment.ADMIN_GATE_EMAIL ?? ''
  const password = environment.ADMIN_GATE_PASSWORD ?? ''
  const secret = environment.ADMIN_GATE_SECRET ?? ''
  if (!email || !password || !secret) return new Response('Admin gate misconfigured — access denied.', { status: 503 })

  if (url.pathname === '/__admin-logout') {
    return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } })
  }
  if (url.pathname === '/__admin-login' && request.method === 'POST') {
    const form = await request.formData()
    if (!timingSafeEqual(String(form.get('email') ?? ''), email) || !timingSafeEqual(String(form.get('password') ?? ''), password)) {
      return new Response(loginPage('E-posta veya şifre yanlış.'), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8' } })
    }
    const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
    const signature = await hmac(secret, String(expires))
    return new Response(null, { status: 303, headers: { Location: '/', 'Set-Cookie': `${COOKIE_NAME}=${expires}.${signature}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_DAYS * 24 * 60 * 60}` } })
  }
  const match = (request.headers.get('cookie') ?? '').match(new RegExp(`${COOKIE_NAME}=([^;]+)`))
  if (await validSession(match?.[1], secret)) return new Response(null, { headers: { 'x-middleware-next': '1' } })
  return new Response(loginPage(), { status: 401, headers: { 'content-type': 'text/html; charset=utf-8' } })
}
