"use client";

import Header from "@/components/header";
import Metrics from "@/components/metrics";
import AdsTable from "@/components/adstable";
import AddAdModal from "@/components/addModal";
import { AdFormData } from "@/components/addModal";
import { useState } from "react";

export default function Home() {
  const [ads, setAds] = useState<AdFormData[]>([]);

  const [isOpen, setIsOpen] = useState(false);

  const handleSaveAd = (data: AdFormData) => {
    setAds((prev) => [...prev, data]);
  };

  const handleEditAd = (id: string | number, updated: AdFormData) => {
    setAds((prev) => prev.map((a) => (a.id == id ? { ...a, ...updated } : a)));
  };

  const handleDeleteAd = (id: string | number) => {
    setAds((prev) => prev.filter((a) => a.id != id));
  };

  return (
    <div className="max-w-6xl mx-auto p-5">
      <Header onAddClick={() => setIsOpen(true)} />
      <Metrics />
      <AdsTable ads={ads} onEdit={handleEditAd} onDelete={handleDeleteAd} />
      {isOpen && (
        <AddAdModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onSave={handleSaveAd}
        />
      )}
    </div>
  );
}
