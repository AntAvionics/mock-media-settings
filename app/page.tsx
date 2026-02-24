"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Megaphone,
  Film,
  Plane,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
} from "lucide-react"
import { MetricCard } from "@/components/metric-card"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { PushWizard } from "@/components/push-wizard"
import { useAllRules, useAircraft, useCampaignHistory } from "@/lib/hooks"
import { getActionLabel, getStatusVariant } from "@/lib/types"
import { formatDateTime } from "@/lib/utils"
import type { UpdateRecord, CampaignHistoryEntry } from "@/lib/types"

export default function DashboardPage() {
  const { data: rulesData, isLoading: rulesLoading } = useAllRules()
  const { data: aircraftData } = useAircraft()
  const { data: historyData, isLoading: historyLoading } = useCampaignHistory()
  const [wizardOpen, setWizardOpen] = useState(false)

  const rules = (rulesData?.rules ?? []) as unknown as UpdateRecord[]
  const aircraftList = aircraftData?.aircraft ?? []
  const historyEntries = (historyData?.updates ?? []) as unknown as CampaignHistoryEntry[]

  // Derive metrics
  const uniqueCampaignIds = new Set(rules.flatMap((r) => r.campaign_ids))
  const allCreatives = rules.flatMap((r) => {
    const creatives = r.metadata?.creatives ?? []
    return creatives.flatMap((c: Record<string, unknown>) => Object.keys(c))
  })
  const uniqueCreatives = new Set(allCreatives)

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Dashboard"
        description="Overview of your ad delivery system"
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

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Campaigns"
          value={rulesLoading ? "--" : uniqueCampaignIds.size}
          icon={Megaphone}
          subtitle={`${rules.length} update records`}
        />
        <MetricCard
          title="Ads"
          value={rulesLoading ? "--" : uniqueCreatives.size}
          icon={Film}
          subtitle="Across all campaigns"
        />
        <MetricCard
          title="Aircraft"
          value={aircraftList.length || "--"}
          icon={Plane}
          subtitle="Connected fleet"
        />
        <MetricCard
          title="Recent Pushes"
          value={historyLoading ? "--" : historyEntries.length}
          icon={Clock}
          subtitle="Campaign update events"
        />
      </div>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Recent Activity
          </h2>
          <Link
            href="/activity"
            className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {historyEntries.length === 0 && !historyLoading ? (
          <EmptyState
            icon={Clock}
            title="No activity yet"
            description="Push a campaign update to aircraft to see activity here."
          />
        ) : (
          <div className="bg-card rounded-xl border shadow-sm divide-y">
            {historyEntries.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-4 px-5 py-4"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0">
                  <RefreshCw className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-card-foreground truncate">
                    {getActionLabel(entry.update_type)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Aircraft{" "}
                    <span className="font-mono">{entry.tail_number}</span>
                    {" -- "}
                    v{entry.adload_version}
                  </p>
                </div>
                <StatusBadge
                  label={entry.update_type}
                  variant={getStatusVariant(entry.update_type === "ROLLBACK" ? "warning" : "ok")}
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateTime(entry.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/campaigns"
          className="flex items-center gap-3 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
        >
          <Megaphone className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              View Campaigns
            </p>
            <p className="text-xs text-muted-foreground">
              Browse and manage ad campaigns
            </p>
          </div>
        </Link>
        <Link
          href="/aircraft"
          className="flex items-center gap-3 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
        >
          <Plane className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              Fleet Status
            </p>
            <p className="text-xs text-muted-foreground">
              Check aircraft connectivity
            </p>
          </div>
        </Link>
        <Link
          href="/activity"
          className="flex items-center gap-3 p-4 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
        >
          <Clock className="w-5 h-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-card-foreground">
              Push History
            </p>
            <p className="text-xs text-muted-foreground">
              Audit log of all updates
            </p>
          </div>
        </Link>
      </div>

      <PushWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  )
}
