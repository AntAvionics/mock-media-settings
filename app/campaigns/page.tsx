"use client"

import { useState } from "react"
import { Megaphone, Search, Plus } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { CampaignCard } from "@/components/campaign-card"
import { EmptyState } from "@/components/empty-state"
import { PushWizard } from "@/components/push-wizard"
import { useAllRules } from "@/lib/hooks"
import type { UpdateRecord, Campaign } from "@/lib/types"
import Link from "next/link"

interface CampaignSummary {
  campaignId: number
  adCount: number
  pushCount: number
  lastPushed?: string
  isActive: boolean
  targetingZones: Record<string, boolean>
  displayName?: string
  impressionCaps: {
    flight?: number
    client?: number
  }
}

function deriveCampaigns(rules: UpdateRecord[]): CampaignSummary[] {
  const map = new Map<number, CampaignSummary>()

  for (const rule of rules) {
    const campaigns = (rule.metadata?.campaigns ?? []) as Campaign[]
    const creatives = rule.metadata?.creatives ?? []
    const zones = rule.metadata?.targeting_zones ?? {}

    for (const camp of campaigns) {
      const existing = map.get(camp.id)
      const adCount = creatives.reduce(
        (sum: number, c: Record<string, unknown>) => sum + Object.keys(c).length,
        0
      )

      if (existing) {
        existing.pushCount += 1
        if (
          rule.timestamp &&
          (!existing.lastPushed || rule.timestamp > existing.lastPushed)
        ) {
          existing.lastPushed = rule.timestamp
        }
        if (camp.targeting_zones) {
          existing.targetingZones = {
            ...existing.targetingZones,
            ...camp.targeting_zones,
          }
        }
        if (adCount > existing.adCount) existing.adCount = adCount
      } else {
        map.set(camp.id, {
          campaignId: camp.id,
          adCount,
          pushCount: 1,
          lastPushed: rule.timestamp,
          isActive: camp.is_active !== false,
          targetingZones: { ...zones, ...(camp.targeting_zones ?? {}) },
          displayName: rule.display_name,
          impressionCaps: {
            flight: camp.flightImpressionCap,
            client: camp.clientImpressionCap,
          },
        })
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      (b.lastPushed ? new Date(b.lastPushed).getTime() : 0) -
      (a.lastPushed ? new Date(a.lastPushed).getTime() : 0)
  )
}

export default function CampaignsPage() {
  const { data, isLoading } = useAllRules()
  const [search, setSearch] = useState("")
  const [versionFilter, setVersionFilter] = useState("")
  const [wizardOpen, setWizardOpen] = useState(false)

  const rules = (data?.rules ?? []) as unknown as UpdateRecord[]

  // Get unique adload versions for filter
  const adloadVersions = [...new Set(rules.map((r) => r.adload_version))].sort()

  // Apply version filter first
  const filteredRules = versionFilter
    ? rules.filter((r) => r.adload_version === versionFilter)
    : rules

  const campaigns = deriveCampaigns(filteredRules)

  // Apply search
  const filtered = search
    ? campaigns.filter(
        (c) =>
          String(c.campaignId).includes(search) ||
          c.displayName?.toLowerCase().includes(search.toLowerCase())
      )
    : campaigns

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Campaigns"
        description="Browse and manage your ad campaigns"
        actions={
          <button
            onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign Update
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search campaigns by name or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-card border rounded-lg text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        {adloadVersions.length > 1 && (
          <select
            value={versionFilter}
            onChange={(e) => setVersionFilter(e.target.value)}
            className="px-3 py-2.5 bg-card border rounded-lg text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          >
            <option value="">All Ad Load Versions</option>
            {adloadVersions.map((v) => (
              <option key={v} value={v}>
                Version {v}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Campaign grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-card rounded-xl border animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns found"
          description={
            search
              ? "Try adjusting your search or filters."
              : "Create a campaign update to get started."
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <CampaignCard
              key={c.campaignId}
              campaignId={c.campaignId}
              adCount={c.adCount}
              pushCount={c.pushCount}
              lastPushed={c.lastPushed}
              isActive={c.isActive}
              targetingZones={c.targetingZones}
              displayName={c.displayName}
              impressionCaps={c.impressionCaps}
            />
          ))}
        </div>
      )}

      <PushWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  )
}
