import axios from 'axios'
import { KOIOS_API_URL } from '../config/common'
import { CardanoAsset, CardanoAssetInfo } from '@/interfaces/api'

export async function getCardanoWalletBalance(address: string, token: string) {
  const { data } = await axios.post(`${KOIOS_API_URL}/address_info`, { _addresses: [address] }, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  return data[0]?.balance
}

export async function getCadranoWalletAssets(_addresses: string[], token: string): Promise<CardanoAsset[]> {
  const { data } = await axios.post(`${KOIOS_API_URL}/address_assets`, { _addresses }, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })
  return data
}

export async function getCadranoAssetInfo(_asset_list: Array<string[]>, token: string): Promise<CardanoAssetInfo[]> {
  const { data } = await axios.post(`${KOIOS_API_URL}/asset_info`, { _asset_list }, {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  })

  return data
}