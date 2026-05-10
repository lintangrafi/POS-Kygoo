export default function DashboardPageLoading() {
    return (
        <div className="min-h-screen bg-[#F5F1E8] animate-pulse">
            <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto w-full space-y-8">
                <div>
                    <div className="h-3 w-32 bg-[#E6DED0] rounded" />
                    <div className="h-9 w-72 bg-[#E6DED0] rounded mt-3" />
                    <div className="h-4 w-96 bg-[#E6DED0] rounded mt-3" />
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-32 rounded-xl border border-[#E6DED0] bg-white p-5">
                            <div className="h-4 w-28 bg-[#E6DED0] rounded" />
                            <div className="h-7 w-36 bg-[#E6DED0] rounded mt-4" />
                        </div>
                    ))}
                </div>
                <div className="h-48 rounded-xl border border-[#E6DED0] bg-white" />
            </div>
        </div>
    );
}
