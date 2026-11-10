import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { ProfileModule } from './modules/profile/profile.module';
import { PreferencesModule } from './modules/preferences/preferences.module';
import { SystemModule } from './modules/system/system.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { SourcesModule } from './modules/sources/sources.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    AuthModule,
    ProfileModule,
    PreferencesModule,
    SystemModule,
    OpportunitiesModule,
    SourcesModule,
    OrganizationsModule,
    ApplicationsModule,
    NotificationsModule,
  ],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
