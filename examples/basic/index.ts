import { Hono } from 'hono'
import { verifySignedRequest, generateSignedURL } from '../../src'

const secretKey = 'foo'
const expirationSec = 10

const app = new Hono()

app.get(
  '/verify/*',
  verifySignedRequest({
    secretKey
  }),
  (c) => c.text('Verify')
)

app.get('/generate/*', async (c) => {
  const url = new URL(c.req.url)

  const prefix = '/generate/'
  url.pathname = `/verify/${url.pathname.slice(prefix.length)}`

  const signedURL = await generateSignedURL(url, { secretKey, expirationMs: 1000 * expirationSec })
  return c.text(signedURL.toString())
})

app.showRoutes()

export default app
