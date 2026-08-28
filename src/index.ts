import { Hono } from 'hono'
import { requireAuth } from './lib/auth'
import { api } from './routes/api'
import { auth } from './routes/auth'
import { pages } from './routes/pages'
import { trades } from './routes/trades'
import { uploads } from './routes/uploads'
import type { AppEnv } from './types'

const app = new Hono<AppEnv>()

// MT5 / გარე API — საკუთარი გასაღებით იცავს თავს (იხ. routes/api.ts)
app.route('/api', api)

// login / logout — ავტორიზაციამდე ხელმისაწვდომი
app.route('/', auth)

// დანარჩენი ყველაფერი მხოლოდ შესული მომხმარებლისთვის
app.use('*', requireAuth)
app.route('/', uploads)
app.route('/trade', trades)
app.route('/', pages)

app.notFound((c) => c.text('გვერდი ვერ მოიძებნა', 404))

app.onError((err, c) => {
  console.error(err)
  return c.text('სერვერის შეცდომა', 500)
})

export default app
