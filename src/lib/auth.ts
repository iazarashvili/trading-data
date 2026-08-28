import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import type { AppEnv } from '../types'

const SESSION_COOKIE = 'tj_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30 // 30 დღე

const encoder = new TextEncoder()

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return toBase64Url(await crypto.subtle.sign('HMAC', key, encoder.encode(data)))
}

/** მუდმივ დროში შედარება — timing attack-ის თავიდან ასაცილებლად */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function isSecure(c: Context): boolean {
  return new URL(c.req.url).protocol === 'https:'
}

export async function issueSession(c: Context<AppEnv>): Promise<void> {
  const expiresAt = String(Date.now() + MAX_AGE_SECONDS * 1000)
  const token = `${expiresAt}.${await sign(c.env.SESSION_SECRET, expiresAt)}`
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure(c),
    sameSite: 'Lax',
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  })
}

export function clearSession(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE, { path: '/' })
}

async function isValidSession(secret: string, token: string): Promise<boolean> {
  const separator = token.lastIndexOf('.')
  if (separator <= 0) return false

  const expiresAt = token.slice(0, separator)
  const signature = token.slice(separator + 1)
  if (!/^\d+$/.test(expiresAt) || Number(expiresAt) < Date.now()) return false

  return safeEqual(signature, await sign(secret, expiresAt))
}

/** UI როუტების დაცვა — არაავტორიზებული მომხმარებელი გადადის /login-ზე */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE)
  if (token && (await isValidSession(c.env.SESSION_SECRET, token))) return next()

  const url = new URL(c.req.url)
  const target = url.pathname + url.search
  return c.redirect(`/login?next=${encodeURIComponent(target)}`)
})

/** პაროლის შემოწმება login ფორმიდან */
export function checkPassword(c: Context<AppEnv>, provided: string): boolean {
  const expected = c.env.AUTH_PASSWORD ?? ''
  if (!expected) return false
  return safeEqual(provided, expected)
}

/** MT5 / გარე API-ს დაცვა (SPEC სექცია 7) */
export const requireApiKey = createMiddleware<AppEnv>(async (c, next) => {
  const expected = c.env.JOURNAL_API_KEY ?? ''
  if (!expected) {
    return c.json(
      { ok: false, error: 'server misconfigured: JOURNAL_API_KEY is not set' },
      500,
    )
  }

  const provided =
    c.req.header('X-API-Key') ??
    (c.req.header('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()

  if (!provided || !safeEqual(provided, expected)) {
    return c.json({ ok: false, error: 'unauthorized' }, 401)
  }
  return next()
})
