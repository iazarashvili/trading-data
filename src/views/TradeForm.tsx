import type { FC } from 'hono/jsx'
import { toDateTimeLocal } from '../lib/date'
import { ACCEPT_ATTRIBUTE } from '../lib/uploads'
import { EMOTIONS, type TradeFormState } from '../types'

const value = (input: number | string | null | undefined): string =>
  input === null || input === undefined ? '' : String(input)

const INPUT_CLASS =
  'w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 focus:ring-2 focus:ring-accent focus:border-transparent outline-none text-sm'

const SECTION_CLASS =
  'rounded-xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-card p-6'

const TITLE_CLASS =
  'text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4'

const PREVIEW_SCRIPT = `
(function () {
  function bindPreview(inputId, previewId, imgId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const previewImg = document.getElementById(imgId);
    if (!input || !preview || !previewImg) return;
    input.addEventListener('change', function () {
      const file = input.files && input.files[0];
      if (file) {
        previewImg.src = URL.createObjectURL(file);
        preview.classList.remove('hidden');
      } else {
        preview.classList.add('hidden');
        previewImg.src = '';
      }
    });
  }
  bindPreview('screenshot', 'screenshot-preview', 'screenshot-preview-img');
  bindPreview('screenshot2', 'screenshot2-preview', 'screenshot2-preview-img');
})();`

interface TradeFormProps {
  trade: Partial<TradeFormState>
  editing: boolean
}

export const TradeForm: FC<TradeFormProps> = ({ trade, editing }) => (
  <>
    <div class="mb-6">
      <a
        href={editing && trade.id ? `/trade/${trade.id}` : '/'}
        class="text-sm text-slate-500 hover:text-accent transition"
      >
        ← უკან
      </a>
      <h1 class="mt-2 text-2xl font-bold tracking-tight">
        {editing ? 'ტრეიდის რედაქტირება' : 'ახალი ტრეიდი'}
      </h1>
    </div>

    <form
      method="post"
      action={editing && trade.id ? `/trade/${trade.id}/edit` : '/trade/new'}
      enctype="multipart/form-data"
      class="space-y-8"
    >
      <section class={SECTION_CLASS}>
        <h2 class={TITLE_CLASS}>ძირითადი</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div>
            <label for="trade_datetime" class="block text-sm font-medium mb-1.5">
              თარიღი და დრო *
            </label>
            <input
              type="datetime-local"
              id="trade_datetime"
              name="trade_datetime"
              required
              value={toDateTimeLocal(trade.trade_datetime)}
              class={INPUT_CLASS}
            />
          </div>

          <div>
            <label for="asset" class="block text-sm font-medium mb-1.5">
              აქტივი (Asset) *
            </label>
            <input
              type="text"
              id="asset"
              name="asset"
              required
              placeholder="მაგ. EURUSD, BTC"
              value={value(trade.asset)}
              class={INPUT_CLASS}
            />
          </div>

          <div>
            <label class="block text-sm font-medium mb-1.5">მიმართულება *</label>
            <div class="flex gap-2">
              <DirectionOption
                direction="Long"
                current={trade.direction}
                activeClass="peer-checked:bg-emerald-500 peer-checked:text-white peer-checked:border-emerald-500"
              />
              <DirectionOption
                direction="Short"
                current={trade.direction}
                activeClass="peer-checked:bg-red-500 peer-checked:text-white peer-checked:border-red-500"
              />
            </div>
          </div>

          <div>
            <label for="entry_price" class="block text-sm font-medium mb-1.5">
              შესვლის ფასი *
            </label>
            <input
              type="number"
              id="entry_price"
              name="entry_price"
              step="any"
              required
              placeholder="0.00"
              value={value(trade.entry_price)}
              class={`${INPUT_CLASS} tabular-nums`}
            />
          </div>

          <div>
            <label for="stop_loss" class="block text-sm font-medium mb-1.5">
              Stop-Loss
            </label>
            <input
              type="number"
              id="stop_loss"
              name="stop_loss"
              step="any"
              placeholder="0.00"
              value={value(trade.stop_loss)}
              class={`${INPUT_CLASS} tabular-nums`}
            />
          </div>

          <div>
            <label for="take_profit" class="block text-sm font-medium mb-1.5">
              Take-Profit
            </label>
            <input
              type="number"
              id="take_profit"
              name="take_profit"
              step="any"
              placeholder="0.00"
              value={value(trade.take_profit)}
              class={`${INPUT_CLASS} tabular-nums`}
            />
          </div>

          <div>
            <label for="risk_percent" class="block text-sm font-medium mb-1.5">
              რისკი (%)
            </label>
            <input
              type="number"
              id="risk_percent"
              name="risk_percent"
              step="any"
              min="0"
              max="100"
              placeholder="1.0"
              value={value(trade.risk_percent)}
              class={`${INPUT_CLASS} tabular-nums`}
            />
          </div>

          <div>
            <label for="risk_reward" class="block text-sm font-medium mb-1.5">
              Risk/Reward (R:R)
            </label>
            <input
              type="text"
              id="risk_reward"
              name="risk_reward"
              placeholder="მაგ. 1:3"
              value={value(trade.risk_reward)}
              class={INPUT_CLASS}
            />
          </div>

          <div>
            <label for="emotion_open" class="block text-sm font-medium mb-1.5">
              ემოცია გახსნისას
            </label>
            <select id="emotion_open" name="emotion_open" class={INPUT_CLASS}>
              <option value="">—</option>
              {EMOTIONS.map((emotion) => (
                <option value={emotion} selected={trade.emotion_open === emotion}>
                  {emotion}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section class={SECTION_CLASS}>
        <h2 class={TITLE_CLASS}>სეტაპი და სქრინები</h2>
        <div class="space-y-5">
          <div>
            <label for="setup" class="block text-sm font-medium mb-1.5">
              სეტაპის აღწერა
            </label>
            <textarea
              id="setup"
              name="setup"
              rows={3}
              placeholder="რა სეტაპზე შეხვედი..."
              class={INPUT_CLASS}
            >
              {value(trade.setup)}
            </textarea>
          </div>

          <div>
            <label for="chart_link" class="block text-sm font-medium mb-1.5">
              გრაფიკის ლინკი
            </label>
            <input
              type="url"
              id="chart_link"
              name="chart_link"
              placeholder="https://www.tradingview.com/..."
              value={value(trade.chart_link)}
              class={INPUT_CLASS}
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <ScreenshotField
              slot="screenshot"
              label="სქრინი 1"
              current={trade.screenshot ?? null}
              removeName="remove_screenshot"
            />
            <ScreenshotField
              slot="screenshot2"
              label="სქრინი 2"
              current={trade.screenshot2 ?? null}
              removeName="remove_screenshot2"
            />
          </div>
          <p class="text-xs text-slate-500">
            PNG, JPG, GIF, WEBP — მაქსიმუმ 5 MB თითო ფაილზე.
          </p>
        </div>
      </section>

      <section class={SECTION_CLASS}>
        <h2 class={TITLE_CLASS}>შედეგი</h2>
        <div class="space-y-5">
          <div class="sm:w-1/2">
            <label for="result" class="block text-sm font-medium mb-1.5">
              შედეგი (Profit / Loss)
            </label>
            <input
              type="number"
              id="result"
              name="result"
              step="any"
              placeholder="მაგ. 150 ან -50"
              value={value(trade.result)}
              class={`${INPUT_CLASS} tabular-nums`}
            />
          </div>

          <div>
            <label for="conclusion" class="block text-sm font-medium mb-1.5">
              დასკვნა
            </label>
            <textarea
              id="conclusion"
              name="conclusion"
              rows={4}
              placeholder="რა გააკეთე კარგად, რა შეცდომა იყო..."
              class={INPUT_CLASS}
            >
              {value(trade.conclusion)}
            </textarea>
          </div>

          <div>
            <label for="emotion_close" class="block text-sm font-medium mb-1.5">
              ემოცია დახურვისას
            </label>
            <textarea
              id="emotion_close"
              name="emotion_close"
              rows={2}
              placeholder="როგორ გრძნობდი თავს დახურვის შემდეგ..."
              class={INPUT_CLASS}
            >
              {value(trade.emotion_close)}
            </textarea>
          </div>
        </div>
      </section>

      <div class="flex flex-wrap gap-3">
        <button
          type="submit"
          class="px-6 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition"
        >
          {editing ? 'განახლება' : 'შენახვა'}
        </button>
        <a
          href={editing && trade.id ? `/trade/${trade.id}` : '/'}
          class="px-6 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm hover:bg-slate-100 dark:hover:bg-slate-700/50 transition"
        >
          გაუქმება
        </a>
      </div>
    </form>

    <script dangerouslySetInnerHTML={{ __html: PREVIEW_SCRIPT }}></script>
  </>
)

const DirectionOption: FC<{
  direction: 'Long' | 'Short'
  current: string | undefined
  activeClass: string
}> = ({ direction, current, activeClass }) => (
  <label class="flex-1 cursor-pointer">
    <input
      type="radio"
      name="direction"
      value={direction}
      class="peer sr-only"
      checked={current === direction}
    />
    <span
      class={`block text-center px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 text-sm transition ${activeClass}`}
    >
      {direction}
    </span>
  </label>
)

const ScreenshotField: FC<{
  slot: string
  label: string
  current: string | null
  removeName: string
}> = ({ slot, label, current, removeName }) => (
  <div>
    <label for={slot} class="block text-xs font-medium text-slate-500 mb-2">
      {label}
    </label>

    {current && (
      <div class="mb-2 space-y-2">
        <a href={`/uploads/${current}`} target="_blank" rel="noopener" class="block">
          <img
            src={`/uploads/${current}`}
            alt={label}
            class="max-h-32 w-full rounded-lg border border-slate-200 dark:border-slate-600 object-contain bg-slate-900/5 dark:bg-black/30"
          />
        </a>
        <label class="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer">
          <input type="checkbox" name={removeName} value="1" class="rounded border-slate-300" />
          წაშლა
        </label>
      </div>
    )}

    <input
      type="file"
      id={slot}
      name={slot}
      accept={ACCEPT_ATTRIBUTE}
      class="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-accent/10 file:text-accent hover:file:bg-accent/20 cursor-pointer"
    />

    <div id={`${slot}-preview`} class="mt-2 hidden">
      <img
        id={`${slot}-preview-img`}
        src=""
        alt=""
        class="max-h-32 w-full rounded-lg border border-slate-200 dark:border-slate-600 object-contain"
      />
    </div>
  </div>
)
