"use client"

import { useState } from "react"
import { Dialog } from "@/components/dialog"
import { undoPush } from "@/lib/api"
import { AlertTriangle, Undo2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface RollbackDialogProps {
  aircraftList: string[]
  preselected?: string[]
  onClose: () => void
}

export function RollbackDialog({
  aircraftList,
  preselected,
  onClose,
}: RollbackDialogProps) {
  const [selected, setSelected] = useState<string[]>(preselected ?? [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  const toggleAircraft = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleRollback = async () => {
    if (selected.length === 0) return
    setLoading(true)
    setError("")
    try {
      const res = await undoPush({
        aircraft_ids: selected,
      })
      setResult(res)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="Undo Last Push"
      description="This will revert the selected aircraft to their previous ad configuration."
    >
      <div className="flex flex-col gap-4">
        {result ? (
          <div className="flex flex-col gap-3">
            <div className="p-4 bg-warning/10 text-warning rounded-lg text-sm font-medium">
              Rollback sent to {selected.length}{" "}
              {selected.length === 1 ? "aircraft" : "aircraft"}.
            </div>
            <button
              onClick={onClose}
              className="self-end px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-warning/10 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-warning">
                  This action cannot be easily undone
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  The selected aircraft will be reverted to their previous ad
                  configuration. Any ads from the most recent push will be
                  removed.
                </p>
              </div>
            </div>

            {/* Aircraft selection */}
            {aircraftList.length <= 1 && preselected ? (
              <p className="text-sm text-card-foreground">
                Rollback will be sent to Aircraft{" "}
                <span className="font-mono font-semibold">
                  {preselected[0]}
                </span>
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {aircraftList.map((id) => (
                  <label
                    key={id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors",
                      selected.includes(id)
                        ? "border-destructive bg-destructive/5 text-card-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={() => toggleAircraft(id)}
                      className="w-4 h-4 rounded accent-destructive"
                    />
                    Aircraft {id}
                  </label>
                ))}
              </div>
            )}

            {/* Confirmation checkbox */}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="w-4 h-4 rounded accent-destructive"
              />
              <span className="text-card-foreground">
                I understand this will revert the ad configuration
              </span>
            </label>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-card-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRollback}
                disabled={loading || selected.length === 0 || !confirmed}
                className="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-50"
              >
                <Undo2 className="w-4 h-4" />
                {loading ? "Sending..." : "Undo Last Push"}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
