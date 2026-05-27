/**
 * Server-side auth — adds DB-backed SESSDATA to shared auth.
 */
import { BiliClient } from '../../shared/bilibili/client'
import { saveSessdata, clearSessdata, getSessdata } from '../util/db'

export { checkLogin, getQRInfo, getUserInfo } from '../../shared/bilibili/auth'

export async function pollQRLogin(client: BiliClient, qrKey: string): Promise<{ success: boolean; message: string }> {
  const { pollQRLogin: sharedPoll } = await import('../../shared/bilibili/auth')
  return sharedPoll(client, qrKey, (sd) => saveSessdata(sd))
}

export function logout(client: BiliClient): void {
  clearSessdata()
  client.setSessdata('')
}

export { BiliClient }
