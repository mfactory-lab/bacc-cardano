export type CardanoAsset = {
  address: string
  policy_id: string
  asset_name: string | null
  fingerprint: string
  decimals: string
  quantity: string
}

export type CardanoAssetInfo = {
  policy_id: string
  asset_name: string | null
  asset_name_ascii: string
  fingerprint: string
  minting_tx_hash: string
  total_supply: string
  mint_cnt: number
  burn_cnt: number
  creation_time: number
  minting_tx_metadata: { [key: string]: any } | null
  token_registry_metadata: { [key: string]: any } | null
  cip68_metadata: { [key: string]: any } | null
}
