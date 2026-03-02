"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AdFormData } from "./addModal";
import EditAdModal from "./editModal";

/* ─── types ───────────────────────────────────────────────────────────────── */

type AdWithMeta = AdFormData & {
  id: string | number;
  impressions?: number;
  clicks?: number;
};

type Props = {
  ad: AdWithMeta;
  onEdit?: (id: string | number, updated: AdFormData) => void;
  onDelete?: (id: string | number) => void;
};

type BroadcastStatus = {
  status: "idle" | "sending" | "ok" | "partial" | "error";
  message: string;
};

/* ─── payload builders ────────────────────────────────────────────────────── */

function buildCampaignPayload(ad: AdWithMeta) {
  const campaignId = ad.campaignId || Number(ad.id);
  const campaign: Record<string, any> = {
    id: campaignId,
    is_active: ad.status === "active",
  };
  if (ad.impressionCap) campaign.flightImpressionCap = Number(ad.impressionCap);
  if (ad.endDate) campaign.expired_at = `${ad.endDate}T00:00:00Z`;

  const creative: Record<string, any> = {
    id: campaignId,
    startDate: ad.startDate ? `${ad.startDate}T00:00:00Z` : new Date().toISOString(),
    endDate: ad.endDate ? `${ad.endDate}T00:00:00Z` : new Date().toISOString(),
  };

  return {
    adload_version: String(campaignId),
    campaigns: [campaign],
    creatives: [{ [`${campaignId}-${campaignId}`]: creative }],
    targeting_zones: { LVA: { enabled: ad.status === "active" } },
  };
}

function buildFullPayload(ad: AdWithMeta) {
  const campaignId = ad.campaignId || Number(ad.id);
  const base = buildCampaignPayload(ad);
  return {
    version: campaignId,
    data: {
      [ad.name || `campaign_${campaignId}`]: {
        priority: 80,
        impression_cap: ad.impressionCap ? Number(ad.impressionCap) : 1000,
        start_date: ad.startDate ? `${ad.startDate}T00:00:00Z` : new Date().toISOString(),
        end_date: ad.endDate ? `${ad.endDate}T00:00:00Z` : new Date().toISOString(),
        targeting: {
          audience_tags: ad.target ? [ad.target] : [],
        },
        creatives: ad.files?.length
          ? ad.files.map((f: any, i: number) => ({
              id: `CR-${campaignId}-${i + 1}`,
              type: "asset",
              asset_name: typeof f === "string" ? f : f.name,
            }))
          : [],
      },
    },
    ...base,
    metadata: {
      submitted_by: "ad-manager",
      description: ad.description || ad.title || "",
      created_at: new Date().toISOString(),
    },
  };
}

function buildPatchPayload(ad: AdWithMeta) {
  const campaignId = ad.campaignId || Number(ad.id);
  return {
    patch_id: Date.now(),
    prev: campaignId,
    changes: {
      [ad.name || `campaign_${campaignId}`]: {
        priority: ad.status === "active" ? 80 : 40,
        impression_cap: ad.impressionCap ? Number(ad.impressionCap) : undefined,
      },
    },
    ...buildCampaignPayload(ad),
  };
}

/* ─── helpers ──────────────────────────────────────────────────────────────── */

async function fetchJson(path: string, opts?: RequestInit) {
  const r = await fetch(path, opts);
  const text = await r.text();
  try {
    return { ok: r.ok, status: r.status, data: JSON.parse(text) };
  } catch {
    return { ok: r.ok, status: r.status, data: text };
  }
}

function statusBadgeCls(s: string) {
  switch (s) {
    case "active":  return "bg-green-100 text-green-900";
    case "paused":  return "bg-yellow-100 text-yellow-900";
    default:        return "bg-gray-100 text-gray-600";
  }
}

function broadcastPillCls(s: BroadcastStatus["status"]) {
  switch (s) {
    case "ok":      return "bg-green-100 text-green-800";
    case "partial": return "bg-yellow-100 text-yellow-800";
    case "error":   return "bg-red-100 text-red-800";
    case "sending": return "bg-blue-100 text-blue-800";
    default:        return "";
  }
}

/* ─── component ───────────────────────────────────────────────────────────── */

export default function Ads({ ad, onEdit, onDelete }: Props) {
  const [isExpanded, setIsExpanded]   = useState(false);
  const [isEditOpen, setIsEditOpen]   = useState(false);
  const [mounted, setMounted]         = useState(false);

  useEffect(() => { setMounted(true); }, []);
  const [broadcast, setBroadcast]     = useState<BroadcastStatus>({ status: "idle", message: "" });
  const [rollbackTarget, setRollbackTarget] = useState("lva");
  const [showPayloadFor, setShowPayloadFor] = useState<string | null>(null);

  const flights = ad.flights ?? [];
  const flightCount = flights.length;
  const fileCount = (ad.files ?? []).length;
  const budget = typeof ad.budget === "number" ? ad.budget : 0;
  const impressions = ad.impressions ?? 0;

  /* ── routing ── */
  function buildRouting() {
    if (flights.length === 0) return {};
    if (flights.length === 1) return { aircraft_id: flights[0] };
    return { aircraft_ids: flights };
  }

  function hastargets() {
    return flights.length > 0;
  }

  /* ── broadcast ── */
  async function sendBroadcast(endpoint: string, payload: object) {
    if (!hastargets()) {
      setBroadcast({ status: "error", message: "No flights assigned — select aircraft first." });
      return;
    }
    setBroadcast({ status: "sending", message: "Sending…" });
    try {
      const body = { ...payload, ...buildRouting() };
      const { ok, status, data } = await fetchJson(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!ok && status !== 207) {
        const msg = data?.error ?? data?.detail ?? `HTTP ${status}`;
        setBroadcast({ status: "error", message: msg });
        return;
      }
      const localStatus = data?.local?.status ?? (ok ? "ok" : "unknown");
      const okCount   = data?.local?.ok_count   ?? 0;
      const failCount = data?.local?.fail_count  ?? 0;
      const summary =
        localStatus === "partial"
          ? `partial — ${okCount} ok, ${failCount} failed`
          : localStatus;
      setBroadcast({ status: localStatus as BroadcastStatus["status"], message: summary });
    } catch (e: any) {
      setBroadcast({ status: "error", message: String(e?.message ?? e) });
    }
  }

  async function handleFull()     { await sendBroadcast("/api/send_full",     buildFullPayload(ad)); }
  async function handlePatch()    { await sendBroadcast("/api/send_patch",    buildPatchPayload(ad)); }
  async function handleRollback() { await sendBroadcast("/api/send_rollback", { target: rollbackTarget }); }

  function previewPayload(type: "full" | "patch" | "rollback") {
    if (showPayloadFor === type) { setShowPayloadFor(null); return; }
    setShowPayloadFor(type);
  }

  function getPreviewPayload() {
    if (showPayloadFor === "full")     return { ...buildFullPayload(ad),  ...buildRouting() };
    if (showPayloadFor === "patch")    return { ...buildPatchPayload(ad), ...buildRouting() };
    if (showPayloadFor === "rollback") return { target: rollbackTarget,   ...buildRouting() };
    return {};
  }

  const isSending = broadcast.status === "sending";

  return (
    <>
      {/* ── main row ── */}
      <tr
        className="hover:bg-gray-50 cursor-pointer border-b border-gray-200"
        onClick={() => setIsExpanded((v) => !v)}
      >
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          {ad.name}
          {ad.campaignId ? (
            <span className="ml-1.5 text-xs text-gray-400 font-mono">#{ad.campaignId}</span>
          ) : null}
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">{ad.title}</td>
        <td className="px-4 py-3 text-sm text-center">
          <span className="px-2 py-1 bg-blue-100 rounded text-xs font-medium text-blue-900">
            {fileCount}
          </span>
        </td>
        <td className="px-4 py-3 text-sm text-center">
          <span className="px-2 py-1 bg-purple-100 rounded text-xs font-medium text-purple-900">
            {flightCount === 0 ? "—" : flightCount}
          </span>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          ${budget.toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm text-center text-gray-600">
          {impressions.toLocaleString()}
        </td>
        <td className="px-4 py-3 text-sm text-center">
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadgeCls(ad.status)}`}>
            {ad.status?.toUpperCase()}
          </span>
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-3 py-1 bg-gray-900 text-white rounded text-xs font-semibold hover:bg-gray-700 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onDelete?.(ad.id)}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </td>
      </tr>

      {/* ── expanded broadcast + aircraft panel ── */}
      {isExpanded && (
        <tr className="bg-indigo-50 border-b border-gray-200">
          <td colSpan={8} className="px-4 py-4">
            <div className="flex flex-col gap-4">

              {/* ── aircraft status ── */}
              <div>
                <div className="font-semibold text-indigo-900 mb-2 text-sm">
                  ✈ Assigned Aircraft
                </div>
                {flightCount === 0 ? (
                  <p className="text-xs text-gray-500">
                    No aircraft assigned. Edit the ad and select flights.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {flights.map((f) => (
                      <span
                        key={f}
                        className="px-3 py-1 bg-white border border-indigo-200 rounded text-xs font-mono font-semibold text-indigo-800"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* ── broadcast controls ── */}
              <div>
                <div className="font-semibold text-indigo-900 mb-2 text-sm">
                  📡 Broadcast to Aircraft
                </div>

                {flightCount === 0 && (
                  <p className="text-xs text-orange-600 mb-2">
                    ⚠ Assign flights to this ad before broadcasting.
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  {/* FULL */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handleFull}
                      disabled={isSending || flightCount === 0}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                    >
                      {isSending ? "Sending…" : "Send FULL"}
                    </button>
                    <button
                      onClick={() => previewPayload("full")}
                      className="px-1.5 py-1.5 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
                      title="Preview payload"
                    >
                      {"{…}"}
                    </button>
                  </div>

                  {/* PATCH */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePatch}
                      disabled={isSending || flightCount === 0}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                    >
                      {isSending ? "Sending…" : "Send PATCH"}
                    </button>
                    <button
                      onClick={() => previewPayload("patch")}
                      className="px-1.5 py-1.5 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
                      title="Preview payload"
                    >
                      {"{…}"}
                    </button>
                  </div>

                  {/* ROLLBACK */}
                  <div className="flex items-center gap-1">
                    <select
                      value={rollbackTarget}
                      onChange={(e) => setRollbackTarget(e.target.value)}
                      disabled={isSending}
                      className="text-xs border border-gray-300 rounded px-1.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-red-400"
                    >
                      <option value="lva">LVA</option>
                      <option value="lkg">LKG</option>
                      <option value="auto">AUTO</option>
                    </select>
                    <button
                      onClick={handleRollback}
                      disabled={isSending || flightCount === 0}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-xs font-semibold hover:bg-red-700 disabled:opacity-40 transition-colors"
                    >
                      {isSending ? "Sending…" : "Rollback"}
                    </button>
                    <button
                      onClick={() => previewPayload("rollback")}
                      className="px-1.5 py-1.5 bg-gray-200 text-gray-600 rounded text-xs hover:bg-gray-300"
                      title="Preview payload"
                    >
                      {"{…}"}
                    </button>
                  </div>
                </div>

                {/* broadcast result pill */}
                {broadcast.status !== "idle" && (
                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${broadcastPillCls(broadcast.status)}`}
                    >
                      {broadcast.status === "sending" ? "⏳" : broadcast.status === "ok" ? "✓" : broadcast.status === "error" ? "✕" : "~"}{" "}
                      {broadcast.message}
                    </span>
                    <button
                      onClick={() => setBroadcast({ status: "idle", message: "" })}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      clear
                    </button>
                  </div>
                )}

                {/* payload preview */}
                {showPayloadFor && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {showPayloadFor} payload preview
                      </span>
                      <button
                        onClick={() => setShowPayloadFor(null)}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        close
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-green-300 text-xs font-mono p-3 rounded overflow-auto max-h-64 whitespace-pre-wrap break-all">
                      {JSON.stringify(getPreviewPayload(), null, 2)}
                    </pre>
                  </div>
                )}
              </div>

            </div>
          </td>
        </tr>
      )}

      {mounted && isEditOpen && createPortal(
        <EditAdModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          initialData={ad}
          onSave={(updated) => {
            onEdit?.(ad.id, updated);
            setIsEditOpen(false);
          }}
        />,
        document.body
      )}
    </>
  );
}