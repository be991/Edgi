import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../../prisma.service';

@ApiTags('Opportunities')
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List discovered opportunities' })
  async getOpportunities(@Query() query: any) {
    const opps = await this.prisma.opportunity.findMany({
      include: {
        organization: true,
        evidences: { take: 5 },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return {
      opportunities: opps.map((o) => ({
        id: o.id,
        canonicalUrl: o.canonicalUrl,
        title: o.title,
        slug: o.slug,
        summary: o.summary,
        organization: o.organization,
        category: o.category,
        verificationStatus: o.verificationStatus,
        confidence: o.confidence,
        publishedAt: o.publishedAt?.toISOString() || null,
        deadline: o.deadline?.toISOString() || null,
        deadlineTz: o.deadlineTz,
        isDeadlineEstimated: o.isDeadlineEstimated,
        stipend: o.stipendMin
          ? { min: o.stipendMin, max: o.stipendMax, currency: o.stipendCurrency, period: o.stipendPeriod }
          : null,
        locations: [{ country: 'Global', isRemote: true }],
        benefits: [],
        tags: ['Cyber Security', 'AppSec'],
        applyUrl: o.applyUrl,
        evidence: [],
        relevanceScore: 90,
        eligibilityStatus: 'eligible',
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      total: opps.length,
    };
  }

  @Get('recommended')
  @ApiOperation({ summary: 'Get ranked recommended opportunities' })
  async getRecommended() {
    return [];
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get opportunity details by slug' })
  async getOpportunity(@Param('slug') slug: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: { organization: true, evidences: true },
    });
    return opp || null;
  }

  @Post(':id/save')
  @ApiOperation({ summary: 'Toggle save bookmark' })
  saveOpportunity(@Param('id') id: string) {
    return { success: true };
  }
}
