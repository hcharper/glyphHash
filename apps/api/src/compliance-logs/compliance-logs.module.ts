import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ComplianceLogsController } from './compliance-logs.controller';
import { ComplianceLogsService } from './compliance-logs.service';
import { HederaModule } from '../hedera/hedera.module';
import { StorageModule } from '../storage/storage.module';
import { PaymentsModule } from '../payments/payments.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [HttpModule, HederaModule, StorageModule, PaymentsModule, RedisModule],
  controllers: [ComplianceLogsController],
  providers: [ComplianceLogsService],
  exports: [ComplianceLogsService],
})
export class ComplianceLogsModule {}
