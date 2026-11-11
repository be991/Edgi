import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard, AuthenticatedUser } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ProfileService } from './profile.service';
import { UpdateUserProfile } from '@edgi/contracts';

@ApiTags('Profile')
@Controller('profile')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getProfile(user.id);
  }

  @Get('completeness')
  @ApiOperation({ summary: 'Get profile completeness meter and missing field impacts' })
  async getCompleteness(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getCompleteness(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() body: UpdateUserProfile) {
    return this.profileService.updateProfile(user.id, body);
  }
}
