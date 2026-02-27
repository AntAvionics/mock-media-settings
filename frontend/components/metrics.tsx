
export default function Metrics() {
    return (
        <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600" id="total-ads">0</div>
            <div className="text-xs text-gray-500 mt-1">Total Ads</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600" id="active-ads">
              0
            </div>
            <div className="text-xs text-gray-500 mt-1">Active</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-center">
            <div
              className="text-2xl font-bold text-blue-600"
              id="total-impressions"
            >
              0
            </div>
            <div className="text-xs text-gray-500 mt-1">Impressions</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600" id="total-clicks">
              0
            </div>
            <div className="text-xs text-gray-500 mt-1">Clicks</div>
          </div>
        </div>
      </div>
    )
}