import { Controller, Get, Post, Put, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard, AuthenticatedUser } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List user notifications with filters' })
  async getNotifications(
    @CurrentUser() user: AuthenticatedUser,
    @Query('type') type?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.listNotifications(user.id, {
      type,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark single notification as read' })
  async markRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markRead(id, user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get user notification preferences' })
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update user notification preferences' })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: any,
  ) {
    return this.notificationsService.updatePreferences(user.id, body);
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'Inspect notification deliveries ledger and errors' })
  async getDeliveries(@CurrentUser() user: AuthenticatedUser) {
    return this.emailService.getDeliveryLedger(user.id);
  }

  @Get('preview/:template')
  @ApiOperation({ summary: 'Render responsive HTML preview for email templates' })
  async previewTemplate(
    @Param('template') template: 'priority_alert' | 'daily_digest' | 'deadline_reminder',
  ) {
    return this.notificationsService.renderTemplatePreview(template);
  }

  @Post('test-alert/:opportunityId')
  @ApiOperation({ summary: 'Trigger test immediate priority alert email' })
  async triggerTestAlert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('opportunityId') opportunityId: string,
  ) {
    return this.notificationsService.dispatchPriorityAlert(user.id, opportunityId);
  }

  @Post('test-digest')
  @ApiOperation({ summary: 'Trigger test daily digest dispatch' })
  async triggerTestDigest(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.dispatchDailyDigest(user.id);
  }
}
