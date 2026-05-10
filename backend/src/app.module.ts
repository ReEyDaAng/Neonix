import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { CallsModule } from './modules/calls/calls.module';
import { SocialModule } from './modules/social/social.module';
import { LoggerModule } from './common/logger/logger.module';

/**
 *
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Global rate limiting — applied to every HTTP route by default.
    // Sensitive endpoints (auth/register, auth/login, calls/token) override
    // this with stricter limits via @Throttle decorators.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    ChatModule,
    CallsModule,
    SocialModule,
    LoggerModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
