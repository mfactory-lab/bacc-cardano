import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { CardanoTokenListModule } from './module'
import { TokenListCronService } from './services'

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CardanoTokenListModule,
  ],
  providers: [TokenListCronService],
})
export class CardanoTokenListCronModule {}
