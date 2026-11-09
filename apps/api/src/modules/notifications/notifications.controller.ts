import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard, AuthenticatedUser } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma.service';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List user notifications' })
  async getNotifications(@CurrentUser() user: AuthenticatedUser) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return notifications;
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markRead(@Param('id') id: string) {
    return { id, read: true };
  }
}
