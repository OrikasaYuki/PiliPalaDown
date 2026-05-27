/**
 * Bilibili WBI signing
 * Reference: https://socialsisteryi.github.io/bilibili-API-collect/docs/misc/sign/wbi.html
 */
import * as crypto from 'crypto'

const MIXIN_KEY_ENC_TABLE = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 37, 12, 52, 56, 7,
  0, 57, 39, 60, 65, 34, 25, 17, 54, 21, 1, 40, 63, 59, 20, 42,
  6, 55, 64, 53, 22, 11, 41, 61, 16, 44, 4, 51, 24, 36, 13, 62,
]

function getMixinKey(orig: string): string {
  let result = ''
  for (const i of MIXIN_KEY_ENC_TABLE) {
    result += orig[i]
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

  const wbiSign = crypto.createHash('md5').update(query + mixinKey).digest('hex')
  sortedParams['w_rid'] = wbiSign
  return sortedParams
}

export async function getWbiKeys(client: { get: <T>(url: string, params?: Record<string, string>) => Promise<any> }): Promise<{ imgKey: string; subKey: string }> {
  const res = await client.get<any>('https://api.bilibili.com/x/web-interface/nav')
  const data = res.data
  const imgUrl = data.wbi_img?.img_url || data.wbi_img?.img_url || ''
  const subUrl = data.wbi_img?.sub_url || data.wbi_img?.sub_url || ''
  const imgMatch = imgUrl.match(/\/bfs\/wbi\/([a-z0-9]+)\./)
  const subMatch = subUrl.match(/\/bfs\/wbi\/([a-z0-9]+)\./)
  if (!imgMatch || !subMatch) throw new Error('Failed to extract WBI keys')
  return { imgKey: imgMatch[1], subKey: subMatch[1] }
}

export async function signParams(
  client: { get: <T>(url: string, params?: Record<string, string>) => Promise<any> },
  params: Record<string, string>
): Promise<Record<string, string>> {
  const keys = await getWbiKeys(client)
  return encryptWbi(params, keys.imgKey, keys.subKey)
}
