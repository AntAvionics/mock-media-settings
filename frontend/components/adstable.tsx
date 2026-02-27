import { AdFormData } from "@/components/addModal";
import Ads from "./ads";

export default function AdsTable({
  ads,
  onEdit,
  onDelete,
}: {
  ads: AdFormData[];
  onEdit?: (id: string | number, updated: AdFormData) => void;
  onDelete?: (id: string | number) => void;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <h3 className="m-0 px-4 py-3 text-lg font-semibold text-black border-b border-gray-200">
        Advertisement Campaigns
      </h3>
      <div id="ads-container" className="overflow-x-auto">
        {ads.length > 0 ? (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">
                  Campaign
                </th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">
                  Title
                </th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700">
                  Files
                </th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700">
                  Flights
                </th>
                <th className="px-4 py-2 text-left text-xs font-bold text-gray-700">
                  Budget
                </th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700">
                  Impressions
                </th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700">
                  Status
                </th>
                <th className="px-4 py-2 text-center text-xs font-bold text-gray-700">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad, index) => (
                <Ads
                  key={index}
                  ad={ad as any}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <div className="text-4xl mb-2">📢</div>
            <div>No advertisements yet. Create one to get started.</div>
          </div>
        )}
      </div>
    </div>
  );
}
