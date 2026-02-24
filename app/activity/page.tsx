"use client"

import { useState } from "react"
import { Clock, Filter, RefreshCw } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { useCampaignHistory, useBroadcastHistory } from "@/lib/hooks"
import { getActionLabel, getStatusVariant } from "@/lib/types"
import type { CampaignHistoryEntry, BroadcastHistoryEntry } from "@/lib/types"
import { formatDateTime, cn } from "@/lib/utils"

type ViewMode = "campaign" | "broadcast"

export default function ActivityPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("campaign")
  const [typeFilter, setTypeFilter] = useState("")
  const [aircraftFilter, setAircraftFilter] = useState("")

  const { data: campaignData, isLoading: campLoading } = useCampaignHistory()
  const { data: broadcastData, isLoading: broadLoading } = useBroadcastHistory()

  const campaignEntries = (campaignData?.updates ??
    []) as unknown as CampaignHistoryEntry[]
  const broadcastEntries = (
    (broadcastData as Record<string, unknown>)?.entries ?? []
  ) as unknown as BroadcastHistoryEntry[]

  // Unique aircraft and types for filters
  const uniqueAircraft = [
    ...new Set(campaignEntries.map((e) => e.tail_number)),
  ].sort()
  const uniqueTypes = [
    ...new Set(campaignEntries.map((e) => e.update_type)),
  ].sort()

  // Filtered campaign entries
  const filteredCampaign = campaignEntries
    .filter((e) => !typeFilter || e.update_type === typeFilter)
    .filter((e) => !aircraftFilter || e.tail_number === aircraftFilter)

  const isLoading = viewMode === "campaign" ? campLoading : broadLoading

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Activity"
        description="Audit log of all campaign pushes, updates, and rollbacks"
      />

      {/* View toggle + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          <button
            onClick={() => setViewMode("campaign")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              viewMode === "campaign"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            )}
          >
            Campaign Updates
          </button>
          <button
            onClick={() => setViewMode("broadcast")}
            className={cn(
              "px-4 py-2 rounded-md text-sm font-medium transition-colors",
              viewMode === "broadcast"
                ? "bg-card text-card-foreground shadow-sm"
                : "text-muted-foreground hover:text-card-foreground"
            )}
          >
            Broadcast Log
          </button>
        </div>

        {viewMode === "campaign" && (
          <>
            {uniqueTypes.length > 1 && (
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 bg-card border rounded-lg text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Types</option>
                {uniqueTypes.map((t) => (
                  <option key={t} value={t}>
                    {getActionLabel(t)}
                  </option>
                ))}
              </select>
            )}
            {uniqueAircraft.length > 1 && (
              <select
                value={aircraftFilter}
                onChange={(e) => setAircraftFilter(e.target.value)}
                className="px-3 py-2 bg-card border rounded-lg text-sm text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                <option value="">All Aircraft</option>
                {uniqueAircraft.map((a) => (
                  <option key={a} value={a}>
                    Aircraft {a}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
      </div>

      {/* Campaign Updates view */}
      {viewMode === "campaign" && (
        <>
          {isLoading ? (
            <div className="h-64 bg-card rounded-xl border animate-pulse" />
          ) : filteredCampaign.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No activity yet"
              description="Push campaign updates to aircraft to see activity here."
            />
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                      Time
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                      Action
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                      Aircraft
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                      Ad Load Version
                    </th>
                    <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                      Update ID
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredCampaign.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.timestamp)}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge
                          label={getActionLabel(entry.update_type)}
                          variant={getStatusVariant(
                            entry.update_type === "ROLLBACK"
                              ? "warning"
                              : entry.update_type === "FULL"
                                ? "ok"
                                : "pending"
                          )}
                        />
                      </td>
                      <td className="px-5 py-3 font-mono text-card-foreground">
                        {entry.tail_number}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        v{entry.adload_version}
                      </td>
                      <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                        {entry.rule_id === "N/A"
                          ? "--"
                          : entry.rule_id.slice(0, 12)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Broadcast log view */}
      {viewMode === "broadcast" && (
        <>
          {broadLoading ? (
            <div className="h-64 bg-card rounded-xl border animate-pulse" />
          ) : broadcastEntries.length === 0 ? (
            <EmptyState
              icon={RefreshCw}
              title="No broadcast entries"
              description="Broadcast history will appear here after sending updates."
            />
          ) : (
            <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b">
                <p className="text-sm text-muted-foreground">
                  Raw broadcast log from the delivery system. Use the Campaign
                  Updates tab for a friendlier view.
                </p>
              </div>
              <pre className="text-xs p-5 overflow-x-auto font-mono text-muted-foreground max-h-[600px] overflow-y-auto">
                {JSON.stringify(broadcastEntries, null, 2)}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  )
}
