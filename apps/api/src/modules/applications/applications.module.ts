import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [ApplicationsController],
  providers: [PrismaService, ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
