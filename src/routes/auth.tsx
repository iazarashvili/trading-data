import { Hono } from 'hono'
import { checkPassword, clearSession, issueSession } from '../lib/auth'
import { error, takeFlashes } from '../lib/flash'
import type { AppEnv } from '../types'
import { Layout } from '../views/Layout'
import { Login } from '../views/Login'

export const auth = new Hono<AppEnv>()

/** ღია redirect-ის თავიდან აცილება — მხოლოდ შიდა ბილიკები */
function safeNext(value: unknown): string {
  const next = String(value ?? '').trim()
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

auth.get('/login', (c) =>
  c.html(
    <Layout title="შესვლა — Trading Journal" flashes={takeFlashes(c)} bare>
      <Login next={safeNext(c.req.query('next'))} />
    </Layout>,
  ),
)

auth.post('/login', async (c) => {
  const form = await c.req.parseBody()
  const next = safeNext(form.next)

  if (!checkPassword(c, String(form.password ?? ''))) {
    return c.html(
      <Layout
        title="შესვლა — Trading Journal"
        flashes={[error('პაროლი არასწორია.')]}
        bare
      >
        <Login next={next} />
      </Layout>,
      401,
    )
  }

  await issueSession(c)
  return c.redirect(next)
})

auth.post('/logout', (c) => {
  clearSession(c)
  return c.redirect('/login')
})
