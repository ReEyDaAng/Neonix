import { Module } from '@nestjs/common';
import { CallsController } from './calls.controller';
import { CallsService } from './calls.service';
import { CallsGateway } from './calls.gateway';

/**
 * Module wiring the calls subsystem (token endpoint, presence gateway,
 * annotations API). PrismaModule is global, so no extra imports needed.
 */
@Module({
  controllers: [CallsController],
  providers: [CallsService, CallsGateway],
  exports: [CallsService],
})
export class CallsModule {}
