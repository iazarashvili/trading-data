import type { FC } from 'hono/jsx'
import { displayDateTime } from '../lib/date'
import type { ChartSeries, MonthlyStats, Mt5Status, Trade } from '../types'

const money = (value: number): string => value.toFixed(2)

const num = (value: unknown, fallback = '—'): string =>
  value === null || value === undefined || value === '' ? fallback : String(value)

interface IndexProps {
  trades: Trade[]
  assets: string[]
  search: string
  assetFilter: string
  selectedMonth: string
  months: string[]
  monthLabels: Record<string, string>
  monthDisplay: string
  stats: MonthlyStats
  startingBalance: number | null
  equity: ChartSeries | null
  distribution: ChartSeries | null
  mt5Status: Mt5Status | null
}

export const Index: FC<IndexProps> = (props) => {
  const { stats, selectedMonth, monthDisplay } = props

  return (
    <>
      <div class="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">ტრეიდების ისტორია</h1>
          <p class="mt-1 text-slate-500 dark:text-slate-400 text-sm">
            ანალიტიკა და ჩანაწერები თვეების მიხედვით
          </p>
        </div>
        <form method="get" action="/" class="flex items-center gap-2">
          <input type="hidden" name="q" value={props.search} />
          <input type="hidden" name="asset" value={props.assetFilter} />
          <label for="month" class="text-sm text-slate-500 whitespace-nowrap">
            თვე:
          </label>
          <select
            id="month"
            name="month"
            onchange="this.form.submit()"
            class="px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 focus:ring-2 focus:ring-accent outline-none text-sm min-w-[180px]"
          >
            {props.months.map((month) => (
              <option value={month} selected={month === selectedMonth}>
                {props.monthLabels[month] ?? month}
              </option>
            ))}
          </select>
        </form>
      </div>

      {props.mt5Status && <Mt5Panel status={props.mt5Status} />}

      <BalanceForm selectedMonth={selectedMonth} balance={props.startingBalance} monthDisplay={monthDisplay} />

      {!stats.has_balance && (
        <div class="mb-6 px-4 py-3 rounded-lg text-sm bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/25">
          გთხოვთ, მიუთითოთ ამ თვის საწყისი ბალანსი სტატისტიკისთვის.
        </div>
      )}

      <StatCards stats={stats} startingBalance={props.startingBalance} monthDisplay={monthDisplay} />

      <Charts stats={stats} equity={props.equity} distribution={props.distribution} />

      <hr class="mb-8 border-slate-200 dark:border-slate-700/60" />

      <SearchForm
        search={props.search}
        assetFilter={props.assetFilter}
        assets={props.assets}
        selectedMonth={selectedMonth}
      />

      <TradesTable trades={props.trades} monthDisplay={monthDisplay} />

      {props.equity && (
        <>
          <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
          <script
            dangerouslySetInnerHTML={{
              __html: chartScript(props.equity, props.distribution),
            }}
          ></script>
        </>
      )}
    </>
  )
}

const Mt5Panel: FC<{ status: Mt5Status }> = ({ status }) => {
  const balance = Number(status.balance ?? 0)
  const equity = Number(status.equity ?? 0)

  return (
    <section class="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-4 text-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div class="font-semibold text-emerald-700 dark:text-emerald-300">MT5 Live — Xelius</div>
        <div class="text-xs text-slate-500">განახლდა: {status._updated_at}</div>
      </div>
      <div class="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums text-slate-700 dark:text-slate-200">
        <div>
          <div class="text-xs text-slate-500">ბალანსი</div>
          <div class="font-medium">${money(Number.isFinite(balance) ? balance : 0)}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">Equity</div>
          <div class="font-medium">${money(Number.isFinite(equity) ? equity : 0)}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">სიმბოლო</div>
          <div class="font-medium">{num(status.symbol)}</div>
        </div>
        <div>
          <div class="text-xs text-slate-500">რეჟიმი / პოზიცია</div>
          <div class="font-medium">
            {num(status.regime)} · {num(status.open_positions, '0')} open
          </div>
        </div>
      </div>
      {status.last_signal ? (
        <p class="mt-2 text-xs text-slate-500">ბოლო სიგნალი: {String(status.last_signal)}</p>
      ) : null}
    </section>
  )
}

const BalanceForm: FC<{
  selectedMonth: string
  balance: number | null
  monthDisplay: string
}> = ({ selectedMonth, balance, monthDisplay }) => (
  <section class="mb-6 rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card p-5 shadow-sm">
    <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
      თვიური საწყისი ბალანსი
    </h2>
    <form method="post" action="/" class="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-3">
      <input type="hidden" name="form_type" value="balance" />
      <div>
        <label for="balance_month" class="block text-xs text-slate-500 mb-1">
          თვე
        </label>
        <input
          type="month"
          id="balance_month"
          name="month_id"
          value={selectedMonth}
          required
          class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-sm w-full sm:w-auto outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div>
        <label for="starting_balance" class="block text-xs text-slate-500 mb-1">
          საწყისი ბალანსი ($)
        </label>
        <input
          type="number"
          id="starting_balance"
          name="starting_balance"
          step="any"
          min="0"
          required
          placeholder="10000"
          value={balance === null ? '' : String(balance)}
          class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 text-sm w-full sm:w-40 outline-none focus:ring-2 focus:ring-accent tabular-nums"
        />
      </div>
      <button
        type="submit"
        class="px-5 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition"
      >
        შენახვა
      </button>
    </form>
    {balance !== null && (
      <p class="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
        {monthDisplay}: საწყისი ბალანსი —{' '}
        <span class="font-semibold tabular-nums">${money(balance)}</span>
      </p>
    )}
  </section>
)

const Card: FC<{ label: string; children?: unknown }> = ({ label, children }) => (
  <div class="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card p-4 sm:p-5">
    <p class="text-xs uppercase tracking-wider text-slate-500">{label}</p>
    {children}
  </div>
)

const StatCards: FC<{
  stats: MonthlyStats
  startingBalance: number | null
  monthDisplay: string
}> = ({ stats, startingBalance, monthDisplay }) => {
  const pnlClass = stats.total_pnl >= 0 ? 'text-emerald-500' : 'text-red-500'
  const finalClass = !stats.has_balance
    ? 'text-slate-400'
    : (stats.final_balance as number) >= (startingBalance as number)
      ? 'text-emerald-500'
      : 'text-red-500'
  const growthClass =
    stats.growth_pct === null
      ? 'text-slate-400'
      : stats.growth_pct >= 0
        ? 'text-emerald-500'
        : 'text-red-500'

  return (
    <section class="mb-8">
      <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
        ანალიტიკა — {monthDisplay}
      </h2>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Card label="Total P&L">
          <p class={`mt-1 text-xl sm:text-2xl font-bold tabular-nums ${pnlClass}`}>
            {stats.total_pnl >= 0 ? '+' : ''}${money(stats.total_pnl)}
          </p>
        </Card>
        <Card label="Final Balance">
          <p class={`mt-1 text-xl sm:text-2xl font-bold tabular-nums ${finalClass}`}>
            {stats.has_balance ? `$${money(stats.final_balance as number)}` : '—'}
          </p>
        </Card>
        <Card label="Monthly Growth %">
          <p class={`mt-1 text-xl sm:text-2xl font-bold tabular-nums ${growthClass}`}>
            {stats.growth_pct === null
              ? '—'
              : `${stats.growth_pct >= 0 ? '+' : ''}${money(stats.growth_pct)}%`}
          </p>
        </Card>
        <Card label="Win Rate">
          <p class="mt-1 text-xl sm:text-2xl font-bold tabular-nums text-accent">
            {stats.win_rate.toFixed(1)}%
          </p>
          <p class="text-xs text-slate-500 mt-0.5">
            {stats.win_count}W / {stats.loss_count}L
            {stats.breakeven_count ? ` / ${stats.breakeven_count}BE` : ''}
          </p>
        </Card>
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="ტრეიდები (თვე)">
          <p class="mt-1 text-xl sm:text-2xl font-bold">{stats.trade_count}</p>
          <p class="text-xs text-slate-500">დახურული: {stats.closed_count}</p>
        </Card>
        <Card label="საშ. მოგება">
          <p class="mt-1 text-xl font-bold tabular-nums text-emerald-500">
            {stats.avg_win === null ? '—' : `+$${money(stats.avg_win)}`}
          </p>
        </Card>
        <Card label="საშ. ზარალი">
          <p class="mt-1 text-xl font-bold tabular-nums text-red-500">
            {stats.avg_loss === null ? '—' : `$${money(stats.avg_loss)}`}
          </p>
        </Card>
        <Card label="საწყისი ბალანსი">
          <p class="mt-1 text-xl font-bold tabular-nums">
            {stats.has_balance ? `$${money(startingBalance as number)}` : '—'}
          </p>
        </Card>
      </div>
    </section>
  )
}

const Charts: FC<{
  stats: MonthlyStats
  equity: ChartSeries | null
  distribution: ChartSeries | null
}> = ({ stats, equity, distribution }) => {
  if (stats.has_balance && equity) {
    return (
      <section class={`mb-8 grid grid-cols-1 ${distribution ? 'lg:grid-cols-3' : ''} gap-6`}>
        <div
          class={`${distribution ? 'lg:col-span-2' : ''} rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card p-5 shadow-sm`}
        >
          <h3 class="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">Equity Curve</h3>
          <div class="h-72 sm:h-80">
            <canvas id="equityChart"></canvas>
          </div>
        </div>
        {distribution && (
          <div class="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card p-5 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-4">განაწილება</h3>
            <div class="h-72 sm:h-80 flex items-center justify-center">
              <canvas id="distributionChart"></canvas>
            </div>
          </div>
        )}
      </section>
    )
  }

  if (stats.has_balance && stats.closed_count === 0) {
    return (
      <p class="mb-8 text-sm text-slate-500 text-center py-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
        ამ თვეში შედეგიანი ტრეიდები არ არის — გრაფიკები გამოჩნდება პირველი P/L-ის შემდეგ.
      </p>
    )
  }

  return <></>
}

const SearchForm: FC<{
  search: string
  assetFilter: string
  assets: string[]
  selectedMonth: string
}> = ({ search, assetFilter, assets, selectedMonth }) => (
  <form method="get" action="/" class="flex flex-col sm:flex-row gap-3 mb-6">
    <input type="hidden" name="month" value={selectedMonth} />
    <div class="flex-1 relative">
      <svg
        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        name="q"
        value={search}
        placeholder="ძებნა (აქტივი, სეტაპი, დასკვნა...)"
        class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm"
      />
    </div>
    <select
      name="asset"
      class="sm:w-48 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 focus:ring-2 focus:ring-accent outline-none text-sm"
    >
      <option value="">ყველა აქტივი</option>
      {assets.map((asset) => (
        <option value={asset} selected={asset === assetFilter}>
          {asset}
        </option>
      ))}
    </select>
    <button
      type="submit"
      class="px-5 py-2.5 rounded-lg bg-slate-800 dark:bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium transition"
    >
      ფილტრი
    </button>
    {(search || assetFilter) && (
      <a
        href={`/?month=${encodeURIComponent(selectedMonth)}`}
        class="px-5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm text-center hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
      >
        გასუფთავება
      </a>
    )}
  </form>
)

const TradesTable: FC<{ trades: Trade[]; monthDisplay: string }> = ({ trades, monthDisplay }) => (
  <div class="rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card overflow-hidden shadow-sm">
    <div class="px-4 py-3 border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/40">
      <h2 class="text-sm font-semibold">ჩანაწერები — {monthDisplay}</h2>
    </div>

    {trades.length ? (
      <>
        {/* მობილურზე ცხრილის ნაცვლად ბარათები — 10 სვეტი ტელეფონზე არ იკითხება */}
        <div class="sm:hidden divide-y divide-slate-100 dark:divide-slate-700/40">
          {trades.map((trade) => (
            <TradeCard trade={trade} />
          ))}
        </div>

        <div class="hidden sm:block overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-200 dark:border-slate-700/60">
              <th class="text-left px-4 py-3 font-medium text-slate-500">თარიღი</th>
              <th class="text-left px-4 py-3 font-medium text-slate-500">აქტივი</th>
              <th class="text-left px-4 py-3 font-medium text-slate-500">მიმართ.</th>
              <th class="text-right px-4 py-3 font-medium text-slate-500">შესვლა</th>
              <th class="text-right px-4 py-3 font-medium text-slate-500">SL / TP</th>
              <th class="text-right px-4 py-3 font-medium text-slate-500">რისკი</th>
              <th class="text-right px-4 py-3 font-medium text-slate-500">R:R</th>
              <th class="text-right px-4 py-3 font-medium text-slate-500">შედეგი</th>
              <th class="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100 dark:divide-slate-700/40">
            {trades.map((trade) => (
              <tr
                class="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition cursor-pointer"
                onclick={`window.location='/trade/${trade.id}'`}
              >
                <td class="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                  {displayDateTime(trade.trade_datetime)}
                </td>
                <td class="px-4 py-3 font-medium">
                  {trade.asset}
                  {(trade.screenshot || trade.screenshot2) && (
                    <span class="ml-1 text-slate-400" title="სქრინი">
                      📷{trade.screenshot && trade.screenshot2 ? '×2' : ''}
                    </span>
                  )}
                </td>
                <td class="px-4 py-3">
                  <span
                    class={
                      'inline-flex px-2 py-0.5 rounded text-xs font-medium ' +
                      (trade.direction === 'Long'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-500/15 text-red-600 dark:text-red-400')
                    }
                  >
                    {trade.direction}
                  </span>
                </td>
                <td class="px-4 py-3 text-right tabular-nums">{trade.entry_price}</td>
                <td class="px-4 py-3 text-right tabular-nums text-slate-500 text-xs">
                  {num(trade.stop_loss)} / {num(trade.take_profit)}
                </td>
                <td class="px-4 py-3 text-right tabular-nums">
                  {trade.risk_percent === null ? '—' : `${trade.risk_percent}%`}
                </td>
                <td class="px-4 py-3 text-right">{num(trade.risk_reward)}</td>
                <td
                  class={
                    'px-4 py-3 text-right font-semibold tabular-nums ' +
                    (trade.result === null
                      ? ''
                      : trade.result >= 0
                        ? 'text-emerald-500'
                        : 'text-red-500')
                  }
                >
                  {trade.result === null ? '—' : money(trade.result)}
                </td>
                <td class="px-4 py-3 text-right">
                  <a
                    href={`/trade/${trade.id}`}
                    onclick="event.stopPropagation()"
                    class="text-accent hover:underline text-xs"
                  >
                    დეტალები →
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
    ) : (
      <div class="px-6 py-16 text-center">
        <p class="text-slate-500 dark:text-slate-400">ამ თვეში ჩანაწერები არ არის.</p>
        <a href="/trade/new" class="mt-4 inline-block text-accent hover:underline text-sm font-medium">
          დაამატე ტრეიდი
        </a>
      </div>
    )}
  </div>
)

function chartScript(equity: ChartSeries, distribution: ChartSeries | null): string {
  return `
(function () {
  const isDark = document.documentElement.classList.contains('dark');
  const gridColor = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(148,163,184,0.35)';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const equityData = ${JSON.stringify(equity)};
  const distData = ${JSON.stringify(distribution)};

  new Chart(document.getElementById('equityChart'), {
    type: 'line',
    data: {
      labels: equityData.labels,
      datasets: [{
        label: 'ბალანსი ($)',
        data: equityData.values,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        tension: 0.25,
        pointRadius: 3,
        pointHoverRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return '$' + ctx.parsed.y.toLocaleString(undefined, { minimumFractionDigits: 2 });
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: textColor, maxRotation: 45 }, grid: { color: gridColor } },
        y: {
          ticks: { color: textColor, callback: function (v) { return '$' + v.toLocaleString(); } },
          grid: { color: gridColor }
        }
      }
    }
  });

  if (distData) {
    new Chart(document.getElementById('distributionChart'), {
      type: 'pie',
      data: {
        labels: distData.labels,
        datasets: [{
          data: distData.values,
          backgroundColor: ['#10b981', '#ef4444', '#94a3b8'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: textColor, padding: 16 } } }
      }
    });
  }
})();`
}

/** ერთი ტრეიდი ბარათად — მხოლოდ მობილურზე, ცხრილის ნაცვლად */
const TradeCard: FC<{ trade: Trade }> = ({ trade }) => (
  <a
    href={`/trade/${trade.id}`}
    class="block px-4 py-3.5 active:bg-slate-50 dark:active:bg-slate-800/30 transition"
  >
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium">{trade.asset}</span>
          <span
            class={
              'inline-flex px-2 py-0.5 rounded text-xs font-medium ' +
              (trade.direction === 'Long'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/15 text-red-600 dark:text-red-400')
            }
          >
            {trade.direction}
          </span>
          {(trade.screenshot || trade.screenshot2) && (
            <span class="text-xs text-slate-400" title="სქრინი">
              📷{trade.screenshot && trade.screenshot2 ? '×2' : ''}
            </span>
          )}
        </div>
        <p class="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {displayDateTime(trade.trade_datetime)}
        </p>
      </div>
      <span
        class={
          'shrink-0 font-semibold tabular-nums ' +
          (trade.result === null ? 'text-slate-400' : trade.result >= 0 ? 'text-emerald-500' : 'text-red-500')
        }
      >
        {trade.result === null ? '—' : money(trade.result)}
      </span>
    </div>

    <dl class="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
      <CardPair label="შესვლა" value={String(trade.entry_price)} />
      <CardPair label="SL / TP" value={`${num(trade.stop_loss)} / ${num(trade.take_profit)}`} />
      <CardPair
        label="რისკი"
        value={trade.risk_percent === null ? '—' : `${trade.risk_percent}%`}
      />
      <CardPair label="R:R" value={num(trade.risk_reward)} />
    </dl>
  </a>
)

const CardPair: FC<{ label: string; value: string }> = ({ label, value }) => (
  <div class="flex justify-between gap-2">
    <dt class="text-slate-500 dark:text-slate-400 shrink-0">{label}</dt>
    <dd class="tabular-nums truncate">{value}</dd>
  </div>
)
