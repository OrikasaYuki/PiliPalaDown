/**
 * Server-side BiliClient — adds DB-backed SESSDATA persistence.
 */
import { getSessdata, saveSessdata } from '../util/db'
export { BiliClient } from '../../shared/bilibili/client'
export type { BiliResponse } from '../../shared/bilibili/client'

export function getClient(sessdata?: string) {
  const sd = sessdata || getSessdata() || ''
  const { BiliClient } = require('../../shared/bilibili/client')
  return new BiliClient(sd)
}

export function saveAuthSessdata(sd: string) {
  saveSessdata(sd)
}
