import 'dotenv/config';
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 *
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly pool: Pool;

  /**
   *
   */
  constructor() {
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call */
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL is missing in backend/.env');
    }

    const pool = new Pool({
      connectionString,
      // якщо раптом буде SSL-ошибка — напиши, дам точну правку під Supabase
      // ssl: { rejectUnauthorized: false },
    });

    const adapter = new PrismaPg(pool);

    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
    super({ adapter } as any); // ✅ ОЦЕ КЛЮЧ
    this.pool = pool;
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
  }

  /**
   *
   */
  async onModuleInit() {
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    await (this.$connect as any)();
    /* eslint-enable @typescript-eslint/no-unsafe-call */
  }

  /**
   *
   */
  async onModuleDestroy() {
    /* eslint-disable @typescript-eslint/no-unsafe-call */
    await (this.$disconnect as any)();
    /* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
    await (this.pool.end as any)();
    /* eslint-enable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
  }
}
