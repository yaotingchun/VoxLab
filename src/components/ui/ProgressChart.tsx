"use client";

import { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { motion } from "framer-motion";

export interface ChartDataPoint {
    day: number | string;
    Voice: number | null;
    "Posture & Facial": number | null;
    Content: number | null;
    Overall: number | null;
    sessionIds?: string[]; // Array of session IDs for this day
    videoUrls?: (string | null)[];
    jsonUrls?: (string | null)[];
}

interface ProgressChartProps {
    data: ChartDataPoint[];
    title?: string;
    onPrev?: () => void;
    onNext?: () => void;
    canGoNext?: boolean;
    onNodeClick?: (dataPoint: ChartDataPoint) => void;
}

export function ProgressChart({ data, title, onPrev, onNext, canGoNext, onNodeClick }: ProgressChartProps) {

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const dataPoint = payload[0].payload as ChartDataPoint;

            return (
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.5)] z-50 relative pointer-events-none">
                    <p className="text-slate-300 font-bold mb-3 border-b border-slate-800 pb-2">Day {label}</p>

                    {/* Render the aggregated averages */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        {payload.map((entry: any, index: number) => {
                            if (entry.value === null || entry.value === undefined) return null;
                            return (
                                <div key={index} className="flex items-center gap-2 text-xs justify-between mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                        <span className="text-slate-400 truncate max-w-[60px]" title={entry.name}>{entry.name}</span>
                                    </div>
                                    <span className="font-bold text-white">{entry.value}</span>
                                </div>
                            );
                        })}
                    </div>

                    {dataPoint.sessionIds && dataPoint.sessionIds.length > 0 && (
                        <p className="text-xs text-slate-500 mt-2 text-center italic border-t border-slate-800 pt-2">
                            {dataPoint.sessionIds.length} {dataPoint.sessionIds.length === 1 ? "session" : "sessions"} recorded. Click line to browse.
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-[450px] bg-slate-900 border border-slate-700/50 rounded-3xl p-6 shadow-xl relative"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white">{title || "Performance Trends"}</h3>
                {onPrev && onNext && (
                    <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
                        <button onClick={onPrev} className="px-3 py-1 text-sm text-slate-300 hover:text-white hover:bg-slate-700 focus:bg-slate-700 rounded-md transition-all">Prev</button>
                        <button onClick={onNext} disabled={!canGoNext} className={`px-3 py-1 text-sm rounded-md transition-all ${!canGoNext ? "text-slate-600 cursor-not-allowed" : "text-slate-300 hover:text-white hover:bg-slate-700 focus:bg-slate-700"}`}>Next</button>
                    </div>
                )}
            </div>
            {data.length === 0 ? (
                <div className="w-full h-[300px] flex items-center justify-center text-slate-500 italic">
                    Not enough sessions to display chart.
                </div>
            ) : (
                <div className="w-full h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                            data={data}
                            margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                            onClick={(e: any) => {
                                if (e?.activePayload?.[0]?.payload?.sessionIds) {
                                    onNodeClick?.(e.activePayload[0].payload as ChartDataPoint);
                                }
                            }}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                            <XAxis
                                dataKey="day"
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `D${val}`}
                            />
                            <YAxis
                                domain={[0, 100]}
                                stroke="#64748b"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                content={<CustomTooltip />}
                                cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '3 3' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />

                            <Line connectNulls type="monotone" dataKey="Voice" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line connectNulls type="monotone" dataKey="Posture & Facial" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line connectNulls type="monotone" dataKey="Content" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            <Line connectNulls type="monotone" dataKey="Overall" stroke="#ec4899" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </motion.div>
    );
}
