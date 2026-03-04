"use client";

import { useEffect, useState, useCallback, useMemo, Fragment } from "react";

/* ─── types ──────────────────────────────────────────────────────────────── */

type AircraftInfo = {
  id: string;
  lva?: number | null;
  lkg?: number | null;
  active?: number | null;
};

type HistoryEntry = {
  id: number;
  type: string;
  timestamp: string;
  status: string;
  payload: any;
  remote_by_aircraft: Record<string, { outbound: any; result: any }>;
};

type AircraftRow = {
  id: string;
  lva: number | null;
  lkg: number | null;
  active: number | null;
  hasIssue: boolean;
  issueError: string | null;
  issueStatusCode: number | null;
  lastEntryId: number | null;
  lastEntryType: string | null;
  lastEntryStatus: string | null;
  lastUpdated: string | null;
  lastPayload: any;
};

type SortKey = "id" | "status" | "lastEntryType" | "lastUpdated" | "lva";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250];

/* ─── helpers ────────────────────────────────────────────────────────────── */

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(path, { cache: "no-store", ...opts });
  const text = await r.text();
  try {
    return { ok: r.ok, status: r.status, data: JSON.parse(text) };
  } catch {
    return { ok: r.ok, status: r.status, data: text };
  }
}

function fmtTs(ts: string | null) {
  if (!ts) return "—";
  return ts.slice(0, 19).replace("T", " ");
}

/* ─── page ───────────────────────────────────────────────────────────────── */

export default function FleetIssuesPage() {
  /* raw data */
  const [aircraftMap, setAircraftMap] = useState<Record<string, AircraftInfo>>({});
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  /* table controls */
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "issue" | "ok">("all");
  const [sortKey, setSortKey] = useState<SortKey>("status");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  /* selection */
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /* per-row rollback */
  const [rollbackTargets, setRollbackTargets] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});
  const [rowResults, setRowResults] = useState<Record<string, { ok: boolean; msg: string }>>({});

  /* bulk rollback */
  const [bulkTarget, setBulkTarget] = useState("lva");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  /* payload drawer */
  const [drawer, setDrawer] = useState<{ id: string; payload: any } | null>(null);

  /* ── load ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const [stateRes, aircraftRes] = await Promise.all([
        apiFetch("/api/state"),
        apiFetch("/api/aircraft"),
      ]);

      if (!stateRes.ok) {
        throw new Error(stateRes.data?.error ?? `State fetch failed (HTTP ${stateRes.status})`);
      }
      setHistory(Array.isArray(stateRes.data?.history) ? stateRes.data.history : []);

      const inner = aircraftRes.data?.response ?? aircraftRes.data;
      if (inner?.aircraft) {
        const map: Record<string, AircraftInfo> = {};
        for (const a of Object.values(inner.aircraft as Record<string, any>)) {
          const id = String((a as any).id ?? a);
          map[id] = {
            id,
            lva: (a as any).lva ?? null,
            lkg: (a as any).lkg ?? null,
            active: (a as any).active ?? null,
          };
        }
        setAircraftMap(map);
      }

      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e: any) {
      setGlobalError(String(e?.message ?? e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── derive rows ── */
  const rows: AircraftRow[] = useMemo(() => {
    // index issues from history (newest-first)
    const issueByAircraft: Record<string, {
      error: string | null;
      statusCode: number | null;
      entryId: number;
      entryType: string;
      entryStatus: string;
      updatedAt: string | null;
      payload: any;
    }> = {};

    for (const entry of history) {
      for (const [aid, envelope] of Object.entries(entry.remote_by_aircraft ?? {})) {
        if (aid in issueByAircraft) continue; // already recorded latest
        const result = (envelope as any)?.result ?? {};
        const ok = result?.ok === true;
        const err: string | null =
          result?.error ??
          (result?.response?.error ?? null) ??
          (!ok ? "Non-ok response" : null);
        if (!ok || err) {
          issueByAircraft[aid] = {
            error: err,
            statusCode: result?.status_code ?? null,
            entryId: entry.id,
            entryType: entry.type,
            entryStatus: entry.status,
            updatedAt: result?._updated_at ?? null,
            payload: entry.payload,
          };
        }
      }
    }

    // merge aircraft list + issue index
    const allIds = new Set([
      ...Object.keys(aircraftMap),
      ...Object.keys(issueByAircraft),
    ]);

    return Array.from(allIds).map((id) => {
      const info = aircraftMap[id] ?? { id, lva: null, lkg: null, active: null };
      const issue = issueByAircraft[id] ?? null;
      return {
        id,
        lva: info.lva,
        lkg: info.lkg,
        active: info.active,
        hasIssue: issue !== null,
        issueError: issue?.error ?? null,
        issueStatusCode: issue?.statusCode ?? null,
        lastEntryId: issue?.entryId ?? null,
        lastEntryType: issue?.entryType ?? null,
        lastEntryStatus: issue?.entryStatus ?? null,
        lastUpdated: issue?.updatedAt ?? null,
        lastPayload: issue?.payload ?? null,
      };
    });
  }, [aircraftMap, history]);

  /* ── filter + sort ── */
  const filtered = useMemo(() => {
    let r = rows;
    if (filterStatus === "issue") r = r.filter((x) => x.hasIssue);
    else if (filterStatus === "ok")  r = r.filter((x) => !x.hasIssue);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(
        (x) =>
          x.id.toLowerCase().includes(q) ||
          (x.issueError ?? "").toLowerCase().includes(q) ||
          (x.lastEntryType ?? "").toLowerCase().includes(q),
      );
    }
    return [...r].sort((a, b) => {
      let va: any, vb: any;
      switch (sortKey) {
        case "id":            va = a.id; vb = b.id; break;
        case "status":        va = a.hasIssue ? 1 : 0; vb = b.hasIssue ? 1 : 0; break;
        case "lastEntryType": va = a.lastEntryType ?? ""; vb = b.lastEntryType ?? ""; break;
        case "lastUpdated":   va = a.lastUpdated ?? ""; vb = b.lastUpdated ?? ""; break;
        case "lva":           va = a.lva ?? -1; vb = b.lva ?? -1; break;
        default:              va = a.id; vb = b.id;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, search, filterStatus, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const issueCount = rows.filter((r) => r.hasIssue).length;
  const okCount    = rows.length - issueCount;

  /* ── selection ── */
  const pageIds = pageRows.map((r) => r.id);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const somePageSelected = pageIds.some((id) => selected.has(id));

  function toggleRow(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function togglePage() {
    setSelected((s) => {
      const n = new Set(s);
      if (allPageSelected) pageIds.forEach((id) => n.delete(id));
      else pageIds.forEach((id) => n.add(id));
      return n;
    });
  }

  function selectAllIssues() {
    setSelected(new Set(rows.filter((r) => r.hasIssue).map((r) => r.id)));
  }

  function clearSelection() { setSelected(new Set()); }

  /* ── sort toggle ── */
  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
    setPage(1);
  }

  /* ── rollback ── */
  function rollbackTargetFor(id: string) { return rollbackTargets[id] ?? "lva"; }

  async function doRollback(aircraftId: string, target: string) {
    setSending((s) => ({ ...s, [aircraftId]: true }));
    setRowResults((r) => { const n = { ...r }; delete n[aircraftId]; return n; });
    try {
      const { ok, status, data } = await apiFetch("/api/send_rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aircraft_id: aircraftId, target }),
      });
      if (!ok && status !== 207) {
        const msg = data?.error ?? `HTTP ${status}`;
        setRowResults((r) => ({ ...r, [aircraftId]: { ok: false, msg } }));
      } else {
        const ls = data?.local?.status ?? "sent";
        setRowResults((r) => ({ ...r, [aircraftId]: { ok: true, msg: ls } }));
      }
    } catch (e: any) {
      setRowResults((r) => ({ ...r, [aircraftId]: { ok: false, msg: String(e?.message ?? e) } }));
    } finally {
      setSending((s) => ({ ...s, [aircraftId]: false }));
    }
  }

  async function doBulkRollback() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkSending(true);
    setBulkResult(null);
    let ok = 0, fail = 0;
    await Promise.all(
      ids.map(async (id) => {
        const target = rollbackTargetFor(id);
        try {
          const res = await apiFetch("/api/send_rollback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ aircraft_id: id, target: bulkTarget }),
          });
          if (res.ok || res.status === 207) ok++;
          else fail++;
        } catch { fail++; }
      })
    );
    setBulkResult(`Bulk rollback: ${ok} sent, ${fail} failed`);
    setBulkSending(false);
    await loadData();
  }

  /* ── sort header ── */
  function SortTh({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        className="px-3 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer select-none whitespace-nowrap hover:text-gray-900"
        onClick={() => handleSort(k)}
      >
        {label}{" "}
        <span className={active ? "text-gray-900" : "text-gray-300"}>
          {active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </th>
    );
  }

  /* ── render ── */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* top bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-800">← Ad Manager</a>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-semibold text-gray-800">Fleet Issues</span>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-400 hidden sm:block">
              Updated {lastRefresh}
            </span>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="text-xs font-semibold bg-gray-800 text-white px-3 py-1.5 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="px-5 py-4 max-w-screen-2xl mx-auto">

        {/* stat strip */}
        <div className="flex flex-wrap gap-3 mb-4">
          <StatChip label="Total" value={rows.length} color="gray" />
          <StatChip label="Issues" value={issueCount} color={issueCount > 0 ? "red" : "gray"} />
          <StatChip label="OK" value={okCount} color="green" />
          <StatChip label="Broadcast records" value={history.length} color="gray" />
        </div>

        {/* global error */}
        {globalError && (
          <div className="mb-3 flex items-start gap-2 bg-red-50 border border-red-200 text-red-800 text-sm p-3 rounded">
            <span className="flex-1">{globalError}</span>
            <button onClick={() => setGlobalError(null)} className="text-red-400 hover:text-red-600 font-bold">✕</button>
          </div>
        )}

        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* search */}
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search aircraft ID, error, type…"
            className="text-sm border border-gray-300 rounded px-3 py-1.5 w-64 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />

          {/* status filter */}
          <div className="flex rounded border border-gray-300 overflow-hidden text-xs font-semibold">
            {(["all", "issue", "ok"] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilterStatus(f); setPage(1); }}
                className={`px-3 py-1.5 transition-colors ${
                  filterStatus === f
                    ? f === "issue" ? "bg-red-600 text-white"
                    : f === "ok"    ? "bg-green-600 text-white"
                    : "bg-gray-800 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f === "all" ? "All" : f === "issue" ? "Issues" : "OK"}
              </button>
            ))}
          </div>

          {/* page size */}
          <select
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} / page</option>
            ))}
          </select>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {selected.size > 0 && (
              <>
                <span className="text-xs text-gray-600 font-medium">{selected.size} selected</span>
                {/* bulk rollback target */}
                <select
                  value={bulkTarget}
                  onChange={(e) => setBulkTarget(e.target.value)}
                  disabled={bulkSending}
                  className="text-xs border border-gray-300 rounded px-2 py-1.5 focus:outline-none"
                >
                  <option value="lva">LVA</option>
                  <option value="lkg">LKG</option>
                  <option value="auto">AUTO</option>
                </select>
                <button
                  onClick={doBulkRollback}
                  disabled={bulkSending}
                  className="text-xs font-semibold bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkSending ? "Sending…" : `Rollback ${selected.size}`}
                </button>
                <button
                  onClick={clearSelection}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </>
            )}
            {selected.size === 0 && issueCount > 0 && (
              <button
                onClick={selectAllIssues}
                className="text-xs text-red-600 hover:underline font-medium"
              >
                Select all {issueCount} issues
              </button>
            )}
          </div>
        </div>

        {bulkResult && (
          <div className="mb-3 text-xs font-medium text-gray-700 bg-gray-100 border border-gray-200 rounded px-3 py-2">
            {bulkResult}{" "}
            <button onClick={() => setBulkResult(null)} className="text-gray-400 hover:text-gray-600 ml-1">✕</button>
          </div>
        )}

        {/* results count */}
        <div className="text-xs text-gray-400 mb-2">
          {filtered.length.toLocaleString()} aircraft
          {search || filterStatus !== "all" ? " (filtered)" : ""}
          {" · "}page {safePage} of {totalPages}
        </div>

        {/* table */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {/* checkbox */}
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    ref={(el) => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                    onChange={togglePage}
                    className="cursor-pointer"
                  />
                </th>
                <SortTh label="Aircraft" k="id" />
                <SortTh label="Status" k="status" />
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Error</th>
                <SortTh label="Last msg" k="lastEntryType" />
                <SortTh label="LVA" k="lva" />
                <SortTh label="Updated" k="lastUpdated" />
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-44">Rollback</th>
                <th className="px-3 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400">
                    {loading ? "Loading…" : "No aircraft match the current filters."}
                  </td>
                </tr>
              )}
              {pageRows.map((row) => {
                const isSelected = selected.has(row.id);
                const isSending  = !!sending[row.id];
                const result     = rowResults[row.id];
                const target     = rollbackTargetFor(row.id);

                return (
                  <Fragment key={row.id}>
                    <tr
                      className={`border-b border-gray-100 hover:bg-gray-50 ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                    >
                      {/* checkbox */}
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(row.id)}
                          className="cursor-pointer"
                        />
                      </td>

                      {/* id */}
                      <td className="px-3 py-2 font-mono font-semibold text-gray-800 whitespace-nowrap">
                        {row.id}
                      </td>

                      {/* status */}
                      <td className="px-3 py-2">
                        {row.hasIssue ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                            Issue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                            OK
                          </span>
                        )}
                      </td>

                      {/* error */}
                      <td className="px-3 py-2 text-gray-500 max-w-xs truncate">
                        {row.hasIssue ? (
                          <span className="text-red-600" title={row.issueError ?? undefined}>
                            {row.issueError ?? "—"}
                            {row.issueStatusCode != null && (
                              <span className="ml-1 text-gray-400">({row.issueStatusCode})</span>
                            )}
                          </span>
                        ) : "—"}
                      </td>

                      {/* last broadcast */}
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {row.lastEntryType ? (
                          <span>
                            <span className="font-semibold">{row.lastEntryType}</span>
                            {" "}
                            <span className="text-gray-400">#{row.lastEntryId}</span>
                          </span>
                        ) : "—"}
                      </td>

                      {/* lva */}
                      <td className="px-3 py-2 font-mono text-gray-500">
                        {row.lva ?? "—"}
                      </td>

                      {/* updated */}
                      <td className="px-3 py-2 text-gray-400 whitespace-nowrap font-mono">
                        {fmtTs(row.lastUpdated)}
                      </td>

                      {/* rollback */}
                      <td className="px-3 py-2">
                        {row.hasIssue ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={target}
                              onChange={(e) =>
                                setRollbackTargets((t) => ({ ...t, [row.id]: e.target.value }))
                              }
                              disabled={isSending}
                              className="border border-gray-300 rounded px-1 py-0.5 text-xs focus:outline-none"
                            >
                              <option value="lva">LVA</option>
                              <option value="lkg">LKG</option>
                              <option value="auto">AUTO</option>
                            </select>
                            <button
                              onClick={() => doRollback(row.id, target)}
                              disabled={isSending}
                              className="bg-red-600 text-white px-2 py-0.5 rounded font-semibold hover:bg-red-700 disabled:opacity-50 whitespace-nowrap"
                            >
                              {isSending ? "…" : "Rollback"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                        {result && (
                          <div className={`mt-1 ${result.ok ? "text-green-700" : "text-red-600"} font-medium`}>
                            {result.ok ? "✓" : "✕"} {result.msg}
                          </div>
                        )}
                      </td>

                      {/* payload drawer toggle */}
                      <td className="px-3 py-2">
                        {row.lastPayload && (
                          <button
                            onClick={() =>
                              setDrawer(
                                drawer?.id === row.id ? null : { id: row.id, payload: row.lastPayload }
                              )
                            }
                            className="text-gray-400 hover:text-gray-700"
                            title="View payload"
                          >
                            {drawer?.id === row.id ? "▲" : "▼"}
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* inline payload drawer */}
                    {drawer?.id === row.id && (
                      <tr key={`${row.id}-drawer`} className="bg-gray-900 border-b border-gray-700">
                        <td colSpan={9} className="px-4 py-3">
                          <pre className="text-green-300 font-mono text-xs whitespace-pre-wrap break-all max-h-52 overflow-auto">
                            {JSON.stringify(drawer.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              ← Prev
            </button>

            <div className="flex items-center gap-1">
              {/* show at most 7 page buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - safePage) <= 2) return true;
                  return false;
                })
                .reduce<(number | "…")[]>((acc, p, i, arr) => {
                  if (i > 0 && typeof arr[i - 1] === "number" && (p as number) - (arr[i - 1] as number) > 1) {
                    acc.push("…");
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "…" ? (
                    <span key={`ellipsis-${i}`} className="px-1 text-gray-400">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-7 h-7 rounded font-semibold ${
                        safePage === p
                          ? "bg-gray-800 text-white"
                          : "hover:bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1.5 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── sub-components ─────────────────────────────────────────────────────── */

function StatChip({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "gray" | "red" | "green";
}) {
  const cls = {
    gray:  "bg-gray-100 text-gray-700",
    red:   "bg-red-100 text-red-700",
    green: "bg-green-100 text-green-700",
  }[color];
  return (
    <div className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold ${cls}`}>
      <span className="text-base font-bold">{value.toLocaleString()}</span>
      <span className="font-normal opacity-75">{label}</span>
    </div>
  );
}