import { Module } from '@nestjs/common';
import { OpportunitiesController } from './opportunities.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [OpportunitiesController],
  providers: [PrismaService],
})
export class OpportunitiesModule {}
