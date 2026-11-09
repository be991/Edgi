import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.service';

@ApiTags('Sources')
@Controller('sources')
export class SourcesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List registered crawler and ingestion sources' })
  async getSources() {
    const sources = await this.prisma.source.findMany({
      include: { organization: true },
    });
    return sources;
  }

  @Get('candidates')
  @ApiOperation({ summary: 'List candidate sources discovered by search' })
  getCandidates() {
    return [];
  }

  @Patch('candidates/:id')
  @ApiOperation({ summary: 'Update candidate status (approved/ignored/blocked)' })
  updateCandidate(@Param('id') id: string, @Body() body: any) {
    return { id, status: body.status };
  }
}
