import { Hono } from 'hono'
import { html } from 'hono/html'
import { serveStatic } from 'hono/cloudflare-workers'
import { generateSignedURL, verifySignedRequest } from '../../../src'

const secretKey = 'foo'
const expirationSec = 5

const app = new Hono()

app.get('/static/images/*', verifySignedRequest({ secretKey }))

app.get('/static/*', serveStatic({ root: './' }))

app.get('/', async (c, next) => {
  await next()
  class AttributeRewriter {
    private attributeName: string
    constructor(attributeName: string) {
      this.attributeName = attributeName
    }
    async element(element: any) {
      const attribute = element.getAttribute(this.attributeName)
      if (attribute) {
        const url = new URL(attribute, c.req.url)
        const generatedURL = await generateSignedURL(url, {
          secretKey,
          expirationMs: 1000 * expirationSec
        })
        element.setAttribute(this.attributeName, generatedURL.toString())
      }
    }
  }

  const rewriter = new HTMLRewriter().on('img', new AttributeRewriter('src'))
  c.res = rewriter.transform(c.res)
})

app.get('/', (c) => {
  return c.html(
    html`<html>
      <body>
        <h1>SignedRequest Middleware Demo</h1>
        <img src="/static/images/hono-title.png" width="300" />
      </body>
    </html>`
  )
})

export default app
