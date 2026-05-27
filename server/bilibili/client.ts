import { getSessdata } from '../util/db'

export interface BiliResponse<T = any> {
  code: number
  message: string
  data?: T
  result?: T
}

export class BiliClient {
  private sessdata: string

  constructor(sessdata?: string) {
    this.sessdata = sessdata || getSessdata() || ''
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

  async get<T>(url: string, params?: Record<string, string>): Promise<BiliResponse<T>> {
    const searchParams = new URLSearchParams(params || {})
    const fullUrl = params ? `${url}?${searchParams.toString()}` : url

    const res = await fetch(fullUrl, {
      headers: this.makeHeaders(),
      redirect: 'follow',
    })

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const body = await res.json()
    if (body.code !== 0) {
      throw new Error(body.message || `API error: ${body.code}`)
    }
    return body
  }

  async getRaw(url: string, params?: Record<string, string>): Promise<Response> {
    const searchParams = new URLSearchParams(params || {})
    const fullUrl = params ? `${url}?${searchParams.toString()}` : url
    return fetch(fullUrl, { headers: this.makeHeaders() })
  }

  private makeHeaders(): Record<string, string> {
    return {
      'Cookie': `SESSDATA=${this.sessdata}`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.bilibili.com',
    }
  }
}

// Singleton for convenience
let _client: BiliClient | null = null

export function getClient(): BiliClient {
  if (!_client) {
    _client = new BiliClient()
  }
  return _client
}

export function resetClient(sessdata?: string) {
  _client = sessdata ? new BiliClient(sessdata) : new BiliClient()
}
