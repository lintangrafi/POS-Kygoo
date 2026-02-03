"use client";

import React, { useMemo } from 'react';

export type SeriesPoint = { period: string; amount: number };

export default function TrendChart({ data, periodLabel }: { data: SeriesPoint[]; periodLabel?: string }) {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const [tooltip, setTooltip] = React.useState<{ visible: boolean; left: number; top: number; period?: string; amount?: number } | null>(null);

    const points = useMemo(() => {
        if (!data || data.length === 0) return [];
        const amounts = data.map(d => d.amount);
        const min = Math.min(...amounts);
        const max = Math.max(...amounts);
        const w = 700;
        const h = 180;
        const innerW = w - 40;
        const innerH = h - 30;

        const pts = data.map((d, i) => {
            const x = 20 + (innerW * (i / Math.max(1, data.length - 1)));
            const ratio = max === min ? 0.5 : (d.amount - min) / (max - min);
            const y = 10 + innerH * (1 - ratio);
            return { x, y, label: d.period, value: d.amount };
        });

        const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        return { pts, path, w, h } as any;
    }, [data]);

    function downloadCSV() {
        const rows = ['period,amount', ...data.map(d => `${d.period},${d.amount}`)];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${periodLabel || 'period'}_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    if (!data || data.length === 0) return (
        <div className="p-4 border rounded-md text-muted-foreground">No data to display</div>
    );

    return (
        <div className="space-y-3 relative" ref={containerRef}>
            <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{periodLabel || 'Trend'}</div>
                <div className="flex gap-2">
                    <button title="Copy JSON" className="btn hover:shadow-md transition" onClick={() => navigator.clipboard && navigator.clipboard.writeText(JSON.stringify(data))}>Copy JSON</button>
                    <button title="Export CSV" className="btn btn-outline hover:bg-primary hover:text-white transition" onClick={downloadCSV}>Export CSV</button>
                </div>
            </div>

            <div className="overflow-auto">
                <svg width={points.w} height={points.h} className="block">
                    <defs>
                        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    <path d={`${points.path}`} fill="none" stroke="#2563EB" strokeWidth={2} />
                    {points.pts && (
                        <g>
                            {points.pts.map((p: any, idx: number) => (
                                <g key={idx}>
                                    <circle
                                        cx={p.x}
                                        cy={p.y}
                                        r={4}
                                        fill="#2563EB"
                                        style={{ cursor: 'pointer', transition: 'r 120ms' }}
                                        onMouseMove={(e: any) => {
                                            const rect = containerRef.current?.getBoundingClientRect();
                                            if (!rect) return;
                                            setTooltip({ visible: true, left: e.clientX - rect.left + 8, top: e.clientY - rect.top - 30, period: p.label, amount: p.value });
                                        }}
                                        onMouseLeave={() => setTooltip(null)}
                                    />
                                </g>
                            ))}
                        </g>
                    )}
                </svg>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
                {data.slice(0, 12).map((d) => (
                    <div key={d.period} className="p-2 border rounded text-center">
                        <div className="font-medium">{d.period}</div>
                        <div className="text-sm">{d.amount.toLocaleString()}</div>
                    </div>
                ))}
            </div>

            {tooltip && tooltip.visible && (
                <div style={{ left: tooltip.left, top: tooltip.top }} className="absolute z-50 pointer-events-none transform -translate-y-1/2">
                    <div className="bg-white border rounded shadow px-3 py-1 text-xs">
                        <div className="font-medium">{tooltip.period}</div>
                        <div className="text-muted-foreground">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(tooltip.amount || 0))}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
