import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('Opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly service: OpportunitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List opportunities with relevance and eligibility' })
  async getOpportunities(@Query() query: any) {
    return this.service.getRecommended(query);
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Get ranked recommended opportunities with dual assessments' })
  async getRecommended(
    @Query('tab') tab?: string,
    @Query('openToNigeria') openToNigeria?: string,
    @Query('category') category?: string
  ) {
    return this.service.getRecommended({ tab, openToNigeria, category });
  }

  @Get('weights')
  @ApiOperation({ summary: 'Get learned ranking weights and bounds' })
  getWeights() {
    return this.service.getWeights();
  }

  @Post('weights/reset')
  @ApiOperation({ summary: 'Reset learned ranking weights back to defaults' })
  resetWeights() {
    return this.service.resetWeights();
  }

  @Get('profile/completeness')
  @ApiOperation({ summary: 'Get profile completeness meter and missing field impacts' })
  getProfileCompleteness() {
    return this.service.getProfileCompleteness();
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get opportunity details by slug or id' })
  async getOpportunity(@Param('slug') slug: string) {
    return this.service.getOpportunity(slug);
  }

  @Get(':id/eligibility')
  @ApiOperation({ summary: 'Get requirement-by-requirement eligibility audit table' })
  async getEligibility(@Param('id') id: string) {
    return this.service.getEligibilityAssessment(id);
  }

  @Post(':id/feedback')
  @ApiOperation({ summary: 'Submit feedback (save, apply, thumbs_up, thumbs_down, dismiss)' })
  async recordFeedback(
    @Param('id') id: string,
    @Body() body: { action: 'save' | 'apply' | 'thumbs_up' | 'thumbs_down' | 'dismiss'; reason?: string; notes?: string }
  ) {
    return this.service.recordFeedback(id, body.action, body.reason, body.notes);
  }

  @Post(':id/save')
  @ApiOperation({ summary: 'Toggle save bookmark' })
  async saveOpportunity(@Param('id') id: string) {
    return this.service.recordFeedback(id, 'save');
  }
}
