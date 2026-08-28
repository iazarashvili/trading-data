import { Hono } from 'hono'
import type { AppEnv } from '../types'

export const uploads = new Hono<AppEnv>()

/** სქრინის ჩვენება R2-იდან */
uploads.get('/uploads/:key{[A-Za-z0-9._-]+}', async (c) => {
  const object = await c.env.BUCKET.get(c.req.param('key'))
  if (!object) return c.notFound()

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)
  headers.set('Cache-Control', 'private, max-age=3600')

  return new Response(object.body, { headers })
})
