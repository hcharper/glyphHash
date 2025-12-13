import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tenant' })
  async createTenant(
    @Body() body: { name: string; slug: string; clerkOrgId: string },
  ) {
    return this.tenantsService.createTenant(body);
  }

  @Get()
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all tenants' })
  async listTenants(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.tenantsService.listTenants(parseInt(page), parseInt(limit));
  }

  @Get(':id')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant by ID' })
  async getTenant(@Param('id') id: string) {
    return this.tenantsService.getTenant(id);
  }

  @Get('org/:clerkOrgId')
  @UseGuards(ClerkAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get tenant by Clerk organization ID' })
  async getTenantByOrg(@Param('clerkOrgId') clerkOrgId: string) {
    return this.tenantsService.getTenantByClerkOrgId(clerkOrgId);
  }
}
