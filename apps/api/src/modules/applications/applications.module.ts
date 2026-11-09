import { Module } from '@nestjs/common';
import { ApplicationsController } from './applications.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [ApplicationsController],
  providers: [PrismaService],
})
export class ApplicationsModule {}
