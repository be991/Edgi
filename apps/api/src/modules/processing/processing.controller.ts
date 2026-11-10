import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProcessingService, CaptureDto } from './processing.service';

@ApiTags('processing')
@Controller()
export class ProcessingController {
  constructor(private readonly processingService: ProcessingService) {}

  @Post('opportunities/capture')
  @ApiOperation({ summary: 'Manual capture: parse pasted URL or text into structured opportunity' })
  async captureOpportunity(@Body() dto: CaptureDto) {
    return this.processingService.captureManual(dto);
  }

  @Get('processing/review')
  @ApiOperation({ summary: 'List items in processing review queue' })
  async listReviewItems(@Query('status') status?: string) {
    return this.processingService.listReviewItems(status);
  }

  @Post('processing/review/:id/accept')
  @ApiOperation({ summary: 'Accept review item as a canonical opportunity' })
  async acceptReviewItem(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.processingService.resolveReviewItem(id, 'accept', notes);
  }

  @Post('processing/review/:id/merge')
  @ApiOperation({ summary: 'Merge review item as evidence into an existing opportunity' })
  async mergeReviewItem(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.processingService.resolveReviewItem(id, 'merge', notes);
  }

  @Post('processing/review/:id/reject')
  @ApiOperation({ summary: 'Reject review item' })
  async rejectReviewItem(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.processingService.resolveReviewItem(id, 'reject', notes);
  }

  @Get('opportunities/:id/evidence')
  @ApiOperation({ summary: 'Get evidence timeline and source provenance for an opportunity' })
  async getOpportunityEvidence(@Param('id') id: string) {
    return this.processingService.getOpportunityEvidence(id);
  }

  @Get('opportunities/:id/history')
  @ApiOperation({ summary: 'Get status & deadline modification history for an opportunity' })
  async getOpportunityHistory(@Param('id') id: string) {
    return this.processingService.getOpportunityStatusHistory(id);
  }
}
