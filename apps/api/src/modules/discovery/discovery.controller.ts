import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DiscoveryService, RunDiscoveryDto, UpdateBudgetDto } from './discovery.service';

@ApiTags('Discovery & Budget')
@Controller()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post('discovery/run')
  @ApiOperation({ summary: 'Trigger an independent discovery run (with optional dryRun preview)' })
  async runDiscovery(@Body() body: RunDiscoveryDto) {
    return this.discoveryService.runDiscovery(body);
  }

  @Get('discovery/history')
  @ApiOperation({ summary: 'Get history of past discovery runs and metrics' })
  async getHistory() {
    return this.discoveryService.getHistory();
  }

  @Get('discovery/queries')
  @ApiOperation({ summary: 'Preview query set generated from user profile dimensions' })
  async getQueries(@Query('max') max?: string) {
    const limit = max ? parseInt(max, 10) : 10;
    return this.discoveryService.getQueriesPreview(limit);
  }

  @Get('leads')
  @ApiOperation({ summary: 'List unverified leads found by search' })
  async getLeads(@Query('status') status?: string) {
    return this.discoveryService.getLeads(status);
  }

  @Post('leads/:id/process')
  @ApiOperation({ summary: 'Queue lead for opportunity extraction' })
  async processLead(@Param('id') id: string) {
    return this.discoveryService.processLead(id);
  }

  @Post('leads/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss search lead' })
  async dismissLead(@Param('id') id: string) {
    return this.discoveryService.dismissLead(id);
  }

  @Post('leads/:id/add-source')
  @ApiOperation({ summary: 'Convert lead publishing domain into a candidate source' })
  async addLeadAsSource(@Param('id') id: string) {
    return this.discoveryService.addLeadAsSource(id);
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get monthly budget limits, current spend, and threshold state' })
  async getUsage() {
    return this.discoveryService.getFullUsageTelemetry();
  }

  @Post('usage/budget')
  @ApiOperation({ summary: 'Update monthly budget caps or toggle emergency pause' })
  async updateBudget(@Body() body: UpdateBudgetDto) {
    return this.discoveryService.updateBudgetSettings(body);
  }
}
