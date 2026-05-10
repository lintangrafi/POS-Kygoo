export default function ReportsLoading() {
    return (
        <div className="rounded-2xl border border-[#E6DED0] bg-[#F5F1E8] p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
            <div className="flex items-center justify-between rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div>
                    <div className="h-8 w-56 bg-[#E6DED0] rounded" />
                    <div className="h-4 w-80 bg-[#E6DED0] rounded mt-2" />
                </div>
                <div className="flex flex-col gap-3">
                    <div className="h-9 w-48 bg-[#E6DED0] rounded-lg" />
                    <div className="h-9 w-64 bg-[#E6DED0] rounded-lg" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 rounded-xl border border-[#E6DED0] bg-white p-4">
                        <div className="h-3 w-20 bg-[#E6DED0] rounded" />
                        <div className="h-6 w-28 bg-[#E6DED0] rounded mt-3" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="h-64 rounded-xl border border-[#E6DED0] bg-white" />
                <div className="h-64 rounded-xl border border-[#E6DED0] bg-white" />
            </div>
        </div>
    );
}
