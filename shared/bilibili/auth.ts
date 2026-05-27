/**
 * Platform-independent Bilibili auth (QR login).
 * Takes a sessdata callback for storage — platform decides how to persist.
 */
import { BiliClient } from './client'
import type { QRInfo } from '../../src/types'

export async function checkLogin(client: BiliClient): Promise<boolean> {
  try {
    const res = await client.get<any>('https://api.bilibili.com/x/space/myinfo')
    return res.code === 0
  } catch {
    return false
  }
}

export async function getQRInfo(client: BiliClient): Promise<{ url: string; qrcode_key: string }> {
  const res = await client.get<any>('https://passport.bilibili.com/x/passport-login/web/qrcode/generate')
  return res.data as { url: string; qrcode_key: string }
}

/**
 * Poll QR login status. Returns { success, message }.
 * Electron also returns sessdata from cookies; web/Android uses the callback.
 */
export async function pollQRLogin(
  client: BiliClient,
  qrKey: string,
  onSessdata?: (sd: string) => void
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(
    `https://passport.bilibili.com/x/passport-login/web/qrcode/poll?qrcode_key=${qrKey}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.bilibili.com',
      },
    }
  )
  const body = await res.json()
  if (body.code !== 0) return { success: false, message: body.message || 'API error' }

  const data = body.data
  if (data.code === 0) {
    const setCookie = res.headers.get('set-cookie') || ''
    const match = setCookie.match(/SESSDATA=([^;]+)/)
    if (match) {
      const sd = match[1]
      client.setSessdata(sd)
      onSessdata?.(sd)
      return { success: true, message: '登录成功' }
    }
    return { success: false, message: '获取登录信息失败' }
  }

  const messages: Record<number, string> = {
    [-1]: '二维码已过期', [-2]: '二维码已失效',
    [-4]: '未扫码', [-5]: '已扫码，请点击确认',
  }
  return { success: false, message: messages[data.code] || `状态码: ${data.code}` }
}

export function getUserInfo(client: BiliClient): Promise<{
  name: string; face: string; mid: number; vipType: number; vipStatus: number
} | null> {
  return client.get<any>('https://api.bilibili.com/x/space/myinfo')
    .then(res => {
      const d = res.data
      return { name: d.name, face: d.face, mid: d.mid, vipType: d.vip?.type || 0, vipStatus: d.vip?.status || 0 }
    })
    .catch(() => null)
}
