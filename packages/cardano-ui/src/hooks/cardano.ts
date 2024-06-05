import type { ChildrenAsset } from '@bacc/ui'
import { useCardanoApi } from './cardanoApi'
import { bytesToBase64, generateImgLink, normalizeADA } from '@/utils'
import { cardanoInfo } from '@/config'
import adaIcon from '@/assets/img/token/ada.png'
import type { CardanoAsset, CardanoAssetInfo } from '@/types'

export function useCardano() {
  const { getCardanoAssets, getAssetInfo, getCardanoBalance } = useCardanoApi()

  /**
   * @param addresses
   * wallet addresses(hex)
   */
  const getAllTokens = async (addresses: string[], token: string): Promise<CardanoAsset[] | undefined> => {
    try {
      const data = await getCardanoAssets(addresses, token)
      return data
    } catch (err) {
      console.log(err)
    }
  }

  /**
   * Retrieves information about a token.
   * @param data
   * Data - an array of strings that represent id:
   * 1. policyID.
   * 2. asset name(hex).
   */
  const getTokenInfo = async (data: CardanoAsset[] | undefined, token: string): Promise<CardanoAssetInfo[] | undefined> => {
    if (!data) {
      return
    }
    try {
      const assets = await getAssetInfo(data, token)
      return assets
    } catch (err) {
      console.log(err)
    }
  }

  function prepareChildren(data: {
    name: string
    symbol: string
    balance: number
    image: string
    isNft: boolean
    mint?: string
    metadata?: { [key: string]: string }
    tokenAccount?: string
  }): ChildrenAsset {
    return {
      id: data.name,
      balance: data.balance,
      mint: data?.mint,
      tokenAccount: data?.tokenAccount,
      blockchain: cardanoInfo.label,
      metadata: {
        ...data?.metadata,
        image: data.isNft ? generateImgLink(data.image) : data.image,
        isNft: data.isNft,
        name: data.name,
        symbol: data.symbol || data.name,
      },
    }
  }
  function findLastNestedObjectsWithFieldImage(asset) {
    const results: any = []

    function traverse(node) {
      if (typeof node === 'object' && node !== null) {
        if ('image' in node) {
          const prepareNft = prepareChildren({
            name: node?.name,
            symbol: node?.name,
            balance: asset?.mint_cnt,
            image: node?.image,
            isNft: true,
            mint: asset?.fingerprint,
            metadata: {
              ...node,
              policy_id: asset.policy_id,
            },
          })
          results.push(prepareNft)
          return
        }
        for (const key in node) {
          traverse(node[key])
        }
      }
    }

    traverse(asset)
    return results
  }

  const generateAccountChildren = async (
    assetsInfo: CardanoAssetInfo[] | undefined,
    assets: CardanoAsset[] | undefined,
    address: string,
    token: string) => {
    if (!assetsInfo || !assets) {
      return
    }
    try {
      const children: { [key: string]: ChildrenAsset[] } = {
        assets: [],
      }
      const nfts: { [key: string]: ChildrenAsset[] }[] = []
      assetsInfo.forEach((asset) => {
        if (!asset?.token_registry_metadata && asset.mint_cnt === 1) {
          const nft = findLastNestedObjectsWithFieldImage(asset)
          nfts.push(nft)
        } else {
          const _asset = asset.token_registry_metadata
          const image = bytesToBase64(_asset?.logo)
          const currentAsset = assets.find(a => a.policy_id === asset.policy_id)
          let balance = 0
          if (currentAsset && currentAsset.quantity) {
            const quantity = Number(currentAsset.quantity)
            const decimals = Number(currentAsset.decimals)
            if (!Number.isNaN(quantity) && quantity > 0) {
              balance = normalizeADA(quantity, decimals)
            }
          }
          const prepareAsset = prepareChildren({
            name: _asset?.name,
            symbol: _asset?.ticker,
            balance,
            image,
            isNft: false,
            mint: asset?.fingerprint,
            tokenAccount: asset?.policy_id,
          })

          children.assets.push(prepareAsset)
        }
      })

      const adaBalance = await getCardanoBalance(address, token)
      let balance = 0
      if (adaBalance) {
        const quantity = Number(adaBalance)
        if (!Number.isNaN(quantity) && quantity > 0) {
          balance = normalizeADA(quantity)
        }
      }

      children.assets.unshift(prepareChildren({
        name: 'Cardano',
        symbol: 'ADA',
        balance,
        image: adaIcon,
        isNft: false,
      }),
      )

      return { ...children, nfts: nfts.flat() }
    } catch (err) {
      console.log(err)
    }
  }
  return {
    getAllTokens,
    getTokenInfo,
    generateAccountChildren,
  }
}
