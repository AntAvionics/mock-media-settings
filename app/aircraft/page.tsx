"use client"

import { useState, useCallback } from "react"
import {
  Plane,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Undo2,
} from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { EmptyState } from "@/components/empty-state"
import { useAircraft, useHeadendPing } from "@/lib/hooks"
import { pingAircraft, getAircraftState } from "@/lib/api"
import { RollbackDialog } from "@/components/rollback-dialog"
import { cn } from "@/lib/utils"

interface AircraftDetail {
  loading: boolean
  error?: string
  pingResult?: Record<string, unknown>
  stateResult?: Record<string, unknown>
}

export default function AircraftPage() {
  const { data, isLoading, mutate } = useAircraft()
  const { data: headendData } = useHeadendPing()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, AircraftDetail>>({})
  const [rollbackAircraft, setRollbackAircraft] = useState<string | null>(null)

  const aircraftList = data?.aircraft ?? []
  const headendOk = headendData?.ok ?? false

  const handlePing = useCallback(async (id: string) => {
    setDetails((prev) => ({
      ...prev,
      [id]: { loading: true },
    }))
    try {
      const result = await pingAircraft(id)
      setDetails((prev) => ({
        ...prev,
        [id]: { loading: false, pingResult: result },
      }))
    } catch (err) {
      setDetails((prev) => ({
        ...prev,
        [id]: { loading: false, error: String(err) },
      }))
    }
  }, [])

  const handleExpand = useCallback(
    async (id: string) => {
      if (expanded === id) {
        setExpanded(null)
        return
      }
      setExpanded(id)
      if (!details[id]?.stateResult) {
        setDetails((prev) => ({
          ...prev,
          [id]: { ...prev[id], loading: true },
        }))
        try {
          const result = await getAircraftState(id)
          setDetails((prev) => ({
            ...prev,
            [id]: { ...prev[id], loading: false, stateResult: result },
          }))
        } catch (err) {
          setDetails((prev) => ({
            ...prev,
            [id]: { ...prev[id], loading: false, error: String(err) },
          }))
        }
      }
    },
    [expanded, details]
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Aircraft"
        description="Fleet connectivity and ad delivery status"
        actions={
          <div className="flex items-center gap-3">
            <StatusBadge
              label={headendOk ? "Backend Online" : "Backend Offline"}
              variant={headendOk ? "success" : "error"}
            />
            <button
              onClick={() => mutate()}
              className="inline-flex items-center gap-2 px-3 py-2 bg-card border rounded-lg text-sm font-medium text-card-foreground hover:bg-muted transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 bg-card rounded-xl border animate-pulse"
            />
          ))}
        </div>
      ) : aircraftList.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="No aircraft detected"
          description="Make sure the rollback service is running and aircraft are connected."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {aircraftList.map((id) => {
            const detail = details[id]
            const isExpanded = expanded === id
            const pingOk = detail?.pingResult
              ? (
                  detail.pingResult as {
                    result?: { ok?: boolean }
                  }
                ).result?.ok
              : undefined

            return (
              <div
                key={id}
                className={cn(
                  "flex flex-col bg-card rounded-xl border shadow-sm transition-shadow",
                  isExpanded && "shadow-md"
                )}
              >
                {/* Card header */}
                <div className="flex items-center gap-3 p-5">
                  <div
                    className={cn(
                      "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                      pingOk === true
                        ? "bg-success/10 text-success"
                        : pingOk === false
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {pingOk === false ? (
                      <WifiOff className="w-5 h-5" />
                    ) : (
                      <Wifi className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-card-foreground">
                      Aircraft {id}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Tail Number: {id}
                    </p>
                  </div>
                  {pingOk !== undefined && (
                    <StatusBadge
                      label={pingOk ? "Online" : "Offline"}
                      variant={pingOk ? "success" : "error"}
                    />
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 px-5 pb-4">
                  <button
                    onClick={() => handlePing(id)}
                    disabled={detail?.loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw
                      className={cn(
                        "w-3.5 h-3.5",
                        detail?.loading && "animate-spin"
                      )}
                    />
                    Ping
                  </button>
                  <button
                    onClick={() => handleExpand(id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-medium hover:bg-muted/80 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                    State
                  </button>
                  <button
                    onClick={() => setRollbackAircraft(id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Undo
                  </button>
                </div>

                {/* Expanded state */}
                {isExpanded && (
                  <div className="px-5 pb-4 border-t pt-3">
                    {detail?.loading && !detail.stateResult ? (
                      <p className="text-xs text-muted-foreground">
                        Loading state...
                      </p>
                    ) : detail?.error ? (
                      <p className="text-xs text-destructive">
                        {detail.error}
                      </p>
                    ) : detail?.stateResult ? (
                      <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto font-mono text-muted-foreground max-h-48 overflow-y-auto">
                        {JSON.stringify(detail.stateResult, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Rollback dialog for single aircraft */}
      {rollbackAircraft && (
        <RollbackDialog
          aircraftList={[rollbackAircraft]}
          preselected={[rollbackAircraft]}
          onClose={() => setRollbackAircraft(null)}
        />
      )}
    </div>
  )
}
