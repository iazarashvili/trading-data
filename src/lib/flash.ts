import type { Context } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import type { AppEnv } from '../types'

export type FlashCategory = 'success' | 'error'

export interface Flash {
  category: FlashCategory
  message: string
}

const FLASH_COOKIE = 'tj_flash'

export const success = (message: string): Flash => ({ category: 'success', message })
export const error = (message: string): Flash => ({ category: 'error', message })

function encode(flashes: Flash[]): string {
  const bytes = new TextEncoder().encode(JSON.stringify(flashes))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decode(value: string): Flash[] {
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0))
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes))
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is Flash =>
        typeof item?.message === 'string' &&
        (item.category === 'success' || item.category === 'error'),
    )
  } catch {
    return []
  }
}

/** შეტყობინებების გადატანა redirect-ის შემდეგ გვერდზე */
export function setFlashes(c: Context<AppEnv>, flashes: Flash[]): void {
  if (!flashes.length) return
  setCookie(c, FLASH_COOKIE, encode(flashes), {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: 60,
  })
}

/** წაკითხვა + წაშლა (ერთჯერადი ჩვენება) */
export function takeFlashes(c: Context<AppEnv>): Flash[] {
  const raw = getCookie(c, FLASH_COOKIE)
  if (!raw) return []
  deleteCookie(c, FLASH_COOKIE, { path: '/' })
  return decode(raw)
}
