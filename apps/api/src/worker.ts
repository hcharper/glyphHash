import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';
import { MirrorNodeService } from './hedera/mirror-node.service';
import { ComplianceLogsService } from './compliance-logs/compliance-logs.service';
import { PaymentsService } from './payments/payments.service';
import { RedisService } from './redis/redis.service';

class MirrorNodeWorker {
  private readonly logger = new Logger('MirrorNodeWorker');
  private isRunning = false;
  private pollInterval = 10000; // 10 seconds

  constructor(
    private prisma: PrismaService,
    private mirrorNode: MirrorNodeService,
    private logsService: ComplianceLogsService,
    private paymentsService: PaymentsService,
    private redis: RedisService,
  ) {}

  async start() {
    this.logger.log('Starting Mirror Node Worker...');
    this.isRunning = true;

    // Poll for new HCS messages
    this.pollAllTopics();

    // Handle graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  private async pollAllTopics() {
    while (this.isRunning) {
      try {
        // Get all active tenants with HCS topics
        const tenants = await this.prisma.tenant.findMany({
          where: {
            hcsTopicId: { not: null },
            status: 'ACTIVE',
          },
        });

        this.logger.log(`Polling ${tenants.length} tenant topics...`);

        // Poll each topic
        for (const tenant of tenants) {
          if (!tenant.hcsTopicId) continue;

          try {
            await this.pollTenantTopic(tenant.id, tenant.hcsTopicId);
          } catch (error) {
            this.logger.error(
              `Error polling topic ${tenant.hcsTopicId}: ${error.message}`,
            );
          }
        }
      } catch (error) {
        this.logger.error(`Error in poll cycle: ${error.message}`);
      }

      // Wait before next poll
      await this.sleep(this.pollInterval);
    }
  }

  private async pollTenantTopic(tenantId: string, topicId: string) {
    // Get last processed sequence number from Redis
    const lastSequenceKey = `topic:${topicId}:lastSequence`;
    const lastSequence = (await this.redis.get(lastSequenceKey)) || '0';

    // Fetch new messages
    const messages = await this.mirrorNode.getTopicMessages(topicId, lastSequence);

    if (messages.length === 0) {
      return;
    }

    this.logger.log(
      `Processing ${messages.length} new messages for topic ${topicId}`,
    );

    // Process each message
    for (const message of messages) {
      try {
        await this.processMessage(tenantId, message);

        // Update last sequence number
        await this.redis.set(lastSequenceKey, message.sequence_number.toString());
      } catch (error) {
        this.logger.error(
          `Error processing message ${message.sequence_number}: ${error.message}`,
        );
      }
    }
  }

  private async processMessage(tenantId: string, message: any) {
    try {
      // Decode message content
      const content = this.mirrorNode.decodeMessage(message.message);
      const data = JSON.parse(content);

      this.logger.log(`Processing message for log ${data.logId}`);

      // Find corresponding compliance log
      const log = await this.prisma.complianceLog.findFirst({
        where: {
          id: data.logId,
          tenantId: tenantId,
        },
      });

      if (!log) {
        this.logger.warn(`Log ${data.logId} not found`);
        return;
      }

      // Update log with consensus timestamp if not already set
      if (!log.hcsConsensusTimestamp) {
        await this.prisma.complianceLog.update({
          where: { id: log.id },
          data: {
            hcsConsensusTimestamp: message.consensus_timestamp,
            hcsSequenceNumber: message.sequence_number.toString(),
            status: 'CONFIRMED',
          },
        });

        this.logger.log(`Updated log ${log.id} with consensus timestamp`);

        // Trigger payment for confirmed log
        await this.triggerPayment(log.id, tenantId);
      }
    } catch (error) {
      this.logger.error(`Error in processMessage: ${error.message}`, error.stack);
    }
  }

  private async triggerPayment(logId: string, tenantId: string) {
    try {
      // Check if payment already exists
      const existingPayment = await this.prisma.payment.findFirst({
        where: { complianceLogId: logId },
      });

      if (existingPayment) {
        this.logger.log(`Payment already exists for log ${logId}`);
        return;
      }

      // Create payment
      const payment = await this.paymentsService.createPayment(
        logId,
        tenantId,
        '0.01',
      );

      // Process payment (in production, this would be queued)
      // For now, we'll skip actual USDC transfer in worker
      this.logger.log(`Payment ${payment.id} created for log ${logId}`);

      // In production environment, process the payment
      if (process.env.NODE_ENV === 'production') {
        await this.paymentsService.processPayment(payment.id);
      }
    } catch (error) {
      this.logger.error(`Error triggering payment: ${error.message}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async shutdown() {
    this.logger.log('Shutting down worker...');
    this.isRunning = false;
    await this.prisma.$disconnect();
    process.exit(0);
  }
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const prisma = app.get(PrismaService);
  const mirrorNode = app.get(MirrorNodeService);
  const logsService = app.get(ComplianceLogsService);
  const paymentsService = app.get(PaymentsService);
  const redis = app.get(RedisService);

  const worker = new MirrorNodeWorker(
    prisma,
    mirrorNode,
    logsService,
    paymentsService,
    redis,
  );

  await worker.start();
}

bootstrap().catch((error) => {
  console.error('Worker failed to start:', error);
  process.exit(1);
});
