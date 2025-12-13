import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { HederaService } from './hedera.service';
import { MirrorNodeService } from './mirror-node.service';

@Module({
  imports: [HttpModule],
  providers: [HederaService, MirrorNodeService],
  exports: [HederaService, MirrorNodeService],
})
export class HederaModule {}
