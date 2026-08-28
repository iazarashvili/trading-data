import type { FC } from 'hono/jsx'
import { displayDateTime } from '../lib/date'
import type { Trade } from '../types'

const dash = (value: unknown): string =>
  value === null || value === undefined || value === '' ? '—' : String(value)

const SECTION_CLASS =
  'rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card p-4 sm:p-6'

const TITLE_CLASS =
  'text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4'

export const TradeDetail: FC<{ trade: Trade }> = ({ trade }) => (
  <>
    <div class="mb-6">
      <a href="/" class="text-sm text-slate-500 hover:text-accent transition">
        ← უკან სიაში
      </a>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
      <div>
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-2xl font-bold">{trade.asset}</h1>
          <span
            class={
              'inline-flex px-2.5 py-1 rounded-lg text-sm font-medium ' +
              (trade.direction === 'Long'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : 'bg-red-500/15 text-red-600 dark:text-red-400')
            }
          >
            {trade.direction}
          </span>
        </div>
        <p class="mt-1 text-slate-500 dark:text-slate-400 text-sm">
          {displayDateTime(trade.trade_datetime, 19)}
        </p>
      </div>

      {trade.result !== null && (
        <div class="rounded-xl px-5 py-3 border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card text-left sm:text-right">
          <p class="text-xs uppercase tracking-wider text-slate-500">შედეგი</p>
          <p
            class={
              'text-2xl font-bold tabular-nums ' +
              (trade.result >= 0 ? 'text-emerald-500' : 'text-red-500')
            }
          >
            {trade.result.toFixed(2)}
          </p>
        </div>
      )}
    </div>

    {(trade.screenshot || trade.screenshot2) && (
      <section class={`mb-8 overflow-hidden ${SECTION_CLASS}`}>
        <h2 class={TITLE_CLASS}>სქრინები</h2>
        <div
          class={`grid grid-cols-1 ${trade.screenshot && trade.screenshot2 ? 'md:grid-cols-2' : ''} gap-4`}
        >
          {trade.screenshot && (
            <Screenshot label="სქრინი 1" file={trade.screenshot} asset={trade.asset} />
          )}
          {trade.screenshot2 && (
            <Screenshot label="სქრინი 2" file={trade.screenshot2} asset={trade.asset} />
          )}
        </div>
        <p class="mt-3 text-xs text-slate-500">დააჭირე სურათს სრულ ზომაზე გასახსნელად</p>
      </section>
    )}

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <section class={SECTION_CLASS}>
        <h2 class={TITLE_CLASS}>ფასები და რისკი</h2>
        <dl class="grid grid-cols-2 gap-4 text-sm">
          <Field label="შესვლის ფასი" value={trade.entry_price} numeric />
          <Field label="Stop-Loss" value={trade.stop_loss} numeric />
          <Field label="Take-Profit" value={trade.take_profit} numeric />
          <Field
            label="რისკი (%)"
            value={trade.risk_percent === null ? null : `${trade.risk_percent}%`}
          />
          <Field label="R:R" value={trade.risk_reward} />
          <Field label="ემოცია გახსნისას" value={trade.emotion_open} />
        </dl>
      </section>

      <section class={SECTION_CLASS}>
        <h2 class={TITLE_CLASS}>სეტაპი</h2>
        {trade.setup ? (
          <p class="text-sm whitespace-pre-wrap leading-relaxed">{trade.setup}</p>
        ) : (
          <p class="text-sm text-slate-500">—</p>
        )}
        {trade.chart_link && (
          <a
            href={trade.chart_link}
            target="_blank"
            rel="noopener noreferrer"
            class="mt-4 inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            გახსენი გრაფიკი
          </a>
        )}
      </section>

      <section class={`lg:col-span-2 ${SECTION_CLASS}`}>
        <h2 class={TITLE_CLASS}>დასკვნა და ემოცია დახურვისას</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 class="text-xs font-medium text-slate-500 mb-2">დასკვნა</h3>
            {trade.conclusion ? (
              <p class="text-sm whitespace-pre-wrap leading-relaxed">{trade.conclusion}</p>
            ) : (
              <p class="text-sm text-slate-500">—</p>
            )}
          </div>
          <div>
            <h3 class="text-xs font-medium text-slate-500 mb-2">ემოცია დახურვისას</h3>
            {trade.emotion_close ? (
              <p class="text-sm whitespace-pre-wrap leading-relaxed">{trade.emotion_close}</p>
            ) : (
              <p class="text-sm text-slate-500">—</p>
            )}
          </div>
        </div>
      </section>
    </div>

    <div class="mt-8 flex flex-wrap gap-3 border-t border-slate-200 dark:border-slate-700/60 pt-6">
      <a
        href={`/trade/${trade.id}/edit`}
        class="px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition"
      >
        რედაქტირება
      </a>
      <form
        method="post"
        action={`/trade/${trade.id}/delete`}
        onsubmit="return confirm('ნამდვილად გსურთ ამ ტრეიდის წაშლა?');"
      >
        <button
          type="submit"
          class="px-5 py-2.5 rounded-lg border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 text-sm transition"
        >
          წაშლა
        </button>
      </form>
    </div>
  </>
)

const Screenshot: FC<{ label: string; file: string; asset: string }> = ({
  label,
  file,
  asset,
}) => (
  <div>
    <p class="text-xs text-slate-500 mb-2">{label}</p>
    <a href={`/uploads/${file}`} target="_blank" rel="noopener" class="block group">
      <img
        src={`/uploads/${file}`}
        alt={`${label} — ${asset}`}
        class="w-full max-h-[28rem] object-contain rounded-lg bg-slate-900/5 dark:bg-black/30 cursor-zoom-in transition group-hover:opacity-95"
      />
    </a>
  </div>
)

const Field: FC<{ label: string; value: unknown; numeric?: boolean }> = ({
  label,
  value,
  numeric = false,
}) => (
  <div>
    <dt class="text-slate-500">{label}</dt>
    <dd class={`mt-0.5 font-semibold ${numeric ? 'tabular-nums' : ''}`}>{dash(value)}</dd>
  </div>
)
