'use client';

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
  return (
      <div className="max-w-6xl mx-auto p-5">
        <Header onAddClick={() => setIsOpen(true)}/>
        <Metrics />
        <AdsTable ads={ads} />
        {isOpen && <AddAdModal isOpen={isOpen} onClose={() => setIsOpen(false)} onSave={handleSaveAd} />}
      </div>
  );
}
