"use client";

import Header from "@/components/header";
import AdsTable from "@/components/adstable";
import AddAdModal, { AdFormData } from "@/components/addModal";
import { useSessionAds } from "@/lib/useSessionAds";
import { useState } from "react";

export default function Home() {
  const { ads, addAd, editAd, deleteAd } = useSessionAds();
  const [isAddOpen, setIsAddOpen] = useState(false);

  const totalAds = ads.length;
  const activeAds = ads.filter((a) => a.status === "active").length;
  const totalImpressions = ads.reduce((sum, a) => sum + (a.impressions ?? 0), 0);
  const flightsTargeted = [...new Set(ads.flatMap((a) => a.flights ?? []))].length;

  return (
    <div className="max-w-6xl mx-auto p-5">
      <Header onAddClick={() => setIsAddOpen(true)} />

      <div className="grid grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Ads" value={totalAds} />
        <MetricCard label="Active" value={activeAds} />
        <MetricCard label="Total Impressions" value={totalImpressions.toLocaleString()} />
        <MetricCard label="Flights Targeted" value={flightsTargeted} />
      </div>

      <AdsTable ads={ads} onEdit={editAd} onDelete={deleteAd} />

      {isAddOpen && (
        <AddAdModal
          isOpen={isAddOpen}
          onClose={() => setIsAddOpen(false)}
          onSave={addAd}
        />
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{label}</div>
      </div>
    </div>
  );
}