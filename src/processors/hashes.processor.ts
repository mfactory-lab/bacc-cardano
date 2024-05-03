import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'
import { AccountJobData, AccountService } from '@bacc/core'
import { Logger } from '@nestjs/common'
import { TX_HASHES_LIMIT, TX_HASHES_QUEUE } from '../constants'
import { CardanoService } from '../services'

@Processor(TX_HASHES_QUEUE)
export class HashesProcessor {
  private readonly logger = new Logger(this.constructor.name)

  constructor(
    private readonly accountService: AccountService,
    private readonly cardanoService: CardanoService,
  ) {}

  @Process()
  async handle(job: Job<AccountJobData>) {
    try {
      this.logger.log(`handle account: ${job.data.publicKey}`)
      const accountId = job.data.id

      const account = await this.accountService.get(accountId)
      if (!account) {
        return this.logger.warn(`account acc: ${job.data.id} ${job.data.publicKey} not found`)
      }

      const hashes = await this.cardanoService.getAccountTransactions({ address: job.data.publicKey, afterBlock: +account.recentTx + 1 })
      if (!hashes.length) {
        return
      }

      await this.cardanoService.addGetTransactionsJob({
        accountId,
        hashes: hashes.map(h => h.tx_hash),
      })

      await this.accountService.setAccountSignatures({
        id: accountId,
        recentTx: String(hashes[hashes.length - 1].block_height),
        oldestTx: account.oldestTx ? account.oldestTx : String(hashes[0].block_height),
      })

      // add next account job if needed
      if (hashes.length === TX_HASHES_LIMIT) {
        await this.cardanoService.addAccountJob({
          id: accountId,
          publicKey: account.publicKey,
        })
      }
    } catch (e) {
      this.logger.warn(`error ${job.id} acc ${job.data.id}: ${e}`)
      throw e
    }
  }
}
