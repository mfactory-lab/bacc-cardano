import { ITransaction } from './transaction.interface'

export type GetTransactionsJobData = {
  accountId: number
  hashes: string[]
}

export type ParseTransactionJobData = {
  accountId: number
  tx: ITransaction
}
