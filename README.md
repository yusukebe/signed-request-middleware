# SignedRequest Middleware for Hono

Based on [Cloudflare Docs](https://developers.cloudflare.com/workers/examples/signing-requests/).

## Usage

```ts
import { verifySignedRequest, generateSignedURL } from './middleware'

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
```

## Related projects

* <https://developers.cloudflare.com/workers/examples/signing-requests/>
* <https://hono.dev>

## Author

Yusuke Wada <https://github.com/yusukebe>

## License

MIT
