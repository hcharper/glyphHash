import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { HederaModule } from '../hedera/hedera.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [HederaModule, RedisModule],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
