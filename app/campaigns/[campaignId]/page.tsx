"use client"

import { use, useState, useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Film,
  Layout,
  Clock,
  Edit2,
  RefreshCw,
  Undo2,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { PlacementTags } from "@/components/placement-tags"
import { EmptyState } from "@/components/empty-state"
import { useAllRules, useAircraft } from "@/lib/hooks"
import {
  getStatusVariant,
  type UpdateRecord,
  type Campaign,
  type Creative,
} from "@/lib/types"
import { formatDate, formatDateTime } from "@/lib/utils"
import { RenameDialog } from "@/components/rename-dialog"
import { ReapplyDialog } from "@/components/reapply-dialog"
import { RollbackDialog } from "@/components/rollback-dialog"

export default function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId: rawId } = use(params)
  const campaignId = parseInt(rawId, 10)

  const { data } = useAllRules()
  const { data: aircraftData } = useAircraft()
  const aircraftList = aircraftData?.aircraft ?? []

  const [expandedRuleId, setExpandedRuleId] = useState<string | null>(null)
  const [renameRuleId, setRenameRuleId] = useState<string | null>(null)
  const [reapplyRuleId, setReapplyRuleId] = useState<string | null>(null)
  const [rollbackOpen, setRollbackOpen] = useState(false)

  const rules = (data?.rules ?? []) as unknown as UpdateRecord[]
  const relatedRules = rules.filter((r) => r.campaign_ids.includes(campaignId))

  // Extract campaign info from the most recent rule
  const latestRule = relatedRules[0]
  const campaignData = useMemo(() => {
    if (!latestRule) return null
    const campaigns = (latestRule.metadata?.campaigns ?? []) as Campaign[]
    return campaigns.find((c) => c.id === campaignId)
  }, [latestRule, campaignId])

  // Collect all unique creatives across all related rules
  const allCreatives = useMemo(() => {
    const seen = new Map<string, Creative>()
    for (const rule of relatedRules) {
      const creatives = rule.metadata?.creatives ?? []
      for (const cObj of creatives as Record<
        string,
        { id: number; startDate: string; endDate: string }
      >[]) {
        for (const [key, val] of Object.entries(cObj)) {
          if (!seen.has(key)) {
            seen.set(key, {
              key,
              id: val.id,
              startDate: val.startDate,
              endDate: val.endDate,
            })
          }
        }
      }
    }
    return Array.from(seen.values())
  }, [relatedRules])

  // Targeting zones from the latest rule
  const targetingZones = useMemo(() => {
    const zones: Record<string, boolean> = {}
    if (campaignData?.targeting_zones) {
      Object.assign(zones, campaignData.targeting_zones)
    }
    if (latestRule?.metadata?.targeting_zones) {
      Object.assign(zones, latestRule.metadata.targeting_zones)
    }
    return zones
  }, [campaignData, latestRule])

  if (!latestRule) {
    return (
      <div className="flex flex-col gap-6">
        <Link
          href="/campaigns"
          className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>
        <EmptyState
          icon={Film}
          title={`Campaign #${campaignId} not found`}
          description="This campaign has no update records yet."
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/campaigns"
        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 font-medium w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Campaigns
      </Link>

      <PageHeader
        title={
          latestRule.display_name || `Campaign #${campaignId}`
        }
        description={`Campaign ID: ${campaignId} -- Ad Load Version: ${latestRule.adload_version}`}
        actions={
          <button
            onClick={() => setRollbackOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
            Undo Last Push
          </button>
        }
      />

      {/* Overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex flex-col gap-2 p-5 bg-card rounded-xl border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">Status</p>
          <StatusBadge
            label={campaignData?.is_active !== false ? "Active" : "Inactive"}
            variant={
              campaignData?.is_active !== false ? "success" : "muted"
            }
          />
        </div>
        <div className="flex flex-col gap-2 p-5 bg-card rounded-xl border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">
            Impression Caps
          </p>
          <div className="flex flex-col gap-1 text-sm text-card-foreground">
            {campaignData?.flightImpressionCap && (
              <span>{campaignData.flightImpressionCap} per flight</span>
            )}
            {campaignData?.clientImpressionCap && (
              <span>{campaignData.clientImpressionCap} per passenger</span>
            )}
            {!campaignData?.flightImpressionCap &&
              !campaignData?.clientImpressionCap && (
                <span className="text-muted-foreground">No caps set</span>
              )}
          </div>
        </div>
        <div className="flex flex-col gap-2 p-5 bg-card rounded-xl border shadow-sm">
          <p className="text-sm text-muted-foreground font-medium">
            Targeting Language
          </p>
          <div className="flex flex-wrap gap-1">
            {campaignData?.targeting_language?.map((lang) => (
              <span
                key={lang}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-muted-foreground text-xs font-medium"
              >
                {lang}
              </span>
            )) ?? (
              <span className="text-sm text-muted-foreground">All</span>
            )}
          </div>
        </div>
      </div>

      {/* Screen Placements */}
      {Object.keys(targetingZones).length > 0 && (
        <section>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
            <Layout className="w-5 h-5 text-primary" />
            Screen Placements
          </h2>
          <PlacementTags zones={targetingZones} />
        </section>
      )}

      {/* Ads in this Campaign */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
          <Film className="w-5 h-5 text-primary" />
          Ads ({allCreatives.length})
        </h2>
        {allCreatives.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No ads found in this campaign.
          </p>
        ) : (
          <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Ad Name
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Start Date
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    End Date
                  </th>
                  <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allCreatives.map((c) => {
                  const now = new Date()
                  const start = new Date(c.startDate)
                  const end = new Date(c.endDate)
                  const isActive = now >= start && now <= end
                  const isExpired = now > end
                  const status = isActive
                    ? "Active"
                    : isExpired
                      ? "Expired"
                      : "Scheduled"

                  return (
                    <tr key={c.key} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3 font-mono text-card-foreground">
                        {c.key}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDate(c.startDate)}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDate(c.endDate)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          label={status}
                          variant={getStatusVariant(
                            isActive ? "active" : isExpired ? "failed" : "pending"
                          )}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Push History */}
      <section>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3">
          <Clock className="w-5 h-5 text-primary" />
          Push History ({relatedRules.length})
        </h2>
        <div className="flex flex-col gap-3">
          {relatedRules.map((rule) => (
            <div
              key={rule.rule_id}
              className="bg-card rounded-xl border shadow-sm"
            >
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-card-foreground">
                      {rule.display_name || `Update ${rule.rule_id.slice(0, 8)}`}
                    </p>
                    <span className="text-xs text-muted-foreground font-mono">
                      {rule.rule_id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDateTime(rule.timestamp)}
                    {rule.tail_number &&
                      ` -- Aircraft ${rule.tail_number}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setRenameRuleId(rule.rule_id)}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-card-foreground transition-colors"
                    title="Rename"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setReapplyRuleId(rule.rule_id)}
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-card-foreground transition-colors"
                    title="Re-push to Aircraft"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() =>
                      setExpandedRuleId(
                        expandedRuleId === rule.rule_id ? null : rule.rule_id
                      )
                    }
                    className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-card-foreground transition-colors"
                    title="Show details"
                  >
                    {expandedRuleId === rule.rule_id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded technical details */}
              {expandedRuleId === rule.rule_id && (
                <div className="px-5 pb-4 border-t">
                  <p className="text-xs text-muted-foreground font-medium mt-3 mb-2">
                    Technical Details
                  </p>
                  <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono text-muted-foreground max-h-64 overflow-y-auto">
                    {JSON.stringify(rule.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Dialogs */}
      {renameRuleId && (
        <RenameDialog
          ruleId={renameRuleId}
          currentName={
            relatedRules.find((r) => r.rule_id === renameRuleId)
              ?.display_name ?? ""
          }
          onClose={() => setRenameRuleId(null)}
        />
      )}
      {reapplyRuleId && (
        <ReapplyDialog
          ruleId={reapplyRuleId}
          aircraftList={aircraftList}
          onClose={() => setReapplyRuleId(null)}
        />
      )}
      {rollbackOpen && (
        <RollbackDialog
          aircraftList={aircraftList}
          onClose={() => setRollbackOpen(false)}
        />
      )}
    </div>
  )
}
