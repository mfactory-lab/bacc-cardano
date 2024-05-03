import { Logger } from '@nestjs/common'
import { OnQueueFailed, Process, Processor } from '@nestjs/bull'
import type { Job } from 'bull'
import type { AccountService, TransactionService } from '@bacc/core'
import type { PriceService } from '@bacc/price-collector'
import { ADA_SYMBOL, CARDANO_BLOCKCHAIN, PARSE_TRANSACTION_QUEUE } from '../constants'
import type { ParseTransactionJobData } from '../types'
import type { CardanoService } from '../services'

@Processor(PARSE_TRANSACTION_QUEUE)
export class ParseTransactionProcessor {
  private readonly logger = new Logger(this.constructor.name)

  constructor(
    private readonly transactionService: TransactionService,
    private readonly accountService: AccountService,
    private readonly priceService: PriceService,
    private readonly cardanoService: CardanoService,
  ) {}

  @Process({ concurrency: 15 })
  async handleTransaction(job: Job<ParseTransactionJobData>) {
    const { accountId, tx } = job.data
    try {
      const { transfers, assetsAll } = await this.cardanoService.parseTx(tx)

      const txTimestamp = tx.tx_timestamp * 1000
      const timestamp = new Date(txTimestamp)

      for (const transfer of transfers) {
        const entity = await this.transactionService.saveTransaction({
          signature: tx.tx_hash,
          blockchain: CARDANO_BLOCKCHAIN,
          from: transfer.from,
          to: transfer.to,
          tokenMint: transfer.tokenMint,
          tokenSymbol: transfer.tokenSymbol,
          instructionOrder: transfer.instructionType === 'fee' ? -1 : 0,
          instructionType: transfer.instructionType,
          amount: transfer.amount,
          metadata: transfer.metadata,
          timestamp,
        })
        const symbol = (!transfer.tokenMint && transfer.tokenSymbol === ADA_SYMBOL)
          ? ADA_SYMBOL
          : assetsAll[`${transfer.tokenMint ? `${transfer.tokenMint}-` : ''}${transfer.tokenSymbol}`]?.symbol
        if (symbol) {
          await this.priceService.addPriceJob({ transactionId: entity.id, symbol, startTime: txTimestamp })
        }
      }

      await Promise.all([
        this.accountService.incrementTxCount({ id: accountId, field: 'txHandled' }),
        this.accountService.incrementTxCount({ id: accountId, field: 'txParsed' }),
      ])
    } catch (e) {
      this.logger.warn(`handleTransaction error ${job.id} tx ${tx.tx_hash}: ${e}`)
      throw e
    }
  }

  @OnQueueFailed()
  async handleQueueFailed(job: Job, err: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${err.message}`)
    const { accountId } = job.data

    if (job.attemptsMade >= (job.opts.attempts ?? 0)) {
      /**
       * increment txHandled, but not txParsed
       */
      await this.accountService.incrementTxCount({ id: accountId, field: 'txHandled' })
    }
  }
}
