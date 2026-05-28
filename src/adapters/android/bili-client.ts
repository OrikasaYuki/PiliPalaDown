/**
 * Android HTTP client wrapper.
 * Uses Capacitor's native HTTP to bypass WebView CORS restrictions.
 * Implements the same interface as BiliClient for compatibility with shared modules.
 */
import { CapacitorHttp, HttpResponse } from '@capacitor/core'

export class AndroidBiliClient {
  private sessdata: string = ''

  constructor(sessdata?: string) {
    this.sessdata = sessdata || ''
  }

  get isLoggedIn(): boolean {
    return !!this.sessdata
  }

  setSessdata(sd: string) {
    this.sessdata = sd
  }

  getSessdata(): string {
    return this.sessdata
  }

  private makeHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://www.bilibili.com',
    }
    if (this.sessdata) {
      headers['Cookie'] = `SESSDATA=${this.sessdata}`
    }
    return headers
  }

  async get<T>(url: string, params?: Record<string, string>): Promise<{ code: number; message: string; data?: T; result?: T }> {
    const fullUrl = params ? `${url}?${new URLSearchParams(params).toString()}` : url

    let data: any
    try {
      const res: HttpResponse = await CapacitorHttp.get({ url: fullUrl, headers: this.makeHeaders() })
      data = res.data
    } catch {
      // Fallback to fetch if CapacitorHttp is unavailable
      const res = await fetch(fullUrl, { headers: this.makeHeaders(), redirect: 'follow' })
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
      data = await res.json()
    }

    if (data.code !== 0) {
      throw new Error(data.message || `API error: ${data.code}`)
    }
    return data
  }

  /** Like get() but returns raw body + headers — used by pollQRLogin */
  async getWithHeaders<T>(url: string): Promise<{ data: T; headers: Record<string, string> }> {
    const res: HttpResponse = await CapacitorHttp.get({ url, headers: this.makeHeaders() })
    return { data: res.data as T, headers: res.headers as Record<string, string> }
  }

  async getRaw(url: string, params?: Record<string, string>): Promise<Response> {
    const fullUrl = params ? `${url}?${new URLSearchParams(params).toString()}` : url
    return fetch(fullUrl, { headers: this.makeHeaders() })
  }
}
