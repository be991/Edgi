import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard, AuthenticatedUser } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PreferencesService } from './preferences.service';
import { UpdateUserPreferences } from '@edgi/contracts';

@ApiTags('Preferences')
@Controller('preferences')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user preferences' })
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.getPreferences(user.id);
  }

  @Put()
  @ApiOperation({ summary: 'Update user preferences' })
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpdateUserPreferences,
  ) {
    return this.preferencesService.updatePreferences(user.id, body);
  }
}
