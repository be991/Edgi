import { Module } from '@nestjs/common';
import { SourcesController } from './sources.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SourcesController],
  providers: [PrismaService],
})
export class SourcesModule {}
