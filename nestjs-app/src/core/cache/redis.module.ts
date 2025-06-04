import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-store';

@Module({
    imports: [
        NestCacheModule.registerAsync({
            isGlobal: true,
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => {
                const store = await redisStore({
                    socket: {
                        host: configService.get<string>('REDIS_HOST'),
                        port: parseInt(configService.get<string>('REDIS_PORT')),
                    },
                    ttl: configService.get<number>('CACHE_TTL'), 
                });
                return {
                    store: store,
                };
            },
            inject: [ConfigService],
        }),
    ],
})
export class RedisModule { }