import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SourcesService, CreateSourceDto, UpdateSourceDto } from './sources.service';

@ApiTags('Sources')
@Controller()
export class SourcesController {
  constructor(private readonly sourcesService: SourcesService) {}

  @Get('sources')
  @ApiOperation({ summary: 'List registered crawler and ingestion sources' })
  async getSources(
    @Query('connectorType') connectorType?: string,
    @Query('status') status?: string
  ) {
    return this.sourcesService.listSources({ connectorType, status });
  }

  @Post('sources/evaluate')
  @ApiOperation({ summary: 'Pre-flight evaluation of target URL (detects type, capabilities, restrictions)' })
  async evaluateSourceUrl(@Body() body: { url: string }) {
    return this.sourcesService.evaluateUrl(body.url);
  }

  @Post('sources')
  @ApiOperation({ summary: 'Register a new verified source' })
  async createSource(@Body() body: CreateSourceDto) {
    return this.sourcesService.createSource(body);
  }

  @Get('sources/:id')
  @ApiOperation({ summary: 'Get source details, capabilities, error logs, and runs' })
  async getSource(@Param('id') id: string) {
    return this.sourcesService.getSource(id);
  }

  @Patch('sources/:id')
  @ApiOperation({ summary: 'Update source parameters (status, schedule interval, config)' })
  async updateSource(@Param('id') id: string, @Body() body: UpdateSourceDto) {
    return this.sourcesService.updateSource(id, body);
  }

  @Delete('sources/:id')
  @ApiOperation({ summary: 'Delete source' })
  async deleteSource(@Param('id') id: string) {
    return this.sourcesService.deleteSource(id);
  }

  @Get('sources/:id/health')
  @ApiOperation({ summary: 'Get recent health check logs and latency graph' })
  async getSourceHealth(@Param('id') id: string) {
    return this.sourcesService.getHealthHistory(id);
  }

  @Post('sources/:id/check')
  @ApiOperation({ summary: 'Trigger an immediate on-demand check of the source' })
  async checkSourceNow(@Param('id') id: string) {
    return this.sourcesService.checkSourceNow(id);
  }

  // --- Source Discovery Candidates Endpoints ---

  @Get('source-candidates')
  @ApiOperation({ summary: 'List candidate sources discovered by crawler or independent search' })
  async getCandidates() {
    return this.sourcesService.listCandidates();
  }

  @Post('source-candidates/:id/approve')
  @ApiOperation({ summary: 'Approve candidate source into active registered sources' })
  async approveCandidate(@Param('id') id: string) {
    return this.sourcesService.approveCandidate(id);
  }

  @Post('source-candidates/:id/ignore')
  @ApiOperation({ summary: 'Ignore candidate source recommendation' })
  async ignoreCandidate(@Param('id') id: string) {
    return this.sourcesService.ignoreCandidate(id);
  }

  @Post('source-candidates/:id/block')
  @ApiOperation({ summary: 'Block candidate source domain from future discovery' })
  async blockCandidate(@Param('id') id: string) {
    return this.sourcesService.blockCandidate(id);
  }

  // --- System Sources Telemetry ---

  @Get('system/sources')
  @ApiOperation({ summary: 'Aggregate source health and telemetry metrics' })
  async getSystemSources() {
    return this.sourcesService.getSystemTelemetry();
  }

  // --- Phase 6: Social Connectors & Quick Capture ---

  @Get('connectors')
  @ApiOperation({ summary: 'List all social and core platform connectors with live status and quotas' })
  async getConnectors() {
    return this.sourcesService.listConnectorsSummary();
  }

  @Post('connectors/:platform/credential')
  @ApiOperation({ summary: 'Encrypt and configure API key or bot token for a social platform' })
  async configureCredential(
    @Param('platform') platform: string,
    @Body() body: { credentialValue: string }
  ) {
    return this.sourcesService.saveConnectorCredential(platform, body.credentialValue);
  }

  @Post('connectors/:platform/health')
  @ApiOperation({ summary: 'Run an immediate live health ping on a platform connector' })
  async testConnectorHealth(@Param('platform') platform: string) {
    return this.sourcesService.testConnectorHealth(platform);
  }

  @Post('connectors/:platform/revoke')
  @ApiOperation({ summary: 'Revoke credentials and wipe stored token for a platform' })
  async revokeConnector(@Param('platform') platform: string) {
    return this.sourcesService.revokeConnector(platform);
  }

  @Post('capture')
  @ApiOperation({ summary: 'Process a quick capture submission from social share or flyer image' })
  async processCapture(
    @Body()
    body: {
      platform: string;
      url?: string;
      caption?: string;
      mediaBase64?: string;
      author?: string;
    }
  ) {
    return this.sourcesService.processCapture(body);
  }
}
