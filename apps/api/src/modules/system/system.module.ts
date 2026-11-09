import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [SystemController],
  providers: [PrismaService],
})
export class SystemModule {}
