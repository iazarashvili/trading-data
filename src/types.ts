/** Cloudflare bindings + საიდუმლოები (იხ. wrangler.toml და .dev.vars) */
export interface Env {
  DB: D1Database
  BUCKET: R2Bucket
  /** ჟურნალში შესასვლელი პაროლი */
  AUTH_PASSWORD: string
  /** სესიის cookie-ს ხელმოწერის გასაღები */
  SESSION_SECRET: string
  /** MT5 / გარე API-ს გასაღები */
  JOURNAL_API_KEY: string
}

export type AppEnv = { Bindings: Env }

export type Direction = 'Long' | 'Short'

/** `trades` ცხრილის მწკრივი */
export interface Trade {
  id: number
  trade_datetime: string
  asset: string
  direction: Direction
  entry_price: number
  stop_loss: number | null
  take_profit: number | null
  risk_percent: number | null
  risk_reward: string | null
  setup: string | null
  chart_link: string | null
  result: number | null
  conclusion: string | null
  screenshot: string | null
  screenshot2: string | null
  external_id: string | null
  source: string | null
  created_at: string
}

/** ფორმიდან ან API-დან მიღებული (ჯერ არავალიდირებული) მონაცემები */
export interface TradeInput {
  trade_datetime: string
  asset: string
  direction: string
  entry_price: number | null
  stop_loss: number | null
  take_profit: number | null
  risk_percent: number | null
  risk_reward: string
  setup: string
  chart_link: string
  result: number | null
  conclusion: string
}

/** ფორმის მდგომარეობა ხელახლა დახატვისას (შეცდომის შემდეგ) */
export interface TradeFormState extends TradeInput {
  id?: number
  screenshot?: string | null
  screenshot2?: string | null
}

export interface MonthlyStats {
  total_pnl: number
  final_balance: number | null
  growth_pct: number | null
  win_rate: number
  trade_count: number
  closed_count: number
  win_count: number
  loss_count: number
  breakeven_count: number
  avg_win: number | null
  avg_loss: number | null
  has_balance: boolean
}

export interface ChartSeries {
  labels: string[]
  values: number[]
}

export interface Mt5Status {
  [key: string]: unknown
  _updated_at: string
}
