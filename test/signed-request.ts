import { Hono } from 'hono'
import { generateSignedURL, verifySignedRequest } from '../src'

describe('SignedRequest Middleware', () => {
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

  it('Should return 200 response', async () => {
    let res = await app.request('/generate/foo')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    const verifyUrl = await res.text()
    res = await app.request(verifyUrl)
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
  })

  it('Should return 403 response - Invalid MAC', async () => {
    let res = await app.request('/generate/foo')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    const verifyUrl = await res.text()
    const url = new URL(verifyUrl)
    const expiry = url.searchParams.get('expiry')
    res = await app.request(`/verify/foo?mac=invalid&expiry=${expiry}`)
    expect(res).not.toBeNull()
    expect(res.status).toBe(403)
    expect(await res.text()).toBe('Invalid MAC')
  })

  jest.useFakeTimers()

  it('Should return 403 response - URL expired', async () => {
    let res = await app.request('/generate/foo')
    expect(res).not.toBeNull()
    expect(res.status).toBe(200)
    const verifyUrl = await res.text()

    jest.advanceTimersByTime(1000 * expirationSec + 1)

    res = await app.request(verifyUrl)
    expect(res).not.toBeNull()
    expect(res.status).toBe(403)
    expect(await res.text()).toBe('URL expired')
  })
})
