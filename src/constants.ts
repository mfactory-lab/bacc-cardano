export const CARDANO_BLOCKCHAIN = 'cardano'

export const ADA_SYMBOL = 'ADA'
export const ADA_DECIMALS = 6

export const COIOS_API_URL = 'https://api.koios.rest/api/v1'

export const TX_HASHES_QUEUE = `${CARDANO_BLOCKCHAIN}_tx_hashes_queue`
export const GET_TRANSACTION_QUEUE = `${CARDANO_BLOCKCHAIN}_get_transactions_queue`
export const PARSE_TRANSACTION_QUEUE = `${CARDANO_BLOCKCHAIN}_parse_transactions_queue`
export const SAVE_TRANSACTION_QUEUE = `${CARDANO_BLOCKCHAIN}_save_transactions_queue`

// max = 1000. Smaller values are used to avoid response timeout
export const TX_HASHES_LIMIT = 1000
export const TX_LIMIT = 100

export const MULTI_ACCOUNT = 'multiAccount'
export const LOGO_BASE_URL = 'https://spectrum.fi/'
