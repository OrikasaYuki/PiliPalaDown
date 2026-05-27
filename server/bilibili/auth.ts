import QRCode from 'qrcode'
import { BiliClient } from './client'
import { saveSessdata, clearSessdata, getSessdata } from '../util/db'
import type { QRInfo } from '../../src/types'

/**
 * Check if the current SESSDATA is valid
 */
export async function checkLogin(client: BiliClient): Promise<boolean> {
  try {
    const res = await client.get<any>('https://api.bilibili.com/x/space/myinfo')
    return res.code === 0
  } catch {
    return false
  }
}

/**
 * Get QR code for login — generates a QR code PNG data URL from the Bilibili login URL
 */
export async function getQRInfo(client: BiliClient): Promise<QRInfo> {
  const res = await client.get<any>('https://passport.bilibili.com/x/passport-login/web/qrcode/generate')
  const data = res.data as { url: string; qrcode_key: string }

  // Generate QR code image from the URL
  const image = await QRCode.toDataURL(data.url, {
    width: 280,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  })

  return { image, key: data.qrcode_key }
}

/**
 * Poll QR code login status
 * Uses the BiliClient which can't extract cookies, so we only check the status code.
 */
export async function getQRStatus(client: BiliClient, qrKey: string): Promise<{ success: boolean; message: string; sessdata?: string }> {
  const params = { qrcode_key: qrKey }
  const res = await client.get<any>('https://passport.bilibili.com/x/passport-login/web/qrcode/poll', params)
  const data = res.data

  if (data.code === 0) {
    return { success: true, message: '登录成功' }
  }

  const messages: Record<number, string> = {
    [-1]: '二维码已过期',
    [-2]: '二维码已失效',
    [-4]: '未扫码',
    [-5]: '已扫码，请点击确认',
  }
  return { success: false, message: messages[data.code] || `状态码: ${data.code}` }
}

/**
 * Perform full QR login flow with cookie extraction via raw fetch.
 * This is used in Electron mode where we can directly call the poll API
 * and extract the SESSDATA cookie from the response headers.
 */
export async function pollQRLogin(client: BiliClient, qrKey: string): Promise<{ success: boolean; message: string }> {
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
  if (body.code !== 0) {
    return { success: false, message: body.message || 'API error' }
  }

  const data = body.data
  if (data.code === 0) {
    // Extract SESSDATA from set-cookie headers
    const setCookie = res.headers.get('set-cookie') || ''
    const match = setCookie.match(/SESSDATA=([^;]+)/)
    if (match) {
      saveSessdata(match[1])
      client.setSessdata(match[1])
      return { success: true, message: '登录成功' }
    }
    return { success: false, message: '获取登录信息失败' }
  }

  const messages: Record<number, string> = {
    [-1]: '二维码已过期',
    [-2]: '二维码已失效',
    [-4]: '未扫码',
    [-5]: '已扫码，请点击确认',
  }
  return { success: false, message: messages[data.code] || `状态码: ${data.code}` }
}

export function logout(client: BiliClient): void {
  clearSessdata()
  client.setSessdata('')
}
