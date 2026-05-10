export default function InvoicesLoading() {
    return (
        <div className="rounded-2xl border border-[#E6DED0] bg-[#F5F1E8] p-4 sm:p-6 lg:p-8 space-y-5 animate-pulse">
            <div className="flex items-center justify-between rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div>
                    <div className="h-8 w-32 bg-[#E6DED0] rounded" />
                    <div className="h-4 w-64 bg-[#E6DED0] rounded mt-2" />
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-8 w-20 bg-[#E6DED0] rounded-lg" />
                    <div className="h-8 w-16 bg-[#E6DED0] rounded-lg" />
                    <div className="h-8 w-16 bg-[#C86B2A]/30 rounded-lg" />
                </div>
            </div>
            <div className="rounded-xl border border-[#E6DED0] bg-white px-4 py-3">
                <div className="h-5 w-12 bg-[#E6DED0] rounded mb-3" />
                <div className="flex gap-4">
                    <div className="h-10 w-32 bg-[#E6DED0] rounded-md" />
                    <div className="h-10 w-32 bg-[#E6DED0] rounded-md" />
                    <div className="h-10 w-20 bg-[#C86B2A]/30 rounded-md" />
                </div>
            </div>
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 rounded-lg border border-[#E6DED0] bg-white" />
                ))}
            </div>
        </div>
    );
}
