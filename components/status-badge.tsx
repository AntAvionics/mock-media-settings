import { cn } from "@/lib/utils"

const VARIANT_CLASSES: Record<string, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  error: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
}

interface StatusBadgeProps {
  label: string
  variant?: keyof typeof VARIANT_CLASSES
  className?: string
}

export function StatusBadge({
  label,
  variant = "muted",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        VARIANT_CLASSES[variant] ?? VARIANT_CLASSES.muted,
        className
      )}
    >
      {label}
    </span>
  )
}
