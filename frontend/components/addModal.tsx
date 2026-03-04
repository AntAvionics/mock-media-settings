"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import FlightSelector from "./flights";

type AddAdModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: AdFormData) => void;
};

export type AdFormData = {
  id: string | number;
  campaignId: number;
  name: string;
  title: string;
  description: string;
  impressionCap: number | "";
  target: string;
  budget: number | "";
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "paused";
  files: File[];
  flights: string[];
};

/* ─── demo templates ──────────────────────────────────────────────────────── */

type Template = Omit<AdFormData, "id" | "files" | "flights">;

const today = new Date();
const fmt = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

const TEMPLATES: { label: string; data: Template }[] = [
  {
    label: "Summer Promo 2026",
    data: {
      campaignId: 1001,
      name: "Summer Promo 2026",
      title: "Fly More, Save More This Summer",
      description:
        "Seasonal promotion targeting leisure travellers on long-haul routes. Offer includes discounted lounge access and bonus miles on select routes operating June–August 2026.",
      impressionCap: 12000,
      target: "Leisure, economy, age 25–45",
      budget: 50000,
      startDate: fmt(addDays(today, 1)),
      endDate: fmt(addDays(today, 90)),
      status: "active",
    },
  },
  {
    label: "Business Class Launch",
    data: {
      campaignId: 1002,
      name: "Business Class Launch",
      title: "Experience the New Business Suite",
      description:
        "Brand awareness campaign for the newly refurbished business cabin. Targets frequent flyers and corporate accounts on trans-Pacific routes. High-impact video creative served during meal service.",
      impressionCap: 5000,
      target: "Business travellers, frequent flyer Gold+, trans-Pacific",
      budget: 120000,
      startDate: fmt(addDays(today, 7)),
      endDate: fmt(addDays(today, 60)),
      status: "active",
    },
  },
  {
    label: "Duty Free — Spirits",
    data: {
      campaignId: 1003,
      name: "Duty Free — Spirits",
      title: "Premium Spirits at Duty-Free Prices",
      description:
        "In-flight duty-free promotion for premium whisky and spirits. Displayed during cruising altitude on flights over 4 hours. Targets adult passengers across all cabin classes.",
      impressionCap: 8000,
      target: "Adults 21+, all cabins, flights 4 h+",
      budget: 18000,
      startDate: fmt(today),
      endDate: fmt(addDays(today, 30)),
      status: "active",
    },
  },
  {
    label: "Destination: Tokyo",
    data: {
      campaignId: 1004,
      name: "Destination: Tokyo",
      title: "Discover Tokyo — Book Your Next Adventure",
      description:
        "Destination marketing campaign in partnership with the Japan Tourism Agency. Served on outbound flights to Asia-Pacific. Encourages connecting passengers to add a Tokyo stopover.",
      impressionCap: 20000,
      target: "Asia-Pacific routes, connecting passengers, all cabins",
      budget: 35000,
      startDate: fmt(addDays(today, 14)),
      endDate: fmt(addDays(today, 120)),
      status: "draft",
    },
  },
  {
    label: "Loyalty — Miles Bonus",
    data: {
      campaignId: 1005,
      name: "Loyalty — Miles Bonus",
      title: "Earn Double Miles This Month",
      description:
        "Limited-time loyalty incentive for enrolled frequent flyer members. Double miles awarded on all spend during the campaign window. Served only to passengers whose booking profile includes a loyalty number.",
      impressionCap: 3000,
      target: "Frequent flyer members, all routes",
      budget: 8000,
      startDate: fmt(today),
      endDate: fmt(addDays(today, 28)),
      status: "active",
    },
  },
  {
    label: "Maintenance Notice (Paused)",
    data: {
      campaignId: 1006,
      name: "Maintenance Notice",
      title: "Scheduled Maintenance — Ad Delivery Paused",
      description:
        "Placeholder campaign created during IFE system maintenance window. Status set to paused; no impressions will be served until reactivated by the ground team.",
      impressionCap: 0,
      target: "N/A",
      budget: 0,
      startDate: fmt(today),
      endDate: fmt(addDays(today, 1)),
      status: "paused",
    },
  },
];

const EMPTY: AdFormData = {
  id: 0,
  campaignId: 0,
  name: "",
  title: "",
  description: "",
  impressionCap: "",
  target: "",
  budget: "",
  startDate: "",
  endDate: "",
  status: "draft",
  files: [],
  flights: [],
};

/* ─── component ───────────────────────────────────────────────────────────── */

export default function AddAdModal({ isOpen, onClose, onSave }: AddAdModalProps) {
  const [formData, setFormData] = useState<AdFormData>(EMPTY);
  const [templateKey, setTemplateKey] = useState<string>("");

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id.replace("ad-", "")]:
        e.target.type === "number" ? (value === "" ? "" : Number(value)) : value,
    }));
    // clear template selection when user manually edits
    setTemplateKey("");
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFormData((prev) => ({ ...prev, files: Array.from(e.target.files as FileList) }));
  };

  const handleTemplateChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTemplateKey(val);
    if (!val) {
      setFormData(EMPTY);
      return;
    }
    const tpl = TEMPLATES.find((t) => t.data.name === val);
    if (tpl) {
      setFormData((prev) => ({
        ...EMPTY,
        ...tpl.data,
        // preserve any flights already chosen
        flights: prev.flights,
        files: [],
        id: prev.id,
      }));
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave?.(formData);
    setFormData(EMPTY);
    setTemplateKey("");
    onClose();
  };

  const handleClose = () => {
    setFormData(EMPTY);
    setTemplateKey("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-11/12 max-h-[90vh] overflow-y-auto">

        {/* header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="m-0 text-xl font-semibold">New Advertisement</h2>
            <p className="text-xs text-gray-400 mt-0.5">Fill manually or load a demo template.</p>
          </div>
          <button
            className="text-2xl cursor-pointer text-gray-400 hover:text-gray-700 ml-4 shrink-0"
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* template picker */}
        <div className="mb-5 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Demo Template
          </label>
          <div className="flex items-center gap-2">
            <select
              value={templateKey}
              onChange={handleTemplateChange}
              className="flex-1 text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              <option value="">— pick a template —</option>
              {TEMPLATES.map((t) => (
                <option key={t.data.name} value={t.data.name}>
                  {t.label}
                </option>
              ))}
            </select>
            {templateKey && (
              <button
                type="button"
                onClick={() => {
                  setTemplateKey("");
                  setFormData(EMPTY);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 whitespace-nowrap"
              >
                Clear
              </button>
            )}
          </div>
          {templateKey && (
            <p className="mt-1.5 text-xs text-blue-600">
              Template loaded — edit any field before saving.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Campaign ID */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Campaign ID</label>
            <input
              type="number"
              id="ad-campaignId"
              placeholder="e.g., 1001"
              value={formData.campaignId || ""}
              onChange={handleChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
            <p className="text-xs text-gray-400 mt-1">Numeric ID used when broadcasting to aircraft.</p>
          </div>

          {/* Campaign Name */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Campaign Name</label>
            <input
              type="text"
              id="ad-name"
              placeholder="e.g., Summer Promo 2026"
              value={formData.name}
              onChange={handleChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
          </div>

          {/* Ad Title */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Ad Title</label>
            <input
              type="text"
              id="ad-title"
              placeholder="e.g., Get 50% Off This Season"
              value={formData.title}
              onChange={handleChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Description</label>
            <textarea
              id="ad-description"
              rows={4}
              placeholder="Ad description or content..."
              value={formData.description}
              onChange={handleChange}
              className="w-full font-mono text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
          </div>

          {/* Impression Cap */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Impression Cap</label>
            <input
              type="number"
              id="ad-impressionCap"
              placeholder="e.g., 10000"
              value={formData.impressionCap}
              onChange={handleChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
          </div>

          {/* Target Audience */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Target Audience</label>
            <input
              type="text"
              id="ad-target"
              placeholder="e.g., Business travellers, age 25–45"
              value={formData.target}
              onChange={handleChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
          </div>

          {/* Budget */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Budget ($)</label>
            <input
              type="number"
              id="ad-budget"
              placeholder="1000"
              min={0}
              step={100}
              value={formData.budget}
              onChange={handleChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium">Start Date</label>
              <input
                type="date"
                id="ad-startDate"
                value={formData.startDate}
                onChange={handleChange}
                className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">End Date</label>
              <input
                type="date"
                id="ad-endDate"
                value={formData.endDate}
                onChange={handleChange}
                className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
              />
            </div>
          </div>

          {/* Flights */}
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Flights &amp; Fleets</label>
            <FlightSelector
              selectedFlights={formData.flights}
              onFlightsChange={(flights) => setFormData((prev) => ({ ...prev, flights }))}
            />
          </div>

          {/* File Upload */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Upload Files</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
            {formData.files.length > 0 && (
              <div className="mt-2 text-xs text-gray-500 space-y-0.5">
                {formData.files.map((file, i) => (
                  <div key={i}>📄 {file.name}</div>
                ))}
              </div>
            )}
          </div>

          {/* Status */}
          <div className="mb-3">
            <label className="block text-sm font-medium">Status</label>
            <select
              id="ad-status"
              value={formData.status}
              onChange={handleChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          {/* actions */}
          <div className="flex gap-2 mt-5">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-blue-700"
            >
              Save Ad
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="bg-gray-100 text-gray-800 px-4 py-2 rounded font-semibold text-sm hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}