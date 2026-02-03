"use client";

import React, { useMemo, useRef, useState } from 'react';
import { formatRupiah } from '@/lib/utils';

export type SeriesPoint = { period: string; amount: number };

export default function BarChart({
    data,
    xLabel = 'Period',
    yLabel = 'Amount',
    showValues = false,
}: {
    data: SeriesPoint[];
    xLabel?: string;
    yLabel?: string;
    showValues?: boolean;
}) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [tooltip, setTooltip] = useState<{ visible: boolean; left: number; top: number; period?: string; amount?: number } | null>(null);
    const [hovered, setHovered] = useState<number | null>(null);

    const prepared = useMemo(() => {
        const amounts = data.map(d => d.amount);
        const max = amounts.length ? Math.max(...amounts) : 0;
        const w = Math.max(600, data.length * 60);
        const h = 320; // a bit taller for readability
        const margin = { top: 28, right: 20, bottom: 80, left: 80 };
        const innerW = w - margin.left - margin.right;
        const innerH = h - margin.top - margin.bottom;

        const barWidth = Math.max(12, innerW / Math.max(1, data.length) - 12);

        const bars = data.map((d, i) => {
            const x = margin.left + i * (innerW / Math.max(1, data.length));
            const height = max === 0 ? 0 : (d.amount / max) * innerH;
            const y = margin.top + (innerH - height);
            return { ...d, x, y, height, barWidth };
        });

        // y ticks
        const ticks = 4;
        const tickValues = Array.from({ length: ticks + 1 }).map((_, i) => Math.round((max / ticks) * i));

        return { w, h, margin, bars, tickValues, innerH };
    }, [data]);

    function downloadCSV() {
        const rows = ['period,amount', ...data.map(d => `${d.period},${d.amount}`)];
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_bar_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    if (!data || data.length === 0) return (
        <div className="p-4 border rounded-md text-muted-foreground">No data to display</div>
    );

    return (
        <div className="space-y-4 relative" ref={containerRef}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm font-medium">{yLabel} by {xLabel}</div>
                    <div className="text-xs text-muted-foreground">Total points: {data.length}</div>
                </div>
                <div className="flex gap-2">
                    <button title="Copy JSON" className="btn hover:shadow-md transition" onClick={() => navigator.clipboard?.writeText(JSON.stringify(data))}>Copy JSON</button>
                    <button title="Export CSV" className="btn btn-outline hover:bg-primary hover:text-white transition" onClick={downloadCSV}>Export CSV</button>
                </div>
            </div>

            <div className="overflow-auto">
                <svg width={prepared.w} height={prepared.h} className="block">
                    <g>
                        {/* stronger y axis */}
                        <line x1={prepared.margin.left} x2={prepared.margin.left} y1={prepared.margin.top} y2={prepared.margin.top + prepared.innerH} stroke="#94A3B8" strokeWidth={1.2} />
                        {/* x axis */}
                        <line x1={prepared.margin.left} x2={prepared.w - prepared.margin.right} y1={prepared.margin.top + prepared.innerH} y2={prepared.margin.top + prepared.innerH} stroke="#94A3B8" strokeWidth={1.2} />

                        {/* y axis ticks and grid */}
                        {prepared.tickValues.map((t, i) => {
                            const y = prepared.margin.top + prepared.innerH - (t / (prepared.tickValues[prepared.tickValues.length - 1] || 1)) * prepared.innerH;
                            return (
                                <g key={i}>
                                    <line x1={prepared.margin.left} x2={prepared.w - prepared.margin.right} y1={y} y2={y} stroke="#CBD5E1" strokeWidth={1} />
                                    <text x={prepared.margin.left - 12} y={y + 4} fontSize={12} textAnchor="end" fill="#0F172A">{t.toLocaleString()}</text>
                                </g>
                            );
                        })}

                        {/* bars with hover handlers */}
                        {prepared.bars.map((b, idx) => (
                            <g key={idx}>
                                <rect
                                    x={b.x + 4}
                                    y={b.y}
                                    width={b.barWidth}
                                    height={b.height}
                                    fill={hovered === idx ? '#1E3A8A' : '#2563EB'}
                                    rx={6}
                                    style={{ cursor: 'pointer', transition: 'fill 120ms' }}
                                    onMouseMove={(e: any) => {
                                        const rect = containerRef.current?.getBoundingClientRect();
                                        if (!rect) return;
                                        setTooltip({ visible: true, left: e.clientX - rect.left + 8, top: e.clientY - rect.top - 38, period: b.period, amount: b.amount });
                                        setHovered(idx);
                                    }}
                                    onMouseLeave={() => { setTooltip(null); setHovered(null); }}
                                />
                                {showValues && b.height > 12 && (
                                    <text x={b.x + 4 + b.barWidth / 2} y={b.y - 6} fontSize={11} textAnchor="middle" fill="#111827">{b.amount.toLocaleString()}</text>
                                )}
                                <text x={b.x + 4 + b.barWidth / 2} y={prepared.h - 20} fontSize={11} textAnchor="middle" fill="#0F172A">{b.period}</text>
                            </g>
                        ))}

                        {/* axis labels */}
                        <text x={prepared.margin.left - 48} y={prepared.margin.top - 6} fontSize={12} textAnchor="start" fill="#0F172A">{yLabel}</text>
                        <text x={(prepared.w) / 2} y={prepared.h} fontSize={12} textAnchor="middle" fill="#0F172A">{xLabel}</text>
                    </g>
                </svg>
            </div>

            {/* Tooltip */}
            {tooltip && tooltip.visible && (
                <div style={{ left: tooltip.left, top: tooltip.top }} className="absolute z-50 pointer-events-none transform -translate-y-1/2">
                    <div className="bg-white border rounded shadow px-3 py-2 text-xs">
                        <div className="font-medium">{tooltip.period}</div>
                        <div className="text-muted-foreground">{formatRupiah(Number(tooltip.amount || 0))}</div>
                    </div>
                </div>
            )}
        </div>
    );
}
