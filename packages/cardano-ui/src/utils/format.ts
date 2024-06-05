import { UNITS_PER_ADA } from '@/config'

export function normalizeADA(amount: number, decimals?: number) {
  const multiplier = decimals ? 10 ** decimals : UNITS_PER_ADA
  return amount / multiplier
}

export function prepareAssets(asset: { [key: string]: any }): string[] {
  return [asset?.policy_id, asset?.asset_name]
}

export function bytesToBase64(bytes: string) {
  return `data:image/png;base64,${bytes}`
}
