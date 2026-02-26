import { AdFormData } from "@/components/addModal";
export default function AdsTable({ ads }: { ads: AdFormData[] }) {
    return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <h3 className="m-0 mb-3 text-lg font-semibold text-black">Advertisement Campaigns</h3>
        <div id="ads-container">
          <div className="text-center py-6 text-gray-500">
            <div className="text-4xl mb-2">📢</div>
            <div>
                No advertisements yet. Create one to get started.
            </div>
          </div>
        </div>
      </div>
    )
}