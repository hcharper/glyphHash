import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HederaService } from '../hedera/hedera.service';
import { RedisService } from '../redis/redis.service';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hedera: HederaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Create a payment for a compliance log
   */
  async createPayment(
    complianceLogId: string,
    tenantId: string,
    amount: string = '0.01',
  ) {
    try {
      const payment = await this.prisma.payment.create({
        data: {
          tenantId,
          complianceLogId,
          amount,
          tokenId: process.env.HEDERA_USDC_TOKEN_ID || '0.0.1',
          status: PaymentStatus.PENDING,
        },
      });

      this.logger.log(`Created payment ${payment.id} for log ${complianceLogId}`);
      return payment;
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Process USDC payment via Hedera HTS
   */
  async processPayment(paymentId: string, recipientId?: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { tenant: true, complianceLog: true },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    try {
      // Update status to processing
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.PROCESSING },
      });

      // For now, we'll use operator account as recipient
      // In production, this would be the compliance service treasury
      const recipient = recipientId || process.env.HEDERA_OPERATOR_ID;

      if (!recipient) {
        throw new Error('No recipient specified');
      }

      // Transfer USDC
      const transactionId = await this.hedera.transferUSDC(
        recipient,
        parseFloat(payment.amount),
      );

      // Update payment with transaction ID
      const updatedPayment = await this.prisma.payment.update({
        where: { id: paymentId },
        data: {
          transactionId,
          status: PaymentStatus.COMPLETED,
        },
      });

      // Publish event
      await this.redis.publish(
        `tenant:${payment.tenantId}:payments`,
        JSON.stringify({
          type: 'PAYMENT_COMPLETED',
          payload: updatedPayment,
          timestamp: new Date().toISOString(),
        }),
      );

      this.logger.log(`Processed payment ${paymentId}, tx: ${transactionId}`);
      return updatedPayment;
    } catch (error) {
      this.logger.error(`Failed to process payment: ${error.message}`, error.stack);

      // Update status to failed
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.FAILED },
      });

      throw error;
    }
  }

  /**
   * Get payment history for a tenant
   */
  async getPaymentHistory(tenantId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { tenantId },
        skip,
        take: limit,
        include: {
          complianceLog: {
            select: { title: true, category: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where: { tenantId } }),
    ]);

    return {
      payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
