"use client"

import { useState } from "react"
import { Dialog } from "@/components/dialog"
import { reapplyUpdateRecord } from "@/lib/api"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface ReapplyDialogProps {
  ruleId: string
  aircraftList: string[]
  onClose: () => void
}

export function ReapplyDialog({
  ruleId,
  aircraftList,
  onClose,
}: ReapplyDialogProps) {
  const [selected, setSelected] = useState<string[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  const toggleAircraft = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
    setSelectAll(false)
  }

  const toggleAll = () => {
    if (selectAll) {
      setSelected([])
      setSelectAll(false)
    } else {
      setSelected([...aircraftList])
      setSelectAll(true)
    }
  }

  const handleReapply = async () => {
    if (selected.length === 0) return
    setLoading(true)
    setError("")
    try {
      const res = await reapplyUpdateRecord(ruleId, selected)
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
      title="Re-push to Aircraft"
      description="Select which aircraft should receive this update again."
    >
      <div className="flex flex-col gap-4">
        {result ? (
          <div className="flex flex-col gap-3">
            <div className="p-4 bg-success/10 text-success rounded-lg text-sm">
              Successfully re-pushed to {selected.length}{" "}
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
            <div className="flex items-center gap-2 pb-2 border-b">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="font-medium text-card-foreground">
                  All Aircraft
                </span>
              </label>
              <span className="text-xs text-muted-foreground">
                ({selected.length} selected)
              </span>
            </div>

            {aircraftList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No aircraft available. Make sure the fleet is connected.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {aircraftList.map((id) => (
                  <label
                    key={id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors",
                      selected.includes(id)
                        ? "border-primary bg-primary/5 text-card-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(id)}
                      onChange={() => toggleAircraft(id)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    Aircraft {id}
                  </label>
                ))}
              </div>
            )}

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
                onClick={handleReapply}
                disabled={loading || selected.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={cn("w-4 h-4", loading && "animate-spin")}
                />
                {loading
                  ? "Pushing..."
                  : `Re-push to ${selected.length || ""} Aircraft`}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}
