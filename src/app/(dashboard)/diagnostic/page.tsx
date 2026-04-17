import { getDiagnosticInfo } from '@/actions/diagnostic-actions';

export default async function DiagnosticPage() {
    const info = await getDiagnosticInfo();

    return (
        <div className="min-h-screen bg-[#F5F1E8] p-8">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="bg-white rounded-lg border border-[#E6DED0] p-6">
                    <h1 className="text-3xl font-bold mb-4">🔍 Diagnostic Info</h1>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-[#F8F3EA] p-4 rounded-lg border border-[#E6DED0]">
                            <p className="text-sm text-[#6F6659]">Current User Event ID</p>
                            <p className="text-xl font-bold">{info.currentUserEventId ?? 'null (Studio Admin)'}</p>
                        </div>
                        <div className="bg-[#F8F3EA] p-4 rounded-lg border border-[#E6DED0]">
                            <p className="text-sm text-[#6F6659]">Total Events</p>
                            <p className="text-xl font-bold">{info.eventsCount}</p>
                        </div>
                        <div className="bg-[#F8F3EA] p-4 rounded-lg border border-[#E6DED0]">
                            <p className="text-sm text-[#6F6659]">Total Orders</p>
                            <p className="text-xl font-bold">{info.ordersCount}</p>
                        </div>
                        <div className="bg-[#F8F3EA] p-4 rounded-lg border border-[#E6DED0]">
                            <p className="text-sm text-[#6F6659]">Total Open Bills</p>
                            <p className="text-xl font-bold">{info.openBillsCount}</p>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-3">📅 Events</h2>
                        {info.events.length === 0 ? (
                            <p className="text-[#6F6659]">No events found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="bg-[#F8F3EA] border-b border-[#E6DED0]">
                                        <tr>
                                            <th className="px-4 py-2 text-left">ID</th>
                                            <th className="px-4 py-2 text-left">Name</th>
                                            <th className="px-4 py-2 text-left">Active?</th>
                                            <th className="px-4 py-2 text-left">Start Date</th>
                                            <th className="px-4 py-2 text-left">End Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {info.events.map((e) => (
                                            <tr key={e.id} className="border-b border-[#E6DED0]">
                                                <td className="px-4 py-2">{e.id}</td>
                                                <td className="px-4 py-2 font-medium">{e.name}</td>
                                                <td className="px-4 py-2">{e.isActive ? '✅ Yes' : '❌ No'}</td>
                                                <td className="px-4 py-2 text-xs">{new Date(e.startDate).toLocaleDateString()}</td>
                                                <td className="px-4 py-2 text-xs">{new Date(e.endDate).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="mb-6">
                        <h2 className="text-xl font-bold mb-3">📦 Orders by Event</h2>
                        <div className="grid grid-cols-2 gap-2">
                            {Object.entries(info.ordersByEvent).map(([key, count]) => (
                                <div key={key} className="bg-[#FFF8F0] p-3 rounded border border-[#C86B2A]">
                                    <p className="text-xs text-[#6F6659]">{key}</p>
                                    <p className="text-lg font-bold">{count} orders</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h2 className="text-xl font-bold mb-3">🧾 Recent Orders</h2>
                        {info.orders.length === 0 ? (
                            <p className="text-[#6F6659]">No orders found</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead className="bg-[#F8F3EA] border-b border-[#E6DED0]">
                                        <tr>
                                            <th className="px-4 py-2 text-left">Invoice</th>
                                            <th className="px-4 py-2 text-left">Event ID</th>
                                            <th className="px-4 py-2 text-left">Amount</th>
                                            <th className="px-4 py-2 text-left">Status</th>
                                            <th className="px-4 py-2 text-left">Created At</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {info.orders.map((o) => (
                                            <tr key={o.id} className="border-b border-[#E6DED0]">
                                                <td className="px-4 py-2 font-mono text-xs">{o.invoiceNumber}</td>
                                                <td className="px-4 py-2 font-bold">{o.eventId ? `Event ${o.eventId}` : 'null'}</td>
                                                <td className="px-4 py-2">{Number(o.totalAmount).toLocaleString()}</td>
                                                <td className="px-4 py-2">{o.status}</td>
                                                <td className="px-4 py-2 text-xs">{new Date(o.createdAt).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
