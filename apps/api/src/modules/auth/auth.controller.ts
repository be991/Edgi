import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupabaseAuthGuard, AuthenticatedUser } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class AuthController {
  @Get('me')
  @ApiOperation({ summary: 'Get currently authenticated user identity' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      user: {
        id: user.id,
        email: user.email,
        role: 'single_tenant_owner',
      },
    };
  }
}
