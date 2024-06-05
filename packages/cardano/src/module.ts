import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { HttpModule } from '@nestjs/axios'
import { BullModule } from '@nestjs/bull'
import { BaccCoreModule } from '@bacc/core'
import { PriceCollectorModule } from '@bacc/price-collector'
import { CardanoService } from './services'
import { GET_TRANSACTION_QUEUE, KOIOS_API_URL, PARSE_TRANSACTION_QUEUE, TX_HASHES_QUEUE } from './constants'
import { GetTransactionsProcessor, HashesProcessor, ParseTransactionProcessor } from './processors'
import { CardanoTokenListModule } from './token-list'

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule,
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (cfg: ConfigService) => ({
        baseURL: KOIOS_API_URL,
        headers: {
          authorization: `Bearer ${cfg.get('KOIOS_API_TOKEN')}`,
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: TX_HASHES_QUEUE,
        // TODO: single limit for this and GET_TRANSACTION_QUEUE queues: 100/10s
        limiter: { max: 10, duration: 10000 },
      },
      {
        name: GET_TRANSACTION_QUEUE,
        limiter: { max: 40, duration: 10000 },
      },
      {
        name: PARSE_TRANSACTION_QUEUE,
        limiter: { max: 40, duration: 10000 },
      },
    ),
    CardanoTokenListModule,
    BaccCoreModule,
    PriceCollectorModule,
  ],
  controllers: [],
  providers: [
    CardanoService,
    HashesProcessor,
    GetTransactionsProcessor,
    ParseTransactionProcessor,
  ],
  exports: [
    CardanoService,
  ],
})
export class BaccCardanoModule { }
