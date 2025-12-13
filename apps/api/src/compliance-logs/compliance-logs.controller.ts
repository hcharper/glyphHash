import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  Patch,
  SetMetadata,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ComplianceLogsService } from './compliance-logs.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ComplianceCategory, ComplianceSeverity } from '@prisma/client';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@ApiTags('compliance-logs')
@Controller('compliance-logs')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class ComplianceLogsController {
  constructor(private readonly logsService: ComplianceLogsService) {}

  @Public()
  @Post('test')
  @ApiOperation({ summary: 'Create a test compliance log (no auth)' })
  async createTestLog(
    @Body()
    body: {
      tenantId: string;
      title: string;
      description: string;
      category: ComplianceCategory;
      severity: ComplianceSeverity;
      evidenceHash?: string;
      metadata?: any;
    },
  ) {
    const { tenantId, title, description, category, severity, metadata } = body;
    return this.logsService.createLog({
      tenantId,
      userId: 'test-user-id',  // matches the test user we created
      title,
      description,
      category,
      severity,
      metadata,
    });
  }

  @Public()
  @Post()
  @ApiOperation({ summary: 'Create a new compliance log' })
  async createLog(
    @Body()
    body: {
      title: string;
      description: string;
      category: ComplianceCategory;
      severity: ComplianceSeverity;
      evidenceHash?: string;
      metadata?: any;
    },
  ) {
    // For demo: use test tenant and user
    return this.logsService.createLog({
      tenantId: 'bf3e01bf-3626-4d2f-ac17-9ae783bebec6', // Acme Inc
      userId: 'test-user-id',
      ...body,
    });
  }

  @Public()
  @Post(':id/submit')
  @ApiOperation({ summary: 'Submit log to Hedera HCS' })
  async submitToHCS(@Param('id') id: string) {
    return this.logsService.submitToHCS(id);
  }

  @Public()
  @Get(':id/evidence-upload-url')
  @ApiOperation({ summary: 'Get pre-signed URL for evidence upload' })
  async getEvidenceUploadUrl(
    @Param('id') id: string,
    @Query('fileName') fileName: string,
    @Query('contentType') contentType: string,
  ) {
    // For demo: use test tenant
    return this.logsService.getEvidenceUploadUrl(id, fileName, contentType, 'bf3e01bf-3626-4d2f-ac17-9ae783bebec6');
  }

  @Public()
  @Patch(':id/evidence')
  @ApiOperation({ summary: 'Update log with evidence metadata' })
  async updateEvidence(
    @Param('id') id: string,
    @Body()
    body: {
      evidenceUrl: string;
      evidenceHash: string;
      encryptionMetadata?: any;
    },
  ) {
    return this.logsService.updateEvidence(
      id,
      body.evidenceUrl,
      body.evidenceHash,
      body.encryptionMetadata || {},
    );
  }

  @Get()
  @ApiOperation({ summary: 'List compliance logs' })
  async listLogs(
    @CurrentUser() user: any,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('category') category?: ComplianceCategory,
    @Query('severity') severity?: ComplianceSeverity,
  ) {
    return this.logsService.listLogs(user.tenantId, parseInt(page), parseInt(limit), {
      category,
      severity,
    });
  }

  @Public()
  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboardStats() {
    // For demo: use test tenant
    return this.logsService.getDashboardStats('bf3e01bf-3626-4d2f-ac17-9ae783bebec6');
  }
}

