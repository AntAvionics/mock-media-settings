"use client";
type HeaderProps = {
  onAddClick: () => void;
};

export default function Page({ onAddClick }: HeaderProps) {
    return (
    <>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold m-0">Ad Manager</h1>
          <div className="text-gray-500 text-sm">
            Manage and monitor your advertisement campaigns
          </div>
        </div>

        <button
          onClick={onAddClick}
          className="bg-blue-600 text-white px-4 py-2 rounded font-semibold text-sm hover:bg-blue-700"
        >
          + New Ad
        </button>
      </header>
    </>
  );
}