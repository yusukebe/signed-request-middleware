import { MiddlewareHandler } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { encodeBase64 } from 'hono/utils/encode'

export const verifySignedRequest = (options: { secretKey: string }): MiddlewareHandler => {
  const handler: MiddlewareHandler = async (c, next) => {
    const encoder = new TextEncoder()
    const secretKeyData = encoder.encode(options.secretKey)

    const { mac, expiry } = c.req.query()

    if (!mac || !expiry) {
      throw new HTTPException(403, {
        res: exceptionResponse('Missing query parameter')
      })
    }

    const key = await crypto.subtle.importKey('raw', secretKeyData, { name: 'HMAC', hash: 'SHA-256' }, false, [
      'verify'
    ])
    const expiryNumber = Number(expiry)

    const dataToAuthenticate = `${c.req.path}@${expiryNumber}`
    let receivedMac: Uint8Array
    try {
      receivedMac = byteStringToUint8Array(atob(mac))
    } catch (e) {
      throw new HTTPException(403, {
        res: exceptionResponse('Invalid sign')
      })
    }

    const verified = await crypto.subtle.verify('HMAC', key, receivedMac, encoder.encode(dataToAuthenticate))

    if (!verified) {
      throw new HTTPException(403, {
        res: exceptionResponse('Invalid MAC')
      })
    }

    if (Date.now() > expiryNumber) {
      throw new HTTPException(403, {
        res: exceptionResponse('URL expired')
      })
    }

    await next()
  }

  return handler
}

export const generateSignedURL = async (
  url: URL,
  options: {
    secretKey: string
    expirationMs: number
  }
) => {
  const encoder = new TextEncoder()
  const secretKeyData = encoder.encode(options.secretKey)
  const key = await crypto.subtle.importKey('raw', secretKeyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  const expirationMs = options.expirationMs
  const expiry = Date.now() + expirationMs
  const dataToAuthenticate = `${url.pathname}@${expiry}`

  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(dataToAuthenticate))
  const base64Mac = encodeBase64(mac)

  url.searchParams.set('mac', base64Mac)
  url.searchParams.set('expiry', expiry.toString())

  return url
}

const exceptionResponse = (message: string) => {
  return new Response(message, {
    status: 403
  })
}

const byteStringToUint8Array = (byteString: string) => {
  const ui = new Uint8Array(byteString.length)
  for (let i = 0; i < byteString.length; ++i) {
    ui[i] = byteString.charCodeAt(i)
  }
  return ui
}
