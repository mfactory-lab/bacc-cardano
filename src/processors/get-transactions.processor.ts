import { InjectQueue, Process, Processor } from '@nestjs/bull'
import { Job, Queue } from 'bull'
import { AccountService, DEFAULT_JOB_OPTS } from '@bacc/core'
import { Logger } from '@nestjs/common'
import { CARDANO_BLOCKCHAIN, GET_TRANSACTION_QUEUE, PARSE_TRANSACTION_QUEUE } from '../constants'
import { CardanoService } from '../services'
import { GetTransactionsJobData, ParseTransactionJobData } from '../interfaces'

@Processor(GET_TRANSACTION_QUEUE)
export class GetTransactionsProcessor {
  private readonly logger = new Logger(this.constructor.name)

  constructor(
    private readonly cardanoService: CardanoService,
    @InjectQueue(PARSE_TRANSACTION_QUEUE) private transactionQueue: Queue<ParseTransactionJobData>,
    private readonly accountService: AccountService,
  ) {}

  @Process()
  async handleHashes(job: Job<GetTransactionsJobData>) {
    try {
      const { accountId, hashes } = job.data
      const hashesToHandle = await this.accountService.filterHandledTxs(CARDANO_BLOCKCHAIN, hashes, accountId)
      const transactions = (await this.cardanoService.getTransactionsInfo(hashesToHandle))
        .filter(tx => !!tx)

      this.logger.log(`Handle acc: ${accountId} transactions hashes: ${transactions.length} / ${hashesToHandle.length} / ${hashes.length}`)
      await this.accountService.incrementTxCount({ id: accountId, field: 'txTotal', amount: transactions.length })

      for (const tx of transactions) {
        this.addParseJob({ accountId, tx }).then()
      }
    } catch (e) {
      this.logger.warn(`handleSignatures error ${job.id} acc ${job.data.accountId}: ${e}`)
      throw e
    }
  }

  async addParseJob(data: ParseTransactionJobData) {
    await this.transactionQueue.add(
      data,
      {
        ...DEFAULT_JOB_OPTS,
        priority: 300,
      },
    ).then()
  }
}
