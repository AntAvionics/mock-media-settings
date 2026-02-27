"use client";

import { useState, ChangeEvent, FormEvent } from "react";
import FlightSelector from "./flights";

type AddAdModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (data: AdFormData) => void;
};

export type AdFormData = {
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

export default function AddAdModal({
  isOpen,
  onClose,
  onSave,
}: AddAdModalProps) {
  const [formData, setFormData] = useState<AdFormData>({
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
  });

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id.replace("ad-", "")]:
        e.target.type === "number"
          ? value === ""
            ? ""
            : Number(value)
          : value,
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setFormData((prev) => ({
      ...prev,
      files: Array.from(e.target.files as FileList),
    }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSave?.(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-11/12 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="m-0 text-xl font-semibold">New Advertisement</h2>
          <button
            className="text-2xl cursor-pointer text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Campaign Name */}
          <div className="mb-3">
            <label className="block mt-2 text-sm font-medium">
              Campaign Name
            </label>
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
            <label className="block mt-2 text-sm font-medium">Ad Title</label>
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
            <label className="block mt-2 text-sm font-medium">
              Description
            </label>
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
            <label className="block mt-2 text-sm font-medium">
              Impression Cap
            </label>
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
            <label className="block mt-2 text-sm font-medium">
              Target Audience
            </label>
            <input
              type="text"
              id="ad-target"
              placeholder="e.g., Users aged 18-35"
              value={formData.target}
              onChange={handleChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
          </div>

          {/* Budget */}
          <div className="mb-3">
            <label className="block mt-2 text-sm font-medium">Budget ($)</label>
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
          <div className="mb-3">
            <label className="block mt-2 text-sm font-medium">Start Date</label>
            <input
              type="date"
              id="ad-startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
          </div>

          <div className="mb-3">
            <label className="block mt-2 text-sm font-medium">End Date</label>
            <input
              type="date"
              id="ad-endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
          </div>

          <FlightSelector
            selectedFlights={formData.flights}
            onFlightsChange={(flights) =>
              setFormData((prev) => ({ ...prev, flights }))
            }
          />

          {/* File Upload */}
          <div className="mb-3">
            <label className="block mt-2 text-sm font-medium">
              Upload Files
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              className="w-full text-sm px-2 py-2 rounded border border-gray-300 mt-1"
            />
            <div className="mt-2 text-xs">
              {formData.files.map((file, index) => (
                <div key={index}>{file.name}</div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="mb-3">
            <label className="block mt-2 text-sm font-medium">Status</label>
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

          {/* Buttons */}
          <div className="flex gap-2 mt-5">
            <button
              type="submit"
              className="bg-blue-600 text-white px-3 py-2 rounded font-semibold text-sm hover:bg-blue-700"
            >
              Save Ad
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-900 text-white px-3 py-2 rounded font-semibold text-sm hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
