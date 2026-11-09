import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard, AuthenticatedUser } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma.service';

@ApiTags('Applications')
@Controller('applications')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List user application pipeline' })
  async getApplications(@CurrentUser() user: AuthenticatedUser) {
    const apps = await this.prisma.application.findMany({
      where: { userId: user.id },
      include: { opportunity: true, documents: true },
      orderBy: { createdAt: 'desc' },
    });
    return apps;
  }

  @Post()
  @ApiOperation({ summary: 'Create application tracker entry' })
  async createApplication(@CurrentUser() user: AuthenticatedUser, @Body() body: any) {
    return { id: 'app-mock', ...body, userId: user.id, status: 'preparing' };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update application status or checklist' })
  async updateApplication(@Param('id') id: string, @Body() body: any) {
    return { id, ...body };
  }
}
