/**
 * Bilibili WBI signing — platform-independent.
 */
import { BiliClient } from './client'

const MIXIN_KEY_ENC_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 37, 12, 52, 56, 7,
  0, 57, 39, 60, 65, 34, 25, 17, 54, 21, 1, 40, 63, 59, 20, 42,
  6, 55, 64, 53, 22, 11, 41, 61, 16, 44, 4, 51, 24, 36, 13, 62,
]

function getMixinKey(orig: string): string {
  let result = ''
  for (const i of MIXIN_KEY_ENC_TABLE) {
    result += orig[i] || ''
  }
  return result.slice(0, 32)
}

function encryptWbi(params: Record<string, string>, imgKey: string, subKey: string): Record<string, string> {
  const mixinKey = getMixinKey(imgKey + subKey)
  const currTime = Math.round(Date.now() / 1000)
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key].replace(/[!'()*]/g, '')
      return acc
    }, {} as Record<string, string>)

  sortedParams['wts'] = currTime.toString()
  const query = Object.entries(sortedParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  const wbiSign = md5(query + mixinKey)
  sortedParams['w_rid'] = wbiSign
  return sortedParams
}

// Simple MD5 implementation (no Node.js crypto dependency)
function md5(str: string): string {
  const hex = (n: number) => (n < 16 ? '0' : '') + n.toString(16)

  // Convert string to UTF-8 bytes
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    let code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }

  // Append padding
  const origLen = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  for (let i = 0; i < 8; i++) bytes.push((origLen >>> (i * 8)) & 0xff)

  // Process 512-bit blocks
  const K = [0x67452301, 0xefcdab89, 0x98badcfe, 0x10325476]
  const rotate = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0

  const F = (x: number, y: number, z: number) => (x & y) | (~x & z)
  const G = (x: number, y: number, z: number) => (x & z) | (y & ~z)
  const H = (x: number, y: number, z: number) => x ^ y ^ z
  const I = (x: number, y: number, z: number) => y ^ (x | ~z)
  const T = Math.round

  const S: number[] = []
  for (let i = 0; i < 64; i++) {
    S[i] = Math.abs(Math.sin(i + 1)) * 0x100000000
  }

  for (let block = 0; block < bytes.length; block += 64) {
    const X: number[] = []
    for (let i = 0; i < 16; i++) {
      X[i] = bytes[block + i * 4] | (bytes[block + i * 4 + 1] << 8) |
             (bytes[block + i * 4 + 2] << 16) | (bytes[block + i * 4 + 3] << 24)
    }

    let [a, b, c, d] = K

    for (let i = 0; i < 64; i++) {
      let f: number, g: number
      if (i < 16) { f = F(b, c, d); g = i }
      else if (i < 32) { f = G(b, c, d); g = (5 * i + 1) % 16 }
      else if (i < 48) { f = H(b, c, d); g = (3 * i + 5) % 16 }
      else { f = I(b, c, d); g = (7 * i) % 16 }

      const temp = (d + rotate(a + f + S[i] + X[g], [7, 12, 17, 22][i % 4])) >>> 0
      d = c; c = b; b = a; a = temp
    }

    K[0] = (K[0] + a) >>> 0
    K[1] = (K[1] + b) >>> 0
    K[2] = (K[2] + c) >>> 0
    K[3] = (K[3] + d) >>> 0
  }

  // Output as hex
  return K.map(n => hex((n >> 24) & 0xff) + hex((n >> 16) & 0xff) +
                    hex((n >> 8) & 0xff) + hex(n & 0xff)).join('')
}

export async function getWbiKeys(client: BiliClient): Promise<{ imgKey: string; subKey: string }> {
  const res = await client.get<any>('https://api.bilibili.com/x/web-interface/nav')
  const data = res.data
  const imgUrl = data?.wbi_img?.img_url || data?.wbi_img?.img_url || ''
  const subUrl = data?.wbi_img?.sub_url || data?.wbi_img?.sub_url || ''
  const imgMatch = imgUrl.match(/\/bfs\/wbi\/([a-z0-9]+)\./)
  const subMatch = subUrl.match(/\/bfs\/wbi\/([a-z0-9]+)\./)
  if (!imgMatch || !subMatch) throw new Error('Failed to extract WBI keys')
  return { imgKey: imgMatch[1], subKey: subMatch[1] }
}

export async function signParams(
  client: BiliClient,
  params: Record<string, string>
): Promise<Record<string, string>> {
  const keys = await getWbiKeys(client)
  return encryptWbi(params, keys.imgKey, keys.subKey)
}
