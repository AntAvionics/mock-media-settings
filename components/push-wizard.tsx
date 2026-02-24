"use client"

import { useState } from "react"
import { Dialog } from "@/components/dialog"
import { submitCampaignUpdate, pushToAircraft } from "@/lib/api"
import { getPlacementLabel } from "@/lib/types"
import { formatDate, cn } from "@/lib/utils"
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Send,
  Check,
} from "lucide-react"
import { mutate } from "swr"

interface PushWizardProps {
  aircraftList: string[]
  onClose: () => void
}

interface CampaignEntry {
  id: string
  flightImpressionCap: string
  clientImpressionCap: string
  isActive: boolean
  targetingLanguage: string
}

interface AdEntry {
  key: string
  id: string
  startDate: string
  endDate: string
}

const PLACEMENT_OPTIONS = [
  "welcome_screen",
  "mid_roll",
  "post_roll",
  "pre_roll",
  "banner",
  "interstitial",
  "seatback",
  "overhead",
]

const STEPS = [
  "Campaign Info",
  "Campaigns",
  "Ads",
  "Screen Placements",
  "Target Aircraft",
  "Review & Push",
]

export function PushWizard({ aircraftList, onClose }: PushWizardProps) {
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Step 1: Campaign Info
  const [adloadVersion, setAdloadVersion] = useState("")
  const [displayName, setDisplayName] = useState("")

  // Step 2: Campaigns
  const [campaigns, setCampaigns] = useState<CampaignEntry[]>([
    {
      id: "",
      flightImpressionCap: "",
      clientImpressionCap: "",
      isActive: true,
      targetingLanguage: "",
    },
  ])

  // Step 3: Ads
  const [ads, setAds] = useState<AdEntry[]>([
    { key: "", id: "", startDate: "", endDate: "" },
  ])

  // Step 4: Placements
  const [placements, setPlacements] = useState<Record<string, boolean>>(
    Object.fromEntries(PLACEMENT_OPTIONS.map((p) => [p, false]))
  )

  // Step 5: Aircraft
  const [selectedAircraft, setSelectedAircraft] = useState<string[]>([])
  const [selectAllAircraft, setSelectAllAircraft] = useState(false)

  // Helpers
  const addCampaign = () =>
    setCampaigns([
      ...campaigns,
      {
        id: "",
        flightImpressionCap: "",
        clientImpressionCap: "",
        isActive: true,
        targetingLanguage: "",
      },
    ])
  const removeCampaign = (idx: number) =>
    setCampaigns(campaigns.filter((_, i) => i !== idx))
  const updateCampaign = (
    idx: number,
    field: keyof CampaignEntry,
    value: string | boolean
  ) =>
    setCampaigns(
      campaigns.map((c, i) => (i === idx ? { ...c, [field]: value } : c))
    )

  const addAd = () => setAds([...ads, { key: "", id: "", startDate: "", endDate: "" }])
  const removeAd = (idx: number) => setAds(ads.filter((_, i) => i !== idx))
  const updateAd = (idx: number, field: keyof AdEntry, value: string) =>
    setAds(ads.map((a, i) => (i === idx ? { ...a, [field]: value } : a)))

  const togglePlacement = (key: string) =>
    setPlacements({ ...placements, [key]: !placements[key] })

  const toggleAircraft = (id: string) =>
    setSelectedAircraft((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  const toggleAllAircraft = () => {
    if (selectAllAircraft) {
      setSelectedAircraft([])
    } else {
      setSelectedAircraft([...aircraftList])
    }
    setSelectAllAircraft(!selectAllAircraft)
  }

  const canNext = () => {
    switch (step) {
      case 0:
        return adloadVersion.trim().length > 0
      case 1:
        return campaigns.some((c) => c.id.trim().length > 0)
      case 2:
        return ads.some((a) => a.key.trim().length > 0)
      case 3:
        return true
      case 4:
        return selectedAircraft.length > 0
      default:
        return true
    }
  }

  const buildPayload = () => {
    const activePlacements: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(placements)) {
      if (v) activePlacements[k] = true
    }

    return {
      adload_version: adloadVersion.trim(),
      campaigns: campaigns
        .filter((c) => c.id.trim())
        .map((c) => ({
          id: parseInt(c.id, 10),
          ...(c.flightImpressionCap
            ? { flightImpressionCap: parseInt(c.flightImpressionCap, 10) }
            : {}),
          ...(c.clientImpressionCap
            ? { clientImpressionCap: parseInt(c.clientImpressionCap, 10) }
            : {}),
          is_active: c.isActive,
          ...(c.targetingLanguage
            ? {
                targeting_language: c.targetingLanguage
                  .split(",")
                  .map((l) => l.trim())
                  .filter(Boolean),
              }
            : {}),
          targeting_zones: activePlacements,
        })),
      creatives: ads
        .filter((a) => a.key.trim())
        .map((a) => ({
          [a.key.trim()]: {
            id: parseInt(a.id, 10) || 0,
            startDate: a.startDate,
            endDate: a.endDate,
          },
        })),
      targeting_zones: activePlacements,
      aircraft_ids: selectedAircraft,
    }
  }

  const handlePush = async () => {
    setLoading(true)
    setError("")
    try {
      const payload = buildPayload()
      // First submit as a campaign update to get a rule_id
      await submitCampaignUpdate(payload)
      // Then broadcast FULL to the selected aircraft
      await pushToAircraft(payload)
      // Revalidate SWR caches
      await mutate(() => true, undefined, { revalidate: true })
      setSuccess(true)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Dialog
        open
        onClose={onClose}
        title="Push Successful"
        description="Your campaign update has been sent to the selected aircraft."
      >
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-success/10 text-success">
            <Check className="w-7 h-7" />
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Pushed to {selectedAircraft.length}{" "}
            {selectedAircraft.length === 1 ? "aircraft" : "aircraft"} with{" "}
            {campaigns.filter((c) => c.id.trim()).length}{" "}
            {campaigns.filter((c) => c.id.trim()).length === 1
              ? "campaign"
              : "campaigns"}{" "}
            and {ads.filter((a) => a.key.trim()).length}{" "}
            {ads.filter((a) => a.key.trim()).length === 1 ? "ad" : "ads"}.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Done
          </button>
        </div>
      </Dialog>
    )
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title="New Campaign Update"
      description={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
      className="max-w-2xl"
    >
      <div className="flex flex-col gap-5">
        {/* Progress bar */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn(
                "flex-1 h-1.5 rounded-full transition-colors",
                i <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step 1: Campaign Info */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1.5">
                Ad Load Version <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={adloadVersion}
                onChange={(e) => setAdloadVersion(e.target.value)}
                placeholder="e.g. 1.0.0"
                className="w-full px-3 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                autoFocus
              />
              <p className="text-xs text-muted-foreground mt-1">
                The version number for this set of ads
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1.5">
                Display Name (optional)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Summer Holiday Promo"
                className="w-full px-3 py-2.5 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A friendly name to help you find this update later
              </p>
            </div>
          </div>
        )}

        {/* Step 2: Campaigns */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            {campaigns.map((c, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg border"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">
                    Campaign {idx + 1}
                  </span>
                  {campaigns.length > 1 && (
                    <button
                      onClick={() => removeCampaign(idx)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Campaign ID <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      value={c.id}
                      onChange={(e) => updateCampaign(idx, "id", e.target.value)}
                      placeholder="e.g. 1001"
                      className="w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Languages
                    </label>
                    <input
                      type="text"
                      value={c.targetingLanguage}
                      onChange={(e) =>
                        updateCampaign(idx, "targetingLanguage", e.target.value)
                      }
                      placeholder="en, fr, de"
                      className="w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Max per Flight
                    </label>
                    <input
                      type="number"
                      value={c.flightImpressionCap}
                      onChange={(e) =>
                        updateCampaign(
                          idx,
                          "flightImpressionCap",
                          e.target.value
                        )
                      }
                      placeholder="e.g. 100"
                      className="w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Max per Passenger
                    </label>
                    <input
                      type="number"
                      value={c.clientImpressionCap}
                      onChange={(e) =>
                        updateCampaign(
                          idx,
                          "clientImpressionCap",
                          e.target.value
                        )
                      }
                      placeholder="e.g. 3"
                      className="w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={c.isActive}
                    onChange={(e) =>
                      updateCampaign(idx, "isActive", e.target.checked)
                    }
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-card-foreground">Active</span>
                </label>
              </div>
            ))}
            <button
              onClick={addCampaign}
              className="inline-flex items-center gap-1.5 self-start px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Campaign
            </button>
          </div>
        )}

        {/* Step 3: Ads */}
        {step === 2 && (
          <div className="flex flex-col gap-4">
            {ads.map((a, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 p-4 bg-muted/50 rounded-lg border"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">
                    Ad {idx + 1}
                  </span>
                  {ads.length > 1 && (
                    <button
                      onClick={() => removeAd(idx)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Ad Identifier <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      value={a.key}
                      onChange={(e) => updateAd(idx, "key", e.target.value)}
                      placeholder="e.g. 12345-67890"
                      className="w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Ad ID
                    </label>
                    <input
                      type="number"
                      value={a.id}
                      onChange={(e) => updateAd(idx, "id", e.target.value)}
                      placeholder="e.g. 101"
                      className="w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      Start Date <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      value={a.startDate}
                      onChange={(e) =>
                        updateAd(idx, "startDate", e.target.value)
                      }
                      className="w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">
                      End Date <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      value={a.endDate}
                      onChange={(e) => updateAd(idx, "endDate", e.target.value)}
                      className="w-full px-3 py-2 bg-background border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addAd}
              className="inline-flex items-center gap-1.5 self-start px-3 py-2 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Ad
            </button>
          </div>
        )}

        {/* Step 4: Screen Placements */}
        {step === 3 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Choose where your ads should appear on the aircraft screens.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {PLACEMENT_OPTIONS.map((key) => (
                <label
                  key={key}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg border text-sm cursor-pointer transition-colors",
                    placements[key]
                      ? "border-primary bg-primary/5 text-card-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={placements[key]}
                    onChange={() => togglePlacement(key)}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  {getPlacementLabel(key)}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Target Aircraft */}
        {step === 4 && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              Select which aircraft should receive this update.
            </p>
            <label className="flex items-center gap-2 text-sm cursor-pointer pb-2 border-b">
              <input
                type="checkbox"
                checked={selectAllAircraft}
                onChange={toggleAllAircraft}
                className="w-4 h-4 rounded accent-primary"
              />
              <span className="font-medium text-card-foreground">
                All Aircraft
              </span>
              <span className="text-xs text-muted-foreground">
                ({selectedAircraft.length} selected)
              </span>
            </label>
            {aircraftList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No aircraft available. Make sure the fleet is connected.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {aircraftList.map((id) => (
                  <label
                    key={id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer transition-colors",
                      selectedAircraft.includes(id)
                        ? "border-primary bg-primary/5 text-card-foreground"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAircraft.includes(id)}
                      onChange={() => toggleAircraft(id)}
                      className="w-4 h-4 rounded accent-primary"
                    />
                    Aircraft {id}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 6: Review */}
        {step === 5 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Review your campaign update before pushing to aircraft.
            </p>
            <div className="bg-muted/50 rounded-lg border p-4 text-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ad Load Version</span>
                <span className="font-mono font-medium text-card-foreground">
                  {adloadVersion}
                </span>
              </div>
              {displayName && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-card-foreground">
                    {displayName}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Campaigns</span>
                <span className="font-medium text-card-foreground">
                  {campaigns.filter((c) => c.id.trim()).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ads</span>
                <span className="font-medium text-card-foreground">
                  {ads.filter((a) => a.key.trim()).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Screen Placements
                </span>
                <span className="font-medium text-card-foreground">
                  {Object.values(placements).filter(Boolean).length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Target Aircraft</span>
                <span className="font-medium text-card-foreground">
                  {selectedAircraft.length}
                </span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2 border-t">
          <button
            onClick={() => (step > 0 ? setStep(step - 1) : onClose())}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-card-foreground transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handlePush}
              disabled={loading || selectedAircraft.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {loading ? "Pushing..." : "Push to Aircraft"}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  )
}
