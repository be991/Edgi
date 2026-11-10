import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export interface CreateOrganizationDto {
  name: string;
  website?: string;
  country?: string;
  description?: string;
  logoUrl?: string;
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrganizations() {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: { sources: true, opportunities: true },
        },
        sources: {
          select: { id: true, name: true, connectorType: true, status: true, url: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async getOrganization(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        sources: true,
        opportunities: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization ${id} not found.`);
    }

    // Build discovered channel tree for the organization
    const channelTree = this.buildChannelTree(org);

    return {
      ...org,
      channelTree,
    };
  }

  async createOrganization(dto: CreateOrganizationDto) {
    const slug = `${dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug,
        website: dto.website || null,
        country: dto.country || 'Global',
        description: dto.description || null,
        logoUrl: dto.logoUrl || null,
      },
    });

    return {
      ...org,
      channelTree: this.buildChannelTree(org),
    };
  }

  private buildChannelTree(org: { name: string; website?: string | null }) {
    const baseUrl = org.website || `https://${org.name.toLowerCase().replace(/\s+/g, '')}.org`;
    return [
      {
        channel: 'Careers & Jobs',
        url: `${baseUrl}/careers`,
        status: 'discovered',
        suggestedConnector: 'website',
      },
      {
        channel: 'Fellowships & Grants',
        url: `${baseUrl}/grants`,
        status: 'discovered',
        suggestedConnector: 'website',
      },
      {
        channel: 'Newsroom & Updates Feed',
        url: `${baseUrl}/feed.xml`,
        status: 'discovered',
        suggestedConnector: 'rss_feed',
      },
      {
        channel: 'Developer Events & Hackathons',
        url: `${baseUrl}/events`,
        status: 'discovered',
        suggestedConnector: 'website',
      },
      {
        channel: 'Socials (GitHub / X / LinkedIn)',
        url: `https://github.com/${org.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        status: 'discovered',
        suggestedConnector: 'github',
      },
    ];
  }
}
