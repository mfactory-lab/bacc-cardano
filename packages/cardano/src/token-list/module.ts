import { RedisModule } from '@liaoliaots/nestjs-redis'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TokenListService } from './services'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        return {
          config: {
            host: cfg.get<string>('REDIS_HOST', 'localhost'),
            port: cfg.get<number>('REDIS_PORT', 6379),
          },
        }
      },
    }),
  ],
  providers: [TokenListService],
  exports: [TokenListService],
})
export class CardanoTokenListModule {}
