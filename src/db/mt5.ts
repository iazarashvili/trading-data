import { nowTimestamp } from '../lib/date'
import type { Mt5Status } from '../types'

/** ბოლო live სტატუსი EA-დან (ერთი მწკრივი, `id = 1`) */
export async function getMt5Status(db: D1Database): Promise<Mt5Status | null> {
  const row = await db
    .prepare('SELECT payload, updated_at FROM mt5_status WHERE id = 1')
    .first<{ payload: string; updated_at: string }>()

  if (!row) return null

  let data: Record<string, unknown> = {}
  try {
    const parsed: unknown = JSON.parse(row.payload)
    if (parsed && typeof parsed === 'object') data = parsed as Record<string, unknown>
  } catch {
    data = {}
  }

  return { ...data, _updated_at: row.updated_at }
}

export async function saveMt5Status(
  db: D1Database,
  payload: Record<string, unknown>,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO mt5_status (id, payload, updated_at)
       VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
    )
    .bind(JSON.stringify(payload), nowTimestamp())
    .run()
}
