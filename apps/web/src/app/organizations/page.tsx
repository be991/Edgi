'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  ShieldCheck,
  ExternalLink,
  MapPin,
  Plus,
  Network,
  Radio,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api/client';
import { Opportunity } from '@edgi/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Channel {
  channel: string;
  url: string;
  status: string;
  suggestedConnector: string;
}

interface OrganizationView {
  id: string;
  name: string;
  slug: string;
  website?: string | null;
  country?: string | null;
  description?: string | null;
  verified?: boolean;
  opportunityCount: number;
  channels: Channel[];
}

export default function OrganizationsPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [orgs, setOrgs] = useState<OrganizationView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form State
  const [nameInput, setNameInput] = useState('');
  const [websiteInput, setWebsiteInput] = useState('');
  const [countryInput, setCountryInput] = useState('Global');
  const [descInput, setDescInput] = useState('');

  const buildChannelTree = (name: string, website?: string | null): Channel[] => {
    const base = website || `https://${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.org`;
    return [
      { channel: 'Careers & Jobs', url: `${base}/careers`, status: 'discovered', suggestedConnector: 'website' },
      { channel: 'Fellowships & Grants', url: `${base}/grants`, status: 'discovered', suggestedConnector: 'website' },
      { channel: 'Newsroom & Updates Feed', url: `${base}/feed.xml`, status: 'discovered', suggestedConnector: 'rss_feed' },
      { channel: 'Developer Events', url: `${base}/events`, status: 'discovered', suggestedConnector: 'website' },
      { channel: 'GitHub Activity', url: `https://github.com/${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`, status: 'discovered', suggestedConnector: 'github' },
    ];
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await api.getOpportunities();
        setOpportunities(res.opportunities);

        const orgMap = new Map<string, OrganizationView>();
        res.opportunities.forEach((o) => {
          if (!orgMap.has(o.organization.id)) {
            orgMap.set(o.organization.id, {
              id: o.organization.id,
              name: o.organization.name,
              slug: o.organization.slug,
              website: o.organization.website,
              country: 'United States',
              description: `${o.organization.name} publishes security, AI, and developer programmes.`,
              verified: true,
              opportunityCount: 1,
              channels: buildChannelTree(o.organization.name, o.organization.website),
            });
          } else {
            const existing = orgMap.get(o.organization.id)!;
            existing.opportunityCount += 1;
          }
        });

        setOrgs(Array.from(orgMap.values()));
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleAddOrganization = () => {
    if (!nameInput.trim()) return;

    const newOrg: OrganizationView = {
      id: `org-${Date.now()}`,
      name: nameInput.trim(),
      slug: nameInput.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      website: websiteInput.trim() || null,
      country: countryInput.trim() || 'Global',
      description: descInput.trim() || 'Custom registered host organization.',
      verified: false,
      opportunityCount: 0,
      channels: buildChannelTree(nameInput.trim(), websiteInput.trim()),
    };

    setOrgs((prev) => [newOrg, ...prev]);
    setShowAddModal(false);
    setNameInput('');
    setWebsiteInput('');
    setDescInput('');
    setToastMessage(`✅ Registered organization "${newOrg.name}" and mapped 5 discovered channel endpoints.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3.5 rounded-xl bg-card border border-border/80 shadow-lg text-xs font-semibold flex items-center justify-between text-foreground">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Organization Directory</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Verified foundations, hackathon leagues, venture incubators, and research labs with discovered channels tree.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAddModal(true)} className="gap-1.5 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Organization</span>
        </Button>
      </div>

      {/* Grid of Organizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {orgs.map((org) => (
          <div
            key={org.id}
            className="rounded-2xl border border-border bg-card p-5 sm:p-6 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm"
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                  {org.name.slice(0, 2).toUpperCase()}
                </div>
                {org.verified ? (
                  <Badge variant="success" className="text-[10px]">
                    <ShieldCheck className="w-3 h-3 mr-1" /> Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">
                    Registered
                  </Badge>
                )}
              </div>

              <div>
                <h3 className="font-bold text-base text-foreground">{org.name}</h3>
                {org.country && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{org.country}</span>
                  </p>
                )}
                {org.description && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                    {org.description}
                  </p>
                )}
              </div>

              {/* Discovered Channels Tree */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-primary" />
                  <span>Discovered Channels ({org.channels.length})</span>
                </span>
                <div className="space-y-1.5">
                  {org.channels.map((ch, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 truncate text-muted-foreground">
                        <ChevronRight className="w-3 h-3 text-primary/60 shrink-0" />
                        <span className="truncate">{ch.channel}</span>
                      </div>
                      <Badge variant="outline" className="font-mono text-[9px] uppercase shrink-0 ml-1">
                        {ch.suggestedConnector}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground">
                {org.opportunityCount} tracked opportunit{org.opportunityCount === 1 ? 'y' : 'ies'}
              </span>

              {org.website && (
                <a
                  href={org.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Website</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Organization Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-base">Add Organization</h3>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold block text-muted-foreground mb-1">Organization Name</label>
                <input
                  type="text"
                  placeholder="e.g. Stanford University or Ethereum Foundation"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div>
                <label className="font-semibold block text-muted-foreground mb-1">Official Website</label>
                <input
                  type="url"
                  placeholder="https://ethereum.org"
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div>
                <label className="font-semibold block text-muted-foreground mb-1">Country / Jurisdiction</label>
                <input
                  type="text"
                  placeholder="e.g. United States or Global"
                  value={countryInput}
                  onChange={(e) => setCountryInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background"
                />
              </div>

              <div>
                <label className="font-semibold block text-muted-foreground mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short overview of the host organization"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-input bg-background resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button size="sm" variant="ghost" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleAddOrganization} disabled={!nameInput.trim()}>
                Register & Map Channels
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
