import type { CardanoToken } from '../token-list'

export type IAccountTransaction = {
  tx_hash: string
  epoch_no: number
  block_height: number | null
  block_time: number
}

export type ITransaction = {
  tx_hash: string
  block_hash: string
  block_height: number | null
  epoch_no: number
  epoch_slot: number
  absolute_slot: number
  tx_timestamp: number
  tx_block_index: number
  tx_size: number
  total_output: string
  fee: string
  deposit: string
  invalid_before: string | null
  invalid_after: string | null
  collateral_inputs: UTxO[] | null
  collateral_output: UTxO | null
  reference_inputs: UTxO[] | null
  inputs: UTxO[]
  outputs: UTxO[]
  withdrawals: StakeWithdrawal[] | null
  assets_minted: Asset[] | null
  metadata: any | null
  certificates: Certificate[] | null
  native_scripts: NativeScript[]
  plutus_contracts: PlutusContract[] | null
}

type PlutusContract = {
  address: string | null
  script_hash: string
  bytecode: string
  size: number
  valid_contract: boolean
  input: PlutusContractInput
}

type PlutusContractInput = {
  redeemer: Redeemer
  datum: Datum
}

type Redeemer = {
  purpose: 'spend' | 'mint' | 'cert' | 'reward'
  fee: string
  unit: RedeemerUnit
  datum: Datum
}

type RedeemerUnit = {
  steps: string | number | null
  mem: string | number | null
}

type Datum = {
  hash: string | null
  value: any | null
}

type NativeScript = {
  script_hash: string
  script_json: any
}

type Certificate = {
  index: number | null
  type: string
  info: any | null
}

export type StakeWithdrawal = {
  amount: string
  stake_addr: string
}

type PaymentAddr = {
  bech32: string
  cred: string
}

type InlineDatum = {
  bytes: string
  value: any | null
}

type ReferenceScript = {
  hash: string
  size: number
  type: string
  bytes: string
  value: any
}

export type Asset = {
  policy_id: string
  asset_name: string | null
  fingerprint: string
  decimals: number
  quantity: string
}

export type UTxO = {
  payment_addr: PaymentAddr
  stake_addr: string | null
  tx_hash: string
  tx_index: number
  value: string
  datum_hash: string | null
  inline_datum: InlineDatum
  reference_script: ReferenceScript
  asset_list: Asset[] | null
}

export type ParsedTxAsset = {
  policy_id: string
  name: string
  decimals: number
  // symbol from hex name. TODO: check if it right
  symbol: string
}

// TODO: clarify types
export enum TransactionType {
  TRANSFER = 'transfer',
  BURN = 'burn',
  MINT = 'mint',
  SWAP = 'swap',
  STAKE = 'stake',
  WITHDRAW_STAKE = 'withdrawStake',
  UNKNOWN = 'unknown',
  FEE = 'fee',
}

export type Transfer = {
  amount: number
  from: string
  instructionType: string
  to: string
  tokenMint: string
  tokenSymbol: string
  metadata?: Partial<CardanoToken>
}
