
'use client';

import { useState } from 'react';
import { AdFormData } from "./addModal";
import EditAdModal from "./editModal";

type AircraftStatusType = {
  status: string;
  issue: {
    hasIssue: boolean;
    message: string;
  };
};

type Props = {
  ad: AdFormData & { id: string | number; impressions?: number; clicks?: number; flights?: string[] };
  aircraftStatus?: Record<string, AircraftStatusType>;
  onEdit?: (id: string | number) => void;
  onDelete?: (id: string | number) => void;
};

export default function Ads({ ad, aircraftStatus = {}, onEdit, onDelete }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [statusData, setStatusData] = useState<AircraftStatusType[]>([]);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleEditClick = () => {
    setIsEditOpen(true);
  };

  const handleEditSave = (updatedData: AdFormData) => {
    onEdit?.(ad.id);
    setIsEditOpen(false);
  };

  const toggleAircraftExpand = () => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);
    
    if (newExpandedState) {
      populateAircraftStatus();
    }
  };

  const populateAircraftStatus = () => {
    const flights = ad.flights || [];
    
    if (flights.length === 0) {
      setStatusData([]);
      return;
    }

    const statuses = flights.map((flight) => {
      const statusObj = aircraftStatus[flight] || {
        status: 'Unknown',
        issue: { hasIssue: false, message: 'No data' }
      };
      return statusObj;
    });

    setStatusData(statuses);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-900';
      case 'On Ground':
        return 'bg-blue-100 text-blue-900';
      case 'Maintenance':
        return 'bg-red-100 text-red-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  const getAdStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-900';
      case 'paused':
        return 'bg-yellow-100 text-yellow-900';
      case 'draft':
        return 'bg-gray-100 text-gray-900';
      default:
        return 'bg-gray-100 text-gray-900';
    }
  };

  const flightCount = (ad.flights || []).length;
  const fileCount = (ad.files || []).length;
  const budget = typeof ad.budget === 'number' ? ad.budget : 0;
  const impressions = ad.impressions || 0;

  return (
    <>
      <tr className="hover:bg-gray-50 cursor-pointer border-b border-gray-200" onClick={toggleAircraftExpand}>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{ad.name}</td>
        <td className="px-4 py-3 text-sm text-gray-600">{ad.title}</td>
        <td className="px-4 py-3 text-sm text-center">
          <span className="px-2 py-1 bg-blue-100 rounded text-xs font-medium text-blue-900">{fileCount}</span>
        </td>
        <td className="px-4 py-3 text-sm text-center">
          <span className="px-2 py-1 bg-purple-100 rounded text-xs font-medium text-purple-900">{flightCount}</span>
        </td>
        <td className="px-4 py-3 text-sm font-medium text-gray-900">${budget.toLocaleString()}</td>
        <td className="px-4 py-3 text-sm text-center text-gray-600">{impressions.toLocaleString()}</td>
        <td className="px-4 py-3 text-sm text-center">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getAdStatusColor(ad.status)}`}>
            {ad.status?.toUpperCase()}
          </span>
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2">
            <button
              onClick={handleEditClick}
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

      <EditAdModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        initialData={ad}
        onSave={handleEditSave}
      />

      {/* Expanded Aircraft Status Row */}
      {isExpanded && (
        <tr className="bg-indigo-50 border-b border-gray-200">
          <td colSpan={8} className="px-4 py-4">
            <div className="font-semibold text-indigo-900 mb-3">✈ Aircraft Status</div>
            {statusData.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-2">No flights assigned to this ad</div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {(ad.flights || []).map((flight, idx) => {
                  const status = statusData[idx] || { status: 'Unknown', issue: { hasIssue: false, message: 'No data' } };
                  const statusColor = getStatusColor(status.status);
                  const issueBadge = status.issue?.hasIssue
                    ? <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-900">ISSUE</span>
                    : <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-900">OK</span>;

                  return (
                    <div key={flight} className="p-2 bg-white border border-indigo-200 rounded text-sm">
                      <div className="font-semibold text-indigo-900">✈ {flight}</div>
                      <div className="flex gap-2 mt-1 items-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor}`}>{status.status}</span>
                        {issueBadge}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{status.issue?.message || 'No issues'}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}