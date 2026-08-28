import { nowTimestamp } from '../lib/date'
import type { Trade, TradeInput } from '../types'

/** ყველა თვე: ბალანსის კონფიგები + ტრეიდების თვეები (SPEC სექცია 3.1) */
export async function availableMonths(db: D1Database): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT month_id FROM monthly_configs
       UNION
       SELECT DISTINCT substr(trade_datetime, 1, 7) AS month_id
       FROM trades
       WHERE length(trade_datetime) >= 7
       ORDER BY month_id DESC`,
    )
    .all<{ month_id: string }>()

  return results.map((row) => row.month_id).filter(Boolean)
}

export async function listTradesForMonth(
  db: D1Database,
  monthId: string,
  search = '',
  asset = '',
): Promise<Trade[]> {
  let sql = 'SELECT * FROM trades WHERE substr(trade_datetime, 1, 7) = ?'
  const params: unknown[] = [monthId]

  if (search) {
    sql += ' AND (asset LIKE ? OR setup LIKE ? OR conclusion LIKE ? OR direction LIKE ?)'
    const like = `%${search}%`
    params.push(like, like, like, like)
  }

  if (asset) {
    sql += ' AND asset = ?'
    params.push(asset)
  }

  sql += ' ORDER BY trade_datetime DESC, id DESC'

  const { results } = await db.prepare(sql).bind(...params).all<Trade>()
  return results
}

/** დახურული ტრეიდები ქრონოლოგიურად — equity curve-ისთვის */
export async function listClosedChronological(
  db: D1Database,
  monthId: string,
): Promise<Trade[]> {
  const { results } = await db
    .prepare(
      `SELECT * FROM trades
       WHERE substr(trade_datetime, 1, 7) = ? AND result IS NOT NULL
       ORDER BY trade_datetime ASC, id ASC`,
    )
    .bind(monthId)
    .all<Trade>()

  return results
}

export async function distinctAssets(db: D1Database, monthId: string): Promise<string[]> {
  const { results } = await db
    .prepare(
      `SELECT DISTINCT asset FROM trades
       WHERE substr(trade_datetime, 1, 7) = ?
       ORDER BY asset COLLATE NOCASE`,
    )
    .bind(monthId)
    .all<{ asset: string }>()

  return results.map((row) => row.asset)
}

export async function getTrade(db: D1Database, id: number): Promise<Trade | null> {
  return db.prepare('SELECT * FROM trades WHERE id = ?').bind(id).first<Trade>()
}

export async function findByExternalId(
  db: D1Database,
  externalId: string,
): Promise<{ id: number } | null> {
  return db
    .prepare('SELECT id FROM trades WHERE external_id = ?')
    .bind(externalId)
    .first<{ id: number }>()
}

interface InsertOptions {
  externalId?: string | null
  source?: string | null
}

export async function insertTrade(
  db: D1Database,
  input: TradeInput,
  options: InsertOptions = {},
): Promise<number> {
  const result = await db
    .prepare(
      `INSERT INTO trades (
         trade_datetime, asset, direction, entry_price, stop_loss,
         take_profit, risk_percent, risk_reward, setup, chart_link,
         emotion_open, result, conclusion, emotion_close,
         external_id, source, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.trade_datetime,
      input.asset,
      input.direction,
      input.entry_price,
      input.stop_loss,
      input.take_profit,
      input.risk_percent,
      input.risk_reward || null,
      input.setup || null,
      input.chart_link || null,
      input.emotion_open || null,
      input.result,
      input.conclusion || null,
      input.emotion_close || null,
      options.externalId || null,
      options.source || null,
      nowTimestamp(),
    )
    .run()

  return Number(result.meta.last_row_id)
}

export async function updateTrade(
  db: D1Database,
  id: number,
  input: TradeInput,
  screenshots: { screenshot: string | null; screenshot2: string | null },
): Promise<void> {
  await db
    .prepare(
      `UPDATE trades SET
         trade_datetime = ?, asset = ?, direction = ?, entry_price = ?,
         stop_loss = ?, take_profit = ?, risk_percent = ?, risk_reward = ?,
         setup = ?, chart_link = ?, emotion_open = ?, result = ?,
         conclusion = ?, emotion_close = ?, screenshot = ?, screenshot2 = ?
       WHERE id = ?`,
    )
    .bind(
      input.trade_datetime,
      input.asset,
      input.direction,
      input.entry_price,
      input.stop_loss,
      input.take_profit,
      input.risk_percent,
      input.risk_reward || null,
      input.setup || null,
      input.chart_link || null,
      input.emotion_open || null,
      input.result,
      input.conclusion || null,
      input.emotion_close || null,
      screenshots.screenshot,
      screenshots.screenshot2,
      id,
    )
    .run()
}

/** API-დან განახლება — სქრინებს არ ეხება (SPEC სექცია 7) */
export async function updateTradeFromApi(
  db: D1Database,
  id: number,
  input: TradeInput,
  source: string | null,
): Promise<void> {
  await db
    .prepare(
      `UPDATE trades SET
         trade_datetime = ?, asset = ?, direction = ?, entry_price = ?,
         stop_loss = ?, take_profit = ?, risk_percent = ?, risk_reward = ?,
         setup = ?, chart_link = ?, emotion_open = ?, result = ?,
         conclusion = ?, emotion_close = ?, source = ?
       WHERE id = ?`,
    )
    .bind(
      input.trade_datetime,
      input.asset,
      input.direction,
      input.entry_price,
      input.stop_loss,
      input.take_profit,
      input.risk_percent,
      input.risk_reward || null,
      input.setup || null,
      input.chart_link || null,
      input.emotion_open || null,
      input.result,
      input.conclusion || null,
      input.emotion_close || null,
      source,
      id,
    )
    .run()
}

export async function setScreenshots(
  db: D1Database,
  id: number,
  screenshot: string | null,
  screenshot2: string | null,
): Promise<void> {
  await db
    .prepare('UPDATE trades SET screenshot = ?, screenshot2 = ? WHERE id = ?')
    .bind(screenshot, screenshot2, id)
    .run()
}

export async function deleteTrade(db: D1Database, id: number): Promise<void> {
  await db.prepare('DELETE FROM trades WHERE id = ?').bind(id).run()
}
