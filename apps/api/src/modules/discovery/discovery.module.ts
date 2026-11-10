import { Module } from '@nestjs/common';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [DiscoveryController],
  providers: [DiscoveryService, PrismaService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}
