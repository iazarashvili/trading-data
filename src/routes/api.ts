import { Hono } from 'hono'
import { getMt5Status, saveMt5Status } from '../db/mt5'
import { findByExternalId, insertTrade, updateTradeFromApi } from '../db/trades'
import { requireApiKey } from '../lib/auth'
import { parseTradeJson, validateTrade } from '../lib/trade-input'
import type { AppEnv } from '../types'

export const api = new Hono<AppEnv>()

/** ჯანმრთელობის შემოწმება — გასაღების გარეშე */
api.get('/health', (c) => c.json({ ok: true, service: 'trading-journal' }))

api.use('/trades', requireApiKey)
api.use('/mt5/*', requireApiKey)

/** MT5 / webhook — დახურული ტრეიდის შექმნა ან განახლება `external_id`-ით */
api.post('/trades', async (c) => {
  const body = await c.req.json<unknown>().catch(() => null)
  const isObject = Boolean(body) && typeof body === 'object' && !Array.isArray(body)
  const payload = parseTradeJson(isObject ? (body as Record<string, unknown>) : {})
  const errors = validateTrade(payload)

  if (errors.length) return c.json({ ok: false, errors }, 400)

  if (payload.external_id) {
    const existing = await findByExternalId(c.env.DB, payload.external_id)
    if (existing) {
      await updateTradeFromApi(c.env.DB, existing.id, payload, payload.source)
      return c.json({ ok: true, id: existing.id, updated: true })
    }
  }

  const id = await insertTrade(c.env.DB, payload, {
    externalId: payload.external_id || null,
    source: payload.source,
  })

  return c.json({ ok: true, id, updated: false }, 201)
})

/** EA-ს live heartbeat (ბალანსი, equity, რეჟიმი და ა.შ.) */
api.post('/mt5/status', async (c) => {
  const body = await c.req.json<unknown>().catch(() => null)

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return c.json({ ok: false, error: 'JSON object required' }, 400)
  }

  await saveMt5Status(c.env.DB, body as Record<string, unknown>)
  return c.json({ ok: true })
})

api.get('/mt5/status', async (c) => {
  const status = await getMt5Status(c.env.DB)
  return c.json({ ok: true, status })
})
