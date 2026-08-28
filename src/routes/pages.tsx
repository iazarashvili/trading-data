import { Hono } from 'hono'
import { getStartingBalance, saveStartingBalance } from '../db/configs'
import { getMt5Status } from '../db/mt5'
import {
  availableMonths,
  distinctAssets,
  listClosedChronological,
  listTradesForMonth,
} from '../db/trades'
import { buildDistribution, buildEquityCurve, computeMonthlyStats } from '../lib/analytics'
import { currentMonthId, isValidMonthId, monthLabel } from '../lib/date'
import { error, setFlashes, success, takeFlashes } from '../lib/flash'
import { floatOrNull } from '../lib/trade-input'
import type { AppEnv } from '../types'
import { Index } from '../views/Index'
import { Killzones } from '../views/Killzones'
import { Layout } from '../views/Layout'

export const pages = new Hono<AppEnv>()

/**
 * არჩეული თვის განსაზღვრა (SPEC სექცია 3.1):
 * მოთხოვნილი თვე -> სიაშია? -> ის; თუ არა, სიას ემატება;
 * ცარიელი სია -> მიმდინარე თვე; სხვა შემთხვევაში მიმდინარე ან ყველაზე ახალი.
 */
function resolveMonth(months: string[], requested: string): { month: string; months: string[] } {
  const valid = requested && isValidMonthId(requested) ? requested : ''

  if (valid && months.includes(valid)) return { month: valid, months }

  const list = valid
    ? [...new Set([...months, valid])].sort().reverse()
    : [...months]

  if (!list.length) {
    const current = currentMonthId()
    return { month: current, months: [current] }
  }

  const current = currentMonthId()
  const month = valid || (list.includes(current) ? current : list[0])

  if (!list.includes(month)) list.unshift(month)
  return { month, months: list }
}

pages.get('/', async (c) => {
  const requested = (c.req.query('month') ?? '').trim()
  const search = (c.req.query('q') ?? '').trim()
  const assetFilter = (c.req.query('asset') ?? '').trim()

  const { month: selectedMonth, months } = resolveMonth(
    await availableMonths(c.env.DB),
    requested,
  )

  const [startingBalance, trades, assets, mt5Status] = await Promise.all([
    getStartingBalance(c.env.DB, selectedMonth),
    listTradesForMonth(c.env.DB, selectedMonth, search, assetFilter),
    distinctAssets(c.env.DB, selectedMonth),
    getMt5Status(c.env.DB),
  ])

  const stats = computeMonthlyStats(trades, startingBalance)

  let equity = null
  let distribution = null
  if (startingBalance !== null) {
    const chronological = await listClosedChronological(c.env.DB, selectedMonth)
    equity = buildEquityCurve(chronological, startingBalance)
    if (stats.closed_count > 0) distribution = buildDistribution(stats)
  }

  const monthLabels: Record<string, string> = {}
  for (const month of months) monthLabels[month] = monthLabel(month)

  return c.html(
    <Layout title="ჩანაწერები — Trading Journal" flashes={takeFlashes(c)} activeNav="history">
      <Index
        trades={trades}
        assets={assets}
        search={search}
        assetFilter={assetFilter}
        selectedMonth={selectedMonth}
        months={months}
        monthLabels={monthLabels}
        monthDisplay={monthLabel(selectedMonth)}
        stats={stats}
        startingBalance={startingBalance}
        equity={equity}
        distribution={distribution}
        mt5Status={mt5Status}
      />
    </Layout>,
  )
})

/** თვიური საწყისი ბალანსის შენახვა (SPEC სექცია 3.3) */
pages.post('/', async (c) => {
  const form = await c.req.parseBody()
  const monthId = String(form.month_id ?? '').trim()
  const balance = floatOrNull(form.starting_balance)

  if (balance === null || balance < 0) {
    setFlashes(c, [error('შეიყვანეთ სწორი საწყისი ბალანსი (დადებითი რიცხვი).')])
    return c.redirect(monthId ? `/?month=${encodeURIComponent(monthId)}` : '/')
  }

  if (!isValidMonthId(monthId)) {
    setFlashes(c, [error('აირჩიეთ სწორი თვე.')])
    return c.redirect('/')
  }

  await saveStartingBalance(c.env.DB, monthId, balance)
  setFlashes(c, [success(`${monthLabel(monthId)} — საწყისი ბალანსი შენახულია.`)])
  return c.redirect(`/?month=${encodeURIComponent(monthId)}`)
})

/** ICT killzone-ების ცხრილი (დროები ბრაუზერში გადაითვლება ლოკალურ სარტყელში) */
pages.get('/killzones', (c) =>
  c.html(
    <Layout title="ICT Killzones — Trading Journal" flashes={takeFlashes(c)} activeNav="killzones">
      <Killzones />
    </Layout>,
  ),
)
