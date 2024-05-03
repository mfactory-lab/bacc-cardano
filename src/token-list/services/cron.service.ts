import { Injectable } from '@nestjs/common'
import { Cron, CronExpression, Timeout } from '@nestjs/schedule'
import type { TokenListService } from './token-list.service'

@Injectable()
export class TokenListCronService {
  constructor(
    private tokenListService: TokenListService,
  ) {
  }

  @Timeout(500)
  async init() {
    await this.tokenListService.process()
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async fetchTokenList() {
    await this.tokenListService.process()
  }
}
