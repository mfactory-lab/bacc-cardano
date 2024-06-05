import { getCadranoAssetInfo, getCadranoWalletAssets, getCardanoWalletBalance, prepareAssets } from '@/utils'
import type { CardanoAsset, CardanoAssetInfo } from '@/types'

export function useCardanoApi() {
  const getCardanoBalance = async (addr: string, token: string) => {
    try {
      const balance = await getCardanoWalletBalance(addr, token)
      return balance
    } catch (err) {
      console.log(err)
    }
  }

  const getCardanoAssets = async (addresses: string[], token: string): Promise<CardanoAsset[] | undefined> => {
    try {
      const data = await getCadranoWalletAssets(addresses, token)
      return data
    } catch (err) {
      console.log(err)
    }
  }

  const getAssetInfo = async (assets: CardanoAsset[], token: string): Promise<CardanoAssetInfo[] | undefined> => {
    try {
      if (!assets || assets.length === 0) {
        return
      }
      const prepareData = assets.map(asset => prepareAssets(asset))
      const walletAssets = await getCadranoAssetInfo(prepareData, token)
      return walletAssets
    } catch (err) {
      console.log(err)
    }
  }
  return {
    getCardanoBalance,
    getCardanoAssets,
    getAssetInfo,
  }
}
