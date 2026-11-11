import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';
import { ConnectorRegistry } from '@edgi/connectors';
import { encryptCredential } from '@edgi/security';
import { SocialPlatformSummary, ConnectorType } from '@edgi/contracts';

export interface CreateSourceDto {
  name: string;
  url: string;
  connectorType?: string;
  organizationId?: string;
  checkInterval?: string;
  config?: Record<string, unknown>;
}

export interface UpdateSourceDto {
  name?: string;
  status?: string;
  checkInterval?: string;
  config?: Record<string, unknown>;
}

@Injectable()
export class SourcesService {
  constructor(private readonly prisma: PrismaService) {}

  async listSources(filters?: { connectorType?: string; status?: string }) {
    const where: Record<string, unknown> = {};
    if (filters?.connectorType) where.connectorType = filters.connectorType;
    if (filters?.status) where.status = filters.status;

    return this.prisma.source.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, slug: true, website: true, logoUrl: true },
        },
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 5,
        },
        collectionRuns: {
          orderBy: { startedAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSource(id: string) {
    const source = await this.prisma.source.findUnique({
      where: { id },
      include: {
        organization: true,
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 20,
        },
        collectionRuns: {
          orderBy: { startedAt: 'desc' },
          take: 15,
        },
      },
    });

    if (!source) {
      throw new NotFoundException(`Source with id ${id} not found.`);
    }

    return source;
  }

  async evaluateUrl(url: string) {
    if (!url) {
      throw new BadRequestException('Target URL is required for evaluation.');
    }
    const registry = ConnectorRegistry.getInstance();
    return registry.evaluateUrl(url);
  }

  async createSource(dto: CreateSourceDto) {
    const registry = ConnectorRegistry.getInstance();
    const evaluation = await registry.evaluateUrl(dto.url);

    const connectorType = dto.connectorType || evaluation.detectedType;
    const connector = registry.get(connectorType);
    const capabilities = await connector.getCapabilities();

    const slug = `${dto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`;
    const status = connectorType === 'manual_capture' ? 'manual_capture_only' : 'active';
    const checkInterval = dto.checkInterval || evaluation.suggestedSchedule || 'normal';

    return this.prisma.source.create({
      data: {
        name: dto.name,
        slug,
        url: dto.url,
        connectorType,
        status,
        checkInterval,
        organizationId: dto.organizationId || null,
        capabilities: capabilities as any,
        health: {
          lastSuccessfulCheck: null,
          nextCheck: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          lastError: null,
          consecutiveFailures: 0,
        },
        config: (dto.config || {}) as any,
      },
      include: { organization: true },
    });
  }

  async updateSource(id: string, dto: UpdateSourceDto) {
    await this.getSource(id);

    return this.prisma.source.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
        checkInterval: dto.checkInterval,
        config: dto.config as any,
      },
    });
  }

  async deleteSource(id: string) {
    await this.getSource(id);
    return this.prisma.source.delete({ where: { id } });
  }

  async checkSourceNow(id: string) {
    const source = await this.getSource(id);
    const registry = ConnectorRegistry.getInstance();
    const connector = registry.get(source.connectorType);

    const startTime = new Date();
    let healthResult;

    // 1. Run Health Check
    try {
      healthResult = await connector.checkHealth({
        url: source.url,
        ...(source.config as Record<string, unknown>),
      });
    } catch (err: unknown) {
      healthResult = {
        isHealthy: false,
        statusCode: 500,
        errorMessage: err instanceof Error ? err.message : String(err),
      };
    }

    // Save Health Check Log
    await this.prisma.sourceHealthCheck.create({
      data: {
        sourceId: source.id,
        status: healthResult.isHealthy ? 'healthy' : 'unreachable',
        statusCode: healthResult.statusCode || (healthResult.isHealthy ? 200 : 500),
        responseTimeMs: healthResult.responseTimeMs || 0,
        errorMessage: healthResult.errorMessage || null,
        checkedAt: startTime,
      },
    });

    // 2. If Unhealthy: record failure, increment consecutive errors, DO NOT mark as up to date
    if (!healthResult.isHealthy) {
      const consecutiveFailures = source.consecutiveFailures + 1;
      const newStatus = consecutiveFailures >= 3 ? 'unavailable' : source.status;

      await this.prisma.source.update({
        where: { id: source.id },
        data: {
          lastCheckedAt: startTime,
          consecutiveFailures,
          lastErrorMessage: healthResult.errorMessage || 'Health check failed',
          status: newStatus,
        },
      });

      // Write failed collection run
      await this.prisma.collectionRun.create({
        data: {
          sourceId: source.id,
          status: 'failed',
          itemsFound: 0,
          itemsNew: 0,
          errorMessage: healthResult.errorMessage || 'Source health check failed',
          startedAt: startTime,
          finishedAt: new Date(),
        },
      });

      // Dispatch in-app notification if failing consecutively
      if (consecutiveFailures >= 3) {
        const defaultUser = await this.prisma.user.findFirst();
        if (defaultUser) {
          await this.prisma.notification.create({
            data: {
              userId: defaultUser.id,
              type: 'source_issue',
              title: `Source Check Failing: ${source.name}`,
              message: `Source "${source.name}" has failed 3 consecutive health checks: ${healthResult.errorMessage}`,
              link: `/sources`,
            },
          });
        }
      }

      return {
        success: false,
        sourceId: source.id,
        status: newStatus,
        errorMessage: healthResult.errorMessage,
        itemsFound: 0,
        itemsNew: 0,
      };
    }

    // 3. If Healthy: execute content discovery and deduplicate
    let discoveryResult;
    try {
      discoveryResult = await connector.discover({
        url: source.url,
        config: source.config as Record<string, unknown>,
      });
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await this.prisma.collectionRun.create({
        data: {
          sourceId: source.id,
          status: 'failed',
          itemsFound: 0,
          itemsNew: 0,
          errorMessage: `Discovery error: ${errMsg}`,
          startedAt: startTime,
          finishedAt: new Date(),
        },
      });

      return {
        success: false,
        sourceId: source.id,
        errorMessage: errMsg,
        itemsFound: 0,
        itemsNew: 0,
      };
    }

    let itemsNew = 0;
    for (const item of discoveryResult.items) {
      // Canonical SHA-256 Content Hash for Deduplication
      const hashContent = `${item.url}|${item.title}|${item.rawBody.trim()}`;
      const contentHash = crypto.createHash('sha256').update(hashContent).digest('hex');

      // Check if hash already exists in discovered_content
      const existing = await this.prisma.discoveredContent.findUnique({
        where: { contentHash },
      });

      if (!existing) {
        await this.prisma.discoveredContent.create({
          data: {
            sourceId: source.id,
            url: item.url,
            title: item.title,
            rawBody: item.rawBody,
            cleanedBody: item.cleanedBody || null,
            contentHash,
            discoveredAt: item.publishedAt || new Date(),
          },
        });
        itemsNew++;
      }
    }

    const finishTime = new Date();

    // Write successful collection run
    await this.prisma.collectionRun.create({
      data: {
        sourceId: source.id,
        status: 'completed',
        itemsFound: discoveryResult.items.length,
        itemsNew,
        startedAt: startTime,
        finishedAt: finishTime,
      },
    });

    // Update Source with successful check timestamp and reset failures
    await this.prisma.source.update({
      where: { id: source.id },
      data: {
        lastCheckedAt: finishTime,
        lastSuccessfulCheck: finishTime,
        consecutiveFailures: 0,
        lastErrorMessage: null,
        status: 'active',
        health: {
          lastSuccessfulCheck: finishTime.toISOString(),
          nextCheck: new Date(finishTime.getTime() + 6 * 60 * 60 * 1000).toISOString(),
          lastError: null,
          consecutiveFailures: 0,
          latencyMs: healthResult.responseTimeMs,
        },
      },
    });

    return {
      success: true,
      sourceId: source.id,
      itemsFound: discoveryResult.items.length,
      itemsNew,
      responseTimeMs: healthResult.responseTimeMs,
    };
  }

  async getHealthHistory(sourceId: string) {
    return this.prisma.sourceHealthCheck.findMany({
      where: { sourceId },
      orderBy: { checkedAt: 'desc' },
      take: 50,
    });
  }

  // Candidate Sources Management
  async listCandidates() {
    return this.prisma.sourceCandidate.findMany({
      orderBy: { discoveredAt: 'desc' },
    });
  }

  async approveCandidate(id: string) {
    const candidate = await this.prisma.sourceCandidate.findUnique({ where: { id } });
    if (!candidate) {
      throw new NotFoundException(`Candidate ${id} not found.`);
    }

    // Mark candidate as approved
    await this.prisma.sourceCandidate.update({
      where: { id },
      data: { status: 'approved', reviewedAt: new Date() },
    });

    // Create registered Source
    return this.createSource({
      name: candidate.name,
      url: candidate.url,
      connectorType: candidate.connectorType,
      checkInterval: candidate.suggestedSchedule,
    });
  }

  async ignoreCandidate(id: string) {
    return this.prisma.sourceCandidate.update({
      where: { id },
      data: { status: 'ignored', reviewedAt: new Date() },
    });
  }

  async blockCandidate(id: string) {
    return this.prisma.sourceCandidate.update({
      where: { id },
      data: { status: 'blocked', reviewedAt: new Date() },
    });
  }

  async getSystemTelemetry() {
    const totalSources = await this.prisma.source.count();
    const activeSources = await this.prisma.source.count({ where: { status: 'active' } });
    const failingSources = await this.prisma.source.count({
      where: { consecutiveFailures: { gt: 0 } },
    });
    const totalDiscovered = await this.prisma.discoveredContent.count();
    const pendingCandidates = await this.prisma.sourceCandidate.count({
      where: { status: 'recommended' },
    });

    return {
      totalSources,
      activeSources,
      failingSources,
      totalDiscovered,
      pendingCandidates,
      healthRate: totalSources > 0 ? ((activeSources / totalSources) * 100).toFixed(1) : '100.0',
    };
  }

  // --- Phase 6: Social Connectors & Capture Management ---

  async listConnectorsSummary(): Promise<SocialPlatformSummary[]> {
    const registry = ConnectorRegistry.getInstance();
    const platforms: Array<{ id: ConnectorType; name: string; authType: string }> = [
      { id: 'youtube', name: 'YouTube', authType: 'API Key (Google Cloud)' },
      { id: 'reddit', name: 'Reddit', authType: 'OAuth2 Script (Client ID + Secret)' },
      { id: 'telegram', name: 'Telegram', authType: 'Bot Token (@BotFather)' },
      { id: 'discord', name: 'Discord', authType: 'Bot Token (Discord Developer Portal)' },
      { id: 'x_twitter', name: 'X (Twitter)', authType: 'OAuth 2.0 Bearer Token' },
      { id: 'instagram', name: 'Instagram', authType: 'Manual Capture / Flyer OCR Only' },
      { id: 'linkedin', name: 'LinkedIn', authType: 'Manual Capture / Link Follower Only' },
    ];

    const results: SocialPlatformSummary[] = [];
    for (const p of platforms) {
      const conn = registry.get(p.id);
      const caps = await conn.getCapabilities();

      const credCount = await this.prisma.sourceCredential.count({
        where: { keyType: `${p.id}_token` },
      });
      const envHasToken = !!(
        process.env[`${p.id.toUpperCase()}_TOKEN`] ||
        process.env[`${p.id.toUpperCase()}_API_KEY`] ||
        (p.id === 'x_twitter' && process.env.X_BEARER_TOKEN)
      );

      let status: 'active' | 'active_limited' | 'authorization_required' | 'manual_capture_only' | 'unavailable' = 'active';
      if (p.id === 'instagram' || p.id === 'linkedin') {
        status = 'manual_capture_only';
      } else if (p.id === 'x_twitter') {
        status = credCount > 0 || envHasToken ? 'active_limited' : 'manual_capture_only';
      } else if (!credCount && !envHasToken && caps.requiresAuth) {
        status = 'authorization_required';
      }

      const discoveredCount = await this.prisma.discoveredContent.count({
        where: { source: { connectorType: p.id } },
      });

      results.push({
        platform: p.id,
        name: p.name,
        status,
        capabilitiesDescription: caps.notes || `${p.name} opportunity connector.`,
        restrictions: [
          `Rate quota: ${caps.rateLimitPerMin} requests/min.`,
          caps.requiresAuth
            ? 'Requires authenticated credentials to monitor private feeds.'
            : 'Public queries supported.',
          'Zero unauthenticated scraping (ToS-compliant).',
        ],
        credentialConfigured: credCount > 0 || envHasToken,
        lastCheck: new Date().toISOString(),
        discoveredCount,
        rateLimitPerMin: caps.rateLimitPerMin,
        authType: p.authType,
      });
    }

    return results;
  }

  async saveConnectorCredential(platform: string, credentialValue: string) {
    if (!credentialValue) {
      throw new BadRequestException('Credential value is required.');
    }
    const encrypted = encryptCredential(credentialValue);

    let source = await this.prisma.source.findFirst({
      where: { connectorType: platform },
    });
    if (!source) {
      source = await this.prisma.source.create({
        data: {
          name: `${platform.toUpperCase()} Connector Source`,
          slug: `connector-${platform}`,
          connectorType: platform,
          url: `https://${platform}.com`,
          status: 'active',
          checkInterval: 'normal',
        },
      });
    }

    const existing = await this.prisma.sourceCredential.findFirst({
      where: { sourceId: source.id, keyType: `${platform}_token` },
    });

    if (existing) {
      await this.prisma.sourceCredential.update({
        where: { id: existing.id },
        data: {
          encryptedValue: encrypted.encryptedValue,
          iv: encrypted.iv,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.sourceCredential.create({
        data: {
          sourceId: source.id,
          keyType: `${platform}_token`,
          encryptedValue: encrypted.encryptedValue,
          iv: encrypted.iv,
        },
      });
    }

    await this.prisma.source.update({
      where: { id: source.id },
      data: { status: 'active', consecutiveFailures: 0 },
    });

    return { success: true, platform };
  }

  async testConnectorHealth(platform: string) {
    const registry = ConnectorRegistry.getInstance();
    const conn = registry.get(platform);
    const health = await conn.checkHealth({});
    return {
      isHealthy: health.isHealthy,
      statusCode: health.statusCode || 200,
      responseTimeMs: health.responseTimeMs || 75,
      message: health.errorMessage || `${platform} connector ping succeeded.`,
    };
  }

  async revokeConnector(platform: string) {
    const source = await this.prisma.source.findFirst({
      where: { connectorType: platform },
    });
    if (source) {
      await this.prisma.sourceCredential.deleteMany({
        where: { sourceId: source.id },
      });
      await this.prisma.source.update({
        where: { id: source.id },
        data: { status: 'authorization_required' },
      });
    }
    return { success: true, platform };
  }

  async processCapture(payload: {
    platform: string;
    url?: string;
    caption?: string;
    mediaBase64?: string;
    author?: string;
  }) {
    const caption = payload.caption || '';
    const url = payload.url || '';

    // Find or create platform Source record to guarantee content evidence provenance
    let source = await this.prisma.source.findFirst({
      where: { connectorType: payload.platform },
    });
    if (!source) {
      source = await this.prisma.source.create({
        data: {
          name: `${payload.platform.toUpperCase()} Capture Intake`,
          slug: `capture-${payload.platform}`,
          connectorType: payload.platform,
          url: payload.url || `https://${payload.platform}.com`,
          status: 'active',
          checkInterval: 'normal',
        },
      });
    }

    if (url) {
      const existingOpp = await this.prisma.opportunity.findFirst({
        where: {
          OR: [{ canonicalUrl: url }, { applyUrl: url }],
        },
        include: { organization: true, evidences: true },
      });

      if (existingOpp) {
        await this.prisma.contentEvidence.create({
          data: {
            opportunityId: existingOpp.id,
            sourceId: source.id,
            fieldName: 'announcement',
            extractedValue: caption.slice(0, 120),
            confidence: 0.95,
            snippet: caption,
          },
        });

        return {
          id: `cap-${Date.now()}`,
          status: 'duplicate',
          isDuplicate: true,
          opportunityId: existingOpp.id,
          canonicalUrl: existingOpp.canonicalUrl,
          title: existingOpp.title,
          organization: existingOpp.organization.name,
          deadline: existingOpp.deadline?.toISOString() || null,
          evidenceCount: (existingOpp.evidences?.length || 0) + 1,
          message: `Consolidated with existing canonical opportunity "${existingOpp.title}". Added new evidence record from ${payload.platform}.`,
        };
      }
    }

    const title =
      caption.split('\n')[0]?.slice(0, 80) || `${payload.platform.toUpperCase()} Opportunity Lead`;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    let org = await this.prisma.organization.findFirst();
    if (!org) {
      org = await this.prisma.organization.create({
        data: {
          name: 'Social Network Publisher',
          slug: 'social-network-pub',
          website: url || 'https://edgi.local',
        },
      });
    }

    const createdOpp = await this.prisma.opportunity.create({
      data: {
        title,
        slug: `${slug}-${Date.now()}`,
        canonicalUrl: url || `https://${payload.platform}.com/lead/${Date.now()}`,
        summary: caption || 'Captured via Edgi Share-to-App intake.',
        organizationId: org.id,
        category: caption.toLowerCase().includes('fellowship')
          ? 'fellowship'
          : caption.toLowerCase().includes('hackathon')
            ? 'hackathon_ctf'
            : 'internship',
        verificationStatus: 'unverified',
        confidence: payload.mediaBase64 ? 0.7 : 0.85,
        applyUrl: url || 'https://forms.gle/captured-opportunity',
        isUnpaid: false,
      },
      include: { organization: true },
    });

    await this.prisma.contentEvidence.create({
      data: {
        opportunityId: createdOpp.id,
        sourceId: source.id,
        fieldName: 'announcement',
        extractedValue: caption.slice(0, 120) || title,
        confidence: payload.mediaBase64 ? 0.7 : 0.85,
        snippet: caption || title,
      },
    });

    return {
      id: `cap-${Date.now()}`,
      status: 'extracted',
      isDuplicate: false,
      opportunityId: createdOpp.id,
      canonicalUrl: createdOpp.canonicalUrl,
      title: createdOpp.title,
      organization: createdOpp.organization.name,
      deadline: null,
      evidenceCount: 1,
      message: `Successfully captured and extracted into canonical index with ${Math.round(
        createdOpp.confidence * 100
      )}% confidence.`,
    };
  }
}
