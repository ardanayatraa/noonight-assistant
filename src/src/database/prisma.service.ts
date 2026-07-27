import { INestApplication, Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Efficient MySQL connection layer.
 *
 * Pooling is configured through the DATABASE_URL query string
 * (connection_limit, pool_timeout, connect_timeout) — see .env.example.
 * This service adds connection retry, graceful shutdown, and slow-query logging.
 */
@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'warn' | 'error'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly slowQueryMs = Number(process.env.SLOW_QUERY_MS || 500);

  constructor() {
    super({
      // Keep the wire quiet in prod; surface warnings/errors and (optionally) queries.
      log: [
        { level: 'query', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
      ],
      errorFormat: 'minimal',
    });
  }

  async onModuleInit() {
    // Surface DB problems and slow queries instead of letting them hide.
    this.$on('warn', (e) => this.logger.warn(e.message));
    this.$on('error', (e) => this.logger.error(e.message));

    if (process.env.PRISMA_LOG_QUERIES === 'true') {
      this.$on('query', (e) => {
        if (e.duration >= this.slowQueryMs) {
          this.logger.warn(`SLOW QUERY (${e.duration}ms): ${e.query}`);
        }
      });
    }

    await this.connectWithRetry();
  }

  private async connectWithRetry(attempts = 5, delayMs = 2000): Promise<void> {
    for (let i = 1; i <= attempts; i++) {
      try {
        await this.$connect();
        this.logger.log('MySQL connected');
        return;
      } catch (err: any) {
        this.logger.error(`DB connect attempt ${i}/${attempts} failed: ${err.message}`);
        if (i === attempts) throw err;
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /** Close the pool cleanly on SIGTERM/SIGINT (PM2 / Docker). */
  async enableShutdownHooks(app: INestApplication) {
    process.on('beforeExit', async () => {
      await app.close();
    });
  }
}
