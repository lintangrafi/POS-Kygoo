export default function POSLoading() {
    return (
        <div className="h-[calc(100dvh-2rem)] lg:h-[100dvh] space-y-4 rounded-2xl border border-[#E6DED0] bg-[#F5F1E8] p-4 animate-pulse">
            <div className="flex items-center justify-between rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div>
                    <div className="h-8 w-48 bg-[#E6DED0] rounded" />
                    <div className="h-4 w-72 bg-[#E6DED0] rounded mt-2" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-9 w-24 bg-[#E6DED0] rounded-lg" />
                    <div className="h-9 w-24 bg-[#C86B2A]/30 rounded-lg" />
                </div>
            </div>
            <div className="flex flex-col lg:flex-row h-[calc(100%-88px)] overflow-hidden rounded-xl border border-[#E6DED0] bg-white">
                <div className="flex-1 p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="h-28 rounded-lg bg-[#F5F1E8]" />
                    ))}
                </div>
                <div className="w-full lg:w-[420px] border-t lg:border-t-0 lg:border-l border-[#E6DED0] p-4">
                    <div className="h-6 w-16 bg-[#E6DED0] rounded mb-4" />
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-16 rounded-lg bg-[#F5F1E8]" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
