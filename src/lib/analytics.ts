import type { ChartSeries, MonthlyStats, Trade } from '../types'
import { displayDateTime } from './date'

const round2 = (n: number): number => Math.round(n * 100) / 100

/**
 * თვიური სტატისტიკა (SPEC სექცია 3.4).
 * დახურულად ითვლება ტრეიდი, რომელსაც `result` აქვს (`NULL` = ღია).
 */
export function computeMonthlyStats(
  trades: Trade[],
  startingBalance: number | null,
): MonthlyStats {
  const closed = trades.filter((t) => t.result !== null && t.result !== undefined)
  const wins = closed.filter((t) => (t.result as number) > 0)
  const losses = closed.filter((t) => (t.result as number) < 0)
  const breakeven = closed.filter((t) => (t.result as number) === 0)

  const sum = (list: Trade[]): number =>
    list.reduce((acc, t) => acc + (t.result as number), 0)

  const totalPnl = sum(closed)
  const closedCount = closed.length
  const hasBalance = startingBalance !== null

  return {
    total_pnl: totalPnl,
    final_balance: hasBalance ? (startingBalance as number) + totalPnl : null,
    growth_pct:
      hasBalance && startingBalance !== 0
        ? (totalPnl / (startingBalance as number)) * 100
        : null,
    win_rate: closedCount ? (wins.length / closedCount) * 100 : 0,
    trade_count: trades.length,
    closed_count: closedCount,
    win_count: wins.length,
    loss_count: losses.length,
    breakeven_count: breakeven.length,
    avg_win: wins.length ? sum(wins) / wins.length : null,
    avg_loss: losses.length ? sum(losses) / losses.length : null,
    has_balance: hasBalance,
  }
}

/**
 * Equity curve — პირველი წერტილი საწყისი ბალანსია, შემდეგ
 * ქრონოლოგიურად კუმულატიური P/L (SPEC სექცია 3.5).
 */
export function buildEquityCurve(
  chronological: Trade[],
  startingBalance: number,
): ChartSeries {
  const labels: string[] = ['საწყისი']
  const values: number[] = [round2(startingBalance)]
  let cumulative = 0

  for (const trade of chronological) {
    cumulative += trade.result as number
    labels.push(displayDateTime(trade.trade_datetime) || `#${trade.id}`)
    values.push(round2(startingBalance + cumulative))
  }

  return { labels, values }
}

/** მოგება / ზარალი / უცვლელი — pie chart-ისთვის */
export function buildDistribution(stats: MonthlyStats): ChartSeries {
  return {
    labels: ['მოგება', 'ზარალი', 'უცვლელი'],
    values: [stats.win_count, stats.loss_count, stats.breakeven_count],
  }
}
