import { getPlacementLabel } from "@/lib/types"
import { cn } from "@/lib/utils"

interface PlacementTagsProps {
  zones: Record<string, boolean>
  className?: string
}

export function PlacementTags({ zones, className }: PlacementTagsProps) {
  const activeZones = Object.entries(zones).filter(([, active]) => active)
  if (activeZones.length === 0) return null

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {activeZones.map(([key]) => (
        <span
          key={key}
          className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent text-accent-foreground text-xs font-medium"
        >
          {getPlacementLabel(key)}
        </span>
      ))}
    </div>
  )
}
