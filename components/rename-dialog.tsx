"use client"

import { useState } from "react"
import { Dialog } from "@/components/dialog"
import { renameUpdateRecord } from "@/lib/api"
import { mutate } from "swr"

interface RenameDialogProps {
  ruleId: string
  currentName: string
  onClose: () => void
}

export function RenameDialog({
  ruleId,
  currentName,
  onClose,
}: RenameDialogProps) {
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    if (!name.trim()) return
    setLoading(true)
    setError("")
    try {
      await renameUpdateRecord(ruleId, name.trim())
      await mutate(
        (key: unknown) => typeof key === "string" && key.includes("rules"),
        undefined,
        { revalidate: true }
      )
      onClose()
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
      title="Rename Update"
      description="Give this update a friendly name so it's easy to find later."
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1.5">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Summer Promo Push #3"
            className="w-full px-3 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            Update ID:{" "}
            <span className="font-mono">{ruleId.slice(0, 12)}</span>
          </p>
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-card-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save Name"}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
