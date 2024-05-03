import { Injectable, Logger } from '@nestjs/common'
import { InjectRedis } from '@liaoliaots/nestjs-redis'
import type { Redis } from 'ioredis'
import axios from 'axios'
import type { CardanoToken } from '../types'

const KEY_PREFIX = 'cardano-token-list:'

@Injectable()
export class TokenListService {
  private readonly logger = new Logger(this.constructor.name)

  constructor(
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async process() {
    try {
      this.logger.debug('Processing cardano tokens...')

      const tokenList = await this.fetchTokenList()

      this.logger.debug(`Found ${tokenList.length} tokens...`)

      for (const tokenData of tokenList) {
        await this.saveTokenData(tokenData)
      }
      this.logger.debug('Processing cardano tokens finished...')
    } catch (error) {
      this.logger.error(error)
    }
  }

  saveTokenData(tokenData: CardanoToken) {
    const key = tokenData.subject
    return this.redis.set(KEY_PREFIX + key, JSON.stringify(tokenData))
  }

  async getTokenData(tokenId: string): Promise<CardanoToken> {
    const data = await this.redis.get(KEY_PREFIX + tokenId)
    return data ? JSON.parse(data) : ''
  }

  async fetchTokenList(): Promise<CardanoToken[]> {
    const res = await axios.get(`https://spectrum.fi/cardano-token-list.json`)
    if (res.status === 200 && res.data) {
      return res.data.tokens
    }
    this.logger.warn('Failed to get cardano tokens')
    return []
  }
}
