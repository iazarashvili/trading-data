import { type Context, Hono } from 'hono'
import {
  deleteTrade,
  getTrade,
  insertTrade,
  setScreenshots,
  updateTrade,
} from '../db/trades'
import { monthOf } from '../lib/date'
import { type Flash, error, setFlashes, success, takeFlashes } from '../lib/flash'
import { parseTradeForm, validateTrade } from '../lib/trade-input'
import {
  UploadError,
  deleteScreenshots,
  isUploadedFile,
  saveScreenshot,
  updateScreenshotSlot,
} from '../lib/uploads'
import type { AppEnv, TradeFormState } from '../types'
import { Layout } from '../views/Layout'
import { TradeDetail } from '../views/TradeDetail'
import { TradeForm } from '../views/TradeForm'

export const trades = new Hono<AppEnv>()

const ID_PATTERN = ':id{[0-9]+}'

function renderForm(
  c: Context<AppEnv>,
  trade: Partial<TradeFormState>,
  editing: boolean,
  flashes: Flash[],
) {
  return c.html(
    <Layout
      title={editing ? 'რედაქტირება — Trading Journal' : 'ახალი ტრეიდი — Trading Journal'}
      flashes={flashes}
    >
      <TradeForm trade={trade} editing={editing} />
    </Layout>,
  )
}

/* --------------------------------- ახალი --------------------------------- */

trades.get('/new', (c) =>
  renderForm(c, { direction: 'Long' }, false, takeFlashes(c)),
)

trades.post('/new', async (c) => {
  const form = await c.req.formData()
  const input = parseTradeForm(form)
  const errors = validateTrade(input)

  if (errors.length) {
    return renderForm(c, input, false, errors.map(error))
  }

  const tradeId = await insertTrade(c.env.DB, input)

  try {
    const first = form.get('screenshot')
    const second = form.get('screenshot2')
    const screenshot = isUploadedFile(first)
      ? await saveScreenshot(c.env.BUCKET, first, tradeId)
      : null
    const screenshot2 = isUploadedFile(second)
      ? await saveScreenshot(c.env.BUCKET, second, tradeId)
      : null

    if (screenshot || screenshot2) {
      await setScreenshots(c.env.DB, tradeId, screenshot, screenshot2)
    }
  } catch (uploadError) {
    // სქრინი ვერ აიტვირთა — ტრეიდიც არ შევინახოთ ნახევრად
    await deleteTrade(c.env.DB, tradeId)
    const message =
      uploadError instanceof UploadError ? uploadError.message : 'სქრინის ატვირთვა ვერ მოხერხდა.'
    return renderForm(c, input, false, [error(message)])
  }

  setFlashes(c, [success('ტრეიდი წარმატებით დაემატა.')])
  const month = monthOf(input.trade_datetime)
  return c.redirect(month ? `/?month=${encodeURIComponent(month)}` : '/')
})

/* -------------------------------- დეტალები ------------------------------- */

trades.get(`/${ID_PATTERN}`, async (c) => {
  const trade = await getTrade(c.env.DB, Number(c.req.param('id')))

  if (!trade) {
    setFlashes(c, [error('ჩანაწერი ვერ მოიძებნა.')])
    return c.redirect('/')
  }

  return c.html(
    <Layout title={`${trade.asset} — Trading Journal`} flashes={takeFlashes(c)}>
      <TradeDetail trade={trade} />
    </Layout>,
  )
})

/* ----------------------------- რედაქტირება ------------------------------ */

trades.get(`/${ID_PATTERN}/edit`, async (c) => {
  const trade = await getTrade(c.env.DB, Number(c.req.param('id')))

  if (!trade) {
    setFlashes(c, [error('ჩანაწერი ვერ მოიძებნა.')])
    return c.redirect('/')
  }

  return renderForm(c, trade as unknown as TradeFormState, true, takeFlashes(c))
})

trades.post(`/${ID_PATTERN}/edit`, async (c) => {
  const tradeId = Number(c.req.param('id'))
  const trade = await getTrade(c.env.DB, tradeId)

  if (!trade) {
    setFlashes(c, [error('ჩანაწერი ვერ მოიძებნა.')])
    return c.redirect('/')
  }

  const form = await c.req.formData()
  const input = parseTradeForm(form)
  const errors = validateTrade(input)

  const formState: TradeFormState = {
    ...input,
    id: tradeId,
    screenshot: trade.screenshot,
    screenshot2: trade.screenshot2,
  }

  if (errors.length) {
    return renderForm(c, formState, true, errors.map(error))
  }

  let screenshot: string | null
  let screenshot2: string | null

  try {
    screenshot = await updateScreenshotSlot(
      c.env.BUCKET,
      tradeId,
      trade.screenshot,
      form.get('screenshot'),
      form.get('remove_screenshot') === '1',
    )
    screenshot2 = await updateScreenshotSlot(
      c.env.BUCKET,
      tradeId,
      trade.screenshot2,
      form.get('screenshot2'),
      form.get('remove_screenshot2') === '1',
    )
  } catch (uploadError) {
    const message =
      uploadError instanceof UploadError ? uploadError.message : 'სქრინის ატვირთვა ვერ მოხერხდა.'
    return renderForm(c, formState, true, [error(message)])
  }

  await updateTrade(c.env.DB, tradeId, input, { screenshot, screenshot2 })

  setFlashes(c, [success('ჩანაწერი განახლდა.')])
  return c.redirect(`/trade/${tradeId}`)
})

/* --------------------------------- წაშლა -------------------------------- */

trades.post(`/${ID_PATTERN}/delete`, async (c) => {
  const tradeId = Number(c.req.param('id'))
  const trade = await getTrade(c.env.DB, tradeId)

  if (!trade) {
    setFlashes(c, [error('ჩანაწერი ვერ მოიძებნა.')])
    return c.redirect('/')
  }

  await deleteScreenshots(c.env.BUCKET, trade.screenshot, trade.screenshot2)
  await deleteTrade(c.env.DB, tradeId)

  setFlashes(c, [success('ტრეიდი წაიშალა.')])
  const month = monthOf(trade.trade_datetime)
  return c.redirect(month ? `/?month=${encodeURIComponent(month)}` : '/')
})
