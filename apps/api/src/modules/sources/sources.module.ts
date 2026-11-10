import { Module } from '@nestjs/common';
import { SourcesController } from './sources.controller';
import { SourcesService } from './sources.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SourcesController],
  providers: [SourcesService, PrismaService],
  exports: [SourcesService],
})
export class SourcesModule {}
