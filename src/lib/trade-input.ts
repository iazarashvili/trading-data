import type { TradeInput } from '../types'
import { normalizeDateTime } from './date'

/** ცარიელი ან არარიცხვითი მნიშვნელობა -> `null` (და არა `0`) */
export function floatOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  if (text === '') return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

const text = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim()

/** `<form>`-იდან */
export function parseTradeForm(form: FormData): TradeInput {
  return {
    trade_datetime: normalizeDateTime(text(form.get('trade_datetime'))),
    asset: text(form.get('asset')),
    direction: text(form.get('direction')),
    entry_price: floatOrNull(form.get('entry_price')),
    stop_loss: floatOrNull(form.get('stop_loss')),
    take_profit: floatOrNull(form.get('take_profit')),
    risk_percent: floatOrNull(form.get('risk_percent')),
    risk_reward: text(form.get('risk_reward')),
    setup: text(form.get('setup')),
    chart_link: text(form.get('chart_link')),
    result: floatOrNull(form.get('result')),
    conclusion: text(form.get('conclusion')),
  }
}

/** MT5-ის BUY/SELL -> ჟურნალის Long/Short */
const DIRECTION_MAP: Record<string, string> = {
  BUY: 'Long',
  SELL: 'Short',
  LONG: 'Long',
  SHORT: 'Short',
}

function normalizeDirection(value: unknown): string {
  const raw = text(value)
  return DIRECTION_MAP[raw.toUpperCase()] ?? raw
}

export interface ApiTradePayload extends TradeInput {
  external_id: string
  source: string
}

/**
 * MT5 / გარე webhook-ის JSON.
 * ველების ალიასები: symbol->asset, sl->stop_loss, profit->result და ა.შ.
 * (SPEC სექცია 7)
 */
export function parseTradeJson(body: Record<string, unknown>): ApiTradePayload {
  const pick = (...keys: string[]): unknown => {
    for (const key of keys) {
      const value = body[key]
      if (value !== undefined && value !== null && value !== '') return value
    }
    return undefined
  }

  return {
    trade_datetime: normalizeDateTime(text(pick('trade_datetime', 'time'))),
    asset: text(pick('asset', 'symbol')),
    direction: normalizeDirection(body.direction),
    entry_price: floatOrNull(pick('entry_price', 'entry')),
    stop_loss: floatOrNull(pick('stop_loss', 'sl')),
    take_profit: floatOrNull(pick('take_profit', 'tp')),
    risk_percent: floatOrNull(body.risk_percent),
    risk_reward: text(pick('risk_reward', 'rr')),
    setup: text(body.setup),
    chart_link: text(body.chart_link),
    result: floatOrNull(pick('result', 'profit')),
    conclusion: text(pick('conclusion', 'comment')),
    external_id: text(pick('external_id', 'deal_id')),
    source: text(body.source) || 'mt5',
  }
}

/** სავალდებულო ველების შემოწმება (SPEC სექცია 4) */
export function validateTrade(input: TradeInput): string[] {
  const errors: string[] = []

  if (!input.trade_datetime) errors.push('თარიღი და დრო სავალდებულოა.')
  if (!input.asset) errors.push('აქტივი სავალდებულოა.')
  if (input.direction !== 'Long' && input.direction !== 'Short') {
    errors.push('აირჩიეთ მიმართულება (Long/Short).')
  }
  if (input.entry_price === null) errors.push('შესვლის ფასი სავალდებულოა.')

  return errors
}
