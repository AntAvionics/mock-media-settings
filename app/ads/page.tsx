"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Film, Search } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { useAllRules } from "@/lib/hooks"
import { getStatusVariant, type UpdateRecord, type Campaign } from "@/lib/types"
import { formatDate } from "@/lib/utils"

interface AdEntry {
  key: string
  id: number
  startDate: string
  endDate: string
  campaignId: number
  campaignName?: string
}

export default function AdsPage() {
  const { data, isLoading } = useAllRules()
  const [search, setSearch] = useState("")

  const rules = (data?.rules ?? []) as unknown as UpdateRecord[]

  const ads = useMemo(() => {
    const seen = new Map<string, AdEntry>()

    for (const rule of rules) {
      const campaigns = (rule.metadata?.campaigns ?? []) as Campaign[]
      const creatives = rule.metadata?.creatives ?? []
      const primaryCampaign = campaigns[0]

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
              campaignId: primaryCampaign?.id ?? 0,
              campaignName:
                rule.display_name || `Campaign #${primaryCampaign?.id ?? "?"}`,
            })
          }
        }
      }
    }

    return Array.from(seen.values())
  }, [rules])

  const filtered = search
    ? ads.filter(
        (a) =>
          a.key.toLowerCase().includes(search.toLowerCase()) ||
          String(a.id).includes(search) ||
          a.campaignName?.toLowerCase().includes(search.toLowerCase())
      )
    : ads

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ads"
        description="All advertisements across your campaigns"
      />

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search by ad name, ID, or campaign..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-card border rounded-lg text-sm text-card-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="h-64 bg-card rounded-xl border animate-pulse" />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Film}
          title="No ads found"
          description={
            search
              ? "Try adjusting your search."
              : "Ads will appear here once campaign updates are created."
          }
        />
      ) : (
        <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                  Ad Name
                </th>
                <th className="text-left px-5 py-3 font-medium text-muted-foreground">
                  Campaign
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
              {filtered.map((ad) => {
                const now = new Date()
                const start = new Date(ad.startDate)
                const end = new Date(ad.endDate)
                const isActive = now >= start && now <= end
                const isExpired = now > end
                const status = isActive
                  ? "Active"
                  : isExpired
                    ? "Expired"
                    : "Scheduled"

                return (
                  <tr
                    key={ad.key}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <span className="font-mono text-card-foreground font-medium">
                        {ad.key}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/campaigns/${ad.campaignId}`}
                        className="text-primary hover:text-primary/80 font-medium"
                      >
                        {ad.campaignName}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatDate(ad.startDate)}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {formatDate(ad.endDate)}
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
    </div>
  )
}
