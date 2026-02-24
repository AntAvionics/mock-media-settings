import Link from "next/link"
import { Megaphone, Film, Clock } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import { PlacementTags } from "@/components/placement-tags"
import { formatDateTime } from "@/lib/utils"

interface CampaignCardProps {
  campaignId: number
  adCount: number
  pushCount: number
  lastPushed?: string
  isActive?: boolean
  targetingZones?: Record<string, boolean>
  displayName?: string
  impressionCaps?: {
    flight?: number
    client?: number
  }
}

export function CampaignCard({
  campaignId,
  adCount,
  pushCount,
  lastPushed,
  isActive = true,
  targetingZones,
  displayName,
  impressionCaps,
}: CampaignCardProps) {
  return (
    <Link
      href={`/campaigns/${campaignId}`}
      className="flex flex-col gap-3 p-5 bg-card rounded-xl border shadow-sm hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-card-foreground">
              {displayName || `Campaign #${campaignId}`}
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              ID: {campaignId}
            </p>
          </div>
        </div>
        <StatusBadge
          label={isActive ? "Active" : "Inactive"}
          variant={isActive ? "success" : "muted"}
        />
      </div>

      {/* Placements */}
      {targetingZones && Object.keys(targetingZones).length > 0 && (
        <PlacementTags zones={targetingZones} />
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1 border-t">
        <span className="inline-flex items-center gap-1">
          <Film className="w-3.5 h-3.5" />
          {adCount} {adCount === 1 ? "ad" : "ads"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {pushCount} {pushCount === 1 ? "push" : "pushes"}
        </span>
        {impressionCaps?.flight && (
          <span>{impressionCaps.flight} per flight</span>
        )}
        {impressionCaps?.client && (
          <span>{impressionCaps.client} per passenger</span>
        )}
      </div>

      {/* Last pushed */}
      {lastPushed && (
        <p className="text-xs text-muted-foreground">
          Last pushed: {formatDateTime(lastPushed)}
        </p>
      )}
    </Link>
  )
}
