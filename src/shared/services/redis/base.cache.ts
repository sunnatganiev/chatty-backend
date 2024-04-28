import { config } from '@root/config';
import Logger from 'bunyan';
import { createClient, type RedisClientType } from 'redis';

// export type RedisClient = ReturnType<typeof createClient>;

export abstract class BaseCache {
  client: RedisClientType;
  log: Logger;

  constructor(cacheName: string) {
    this.client = createClient({ url: config.REDIS_HOST });
    this.log = config.createLogger(cacheName);
    this.cacheError();
  }

  private cacheError(): void {
    this.client.on('error', (error: unknown) => {
      this.log.error(error);
    });
  }
}
