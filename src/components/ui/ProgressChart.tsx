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
}

interface ProgressChartProps {
    data: ChartDataPoint[];
    title?: string;
    onPrev?: () => void;
    onNext?: () => void;
    canGoNext?: boolean;
    onNodeClick?: (sessionId: string, videoUrl: string | null) => void;
}

export function ProgressChart({ data, title, onPrev, onNext, canGoNext, onNodeClick }: ProgressChartProps) {
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl">
                    <p className="text-slate-300 font-bold mb-2">Day {label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 text-sm justify-between w-32 mb-1">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-slate-400">{entry.name}</span>
                            </div>
                            <span className="font-bold text-white">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full h-[400px] bg-slate-900 border border-slate-700/50 rounded-3xl p-6 shadow-xl"
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
                                if (e?.activePayload?.[0]?.payload?.sessionIds?.[0]) {
                                    const payload = e.activePayload[0].payload;
                                    onNodeClick?.(payload.sessionIds[0], payload.videoUrls?.[0]);
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
                            <Tooltip content={<CustomTooltip />} />
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
