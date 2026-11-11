import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { PrismaService } from '../../prisma.service';
import { BudgetService } from './budget.service';
import { QualityReportService } from './quality-report.service';
import { OperationsService } from './operations.service';

@Module({
  controllers: [SystemController],
  providers: [PrismaService, BudgetService, QualityReportService, OperationsService],
  exports: [BudgetService, QualityReportService, OperationsService],
})
export class SystemModule {}
