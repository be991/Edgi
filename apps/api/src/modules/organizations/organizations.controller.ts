import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrganizationsService, CreateOrganizationDto } from './organizations.service';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'List registered publishers, companies, and foundations' })
  async listOrganizations() {
    return this.organizationsService.listOrganizations();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details and channel discovery tree' })
  async getOrganization(@Param('id') id: string) {
    return this.organizationsService.getOrganization(id);
  }

  @Post()
  @ApiOperation({ summary: 'Register organization and discover channels tree' })
  async createOrganization(@Body() body: CreateOrganizationDto) {
    return this.organizationsService.createOrganization(body);
  }
}
