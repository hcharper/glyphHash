import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HederaService } from '../hedera/hedera.service';
import { TenantStatus } from '@prisma/client';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hedera: HederaService,
  ) {}

  /**
   * Create a new tenant with Hedera topic
   */
  async createTenant(data: {
    name: string;
    slug: string;
    clerkOrgId: string;
  }) {
    // Check if tenant already exists
    const existing = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ slug: data.slug }, { clerkOrgId: data.clerkOrgId }],
      },
    });

    if (existing) {
      throw new BadRequestException('Tenant with this slug or organization already exists');
    }

    try {
      // Create HCS topic for the tenant
      const topicId = await this.hedera.createTopic(data.name);

      // Create tenant in database
      const tenant = await this.prisma.tenant.create({
        data: {
          name: data.name,
          slug: data.slug,
          clerkOrgId: data.clerkOrgId,
          hcsTopicId: topicId,
          status: TenantStatus.ACTIVE,
        },
      });

      this.logger.log(`Created tenant ${tenant.id} with topic ${topicId}`);
      return tenant;
    } catch (error) {
      this.logger.error(`Failed to create tenant: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            complianceLogs: true,
            payments: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * Get tenant by Clerk organization ID
   */
  async getTenantByClerkOrgId(clerkOrgId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { clerkOrgId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * List all tenants (admin only)
   */
  async listTenants(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              users: true,
              complianceLogs: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.count(),
    ]);

    return {
      tenants,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update tenant status
   */
  async updateTenantStatus(id: string, status: TenantStatus) {
    return this.prisma.tenant.update({
      where: { id },
      data: { status },
    });
  }
}
