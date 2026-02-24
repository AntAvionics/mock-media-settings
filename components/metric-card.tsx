import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  subtitle?: string
  className?: string
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 p-5 bg-card rounded-xl border shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold text-card-foreground mt-0.5">
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}
