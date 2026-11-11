import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard, AuthenticatedUser } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from '@edgi/contracts';

@ApiTags('Applications')
@Controller()
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Get('applications')
  @ApiOperation({ summary: 'List user application pipeline' })
  async getApplications(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.listApplications(user.id);
  }

  @Post('applications')
  @ApiOperation({ summary: 'Create application tracker entry' })
  async createApplication(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.applicationsService.createApplication(user.id, body);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get single application with full status history and documents' })
  async getApplication(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.applicationsService.getApplication(id, user.id);
  }

  @Patch('applications/:id')
  @ApiOperation({ summary: 'Update application details, notes, or checklist' })
  async updateApplication(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.applicationsService.updateApplication(id, user.id, body);
  }

  @Post('applications/:id/status')
  @ApiOperation({ summary: 'Transition application status and append to audit history' })
  async transitionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { status: ApplicationStatus; note?: string },
  ) {
    return this.applicationsService.transitionStatus(id, user.id, body.status, body.note);
  }

  @Delete('applications/:id')
  @ApiOperation({ summary: 'Delete application tracker entry' })
  async deleteApplication(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.applicationsService.deleteApplication(id, user.id);
  }

  @Post('applications/:id/ai-assist')
  @ApiOperation({ summary: 'Run grounded AI assistant for requirement explanation, CV bullets, or statement draft' })
  async runAiAssist(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { promptType: 'tailor_cv_bullets' | 'draft_motivation' | 'explain_requirements' | 'missing_documents'; targetRole?: string },
  ) {
    return this.applicationsService.aiAssist(id, user.id, body.promptType, body.targetRole);
  }

  @Post('applications/:id/documents')
  @ApiOperation({ summary: 'Attach user document from vault to application' })
  async attachDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { documentId: string },
  ) {
    return this.applicationsService.attachDocumentToApplication(id, user.id, body.documentId);
  }

  // --- Document Vault Endpoints ---

  @Get('documents')
  @ApiOperation({ summary: 'List user documents in private vault' })
  async getDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.listUserDocuments(user.id);
  }

  @Post('documents')
  @ApiOperation({ summary: 'Upload/register new document into private vault' })
  async uploadDocument(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return this.applicationsService.uploadUserDocument(user.id, body);
  }

  @Get('documents/:id/download')
  @ApiOperation({ summary: 'Generate private signed download URL for document' })
  async getDownloadUrl(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.applicationsService.getSignedDownloadUrl(id, user.id);
  }

  @Delete('documents/:id')
  @ApiOperation({ summary: 'Delete document from private vault' })
  async deleteDocument(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.applicationsService.deleteUserDocument(id, user.id);
  }
}
