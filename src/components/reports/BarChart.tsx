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
        const w = Math.max(480, data.length * 90);
        const h = 220;
        const margin = { top: 20, right: 20, bottom: 56, left: 64 };
        const innerW = w - margin.left - margin.right;
        const innerH = h - margin.top - margin.bottom;

        const barWidth = Math.max(18, innerW / Math.max(1, data.length) - 18);

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

    const formatPeriod = (label: string) => {
        if (!label) return '';
        if (label.includes('-')) {
            const parts = label.split('-');
            if (parts.length === 3) return `${parts[1]}/${parts[2]}`;
        }
        return label;
    };

    return (
        <div className="space-y-3 relative" ref={containerRef}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="text-sm font-semibold text-[#1F1D1A]">{yLabel} by {xLabel}</div>
                    <div className="text-xs text-[#6F6659]">Total points: {data.length}</div>
                </div>
                <div className="flex gap-3 text-xs text-[#1F1D1A]">
                    <button
                        title="Copy JSON"
                        className="hover:text-[#C86B2A]"
                        onClick={() => navigator.clipboard?.writeText(JSON.stringify(data))}
                    >
                        Copy JSON
                    </button>
                    <button
                        title="Export CSV"
                        className="hover:text-[#C86B2A]"
                        onClick={downloadCSV}
                    >
                        Export CSV
                    </button>
                </div>
            </div>

            <div className="overflow-auto rounded-xl border border-[#E6DED0] bg-[#FCFAF6] p-3">
                <svg viewBox={`0 0 ${prepared.w} ${prepared.h}`} width="100%" height={prepared.h} className="block">
                    <g>
                        {/* axes */}
                        <line x1={prepared.margin.left} x2={prepared.margin.left} y1={prepared.margin.top} y2={prepared.margin.top + prepared.innerH} stroke="#BDB3A5" strokeWidth={1} />
                        <line x1={prepared.margin.left} x2={prepared.w - prepared.margin.right} y1={prepared.margin.top + prepared.innerH} y2={prepared.margin.top + prepared.innerH} stroke="#BDB3A5" strokeWidth={1} />

                        {/* y axis ticks and grid */}
                        {prepared.tickValues.map((t, i) => {
                            const y = prepared.margin.top + prepared.innerH - (t / (prepared.tickValues[prepared.tickValues.length - 1] || 1)) * prepared.innerH;
                            return (
                                <g key={i}>
                                    <line x1={prepared.margin.left} x2={prepared.w - prepared.margin.right} y1={y} y2={y} stroke="#E6DED0" strokeWidth={1} strokeDasharray="3 3" />
                                    <text x={prepared.margin.left - 10} y={y + 4} fontSize={11} textAnchor="end" fill="#6F6659">{t.toLocaleString('id-ID')}</text>
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
                                    fill={hovered === idx ? '#235CD1' : '#2C6BE5'}
                                    rx={10}
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
                                    <text x={b.x + 4 + b.barWidth / 2} y={b.y - 6} fontSize={11} textAnchor="middle" fill="#1F1D1A">{b.amount.toLocaleString('id-ID')}</text>
                                )}
                                <text x={b.x + 4 + b.barWidth / 2} y={prepared.h - 18} fontSize={11} textAnchor="middle" fill="#6F6659">{formatPeriod(b.period)}</text>
                            </g>
                        ))}

                        {/* axis labels */}
                        <text x={prepared.margin.left - 48} y={prepared.margin.top - 6} fontSize={11} textAnchor="start" fill="#6F6659">{yLabel}</text>
                        <text x={(prepared.w) / 2} y={prepared.h} fontSize={11} textAnchor="middle" fill="#6F6659">{xLabel}</text>
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
