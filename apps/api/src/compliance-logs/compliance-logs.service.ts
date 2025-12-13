import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HederaService } from '../hedera/hedera.service';
import { StorageService } from '../storage/storage.service';
import { RedisService } from '../redis/redis.service';
import { ComplianceCategory, ComplianceSeverity, LogStatus } from '@prisma/client';

@Injectable()
export class ComplianceLogsService {
  private readonly logger = new Logger(ComplianceLogsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hedera: HederaService,
    private readonly storage: StorageService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Create a new compliance log
   */
  async createLog(data: {
    tenantId: string;
    userId: string;
    title: string;
    description: string;
    category: ComplianceCategory;
    severity: ComplianceSeverity;
    metadata?: any;
  }) {
    try {
      // Create log in database
      const log = await this.prisma.complianceLog.create({
        data: {
          tenantId: data.tenantId,
          userId: data.userId,
          title: data.title,
          description: data.description,
          category: data.category,
          severity: data.severity,
          status: LogStatus.PENDING,
          metadata: data.metadata || {},
        },
        include: {
          user: true,
          tenant: true,
        },
      });

      // Publish event
      await this.redis.publish(
        `tenant:${data.tenantId}:logs`,
        JSON.stringify({
          type: 'LOG_CREATED',
          payload: log,
          timestamp: new Date().toISOString(),
        }),
      );

      this.logger.log(`Created compliance log ${log.id} for tenant ${data.tenantId}`);
      return log;
    } catch (error) {
      this.logger.error(`Failed to create compliance log: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Submit log to Hedera HCS
   */
  async submitToHCS(logId: string) {
    const log = await this.prisma.complianceLog.findUnique({
      where: { id: logId },
      include: { tenant: true },
    });

    if (!log) {
      throw new NotFoundException('Compliance log not found');
    }

    if (!log.tenant.hcsTopicId) {
      throw new Error('Tenant does not have an HCS topic');
    }

    try {
      // Update status to processing
      await this.prisma.complianceLog.update({
        where: { id: logId },
        data: { status: LogStatus.PROCESSING },
      });

      // Prepare HCS message
      const message = JSON.stringify({
        logId: log.id,
        title: log.title,
        category: log.category,
        severity: log.severity,
        evidenceHash: log.evidenceHash,
        evidenceUrl: log.evidenceUrl,
        timestamp: log.createdAt.toISOString(),
      });

      // Submit to HCS
      const result = await this.hedera.submitMessage(log.tenant.hcsTopicId, message);

      // Update log with HCS info
      const updatedLog = await this.prisma.complianceLog.update({
        where: { id: logId },
        data: {
          hcsMessageId: result.transactionId,
          hcsSequenceNumber: result.sequenceNumber,
          hcsConsensusTimestamp: result.consensusTimestamp,
          status: LogStatus.CONFIRMED,
        },
      });

      // Publish event
      await this.redis.publish(
        `tenant:${log.tenantId}:logs`,
        JSON.stringify({
          type: 'LOG_CONFIRMED',
          payload: updatedLog,
          timestamp: new Date().toISOString(),
        }),
      );

      this.logger.log(`Submitted log ${logId} to HCS, sequence: ${result.sequenceNumber}`);
      return updatedLog;
    } catch (error) {
      this.logger.error(`Failed to submit log to HCS: ${error.message}`, error.stack);
      
      // Update status to failed
      await this.prisma.complianceLog.update({
        where: { id: logId },
        data: { status: LogStatus.FAILED },
      });

      throw error;
    }
  }

  /**
   * Get upload URL for evidence file
   */
  async getEvidenceUploadUrl(
    logId: string,
    fileName: string,
    contentType: string,
    tenantId: string,
  ) {
    const log = await this.prisma.complianceLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new NotFoundException('Compliance log not found');
    }

    if (log.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return this.storage.getUploadUrl(tenantId, fileName, contentType);
  }

  /**
   * Update log with evidence information
   */
  async updateEvidence(
    logId: string,
    evidenceUrl: string,
    evidenceHash: string,
    encryptionMetadata: any,
  ) {
    return this.prisma.complianceLog.update({
      where: { id: logId },
      data: {
        evidenceUrl,
        evidenceHash,
        encryptionMetadata,
      },
    });
  }

  /**
   * List compliance logs for a tenant
   */
  async listLogs(
    tenantId: string,
    page: number = 1,
    limit: number = 20,
    filters?: {
      category?: ComplianceCategory;
      severity?: ComplianceSeverity;
      status?: LogStatus;
    },
  ) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (filters?.category) where.category = filters.category;
    if (filters?.severity) where.severity = filters.severity;
    if (filters?.status) where.status = filters.status;

    const [logs, total] = await Promise.all([
      this.prisma.complianceLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.complianceLog.count({ where }),
    ]);

    return {
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get dashboard stats
   */
  async getDashboardStats(tenantId: string) {
    const [totalLogs, confirmedLogs, pendingLogs, logsByCategory, recentLogs] =
      await Promise.all([
        this.prisma.complianceLog.count({ where: { tenantId } }),
        this.prisma.complianceLog.count({
          where: { tenantId, status: LogStatus.CONFIRMED },
        }),
        this.prisma.complianceLog.count({
          where: { tenantId, status: LogStatus.PENDING },
        }),
        this.prisma.complianceLog.groupBy({
          by: ['category'],
          where: { tenantId },
          _count: true,
        }),
        this.prisma.complianceLog.findMany({
          where: { tenantId },
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { name: true, email: true },
            },
          },
        }),
      ]);

    // Count payments instead of summing since amount is a string (for precision)
    const paymentCount = await this.prisma.payment.count({
      where: { tenantId, status: 'COMPLETED' },
    });

    const categoryMap: any = {};
    logsByCategory.forEach((item: any) => {
      categoryMap[item.category] = item._count;
    });

    return {
      totalLogs,
      confirmedLogs,
      pendingLogs,
      totalPayments: paymentCount,
      logsByCategory: categoryMap,
      recentLogs,
    };
  }
}
