import type { ITransaction } from './transaction'

export type GetTransactionsJobData = {
  accountId: number
  hashes: string[]
}

export type ParseTransactionJobData = {
  accountId: number
  tx: ITransaction
}
