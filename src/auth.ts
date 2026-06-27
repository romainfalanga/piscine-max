// Authentification : hash PBKDF2 (Web Crypto) + sessions par cookie signé

const PBKDF2_ITERATIONS = 100000

function toHex(arr: Uint8Array): string {
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return arr
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256
  )
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(new Uint8Array(bits))}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltHex, hashHex] = stored.split('$')
    if (scheme !== 'pbkdf2') return false
    const iterations = parseInt(iterStr, 10)
    const salt = fromHex(saltHex)
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits']
    )
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
      keyMaterial,
      256
    )
    return toHex(new Uint8Array(bits)) === hashHex
  } catch {
    return false
  }
}

// ---- Session token (HMAC signé) ----
// Format: base64url(payloadJSON).base64url(hmac)

function b64urlEncode(data: Uint8Array): string {
  let str = ''
  for (const b of data) str += String.fromCharCode(b)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function b64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const bin = atob(str)
  const arr = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
  return arr
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data))
  return new Uint8Array(sig)
}

export interface SessionPayload {
  uid: number
  role: string
  name: string
  exp: number
}

export async function createSession(payload: SessionPayload, secret: string): Promise<string> {
  const json = JSON.stringify(payload)
  const p = b64urlEncode(new TextEncoder().encode(json))
  const sig = await hmac(secret, p)
  return `${p}.${b64urlEncode(sig)}`
}

export async function verifySession(token: string, secret: string): Promise<SessionPayload | null> {
  try {
    const [p, sigPart] = token.split('.')
    if (!p || !sigPart) return null
    const expectedSig = await hmac(secret, p)
    const givenSig = b64urlDecode(sigPart)
    if (expectedSig.length !== givenSig.length) return null
    let diff = 0
    for (let i = 0; i < expectedSig.length; i++) diff |= expectedSig[i] ^ givenSig[i]
    if (diff !== 0) return null
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(p))) as SessionPayload
    if (payload.exp < Date.now()) return null
    return payload
  } catch {
    return null
  }
}
