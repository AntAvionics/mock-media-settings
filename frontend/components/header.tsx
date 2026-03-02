"use client";

type HeaderProps = {
  onAddClick: () => void;
};

export default function Header({ onAddClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-3xl font-bold m-0">Ad Manager</h1>
        <div className="text-gray-500 text-sm">
          Manage and monitor your advertisement campaigns
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="/fleet-issues"
          className="inline-flex items-center gap-1.5 bg-red-600 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-red-700 transition-colors"
        >
          <span>⚠</span>
          <span>Fleet Issues</span>
        </a>

        <button
          onClick={onAddClick}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          + New Ad
        </button>
      </div>
    </header>
  );
}